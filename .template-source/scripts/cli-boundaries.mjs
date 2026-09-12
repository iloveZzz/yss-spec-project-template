import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';

function tree(root) {
 const entries=[];
 function visit(ref) {
  const file=path.join(root,ref),s=fs.lstatSync(file);
  if(s.isSymbolicLink())entries.push([ref,'link',fs.readlinkSync(file)]);
  else if(s.isDirectory()){entries.push([ref,'directory']);for(const name of fs.readdirSync(file).sort())visit(path.join(ref,name));}
  else entries.push([ref,s.mode&0o777,createHash('sha256').update(fs.readFileSync(file)).digest('hex')]);
 }
 visit('');return entries;
}
export function boundaryContract(pkg) {
 const family=JSON.parse(fs.readFileSync(path.join(pkg,'config/family.json')));
 test(`${family.side}: 安装包路径隔离、用户文档与技能扩展`,t=>{
  const scratch=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'harness-boundaries-')));
  t.after(()=>fs.rmSync(scratch,{recursive:true,force:true}));
  const entry=path.join(pkg,'bin',family.packageName+'.js');
  const run=(target,command,args=[])=>{
   const r=spawnSync(process.execPath,[entry,command,'--target-dir',target,...args,'--json'],{encoding:'utf8',timeout:300000,maxBuffer:32*1024*1024});
   return {...r,data:JSON.parse(r.stdout)};
  };
  const ok=r=>assert.equal(r.status,0,r.stderr||r.error?.message);
  // A declared, unpopulated gitlink still owns its mount point.
  for(const kind of ['symlink','hardlink','gitlink','nested']) {
   const target=path.join(scratch,kind);fs.mkdirSync(target);
   fs.writeFileSync(path.join(target,'keep'),'user bytes');
   if(kind==='symlink')fs.symlinkSync(path.join(target,'keep'),path.join(target,'AGENTS.md'));
   if(kind==='hardlink')fs.linkSync(path.join(target,'keep'),path.join(target,'AGENTS.md'));
   if(kind==='gitlink')fs.writeFileSync(path.join(target,'.gitmodules'),'[submodule "docs"]\n path = docs\n url = https://example.invalid/docs.git\n');
   if(kind==='nested'){fs.mkdirSync(path.join(target,'docs','.git'),{recursive:true});fs.writeFileSync(path.join(target,'docs','.git','config'),'');}
   const before=tree(target);
   for(const args of [[],['--apply'],...(family.side==='design'?[]:[['--apply','--force']])]) {
    const r=run(target,'attach',args);assert.equal(r.status,1,kind);assert.ok(r.data.code,kind);assert.deepEqual(tree(target),before,kind);
   }
  }
  const target=path.join(scratch,'extensions');fs.mkdirSync(target);
  const preserved={'README.md':'# User README\n','DESIGN.md':'# User design\n','approved.yaml':'decision: approved\n','user-decision.json':'{"approved":true}\n'};
  for(const [ref,bytes]of Object.entries(preserved))fs.writeFileSync(path.join(target,ref),bytes);
  ok(run(target,'attach',['--apply']));
  const metadata=path.join(target,family.metadataFile),lockfile=path.join(target,'skills-lock.json');
  const skill='local-cli-extension',skillBytes='---\nname: local-cli-extension\ndescription: Local project extension.\n---\n# Local extension\n';
  const canonical=path.join(target,'.agents/skills',skill);fs.mkdirSync(canonical,{recursive:true});fs.writeFileSync(path.join(canonical,'SKILL.md'),skillBytes);
  const before=tree(target),attempt=run(target,'sync',['--apply']);
  assert.equal(attempt.status,1);assert.deepEqual(tree(target),before);assert.equal(JSON.parse(fs.readFileSync(lockfile)).skills.shared[skill],undefined);
  // Explicit user registration is preserved by CLI lock generation.
  const lock=JSON.parse(fs.readFileSync(lockfile));
  for(const root of lock.projectionRoots){const dir=path.join(target,root,skill);fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,'SKILL.md'),skillBytes);}
  const registered=spawnSync(process.execPath,['scripts/update-skill-lock',`--add=${skill}`],{cwd:target,encoding:'utf8'});assert.equal(registered.status,0,registered.stderr);
  ok(run(target,'sync',['--apply','--prune']));ok(run(target,'doctor'));
  assert.ok(JSON.parse(fs.readFileSync(lockfile)).skills.shared[skill]);
  for(const root of ['.agents/skills',...lock.projectionRoots])assert.equal(fs.readFileSync(path.join(target,root,skill,'SKILL.md'),'utf8'),skillBytes);
  for(const [ref,bytes]of Object.entries(preserved))assert.equal(fs.readFileSync(path.join(target,ref),'utf8'),bytes);
  assert.equal(Object.keys(JSON.parse(fs.readFileSync(metadata)).managedFiles).some(p=>p.includes('/'+skill+'/')),false);
 });
}
