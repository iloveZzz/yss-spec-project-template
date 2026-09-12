import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {verifyCore} from '../build.mjs';
import {loadBundle} from '../bundle.mjs';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
export function packageContract(root) {
 const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json')));
 const family=JSON.parse(fs.readFileSync(path.join(root,'config/family.json')));
 const entry=path.join(root,'bin',pkg.name+'.js');
 test(`${family.side}: 真实包初始化、接入、诊断、只读、同步和家族边界`,t=>{
  const scratch=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'harness-package-')));
  t.after(()=>fs.rmSync(scratch,{recursive:true,force:true}));
  const target=path.join(scratch,'project');
  const run=(command,args=[],destination=target)=>{
   const r=spawnSync(process.execPath,[entry,command,'--target-dir',destination,...args,'--json'],{encoding:'utf8',timeout:300000,maxBuffer:32*1024*1024});
   let data;try{data=JSON.parse(r.stdout);}catch{}
   return {...r,data};
  };
  const success=r=>{assert.equal(r.status,0,r.stderr || r.error?.message);assert.ok(r.data);return r.data;};
  const init=['--project-name','验收项目','--business-domain','通用 CLI'];
  const inputs=['template.snapshot.json','template.manifest.json','cli-core.lock.json'].map(p=>hash(fs.readFileSync(path.join(root,p))));
  verifyCore(root);loadBundle(root);
  success(run('init',[...init,'--dry-run']));assert.equal(fs.existsSync(target),false);
  success(run('init',init));
  const readme=path.join(target,'README.md'),context=path.join(target,'CONTEXT.md'),metadata=path.join(target,family.metadataFile);
  fs.writeFileSync(readme,'# 用户文档\n');
  const contextBefore=fs.readFileSync(context);
  let before=fs.readFileSync(metadata);const journalCount=()=>fs.readdirSync(path.join(target,'.yss-harness-state',family.side,'transactions')).length;
  const count=journalCount();
  for(const command of ['doctor','diff','recover']) success(run(command));
  success(run('sync',['--plan','--prune']));
  assert.deepEqual(fs.readFileSync(metadata),before);assert.equal(journalCount(),count);
  success(run('sync',['--apply','--prune']));
  assert.equal(fs.readFileSync(readme,'utf8'),'# 用户文档\n');assert.deepEqual(fs.readFileSync(context),contextBefore);
  before=fs.readFileSync(metadata);success(run('sync',['--apply']));assert.deepEqual(fs.readFileSync(metadata),before);
  if(family.side==='design') {
   const modern=JSON.parse(fs.readFileSync(metadata));
   const legacy={metadataSchemaVersion:1,templateName:family.templateName,templateSource:family.templateSource,profileId:family.profileId,templateCommit:modern.templateCommit,templateSourceState:modern.templateSourceState,snapshotHash:modern.snapshotHash,managedFilesManifestVersion:modern.manifestHash,cliVersion:'0.5.2',variables:modern.variables,initializedAt:modern.initializedAt,managedFiles:Object.fromEntries(Object.entries(modern.managedFiles).map(([p,r])=>[p,{type:'copy',contentHash:r.baseline.digest}]))};
   fs.writeFileSync(path.join(target,'scripts/instantiate-harness'),'historical creator');legacy.managedFiles['scripts/instantiate-harness']={type:'copy',contentHash:hash('historical creator')};
   const legacyBytes=Buffer.from(JSON.stringify(legacy,null,2)+'\n');fs.writeFileSync(metadata,legacyBytes);
   assert.equal(success(run('diff')).migrationRequired,true);success(run('doctor'));assert.deepEqual(fs.readFileSync(metadata),legacyBytes);
   // Crash just after replacing metadata: recovery must still understand v1 before/v2 after.
   const hook=path.join(scratch,'crash.mjs');fs.writeFileSync(hook,`import fs from 'node:fs';import {syncBuiltinESMExports} from 'node:module'; const rename=fs.renameSync;fs.renameSync=(a,b)=>{rename(a,b);if(String(b)===${JSON.stringify(metadata)})process.exit(73);};syncBuiltinESMExports();`);
   const crashed=spawnSync(process.execPath,['--import',hook,entry,'sync','--target-dir',target,'--apply','--json'],{encoding:'utf8',timeout:300000});assert.equal(crashed.status,73,crashed.stderr);
   success(run('recover'));success(run('recover',['--apply']));assert.deepEqual(fs.readFileSync(metadata),legacyBytes);
   success(run('sync',['--apply']));assert.equal(JSON.parse(fs.readFileSync(metadata)).metadataSchemaVersion,2);assert.equal(fs.readFileSync(path.join(target,'scripts/instantiate-harness'),'utf8'),'historical creator');
   assert.deepEqual(fs.readFileSync(context),contextBefore);
  }
  const existing=path.join(scratch,'existing');fs.mkdirSync(path.join(existing,'src'),{recursive:true});
  const userFiles={'README.md':'# existing\n','.gitignore':'private-local-rule\n','src/Main.java':'class Main {}\n','pom.xml':'<project/>\n','approved.yaml':'decision: approved\n'};
  for(const [p,bytes]of Object.entries(userFiles))fs.writeFileSync(path.join(existing,p),bytes);
  success(run('attach',[],existing));assert.equal(fs.existsSync(path.join(existing,'.yss-harness-state')),false);
  success(run('attach',['--apply'],existing));success(run('doctor',[],existing));
  for(const [p,bytes] of Object.entries(userFiles))assert.ok(p==='.gitignore'?fs.readFileSync(path.join(existing,p),'utf8').startsWith(bytes):fs.readFileSync(path.join(existing,p),'utf8')===bytes,p);
  for(const foreign of ['.yss-template.json','.yss-harness-dev.json',...['design','backend','frontend'].filter(x=>x!==family.side).map(x=>`.yss-harness-${x}.json`)]) {
   const dir=path.join(scratch,foreign.slice(1));fs.mkdirSync(dir);fs.writeFileSync(path.join(dir,foreign),'{}');
   for(const args of [[],['--apply','--force']]) assert.equal(run('attach',args,dir).status,1);
   assert.deepEqual(fs.readdirSync(dir),[foreign]);
  }
  assert.equal(run('init',[...init,'--force']).status,1);
  for(const command of ['doctor','diff'])assert.equal(run(command,['--apply']).status,1);
  assert.deepEqual(['template.snapshot.json','template.manifest.json','cli-core.lock.json'].map(p=>hash(fs.readFileSync(path.join(root,p)))),inputs);
 });
}
