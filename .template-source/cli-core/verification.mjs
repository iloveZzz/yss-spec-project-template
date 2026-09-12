import * as fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { CHECKS } from './family.mjs';
import { descriptor, ensure, hash, safe, stat, write, same } from './io.mjs';
import { identity, gitlinks, guardNestedRepository } from './identity.mjs';
import { inspectState, recoveryPreview } from './transaction.mjs';

function run(root, ref, args = []) {
  const result = spawnSync(process.execPath, [safe(root, ref), ...args], {cwd:root,encoding:'utf8',timeout:120000,maxBuffer:16*1024*1024});
  ensure(!result.error && result.status === 0, `${ref}: ${result.error?.message || result.stderr || result.stdout}`, 'VERIFY');
  return {exitCode:result.status};
}
function skillTree(root, ref) {
  const files = [];
  function visit(relative) {
    const s = stat(safe(root, relative));
    ensure(s, `缺少技能目录: ${relative}`, 'VERIFY');
    if (s.isDirectory()) for (const name of fs.readdirSync(safe(root, relative)).sort()) {
      if (name === '.DS_Store' || name === '__pycache__' || /\.(pyc|pyo)$/.test(name)) continue;
      visit(relative + '/' + name);
    } else { const d = descriptor(root, relative); files.push([relative.slice(ref.length), d.digest]); }
  }
  visit(ref);
  return JSON.stringify(files);
}
export function verifyInstance(bundle, root) {
  identity(root, bundle, 'doctor');
  const checks = [];
  if (!bundle.files.has('skills-lock.json')) return checks;
  for (const [name, ref, ...args] of CHECKS) checks.push({name,status:'ok',...run(root,ref,args)});
  const lock = JSON.parse(fs.readFileSync(safe(root, 'skills-lock.json')));
  ensure(lock.version === 3 && lock.skills?.shared && Array.isArray(lock.projectionRoots), '技能锁 schema 非法', 'VERIFY');
  for (const name of Object.keys(lock.skills.shared)) {
    const canonical = skillTree(root, `.agents/skills/${name}`);
    for (const projection of lock.projectionRoots) ensure(skillTree(root, `${projection}/${name}`) === canonical, `技能投影漂移: ${projection}/${name}`, 'VERIFY');
  }
  checks.push({name:'skill-projections',status:'ok'});
  return checks;
}
// Prepare the generated lock outside the target, with the same candidate bytes
// that the transaction will apply. Unknown user skills are never auto-enrolled.
export function prepareGenerated(bundle, target, operations, metadata, observe) {
  if (!bundle.files.has('skills-lock.json')) return;
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-candidate-'));
  try {
    const refs = new Set([...bundle.files.keys(), ...Object.keys(metadata.managedFiles)]);
    const roots = ['.agents/skills','.claude/skills','.codex/skills','.cursor/skills','.pi/skills','.qoder/skills','.trae/skills'];
    function collect(ref) {
      const s = stat(safe(target, ref));
      if (!s) return;
      if (s.isDirectory()) for (const name of fs.readdirSync(safe(target, ref))) {
        if (name !== '.DS_Store' && name !== '__pycache__' && !/\.(pyc|pyo)$/.test(name)) collect(ref + '/' + name);
      }
      else refs.add(ref);
    }
    for (const root of roots) collect(root);
    for (const ref of refs) {
      const d = descriptor(target, ref);
      if (observe.has(ref)) ensure(same(observe.get(ref),d), `候选生成期间发生并发修改: ${ref}`, "CONCURRENT");
      else observe.set(ref, d);
      if (d) write(scratch, ref, fs.readFileSync(safe(target, ref)), d.mode);
    }
    for (const op of operations) {
      if (op.after) write(scratch,op.path,op.bytes,op.after.mode);
      else if (stat(safe(scratch,op.path))) fs.unlinkSync(safe(scratch,op.path));
    }
    // Seed registered project extensions without enrolling unknown directories.
    const oldPath = safe(target, 'skills-lock.json');
    if (stat(oldPath)) {
      const old = JSON.parse(fs.readFileSync(oldPath));
      const seed = JSON.parse(fs.readFileSync(safe(scratch,'skills-lock.json')));
      ensure(old.version === 3 && old.skills?.shared, '现有技能锁非法', 'VERIFY');
      for (const [name, record] of Object.entries(old.skills.shared)) {
        const ref = `.agents/skills/${name}`;
        const wasManaged = Object.keys(metadata.managedFiles).some(p=>p.startsWith(ref+'/'));
        if (!seed.skills.shared[name] && !wasManaged && stat(safe(scratch,ref))) seed.skills.shared[name] = record;
      }
      for (const [root, entries] of Object.entries(old.skills.platform || {})) for (const [name, record] of Object.entries(entries)) {
        if (stat(safe(scratch,`${root}/${name}`))) { seed.skills.platform ||= {}; seed.skills.platform[root] ||= {}; seed.skills.platform[root][name] ||= record; }
      }
      seed.sources={...old.sources,...seed.sources};
      write(scratch,'skills-lock.json',JSON.stringify(seed,null,2)+'\n');
    }
    run(scratch,'scripts/update-skill-lock');
    const ref = 'skills-lock.json', bytes = fs.readFileSync(safe(scratch,ref));
    const before = descriptor(target,ref), after = {type:'file',digest:hash(bytes),mode:0o644};
    const index = operations.findIndex(op=>op.path===ref);
    if (index !== -1) operations.splice(index,1);
    if (!same(before,after)) operations.push({path:ref,before,after,bytes});
    metadata.managedFiles[ref] = {baseline:after,lastApplied:after,ownership:'generated'};
    metadata.baselineDigest=hash(JSON.stringify(metadata.managedFiles));
    write(scratch,bundle.family.metadataFile,JSON.stringify(metadata,null,2)+'\n');
    verifyInstance(bundle,scratch);
  } finally { fs.rmSync(scratch,{recursive:true,force:true}); }
}
export function doctor(bundle, target) {
  const report = {schemaVersion:1,command:'doctor',status:'healthy',target,cliVersion:bundle.pkg.version,coreVersion:bundle.core.coreVersion,templateCommit:bundle.snapshot.templateCommit,templateSourceState:bundle.snapshot.sourceState || "committed",coreSourceState:bundle.core.sourceState || "committed",checks:[]};
  function check(name, fn) {
    try { const data = fn(); report.checks.push({name,status:'ok',...data}); return data; }
    catch(error) { report.status='error';report.checks.push({name,status:'error',code:error.code || 'INVALID',message:error.message}); }
  }
  check('target',()=>{ensure(stat(target)?.isDirectory(),'目标目录不存在','PATH');});
  const state = check('transactions',()=>{const s=inspectState(target,bundle.family);if(s.pending.length){const r=recoveryPreview(target,bundle.family,s);throw Object.assign(new Error(`发现 ${s.pending.length} 个未完成事务；运行 recover 查看计划`),{code:'INTERRUPTED',result:r});}return s;});
  const meta = check('identity',()=>({metadata:identity(target,bundle,'doctor')}))?.metadata;
  if(meta) {
    if(meta.legacyRetainedFiles?.length) report.checks.push({name:'legacy-retained',status:'warning',paths:meta.legacyRetainedFiles,message:'旧创建脚本已退出管理，保留原文件；请按项目决定人工移除'});
    check('baseline',()=>{
      const links=gitlinks(target);let modified=0,missing=0;
      for (const [ref,record] of Object.entries(meta.managedFiles)) {
        guardNestedRepository(target,ref);
        ensure(!links.some(p=>p===ref || ref.startsWith(p+'/')),`受管路径进入 gitlink: ${ref}`,'PROTECTED');
        const d=descriptor(target,ref);if(!d)missing++;else if(!same(d,record.lastApplied || record.baseline))modified++;
      }
      return {status:modified||missing?'warning':'ok',modified,missing,migrationRequired:Boolean(meta.legacy)};
    });
    if (state && !state.pending.length) check('instance-contract',()=>({checks:verifyInstance(bundle,target)}));
  }
  const git=spawnSync('git',['--no-optional-locks','-c','core.fsmonitor=false','-C',target,'status','--porcelain'],{encoding:'utf8',timeout:5000});
  report.checks.push({name:'git',status:git.status!==0||git.stdout?'warning':'ok',message:git.status!==0?'未建立 Git 工作区':git.stdout?'存在本地改动':'工作区干净'});
  for (const check of report.checks) delete check.metadata;
  report.advice=report.status==='error'?'按失败检查项修复；中断事务使用 recover，禁止删除 metadata 绕过':'使用 diff 查看模板更新';
  return report;
}
