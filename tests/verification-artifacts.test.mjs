import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {createArtifactCoordinator, sourceTuple, validateArtifact,installedTreeDigest,prepareCliSourceConsumer,validateCliSourceConsumer} from '../.template-source/scripts/lib/verification-artifacts.mjs';
import {spawnSync} from 'node:child_process';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
test('同轮精确来源只生产一次，plugin-pinned 与候选产物分槽',t=>{
 const directory=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'artifact-tuple-')));t.after(()=>fs.rmSync(directory,{recursive:true,force:true}));
 const source={namespace:'candidate-release',family:'spec',cli_commit:'1'.repeat(40),template_commit:'2'.repeat(40),core_commit:'3'.repeat(40),package_name:'create-yss-spec',version:'1.0.0'};
 const tarball=path.join(directory,'package.tgz');fs.writeFileSync(tarball,'exact package bytes');let count=0;
 const coordinator=createArtifactCoordinator({produce:tuple=>{count++;return {source_tuple:tuple,tarball,tarball_sha256:hash(fs.readFileSync(tarball))};}});
 const a=coordinator.acquire(source);assert.equal(coordinator.acquire({...source}),a);assert.equal(count,1);
 coordinator.acquire({...source,namespace:'plugin-pinned'});assert.equal(count,2);
 assert.throws(()=>validateArtifact(a,{...source,template_commit:'4'.repeat(40)}),/来源/);
 fs.writeFileSync(tarball,'changed');assert.throws(()=>validateArtifact(a,source),/摘要/);
 assert.throws(()=>sourceTuple({...source,core_commit:'HEAD'}),/完整/);
});

test('已安装 bin/runtime 字节、类型和权限污染不能复用',t=>{
 const directory=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'installed-tree-')));t.after(()=>fs.rmSync(directory,{recursive:true,force:true}));
 const source={namespace:'candidate-release',family:'spec',cli_commit:'1'.repeat(40),template_commit:'2'.repeat(40),core_commit:'3'.repeat(40),package_name:'create-yss-spec',version:'1.0.0'},installed=path.join(directory,'installed');fs.mkdirSync(path.join(installed,'bin'),{recursive:true});
 fs.writeFileSync(path.join(installed,'package.json'),JSON.stringify({name:source.package_name,version:source.version}));
 for(const [file,data] of [['template.snapshot.json',{sourceState:'committed',templateCommit:source.template_commit,requestedRef:source.template_commit}],['cli-core.lock.json',{sourceState:'committed',sourceRevision:source.core_commit}]])fs.writeFileSync(path.join(installed,file),JSON.stringify(data));
 const bin=path.join(installed,'bin/create-yss-spec.js');fs.writeFileSync(bin,'real entry',{mode:0o755});
 const tarball=path.join(directory,'package.tgz');fs.writeFileSync(tarball,'fixed packed bytes');
 const artifact={source_tuple:source,tarball,tarball_sha256:hash(fs.readFileSync(tarball)),installed_root:installed,snapshot_sha256:hash(fs.readFileSync(path.join(installed,'template.snapshot.json'))),core_lock_sha256:hash(fs.readFileSync(path.join(installed,'cli-core.lock.json'))),installed_tree_sha256:installedTreeDigest(installed)};
 validateArtifact(artifact,source);artifact.source_tuple={...source,snapshot_hash:'0'.repeat(64)};assert.throws(()=>validateArtifact(artifact,source),/材料摘要/);artifact.source_tuple=source;
 fs.writeFileSync(bin,'polluted runtime');assert.throws(()=>validateArtifact(artifact,source),/安装树/);
 fs.writeFileSync(bin,'real entry');fs.chmodSync(bin,0o644);assert.throws(()=>validateArtifact(artifact,source),/安装树/);
 fs.chmodSync(bin,0o755);fs.rmSync(bin);fs.mkdirSync(bin);assert.throws(()=>validateArtifact(artifact,source),/安装树/);
});

test('固定源码消费保留原 tests/scripts 并绑定精确安装材料，污染与错配不能复用',t=>{
 const base=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'source-consumer-')));t.after(()=>fs.rmSync(base,{recursive:true,force:true}));
 const root=path.join(base,'source'),cli=path.join(root,'submodules/create-yss-spec');fs.mkdirSync(cli,{recursive:true});
 const commands=[],run=(file,args,cwd)=>{commands.push({file,args,cwd});const result=spawnSync(file,args,{cwd,encoding:'utf8'});assert.equal(result.status,0,result.stderr);return result;};
 run('git',['init','-q'],root);run('git',['init','-q'],cli);
 const put=(ref,bytes,mode=0o644)=>{fs.mkdirSync(path.dirname(path.join(cli,ref)),{recursive:true});fs.writeFileSync(path.join(cli,ref),bytes,{mode});};
 put('package.json',JSON.stringify({name:'create-yss-spec',version:'1.0.0'}));put('bin/create-yss-spec.js','fixed public entry',0o755);put('scripts/sync-template.js','fixed source script');put('tests/sync-fast-smoke.test.js',`const fs=require('fs'),path=require('path'),assert=require('assert');assert.equal(JSON.parse(fs.readFileSync(path.join(__dirname,'../template.snapshot.json'))).sourceState,'committed');`);
 run('git',['add','.'],cli);run('git',['-c','user.name=fixture','-c','user.email=fixture@example.invalid','commit','-qm','fixed CLI'],cli);const cliCommit=run('git',['rev-parse','HEAD'],cli).stdout.trim();
 run('git',['add','.'],root);run('git',['-c','user.name=fixture','-c','user.email=fixture@example.invalid','commit','-qm','fixed source'],root);const commit=run('git',['rev-parse','HEAD'],root).stdout.trim();
 const source={namespace:'candidate-release',family:'spec',cli_commit:cliCommit,template_commit:commit,core_commit:commit,package_name:'create-yss-spec',version:'1.0.0'},installed=path.join(base,'installed');fs.mkdirSync(installed);
 for(const ref of ['package.json','bin/create-yss-spec.js']){fs.mkdirSync(path.dirname(path.join(installed,ref)),{recursive:true});fs.copyFileSync(path.join(cli,ref),path.join(installed,ref));}
 fs.writeFileSync(path.join(installed,'template.snapshot.json'),JSON.stringify({sourceState:'committed',templateCommit:commit,requestedRef:commit}));fs.writeFileSync(path.join(installed,'cli-core.lock.json'),JSON.stringify({sourceState:'committed',sourceRevision:commit}));const tarball=path.join(base,'package.tgz');fs.writeFileSync(tarball,'exact package');
 const artifact={source_tuple:source,tarball,tarball_sha256:hash(fs.readFileSync(tarball)),installed_root:installed,snapshot_sha256:hash(fs.readFileSync(path.join(installed,'template.snapshot.json'))),core_lock_sha256:hash(fs.readFileSync(path.join(installed,'cli-core.lock.json'))),installed_tree_sha256:installedTreeDigest(installed)},directory=path.join(base,'consumer');
 const receipt=prepareCliSourceConsumer({root,source,artifact,directory,run}),validate=value=>validateCliSourceConsumer(value,{root,expectedSource:source,directory,artifact});assert.equal(validate(receipt).consumer_root,directory);
 assert.equal(fs.existsSync(path.join(installed,'tests')),false);assert.equal(fs.existsSync(path.join(directory,'scripts/sync-template.js')),true);assert.equal(commands.filter(row=>row.file==='npm').length,0);
 run(process.execPath,['--test','--test-concurrency=1',path.join(directory,'tests/sync-fast-smoke.test.js')],directory);validate(receipt);
 const testFile=path.join(directory,'tests/sync-fast-smoke.test.js'),bytes=fs.readFileSync(testFile);fs.writeFileSync(testFile,'process.exit(0)');const forged={...receipt,source_tree_sha256:installedTreeDigest(directory)};assert.throws(()=>validate(forged),/原字节/);fs.writeFileSync(testFile,bytes);
 fs.chmodSync(testFile,0o755);assert.throws(()=>validate({...receipt,source_tree_sha256:installedTreeDigest(directory)}),/权限/);fs.chmodSync(testFile,0o644);
 fs.writeFileSync(path.join(directory,'template.snapshot.json'),'fake material');assert.throws(()=>validate({...receipt,source_tree_sha256:installedTreeDigest(directory)}),/安装覆盖/);fs.copyFileSync(path.join(installed,'template.snapshot.json'),path.join(directory,'template.snapshot.json'));
 assert.throws(()=>validate({...receipt,test_files:{'tests/sync-fast-smoke.test.js':'0'.repeat(64)}}),/原测试摘要/);assert.throws(()=>validateCliSourceConsumer(receipt,{root,expectedSource:{...source,cli_commit:'0'.repeat(40)},directory,artifact}),/来源/);validate(receipt);
});
