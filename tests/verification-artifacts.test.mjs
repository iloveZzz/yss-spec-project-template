import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {createArtifactCoordinator, sourceTuple, validateArtifact,installedTreeDigest} from '../.template-source/scripts/lib/verification-artifacts.mjs';
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
