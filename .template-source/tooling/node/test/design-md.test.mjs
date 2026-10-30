import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { execFileSync } from "node:child_process";
import { readFileSync, cpSync, mkdtempSync, mkdirSync, readdirSync, writeFileSync, rmSync, unlinkSync, chmodSync, realpathSync, symlinkSync } from "node:fs";
import os from "node:os";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const toolingRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repositoryRoot = path.resolve(toolingRoot, "../../..");
const command = path.join(repositoryRoot, ".agents/skills/yss-design-system/scripts/design-md.mjs");

test("DESIGN.md passes local and pinned upstream lint", () => {
  const source = readFileSync(path.join(repositoryRoot, "DESIGN.md"), "utf8");
  for (const section of ["Overview", "Colors", "Typography", "Layout", "Elevation & Depth", "Shapes", "Components", "Do's and Don'ts"]) {
    assert.match(source, new RegExp(`^## ${section.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")}$`, "m"));
  }
  const output = execFileSync("node", [command, "lint", "DESIGN.md"], {
    cwd: repositoryRoot,
    encoding: "utf8"
  });
  const report = JSON.parse(output);
  assert.equal(report.summary.errors, 0);
  assert.equal(report.summary.warnings, 0);
});

test("DESIGN.md projection manifest is current", () => {
  const output = execFileSync("node", [command, "drift"], {
    cwd: repositoryRoot,
    encoding: "utf8"
  });
  assert.match(output, /无漂移/);
  const manifest = JSON.parse(readFileSync(path.join(repositoryRoot, ".template-spec/design/tokens/.design-md-projection.json"), "utf8"));
  assert.equal(manifest.source, "DESIGN.md");
  assert.equal(Object.keys(manifest.files).length, 6);
  const css = readFileSync(path.join(repositoryRoot, ".template-spec/design/tokens/variables.css"), "utf8");
  for (const declaration of ["--yss-color-primary-control: #245bdb", "--yss-color-primary-control-hover: #2f68eb", "--yss-color-on-primary: #ffffff", "--yss-control-height: 32px", "--yss-card-padding: 20px"]) assert.match(css, new RegExp(declaration));
});

test("cross-repository design sync digest matches DESIGN.md", () => {
  const source = readFileSync(path.join(repositoryRoot, "DESIGN.md"));
  const sync = readFileSync(path.join(repositoryRoot, ".template-source/design/design-system-sync.yaml"), "utf8");
  const digest = createHash("sha256").update(source).digest("hex");
  assert.match(sync, new RegExp(`baseline_sha256: ${digest}`));
});


function isolated(t) {
  const root=mkdtempSync(path.join(os.tmpdir(),'yss design-md space '));
  t.after(()=>rmSync(root,{recursive:true,force:true}));
  const ref='.agents/skills/yss-design-system/scripts/design-md.mjs';
  mkdirSync(path.dirname(path.join(root,ref)),{recursive:true});cpSync(command,path.join(root,ref));
  cpSync(path.join(repositoryRoot,'.agents/skills/yss-design-system/scripts/vendor'),path.join(root,'.agents/skills/yss-design-system/scripts/vendor'),{recursive:true});
  cpSync(path.join(repositoryRoot,'DESIGN.md'),path.join(root,'DESIGN.md'));
  mkdirSync(path.join(root,'.template-spec/design'),{recursive:true});cpSync(path.join(repositoryRoot,'.template-spec/design/tokens'),path.join(root,'.template-spec/design/tokens'),{recursive:true});
  mkdirSync(path.join(root,'.template-source/design'),{recursive:true});cpSync(path.join(repositoryRoot,'.template-source/design/design-system-sync.yaml'),path.join(root,'.template-source/design/design-system-sync.yaml'));
  return {root,file:path.join(root,ref)};
}
function state(root){
  const entries={};function scan(dir){for(const e of readdirSync(dir,{withFileTypes:true})){const f=path.join(dir,e.name);if(e.isDirectory())scan(f);else if(e.isFile())entries[path.relative(root,f)]=createHash('sha256').update(readFileSync(f)).digest('hex');}}scan(root);return entries;
}
function run(data,args,options={}){const r=spawnSync(process.execPath,[data.file,...args],{cwd:data.root,encoding:'utf8',...options});assert.equal(r.error,undefined);return r;}

test('仓外复制技能的漂移检查使用显式项目根且不修改其他项目', t => {
  const a = isolated(t), b = isolated(t);
  const skill = mkdtempSync(path.join(os.tmpdir(), 'yss portable skill '));
  t.after(() => rmSync(skill, {recursive:true, force:true}));
  cpSync(path.join(repositoryRoot, '.agents/skills/yss-design-system'), skill, {recursive:true});
  const bCss = path.join(b.root, '.template-spec/design/tokens/variables.css');
  writeFileSync(bCss, readFileSync(bCss, 'utf8') + '\n/* other project */');
  const beforeA = state(a.root), beforeB = state(b.root);
  const result = spawnSync(process.execPath, [path.join(skill, 'scripts/design-md.mjs'), 'drift', '--project-root', a.root], {cwd:b.root, encoding:'utf8'});
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /无漂移/);
  assert.deepEqual(state(a.root), beforeA);
  assert.deepEqual(state(b.root), beforeB);
  for (const args of [['drift'], ['drift','--project-root'], ['drift','--project-root',a.root,'--project-root',b.root], ['drift','--project-root',a.root,'--project-root='+b.root], ['drift','--project-root',path.join(a.root,'missing')]]) {
    const bad = spawnSync(process.execPath, [path.join(skill,'scripts/design-md.mjs'), ...args], {cwd:b.root, encoding:'utf8'});
    assert.notEqual(bad.status, 0, args.join(' '));
    assert.match(bad.stderr, /--project-root/);
  }
  assert.deepEqual(state(a.root), beforeA);
  assert.deepEqual(state(b.root), beforeB);
});

test('同进程使用不同项目根不会复用前一个项目', async t => {
  const a = isolated(t), b = isolated(t);
  const bCss = path.join(b.root,'.template-spec/design/tokens/variables.css');
  writeFileSync(bCss, readFileSync(bCss,'utf8') + '\n/* drift */');
  const {main} = await import(pathToFileURL(a.file).href);
  assert.doesNotThrow(() => main(['drift','--project-root',a.root]));
  assert.throws(() => main(['drift','--project-root',b.root]), /漂移/);
});

test('lint、diff、export 的上游调用使用指定项目根且不转发项目根选项', t => {
  const a = isolated(t), b = isolated(t);
  const bin = path.join(a.root,'fake-bin');
  mkdirSync(bin);
  const stub = path.join(bin,'npx');
  writeFileSync(stub, '#!/usr/bin/env node\nprocess.stdout.write(JSON.stringify({cwd:process.cwd(),args:process.argv.slice(2)}));\n');
  chmodSync(stub, 0o755);
  for (const [args,expected] of [[['lint','DESIGN.md'],['lint','DESIGN.md','--format','json']], [['diff','DESIGN.md','DESIGN.md'],['diff','DESIGN.md','DESIGN.md','--format','json']], [['export','dtcg'],['export','DESIGN.md','--format','dtcg']]]) {
    const result = run(a,[...args,'--project-root',a.root],{cwd:b.root,env:{...process.env,PATH:bin+path.delimiter+process.env.PATH}});
    assert.equal(result.status,0,result.stderr);
    const upstream = JSON.parse(result.stdout);
    assert.equal(upstream.cwd, realpathSync(a.root));
    assert.equal(upstream.args.includes('--project-root'), false);
    assert.deepEqual(upstream.args.slice(2),expected);
  }
});

test('技能内 YAML vendor 与仓库共享版本保持一致', () => {
  for (const file of ['yaml.mjs','NOTICES.md']) {
    assert.deepEqual(readFileSync(path.join(repositoryRoot,'.agents/skills/yss-design-system/scripts/vendor',file)),readFileSync(path.join(repositoryRoot,'scripts/vendor',file)));
  }
});

test('摘要重签拒绝过期设计源、被改写的投影和缺失摘要，且不改任何文件', t => {
  for (const kind of ['source', 'projection', 'manifest']) {
    const data=isolated(t),bin=path.join(data.root,'fake-bin');
    mkdirSync(bin);
    writeFileSync(path.join(bin,'npx'),'#!/usr/bin/env node\nprocess.stdout.write("{}");\n');
    chmodSync(path.join(bin,'npx'),0o755);
    writeFileSync(path.join(data.root,'yss-project.yaml'),'schema_version: 2\nrepository_mode: project-instance\n');
    if(kind==='source'){
      const file=path.join(data.root,'DESIGN.md');
      writeFileSync(file,readFileSync(file,'utf8').replace('primary: "#3371ff"','primary: "#123456"'));
    }
    if(kind==='projection'){
      const file=path.join(data.root,'.template-spec/design/tokens/tokens.default.json');
      writeFileSync(file,readFileSync(file,'utf8')+'\n');
    }
    if(kind==='manifest')unlinkSync(path.join(data.root,'.template-spec/design/tokens/.design-md-projection.json'));
    const before=state(data.root);
    const r=run(data,['export','dtcg','--write-css','--write-manifest'],{env:{...process.env,PATH:bin+path.delimiter+process.env.PATH}});
    assert.notEqual(r.status,0,kind);
    assert.match(r.stderr,/漂移|缺少/);
    assert.deepEqual(state(data.root),before,kind);
  }
});

test('漂移检查拒绝不完整或非法的投影摘要', t => {
  for (const kind of ['empty','missing','extra','schema','source']) {
    const data=isolated(t),file=path.join(data.root,'.template-spec/design/tokens/.design-md-projection.json');
    const manifest=JSON.parse(readFileSync(file,'utf8'));
    if(kind==='empty')manifest.files={};
    if(kind==='missing')delete manifest.files[Object.keys(manifest.files)[0]];
    if(kind==='extra')manifest.files['outside.json']='0'.repeat(64);
    if(kind==='schema')manifest.schema_version=2;
    if(kind==='source')manifest.source='other.md';
    writeFileSync(file,JSON.stringify(manifest));
    const before=state(data.root),r=run(data,['drift']);
    assert.notEqual(r.status,0,kind);
    assert.match(r.stderr,/摘要|投影|manifest/i);
    assert.deepEqual(state(data.root),before,kind);
  }
});

test('指定项目的 CSS 写入不修改当前工作目录中的其他项目', t => {
  const a = isolated(t), b = isolated(t);
  const bin = path.join(a.root,'fake-bin');
  mkdirSync(bin);
  const stub = path.join(bin,'npx');
  writeFileSync(stub, '#!/usr/bin/env node\nprocess.stdout.write("{}");\n');
  chmodSync(stub, 0o755);
  const aCss = path.join(a.root,'.template-spec/design/tokens/variables.css');
  const css = readFileSync(aCss,'utf8');
  const broken = css.replace('--yss-color-primary-control: #245bdb;', '--yss-color-primary-control: #000000;');
  assert.notEqual(broken,css);
  writeFileSync(aCss,broken);
  const beforeB = state(b.root);
  const result = run(a,['export','dtcg','--write-css','--project-root',a.root],{cwd:b.root,env:{...process.env,PATH:bin+path.delimiter+process.env.PATH}});
  assert.equal(result.status,0,result.stderr);
  assert.match(readFileSync(aCss,'utf8'),/--yss-color-primary-control: #245bdb;/);
  assert.equal(run(a,['drift','--project-root',a.root]).status,0,'恢复原有内容后原始摘要仍有效');
  assert.deepEqual(state(b.root),beforeB);
});

test('主题写入拒绝指向项目外的文件或目录符号链接', {skip:process.platform==='win32'}, t => {
  for (const kind of ['file','directory','manifest']) {
    const data=isolated(t), outside=mkdtempSync(path.join(os.tmpdir(),'yss external tokens '));
    t.after(()=>rmSync(outside,{recursive:true,force:true}));
    const bin=path.join(data.root,'fake-bin');
    mkdirSync(bin);
    writeFileSync(path.join(bin,'npx'),'#!/usr/bin/env node\nprocess.stdout.write("{}");\n');
    chmodSync(path.join(bin,'npx'),0o755);
    const tokens=path.join(data.root,'.template-spec/design/tokens');
    const css=path.join(tokens,'variables.css'), manifest=path.join(tokens,'.design-md-projection.json');
    if(kind==='directory') {
      cpSync(tokens,outside,{recursive:true});
      rmSync(tokens,{recursive:true});
      symlinkSync(outside,tokens,'dir');
    } else {
      const target=kind==='file'?css:manifest;
      cpSync(target,path.join(outside,path.basename(target)));
      unlinkSync(target);
      symlinkSync(path.join(outside,path.basename(target)),target);
    }
    const before=state(outside);
    const args=kind==='manifest'?['export','dtcg','--write-manifest']:['export','dtcg','--write-css'];
    const result=run(data,[...args,'--project-root',data.root],{env:{...process.env,PATH:bin+path.delimiter+process.env.PATH}});
    assert.notEqual(result.status,0,kind);
    assert.match(result.stderr,/链接|symlink/i);
    assert.deepEqual(state(outside),before,kind);
  }
});

test('没有同步文件时非法项目身份阻止主题写入', t => {
  for (const [file,content] of [['yss-project.yaml','schema_version: 999\nrepository_mode: project-instance\n'],['.yss.json','{"schemaVersion":5,"profile":"spec"}']]) {
    const data = isolated(t);
    unlinkSync(path.join(data.root,'.template-source/design/design-system-sync.yaml'));
    writeFileSync(path.join(data.root,file),content);
    const css=path.join(data.root,'.template-spec/design/tokens/variables.css');
    writeFileSync(css,readFileSync(css,'utf8').replace('--yss-color-primary-control: #245bdb;','--yss-color-primary-control: #000000;'));
    const bin=path.join(data.root,'fake-bin');
    mkdirSync(bin);
    writeFileSync(path.join(bin,'npx'),'#!/usr/bin/env node\nprocess.stdout.write("{}");\n');
    chmodSync(path.join(bin,'npx'),0o755);
    const before=state(data.root);
    const result=run(data,['export','dtcg','--write-css','--project-root',data.root],{env:{...process.env,PATH:bin+path.delimiter+process.env.PATH}});
    assert.notEqual(result.status,0,file);
    assert.match(result.stderr,/yss-project\.yaml|\.yss\.json/);
    assert.deepEqual(state(data.root),before);
  }
});

test('旧主题完整派生命令明确拒绝且不调用上游或改写项目', t => {
  const data=isolated(t), bin=path.join(data.root,'fake-bin');
  mkdirSync(bin);
  writeFileSync(path.join(bin,'npx'),'#!/usr/bin/env node\nrequire("node:fs").writeFileSync("upstream-ran", "unexpected");\n');
  chmodSync(path.join(bin,'npx'),0o755);
  const before=state(data.root);
  for(const args of [['export','dtcg','--write'],['export','dtcg','--write','--write-css','--write-manifest','--antd-toolchain','missing'],['export','dtcg','--antd-toolchain','missing'],['export','dtcg','--antd-toolchain=missing']]){
    const result=run(data,[...args,'--project-root',data.root],{env:{...process.env,PATH:bin+path.delimiter+process.env.PATH}});
    assert.notEqual(result.status,0,args.join(' '));
    assert.match(result.stderr,/主题.*派生.*已退役/);
    assert.deepEqual(state(data.root),before,args.join(' '));
  }
});

test('写入多份投影中途失败时恢复原文件', t => {
  const data=isolated(t), bin=path.join(data.root,'fake-bin');
  mkdirSync(bin);
  writeFileSync(path.join(bin,'npx'),'#!/usr/bin/env node\nprocess.stdout.write("{}");\n');
  chmodSync(path.join(bin,'npx'),0o755);
  const preload=path.join(data.root,'fail-rename.cjs');
  writeFileSync(preload,`const fs=require('node:fs'); const original=fs.linkSync; fs.linkSync=(a,b)=>{if(String(a).endsWith('/new-1')) throw new Error('simulated rename failure'); return original(a,b)}; require('node:module').syncBuiltinESMExports();`);
  const before=state(data.root);
  const result=run(data,['export','dtcg','--write-css','--write-manifest','--project-root',data.root],{env:{...process.env,NODE_OPTIONS:`--require="${preload}"`,PATH:bin+path.delimiter+process.env.PATH}});
  assert.notEqual(result.status,0);
  assert.match(result.stderr,/simulated rename failure/);
  assert.deepEqual(state(data.root),before);
});

test('回滚时目标被占用则保留新文件与备份', t => {
  const data=isolated(t), bin=path.join(data.root,'fake-bin');
  mkdirSync(bin);
  writeFileSync(path.join(bin,'npx'),'#!/usr/bin/env node\nprocess.stdout.write("{}");\n');
  chmodSync(path.join(bin,'npx'),0o755);
  const manifest=path.join(data.root,'.template-spec/design/tokens/.design-md-projection.json');
  const original=readFileSync(manifest);
  const preload=path.join(data.root,'occupy-rollback.cjs');
  writeFileSync(preload,`const fs=require('node:fs'); const original=fs.linkSync; fs.linkSync=(a,b)=>{if(String(a).endsWith('/new-1')){fs.writeFileSync(b,'new user data'); throw new Error('simulated rename failure')} return original(a,b)}; require('node:module').syncBuiltinESMExports();`);
  const result=run(data,['export','dtcg','--write-css','--write-manifest','--project-root',data.root],{env:{...process.env,NODE_OPTIONS:`--require="${preload}"`,PATH:bin+path.delimiter+process.env.PATH}});
  assert.notEqual(result.status,0);
  assert.match(result.stderr,/回滚未完成/);
  assert.equal(readFileSync(manifest,'utf8'),'new user data');
  const staging=readdirSync(path.dirname(manifest),{withFileTypes:true}).find(entry=>entry.isDirectory() && entry.name.startsWith('.design-md-'))?.name;
  assert.ok(staging);
  assert.deepEqual(readFileSync(path.join(path.dirname(manifest),staging,'old-1')),original);
});

test('并发修改投影时拒绝覆盖并保留用户内容', t => {
  for (const moment of ['read', 'rename', 'old-inode']) {
    const data=isolated(t), bin=path.join(data.root,'fake-bin');
    mkdirSync(bin);
    writeFileSync(path.join(bin,'npx'),'#!/usr/bin/env node\nprocess.stdout.write("{}");\n');
    chmodSync(path.join(bin,'npx'),0o755);
    const css=path.join(data.root,'.template-spec/design/tokens/variables.css');
    const preload=path.join(data.root,`concurrent-${moment}.cjs`);
    const hook = moment === 'read'
      ? `const original=fs.readFileSync; fs.readFileSync=(a,...args)=>{const value=original(a,...args); if(!done && a===target){done=true; fs.writeFileSync(target,'concurrent user change')} return value}`
      : moment === 'rename'
        ? `const original=fs.renameSync; fs.renameSync=(a,b)=>{if(!done && a===target){done=true; fs.writeFileSync(target,'concurrent user change')} return original(a,b)}`
        : `const original=fs.linkSync; fs.linkSync=(a,b)=>{if(!done && String(a).endsWith('/new-0') && b===target){done=true; fs.writeFileSync(require('node:path').join(require('node:path').dirname(a),'old-0'),'concurrent user change')} return original(a,b)}`;
    writeFileSync(preload,`const fs=require('node:fs'); const target=${JSON.stringify(css)}; let done=false; ${hook}; require('node:module').syncBuiltinESMExports();`);
    const result=run(data,['export','dtcg','--write-css','--project-root',data.root],{env:{...process.env,NODE_OPTIONS:`--require="${preload}"`,PATH:bin+path.delimiter+process.env.PATH}});
    assert.notEqual(result.status,0,moment);
    assert.match(result.stderr,/文件发生变化/,moment);
    assert.equal(readFileSync(css,'utf8'),'concurrent user change',moment);
  }
});

test('硬链接不可用时不移动原文件，运行中失败时恢复原文件', t => {
  for (const failAfterProbe of [false, true]) {
    const data=isolated(t), bin=path.join(data.root,'fake-bin');
    mkdirSync(bin);
    writeFileSync(path.join(bin,'npx'),'#!/usr/bin/env node\nprocess.stdout.write("{}");\n');
    chmodSync(path.join(bin,'npx'),0o755);
    const preload=path.join(data.root,'no-links.cjs');
    writeFileSync(preload,`const fs=require('node:fs'); const original=fs.linkSync; let count=0; fs.linkSync=(a,b)=>{if(++count>${failAfterProbe ? 1 : 0}){const e=new Error('simulated EPERM'); e.code='EPERM'; throw e} return original(a,b)}; require('node:module').syncBuiltinESMExports();`);
    const before=state(data.root);
    const result=run(data,['export','dtcg','--write-css','--write-manifest','--project-root',data.root],{env:{...process.env,NODE_OPTIONS:`--require="${preload}"`,PATH:bin+path.delimiter+process.env.PATH}});
    assert.notEqual(result.status,0,String(failAfterProbe));
    assert.match(result.stderr,/simulated EPERM/);
    assert.deepEqual(state(data.root),before,String(failAfterProbe));
  }
});

test('硬链接和回滚复制均失败时保留原文件备份', t => {
  const data=isolated(t), bin=path.join(data.root,'fake-bin');
  mkdirSync(bin);
  writeFileSync(path.join(bin,'npx'),'#!/usr/bin/env node\nprocess.stdout.write("{}");\n');
  chmodSync(path.join(bin,'npx'),0o755);
  const css=path.join(data.root,'.template-spec/design/tokens/variables.css');
  const original=readFileSync(css);
  const preload=path.join(data.root,'fail-restore.cjs');
  writeFileSync(preload,`const fs=require('node:fs'); const link=fs.linkSync; let count=0; fs.linkSync=(a,b)=>{if(++count>1) throw new Error('link failed'); return link(a,b)}; fs.copyFileSync=()=>{throw new Error('copy failed')}; require('node:module').syncBuiltinESMExports();`);
  const result=run(data,['export','dtcg','--write-css','--project-root',data.root],{env:{...process.env,NODE_OPTIONS:`--require="${preload}"`,PATH:bin+path.delimiter+process.env.PATH}});
  assert.notEqual(result.status,0);
  assert.match(result.stderr,/回滚未完成/);
  const staging=readdirSync(path.dirname(css),{withFileTypes:true}).find(entry=>entry.isDirectory() && entry.name.startsWith('.design-md-'))?.name;
  assert.ok(staging);
  assert.deepEqual(readFileSync(path.join(path.dirname(css),staging,'old-0')),original);
});

test('生成摘要缺少投影输入时不写入 CSS', t => {
  const data=isolated(t), bin=path.join(data.root,'fake-bin');
  mkdirSync(bin);
  writeFileSync(path.join(bin,'npx'),'#!/usr/bin/env node\nprocess.stdout.write("{}");\n');
  chmodSync(path.join(bin,'npx'),0o755);
  const css=path.join(data.root,'.template-spec/design/tokens/variables.css');
  writeFileSync(css,readFileSync(css,'utf8').replace('--yss-color-primary-control: #245bdb;','--yss-color-primary-control: #000000;'));
  unlinkSync(path.join(data.root,'.template-spec/design/tokens/tokens.dark.json'));
  const before=state(data.root);
  const result=run(data,['export','dtcg','--write-css','--write-manifest','--project-root',data.root],{env:{...process.env,PATH:bin+path.delimiter+process.env.PATH}});
  assert.notEqual(result.status,0);
  assert.deepEqual(state(data.root),before);
});

test('项目实例自定义 DESIGN 不受模板源同步摘要约束', t => {
  for (const mode of ['governed', 'skills', 'backend-skills']) {
    const data=isolated(t);
    if (mode==='governed') writeFileSync(path.join(data.root,'yss-project.yaml'),'schema_version: 2\nrepository_mode: project-instance\n');
    else writeFileSync(path.join(data.root,'.yss.json'),JSON.stringify({schemaVersion:5,profile:mode==='skills'?'spec':'backend',profileId:mode==='skills'?'harness.spec-template':'harness.backend-delivery',distribution:{installation:'skills',mode:'skills'}}));
    const design=path.join(data.root,'DESIGN.md');
    writeFileSync(design,readFileSync(design,'utf8')+'\n<!-- project customization -->\n');
    const before=state(data.root),result=run(data,['export','dtcg']);
    assert.equal(result.status,0,`${mode}: ${result.stderr}`);
    assert.ok(result.stdout.trim());
    assert.deepEqual(state(data.root),before,'只读导出不得改写项目文件');
  }
});

test('模板源仍校验同步摘要且不从非法身份推断实例', t => {
  for (const manifest of ['schema_version: 1\nrepository_mode: template-source\n', 'schema_version: 999\nrepository_mode: project-instance\n']) {
    const data=isolated(t);
    writeFileSync(path.join(data.root,'yss-project.yaml'),manifest);
    const sync=path.join(data.root,'.template-source/design/design-system-sync.yaml');
    writeFileSync(sync,readFileSync(sync,'utf8').replace(/baseline_sha256: [a-f0-9]+/,'baseline_sha256: '+'0'.repeat(64)));
    const result=run(data,['export','dtcg']);
    assert.equal(result.status,1);
    assert.match(result.stderr, manifest.includes('999') ? /yss-project.yaml/ : /baseline_sha256/);
  }
  const native=isolated(t);
  writeFileSync(path.join(native.root,'.yss.json'),'{"schemaVersion":5,"profile":"spec","distribution":{"installation":"skills"}}');
  const result=run(native,['export','dtcg']);
  assert.equal(result.status,1);
  assert.match(result.stderr,/\.yss\.json/);
});

test('canonical导入无副作用，空格路径下lint/diff/export/drift保持只读',t=>{
  const data=isolated(t),before=state(data.root);
  for(const extra of [[],['not-a-file'],['DESIGN.md'],[data.file]]) {
    const imported=spawnSync(process.execPath,['--input-type=module','-e',`await import(${JSON.stringify(new URL('file://'+data.file).href)})`,...extra],{cwd:data.root,encoding:'utf8'});
    assert.equal(imported.status,0,imported.stderr);assert.equal(imported.stdout,'');assert.equal(imported.stderr,'');
  }
  for(const args of [['lint','DESIGN.md'],['diff','DESIGN.md','DESIGN.md'],['export','dtcg'],['drift']]){const r=run(data,args);assert.equal(r.status,0,r.stderr);assert.ok(r.stdout.trim(),args.join(' ')+' must actually execute');assert.deepEqual(state(data.root),before);}
});

test('CSS角色导出保留现有主题快照并更新摘要',t=>{
  const data=isolated(t),bin=path.join(data.root,'fake-bin');
  mkdirSync(bin);
  writeFileSync(path.join(bin,'npx'),'#!/usr/bin/env node\nprocess.stdout.write("{}");\n');
  chmodSync(path.join(bin,'npx'),0o755);
  const before=state(data.root);
  const r=run(data,['export','dtcg','--write-css','--write-manifest'],{env:{...process.env,PATH:bin+path.delimiter+process.env.PATH}});
  assert.equal(r.status,0,r.stderr);
  const after=state(data.root);
  for(const name of ['theme.json','tokens.default.json','tokens.dark.json','tokens.compact.json','variables.dark.css'])assert.equal(after['.template-spec/design/tokens/'+name],before['.template-spec/design/tokens/'+name]);
  assert.equal(run(data,['drift']).status,0);
});

test('悬空token、同步摘要错、投影漂移与缺依赖不能放行',t=>{
  for(const kind of ['token','sync','projection','dependency']){
    const data=isolated(t);let args=['drift'];
    if(kind==='token'){const f=path.join(data.root,'DESIGN.md');writeFileSync(f,readFileSync(f,'utf8').replace('{colors.primary}','{colors.absent}'));}
    if(kind==='sync'){const f=path.join(data.root,'.template-source/design/design-system-sync.yaml');writeFileSync(f,readFileSync(f,'utf8').replace(/baseline_sha256: [a-f0-9]+/,'baseline_sha256: '+ '0'.repeat(64)));}
    if(kind==='projection'){const f=path.join(data.root,'.template-spec/design/tokens/variables.css');writeFileSync(f,readFileSync(f,'utf8')+'\n/* drift */');}
    if(kind==='dependency')unlinkSync(path.join(data.root,'.agents/skills/yss-design-system/scripts/vendor/yaml.mjs'));
    const r=run(data,args);assert.equal(r.status,1,kind+': '+r.stderr);
    const diagnostic={token:/悬空 token/,sync:/baseline_sha256/,projection:/派生文件漂移/,dependency:/ERR_MODULE_NOT_FOUND/}[kind];assert.match(r.stderr,diagnostic);
  }
  const missing=isolated(t),r=run(missing,['lint'],{env:{...process.env,PATH:missing.root}});assert.equal(r.status,1);assert.match(r.stderr,/design.md CLI 执行失败/);
});
