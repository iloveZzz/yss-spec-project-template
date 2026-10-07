import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {createArtifactCoordinator,sourceTuple,validateArtifact,installedTreeDigest,produceCliArtifact,prepareCliSourceConsumer,validateCliSourceConsumer,verifyInstalledCliMigration} from '../.template-source/scripts/lib/verification-artifacts.mjs';
import {NATIVE_PROFILES,nativeBinary,nativeDigest as hash,inspectNative,runNative} from '../.template-source/scripts/lib/native-yss.mjs';
const temporary=t=>{const dir=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'native-artifacts-')));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));return dir;};
const source=(binarySha)=>({namespace:'candidate-release',family:'spec',cli_commit:'1'.repeat(40),template_commit:'2'.repeat(40),core_commit:'3'.repeat(40),package_name:'yss',version:'1.0.0-alpha.3',template_version:'git:'+'2'.repeat(40),source_contract_version:2,protocol_version:1,snapshot_hash:'4'.repeat(64),manifest_hash:'5'.repeat(64),bundle_hash:'6'.repeat(64),binary_sha256:binarySha});

test('同轮精确来源只生产一次，plugin-pinned 与候选产物分槽',t=>{
 const directory=temporary(t),tarball=path.join(directory,'yss');fs.writeFileSync(tarball,'exact binary bytes');const tuple=source(hash(fs.readFileSync(tarball)));let count=0;
 const coordinator=createArtifactCoordinator({produce:expected=>{count++;return {source_tuple:expected,tarball,tarball_sha256:tuple.binary_sha256};}});
 const a=coordinator.acquire(tuple);assert.equal(coordinator.acquire({...tuple}),a);assert.equal(count,1);coordinator.acquire({...tuple,namespace:'plugin-pinned'});assert.equal(count,2);
 assert.throws(()=>validateArtifact(a,{...tuple,template_commit:'7'.repeat(40)}),/来源/);
 fs.writeFileSync(tarball,'changed');assert.throws(()=>validateArtifact(a,tuple),/摘要/);
 assert.throws(()=>sourceTuple({...tuple,core_commit:'HEAD'}),/完整/);assert.throws(()=>sourceTuple({...tuple,protocol_version:2}),/协议/);assert.throws(()=>sourceTuple({...tuple,bundle_hash:undefined}),/bundle_hash/);
});

test('已安装 bin/runtime 字节、类型和权限污染不能复用',t=>{
 const directory=temporary(t),installed=path.join(directory,'installed');fs.mkdirSync(path.join(installed,'bundle'),{recursive:true});const binary=path.join(installed,'yss');fs.writeFileSync(binary,'fixed binary',{mode:0o755});
 const tuple=source(hash(fs.readFileSync(binary))),bundle_manifest=path.join(installed,'bundle/.yss-bundle.json');fs.writeFileSync(bundle_manifest,JSON.stringify({schemaVersion:2,profile:tuple.family,templateVersion:tuple.template_version,templateCommit:tuple.template_commit,sourceSnapshotHash:tuple.snapshot_hash,manifestHash:tuple.manifest_hash,bundleHash:tuple.bundle_hash}));
 fs.writeFileSync(path.join(installed,'bundle/runtime.mjs'),'fixed retained governance tool',{mode:0o644});const tarball=path.join(directory,'release-yss');fs.copyFileSync(binary,tarball);
 const artifact={source_tuple:tuple,tarball,tarball_sha256:tuple.binary_sha256,installed_root:installed,binary,bundle_manifest,installed_tree_sha256:installedTreeDigest(installed)};
 const supportedManifest=JSON.parse(fs.readFileSync(bundle_manifest));
 for(const schemaVersion of [2,3,1,4,2.5,'3']){
  fs.writeFileSync(bundle_manifest,JSON.stringify({...supportedManifest,schemaVersion}));artifact.installed_tree_sha256=installedTreeDigest(installed);
  if([2,3].includes(schemaVersion))validateArtifact(artifact,tuple);else assert.throws(()=>validateArtifact(artifact,tuple),/Bundle 来源/);
 }
 fs.writeFileSync(bundle_manifest,JSON.stringify(supportedManifest));artifact.installed_tree_sha256=installedTreeDigest(installed);
 validateArtifact(artifact,tuple);const original=fs.readFileSync(binary);fs.writeFileSync(binary,'polluted runtime');assert.throws(()=>validateArtifact(artifact,tuple),/安装树/);fs.writeFileSync(binary,original);fs.chmodSync(binary,0o644);assert.throws(()=>validateArtifact(artifact,tuple),/安装树/);fs.chmodSync(binary,0o755);
 const manifest=fs.readFileSync(bundle_manifest);fs.writeFileSync(bundle_manifest,JSON.stringify({profile:'backend'}));artifact.installed_tree_sha256=installedTreeDigest(installed);assert.throws(()=>validateArtifact(artifact,tuple),/Bundle 来源/);fs.writeFileSync(bundle_manifest,manifest);artifact.installed_tree_sha256=installedTreeDigest(installed);
 fs.rmSync(binary);fs.mkdirSync(binary);assert.throws(()=>validateArtifact(artifact,tuple),/安装树/);
});

test('固定原生消费保留完整 Bundle 并绑定二进制 bytes，旧私有源码接口明确拒绝',t=>{
 const base=temporary(t),root=path.join(base,'source');fs.mkdirSync(root);const pinned=nativeBinary(),inspection=inspectNative('spec'),version=runNative(['version']).result;
 const tuple={...source(pinned.digest),version:version.version,template_version:inspection.templateVersion,template_commit:inspection.templateCommit,snapshot_hash:inspection.sourceSnapshotHash,manifest_hash:inspection.manifestHash,bundle_hash:inspection.bundleHash};
 const commands=[],run=(file,args,cwd,env)=>{commands.push({file,args,cwd});const result=spawnSync(file,args,{cwd,env,encoding:'utf8',maxBuffer:128*1024*1024});assert.equal(result.status,0,result.stderr);return result;};
 const artifact=produceCliArtifact({root,source:tuple,directory:path.join(base,'artifact'),run});validateArtifact(artifact,tuple);assert.equal(commands.length,1);assert.equal(commands[0].file,artifact.binary);assert.deepEqual(commands[0].args.slice(0,2),['bundle','export']);assert.ok(fs.existsSync(path.join(artifact.installed_root,'bundle/scripts/runtime-store')));assert.ok(!commands.some(row=>row.file==='npm'));
 assert.throws(()=>prepareCliSourceConsumer({}),/RETIRED_SOURCE_CONSUMER/);assert.throws(()=>validateCliSourceConsumer({}),/RETIRED_SOURCE_CONSUMER/);
 fs.writeFileSync(path.join(artifact.installed_root,'bundle/scripts/runtime-store'),'tampered governance tool');assert.throws(()=>validateArtifact(artifact,tuple),/安装树/);
});

test('四 Profile 真实原生受管升级执行非空事务、重新规划幂等并整体回退',t=>{
 const base=temporary(t),root=path.join(base,'source');fs.mkdirSync(root);const pinned=nativeBinary(),version=runNative(['version']).result;
 for(const family of NATIVE_PROFILES){
  const inspection=inspectNative(family),tuple={...source(pinned.digest),family,version:version.version,template_version:inspection.templateVersion,cli_commit:version.cliCommit,template_commit:inspection.templateCommit,snapshot_hash:inspection.sourceSnapshotHash,manifest_hash:inspection.manifestHash,bundle_hash:inspection.bundleHash};
  const commands=[],run=(file,args,cwd,env)=>{commands.push({file,args,cwd});return spawnSync(file,args,{cwd,env,encoding:'utf8',maxBuffer:128*1024*1024});};
  const artifact=produceCliArtifact({root,source:tuple,directory:path.join(base,family,'artifact'),run});
  const result=verifyInstalledCliMigration({artifact,directory:path.join(base,family,'upgrade'),run});
  assert.equal(result.status,'passed');assert.equal(result.migration_fixture,'native-managed-upgrade');assert.equal(result.historical_recovery,'separate-required-gate');
  for(const action of ['plan','apply','rollback'])assert.ok(commands.some(row=>row.file===artifact.binary&&row.args[0]==='migrate'&&row.args[1]===action),`${family}: ${action}`);
  assert.equal(commands.filter(row=>row.args[0]==='migrate'&&row.args[1]==='plan').length,2);
 }
});
