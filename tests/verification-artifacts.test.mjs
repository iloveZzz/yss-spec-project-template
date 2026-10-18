import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {collectReleaseSources,createArtifactCoordinator,sourceTuple,validateArtifact,installedTreeDigest,produceCliArtifact,prepareCliSourceConsumer,validateCliSourceConsumer,verifyInstalledCliMigration} from '../.template-source/scripts/lib/verification-artifacts.mjs';
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
 for(const schemaVersion of [2,3,4,1,5,2.5,'3']){
  fs.writeFileSync(bundle_manifest,JSON.stringify({...supportedManifest,schemaVersion}));artifact.installed_tree_sha256=installedTreeDigest(installed);
  if([2,3,4].includes(schemaVersion))validateArtifact(artifact,tuple);else assert.throws(()=>validateArtifact(artifact,tuple),/Bundle 来源/);
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
  assert.equal(result.status,'passed');assert.equal(result.migration_fixture,'native-managed-upgrade');
  // yss 2.3 起没有 migrate：升级是 sync 的计划与应用，回退是 rollback --apply。
  const sync=commands.filter(row=>row.file===artifact.binary&&row.args[0]==='sync');
  assert.ok(sync.some(row=>row.args.includes('--apply')),`${family}: sync apply`);
  assert.ok(commands.some(row=>row.file===artifact.binary&&row.args[0]==='rollback'&&row.args.includes('--apply')),`${family}: rollback`);
  assert.ok(!commands.some(row=>row.args[0]==='migrate'),`${family}: migrate 已移除`);
 }
});


test('发行来源收集：固定二进制与源码提交必须与固定文件一致，不要求 Bundle 绑定本次模板，也不接受装配输入',t=>{
 // Synthetic Go producer/assembler exercise this adapter only. They do not
 // supply native acceptance or replace the real tools/package validator.
 const base=temporary(t),cli=path.join(base,'cli'),root=path.join(base,'template'),evidence=path.join(base,'source-evidence');fs.mkdirSync(cli);fs.mkdirSync(root);
 const git=(cwd,...args)=>{const r=spawnSync('git',args,{cwd,encoding:'utf8'});assert.equal(r.status,0,r.stderr);return r.stdout.trim();};
 const put=(cwd,ref,bytes)=>{const file=path.join(cwd,ref);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,bytes);return file;};
 const commit=cwd=>{git(cwd,'add','.');git(cwd,'-c','user.name=source fixture','-c','user.email=fixture@example.invalid','commit','-qm','source fixture');return git(cwd,'rev-parse','HEAD');};
 for(const cwd of [cli,root])git(cwd,'init','-q');
 put(cli,'go.mod','module github.com/iloveZzz/yss-cli\n\ngo 1.27.1\n');
 put(cli,'main.go',fs.readFileSync(new URL('../.template-source/scripts/tests/fixtures/native-release.go',import.meta.url)));
 put(cli,'tools/package/main.go',`package main
import("archive/tar";"compress/gzip";"crypto/sha256";"encoding/json";"fmt";"os";"path/filepath";"sort";"strings")
func main(){if len(os.Args)!=6||os.Args[1]!="--native-manifest"||os.Args[3]!="--required-platforms"{panic("wrong assembler invocation")};if os.Getenv("GOFLAGS")!=""||os.Getenv("GOWORK")!="off"{panic("unfixed Go environment")};raw,e:=os.ReadFile(os.Args[2]);if e!=nil{panic(e)};var v map[string]any;if e=json.Unmarshal(raw,&v);e!=nil{panic(e)};if v["fixtureFail"]==true{panic("synthetic assembler refusal")};out:=os.Args[5];if e=os.Mkdir(out,0700);e!=nil{panic(e)};platforms:=strings.Split(os.Args[4],",");sort.Strings(platforms);manifest:=v["fixtureManifest"];b,_:=json.Marshal(manifest);archive:="fixture.tar.gz";f,e:=os.Create(filepath.Join(out,archive));if e!=nil{panic(e)};g:=gzip.NewWriter(f);w:=tar.NewWriter(g);w.WriteHeader(&tar.Header{Name:"release-manifest.json",Mode:0644,Size:int64(len(b))});w.Write(b);w.Close();g.Close();f.Close();a,_:=os.ReadFile(filepath.Join(out,archive));m:=manifest.(map[string]any);proof:=map[string]any{"schemaVersion":2,"version":v["cliVersion"],"cliCommit":v["cliCommit"],"sourceState":"committed","stableReady":true,"qualificationScope":"local-platform-impacted-consumers","inputManifestSha256":fmt.Sprintf("%x",sha256.Sum256(raw)),"sourceLockSha256":v["sourceLockSha256"],"requiredPlatforms":platforms,"pending":[]string{},"artifacts":[]any{map[string]any{"platform":m["platform"],"archive":archive,"sha256":fmt.Sprintf("%x",sha256.Sum256(a)),"binarySha256":m["binarySha256"]}}};b,_=json.Marshal(proof);os.WriteFile(filepath.Join(out,"checksums.json"),b,0600);if v["fixtureDrift"]==true{os.WriteFile(os.Args[2],append(raw,' '),0600)}}`);
 const cliCommit=commit(cli),pinCommit='f'.repeat(40),platform=`${process.platform==='win32'?'windows':process.platform}/${process.arch==='x64'?'amd64':process.arch}`;
 put(root,'.template-source/distribution/yss-cli-pin.json',JSON.stringify({schema_version:1,repository:'https://example.test/yss-cli.git',version:'1.3.5',commit:pinCommit,go_version:'1.27.1',build:'go build',binaries:{[platform.replace('/','-')]:{sha256:'0'.repeat(64)}}}));
 const templateCommit=commit(root),binary=path.join(base,'yss-fixture'),built=spawnSync('go',['build','-trimpath','-ldflags',`-X main.cliCommit=${cliCommit} -X main.templateCommit=${templateCommit} -X main.designCommit=${templateCommit} -X main.backendCommit=${templateCommit}`,'-o',binary,'.'],{cwd:cli,env:{...process.env,CGO_ENABLED:'0'},encoding:'utf8'});assert.equal(built.status,0,built.stderr);
 const environment={...process.env,YSS_NATIVE_BINARY:binary,YSS_NATIVE_BINARY_SHA256:hash(fs.readFileSync(binary)),YSS_NATIVE_SOURCE_ROOT:cli};delete environment.YSS_NATIVE_BINARY_OVERRIDE;
 for(const key of Object.keys(environment))if(key.startsWith('YSS_RELEASE_'))delete environment[key];
 assert.throws(()=>collectReleaseSources({root,commit:templateCommit,environment}),/与固定版本不符/,'没有装配证据不能越过 P');
 const pinFile=path.join(root,'.template-source/distribution/yss-cli-pin.json'),digest=hash(fs.readFileSync(binary)),key=platform.replace('/','-');
 const writePin=(commitValue,sha)=>fs.writeFileSync(pinFile,JSON.stringify({schema_version:1,repository:'https://example.test/yss-cli.git',version:'1.3.5',commit:commitValue,go_version:'1.27.1',build:'go build',binaries:{[key]:{sha256:sha}}}));
 writePin(cliCommit,digest);
 const accepted=collectReleaseSources({root,commit:templateCommit,environment});
 assert.equal(accepted.source_authority,undefined,'发布门禁不再产生原生装配来源认证');
 assert.ok(accepted.entries.every(e=>e.cli_commit===cliCommit&&e.template_commit===templateCommit));
 // 模板继续前进：Bundle 仍绑定旧模板提交，来源收集不因此失败，并如实记录 Bundle 实际绑定的模板提交。
 put(root,'later.txt','later change');const later=commit(root);assert.notEqual(later,templateCommit);
 const advanced=collectReleaseSources({root,commit:later,environment});
 assert.ok(advanced.entries.every(e=>e.template_commit===templateCommit&&e.core_commit===later));
 // 装配 native input 与平台范围变量已不再被识别：设置了也不改变结果。
 const withLegacyKeys=collectReleaseSources({root,commit:later,environment:{...environment,YSS_RELEASE_NATIVE_INPUT:'/nonexistent',YSS_RELEASE_REQUIRED_PLATFORMS:'unknown/amd64'}});
 assert.deepEqual(withLegacyKeys.entries.map(sourceTuple),advanced.entries.map(sourceTuple));
 assert.throws(()=>collectReleaseSources({root,commit:later,environment:{...environment,YSS_NATIVE_BINARY_OVERRIDE:'1'}}),/不接受/);
 writePin(cliCommit,'0'.repeat(64));assert.throws(()=>collectReleaseSources({root,commit:later,environment}),/与固定版本不符/);writePin(cliCommit,digest);
 writePin('e'.repeat(40),digest);assert.throws(()=>collectReleaseSources({root,commit:later,environment}),/不一致/);writePin(cliCommit,digest);
 put(cli,'uncommitted','dirty');assert.throws(()=>collectReleaseSources({root,commit:later,environment}),/干净固定/);fs.rmSync(path.join(cli,'uncommitted'));
});
