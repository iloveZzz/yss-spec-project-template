import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {NATIVE_PROFILES, nativeBinary, nativeDigest as hash, inspectNative, initializeNative, runNative, applyNative} from './native-yss.mjs';
import {readYssCliPin, verifyPinnedBinary} from './yss-cli-pin.mjs';
const ensure=(ok,message)=>{if(!ok)throw new TypeError(message);};
const historicalPackages={spec:'create-yss-spec',design:'create-yss-harness-design',backend:'create-yss-harness-backend'};
function git(root,args){const result=spawnSync('git',args,{cwd:root,encoding:'utf8'});ensure(result.status===0,result.stderr||'无法核验固定 Git 来源');return result.stdout.trim();}
function treeEntries(directory){
 ensure(fs.lstatSync(directory).isDirectory()&&!fs.lstatSync(directory).isSymbolicLink(),'安装目录必须是普通目录');const entries=[];
 const walk=(current,prefix='')=>{for(const name of fs.readdirSync(current).sort()){const file=path.join(current,name),ref=prefix?`${prefix}/${name}`:name,stat=fs.lstatSync(file),mode=stat.mode&0o777;
  if(stat.isDirectory()){entries.push({path:ref,kind:'directory',mode});walk(file,ref);}
  else if(stat.isFile())entries.push({path:ref,kind:'file',mode,sha256:hash(fs.readFileSync(file))});
  else throw new TypeError('安装树包含链接或特殊节点');
 }};walk(directory);return entries;
}
export function installedTreeDigest(directory){return hash(JSON.stringify(treeEntries(directory)));}
export function sourceTuple(source){
 ensure(source&&['candidate-release','plugin-pinned'].includes(source.namespace),'来源必须显式分槽');
 ensure(NATIVE_PROFILES.includes(source.family),'未知 Profile');
 for(const field of ['cli_commit','template_commit','core_commit'])ensure(/^[a-f0-9]{40}$/.test(source[field]),`来源 ${field} 必须为完整 SHA`);
 const native=source.package_name==='yss';
 ensure(native||source.package_name===historicalPackages[source.family],'来源包身份不匹配');
 ensure(typeof source.version==='string'&&source.version.length>0,'来源版本缺失');
 for(const field of ['snapshot_hash','manifest_hash','core_digest','core_lock_hash','bundle_hash','binary_sha256'])if(source[field]!==undefined)ensure(/^[a-f0-9]{64}$/.test(source[field]),`来源 ${field} 必须为 SHA-256`);
 if(native){ensure(source.protocol_version===1&&source.source_contract_version===2,'原生来源合同或协议版本不支持');ensure(typeof source.template_version==='string'&&source.template_version.length>0,'原生来源缺少 template_version');for(const field of ['snapshot_hash','manifest_hash','bundle_hash','binary_sha256'])ensure(/^[a-f0-9]{64}$/.test(source[field]||''),`原生来源缺少 ${field}`);}
 const fields=['namespace','family','cli_commit','template_commit','core_commit','package_name','version','snapshot_hash','manifest_hash','core_digest','core_lock_hash',...(native?['source_contract_version','protocol_version','template_version','bundle_hash','binary_sha256']:[])];
 return Object.fromEntries(fields.filter(key=>source[key]!==undefined).map(key=>[key,source[key]]));
}
const releaseSourceKeys=['YSS_RELEASE_NATIVE_INPUT','YSS_RELEASE_NATIVE_INPUT_SHA256','YSS_RELEASE_REQUIRED_PLATFORMS','YSS_RELEASE_SOURCE_EVIDENCE_DIR'];
function releaseNativeAuthority({root,commit,cliSource,sourceCommit,binary,version,inspections,pin,environment,onSourceVerification}) {
 const [inputFile,inputDigest,scope,evidenceRoot]=releaseSourceKeys.map(key=>environment[key]);
 ensure(releaseSourceKeys.every(key=>typeof environment[key]==='string'&&environment[key].length),'发行装配 native input 引用、摘要、独立平台范围和证据目录必须完整');
 const platforms=scope.split(',');
 ensure(platforms.length&&new Set(platforms).size===platforms.length&&platforms.every(p=>/^(darwin|linux|windows)\/(amd64|arm64)$/.test(p)),'发行装配独立平台范围非法');
 platforms.sort();
 const host=`${process.platform==='win32'?'windows':process.platform}/${process.arch==='x64'?'amd64':process.arch}`;
 ensure(platforms.includes(host),'发行装配平台范围必须包含当前原生消费者');
 const outside=(base,file)=>{const rel=path.relative(base,file);return rel==='..'||rel.startsWith(`..${path.sep}`)||path.isAbsolute(rel);};
 const ordinary=file=>{ensure(typeof file==='string'&&path.isAbsolute(file)&&path.resolve(file)===file&&fs.realpathSync(file)===file,'发行来源文件必须是无链接的规范绝对路径');const stat=fs.lstatSync(file);ensure(stat.isFile()&&!stat.isSymbolicLink()&&stat.nlink===1,'发行来源文件必须为独立普通文件');return stat;};
 const guards=new Map();
 const read=(file,expected)=>{ensure(/^[a-f0-9]{64}$/.test(expected||''),'发行来源引用缺少 raw SHA-256');const stat=ordinary(file),raw=fs.readFileSync(file);ensure(hash(raw)===expected,'发行来源原始字节摘要不匹配');const stamp=[stat.dev,stat.ino,stat.size,stat.mode,stat.mtimeMs,stat.ctimeMs,expected];if(guards.has(file))assert.deepEqual(stamp,guards.get(file),'发行来源输入身份或字节漂移');guards.set(file,stamp);return raw;};
 ensure(path.isAbsolute(inputFile)&&outside(root,inputFile)&&outside(cliSource,inputFile),'native input 必须位于两个来源仓外');
 const inputRaw=read(inputFile,inputDigest),input=JSON.parse(inputRaw),inputRoot=path.dirname(inputFile);
 ensure(git(root,['rev-parse','HEAD'])===commit&&git(root,['status','--porcelain','--untracked-files=normal','--ignore-submodules=none'])==='','发行模板要求检出固定 T 且工作树干净');
 ensure(path.isAbsolute(evidenceRoot)&&path.resolve(evidenceRoot)===evidenceRoot&&outside(root,evidenceRoot)&&outside(cliSource,evidenceRoot),'发行装配证据目录必须在两个来源仓外');
 let ancestor=evidenceRoot;while(!fs.existsSync(ancestor))ancestor=path.dirname(ancestor);
 ensure(fs.realpathSync(ancestor)===ancestor&&fs.lstatSync(ancestor).isDirectory(),'发行装配证据目录不得经过链接');
 fs.mkdirSync(evidenceRoot,{recursive:true});ensure(fs.realpathSync(evidenceRoot)===evidenceRoot&&fs.lstatSync(evidenceRoot).isDirectory(),'发行装配证据目录不得经过链接');
 const directory=fs.mkdtempSync(path.join(evidenceRoot,'source-')),out=path.join(directory,'assembled'),records=[];
 const observation={kind:'release-source-native-assembly',status:'failed',input:{path:inputFile,sha256:inputDigest},required_platforms:platforms,cli_commit:sourceCommit,template_commit:commit,maintenance_pin_commit:pin?.commit||null,directory,commands:records};
 const run=(command,args,env=environment)=>{const start=Date.now(),result=spawnSync(command,args,{cwd:cliSource,env,encoding:'utf8',maxBuffer:128*1024*1024,timeout:600000});const prefix=String(records.length+1).padStart(2,'0'),stdout=path.join(directory,`${prefix}.stdout.log`),stderr=path.join(directory,`${prefix}.stderr.log`);fs.writeFileSync(stdout,result.stdout||'',{flag:'wx'});fs.writeFileSync(stderr,result.stderr||'',{flag:'wx'});records.push({command,args,cwd:cliSource,environment:Object.fromEntries([...releaseSourceKeys,'YSS_NATIVE_BINARY','YSS_NATIVE_BINARY_SHA256','YSS_NATIVE_SOURCE_ROOT','CGO_ENABLED','GOENV','GOWORK','GOFLAGS','GOEXPERIMENT','GOTOOLCHAIN','GO111MODULE'].filter(key=>env[key]!==undefined).map(key=>[key,env[key]])),exit_code:result.status,signal:result.signal,error:result.error?.message||null,duration_ms:Date.now()-start,stdout:{path:stdout,sha256:hash(fs.readFileSync(stdout))},stderr:{path:stderr,sha256:hash(fs.readFileSync(stderr))}});ensure(result.status===0&&!result.signal&&!result.error,`发行来源装配失败: ${result.error?.message||result.stderr||result.status}`);return result.stdout;};
 const ref=descriptor=>{ensure(descriptor&&typeof descriptor.path==='string'&&!descriptor.path.includes('\\')&&!descriptor.path.includes(':')&&!path.isAbsolute(descriptor.path),'发行来源依赖路径非法');const file=path.resolve(inputRoot,descriptor.path);ensure(!outside(inputRoot,file)&&file!==inputRoot&&path.relative(inputRoot,file).split(path.sep).join('/')===descriptor.path,'发行来源依赖路径越界');return read(file,descriptor.sha256);};
 try {
  // Do not let GOFLAGS overlays or a workspace replace the clean source assembler.
  const goEnv={...environment,CGO_ENABLED:'0',GOENV:'off',GOWORK:'off',GOFLAGS:'',GOEXPERIMENT:'',GOTOOLCHAIN:'local',GO111MODULE:'on'};
  for(const key of ['GOOS','GOARCH','GOAMD64','GOARM','GOARM64','GO386','GOMIPS','GOMIPS64','GOPPC64','GORISCV64','GOWASM'])delete goEnv[key];
  run('go',['run','-mod=readonly','./tools/package','--native-manifest',inputFile,'--required-platforms',scope,out],goEnv);
  read(inputFile,inputDigest);
  const proofFile=path.join(out,'checksums.json'),proofRaw=fs.readFileSync(proofFile),proof=JSON.parse(read(proofFile,hash(proofRaw)));
  ensure(proof.schemaVersion===2&&proof.cliCommit===sourceCommit&&proof.version===version.version&&proof.sourceState==='committed'&&proof.stableReady===true&&proof.qualificationScope==='local-platform-impacted-consumers'&&proof.inputManifestSha256===inputDigest,'现役装配结果来源或资格不匹配');
  assert.deepEqual(proof.requiredPlatforms,platforms,'装配结果平台范围不匹配');assert.deepEqual(proof.pending,[],'装配结果存在未完成项');
  const artifact=input.artifacts?.find(row=>row.platform===host),published=proof.artifacts?.find(row=>row.platform===host);
  ensure(artifact&&published&&published.binarySha256===binary.digest&&artifact.binary.sha256===binary.digest,'当前二进制不是已验证装配的平台原始二进制');
  assert.deepEqual(ref(artifact.binary),fs.readFileSync(binary.binary),'当前二进制与原始装配输入字节不一致');
  const receipt=JSON.parse(ref(artifact.receipt));
  assert.deepEqual(JSON.parse(ref(receipt.version)).result,version,'实际 version 与已验证原始 envelope 不一致');
  for(const family of NATIVE_PROFILES){const row=receipt.bundleCommands?.find(row=>row.id===`native-inspect-${family}`);ensure(row,'原始完整 inspect 缺失');assert.deepEqual(JSON.parse(ref(row.report)).result,inspections[family],'实际完整 Bundle inspect 与已验证来源不一致');}
  ensure(typeof published.archive==='string'&&path.basename(published.archive)===published.archive,'装配归档路径非法');
  const archive=path.join(out,published.archive);read(archive,published.sha256);
  const manifestRaw=run('python3',['-c',`import sys,tarfile,zipfile
p=sys.argv[1]
if p.endswith('.zip'):
 with zipfile.ZipFile(p) as z: sys.stdout.buffer.write(z.read('release-manifest.json'))
else:
 with tarfile.open(p,'r:gz') as t: sys.stdout.buffer.write(t.extractfile('release-manifest.json').read())`,archive]);
  const manifest=JSON.parse(manifestRaw);
  ensure(manifest.cliCommit===sourceCommit&&manifest.cliVersion===version.version&&manifest.protocolVersion===version.protocolVersion&&manifest.binarySha256===binary.digest&&manifest.sourceLockSha256===proof.sourceLockSha256&&manifest.nativeReceiptSha256===artifact.receipt.sha256&&manifest.releaseGateSha256===input.releaseGate.sha256&&manifest.stableReady===true&&manifest.platform===host,'实际归档 manifest 与已验证输入不一致');
  assert.deepEqual(manifest.requiredPlatforms,platforms,'归档平台范围不匹配');assert.deepEqual(manifest.bundles,inspections,'实际归档完整 inspect 不一致');
  observation.checksums={path:proofFile,sha256:hash(proofRaw)};observation.archive={path:archive,sha256:published.sha256};observation.manifest_sha256=hash(manifestRaw);
  for(const [file,stamp]of guards)read(file,stamp.at(-1));
  ensure(git(cliSource,['rev-parse','HEAD'])===sourceCommit&&git(cliSource,['status','--porcelain','--untracked-files=normal','--ignore-submodules=none'])==='','发行 yss 源码在装配过程中漂移');
  ensure(git(root,['rev-parse','HEAD'])===commit&&git(root,['status','--porcelain','--untracked-files=normal','--ignore-submodules=none'])==='','发行模板来源在装配过程中漂移');
  ensure(nativeBinary(environment).digest===binary.digest,'发行二进制在装配过程中漂移');
  observation.status='passed';
  return {kind:'native-assembly',input_sha256:inputDigest,required_platforms:platforms,maintenance_pin_commit:pin?.commit||null};
 } catch(error){observation.error=error.message;throw error;}
 finally {fs.writeFileSync(path.join(directory,'source-verification.json'),JSON.stringify(observation,null,2)+'\n',{flag:'wx'});onSourceVerification?.(observation);}
}
export function collectReleaseSources({root,commit,families=NATIVE_PROFILES,environment=process.env,onSourceVerification}={}){
 ensure(/^[a-f0-9]{40}$/.test(commit),'模板来源必须为完整 SHA');ensure(families.length&&new Set(families).size===families.length,'发布 Profile 集合非法');
 const nativeAuthority=releaseSourceKeys.some(key=>environment[key]!==undefined);
 if(nativeAuthority)ensure(releaseSourceKeys.every(key=>typeof environment[key]==='string'&&environment[key].length),'发行装配 native input 引用、摘要、独立平台范围和证据目录必须完整');
 ensure(environment.YSS_NATIVE_BINARY_OVERRIDE!=='1','发布验证不接受 YSS_NATIVE_BINARY_OVERRIDE');
 const binary=nativeBinary(environment),version=runNative(['version'],{environment}).result;
 ensure(version.sourceState==='committed','发行二进制必须来自已提交的 yss 源码');
 const cliSource=environment.YSS_NATIVE_SOURCE_ROOT;
 ensure(typeof cliSource==='string'&&path.isAbsolute(cliSource),'YSS_NATIVE_SOURCE_ROOT 必须显式指定固定 yss 源码绝对目录');
 const cliStat=fs.lstatSync(cliSource);ensure(cliStat.isDirectory()&&!cliStat.isSymbolicLink()&&fs.realpathSync(cliSource)===path.resolve(cliSource),'yss 源码必须使用真实普通目录');
 ensure(git(cliSource,['rev-parse','--show-toplevel'])===cliSource,'yss 源码必须是仓库根');
 ensure(/^module\s+github\.com\/iloveZzz\/yss-cli\s*$/m.test(fs.readFileSync(path.join(cliSource,'go.mod'),'utf8')),'yss 源码 module 身份不匹配');
 ensure(git(cliSource,['status','--porcelain','--untracked-files=normal','--ignore-submodules=none'])==='','发行 yss 源码要求干净固定工作树');
 const sourceCommit=git(cliSource,['rev-parse','HEAD']);ensure(sourceCommit===version.cliCommit,'yss 源码实际提交与二进制 CLI commit 错配');
 // 日常维护 pin 不变；发行 C 只能由独立 native 装配认证，不能把 C 伪装成维护 pin P。
 const pin=readYssCliPin(root);
 if(pin&&!nativeAuthority){ensure(verifyPinnedBinary({digest:binary.digest,pin,environment}).pinned,'发布验证必须使用固定的 yss 二进制，不接受 YSS_NATIVE_BINARY_OVERRIDE');ensure(sourceCommit===pin.commit,`yss 源码提交 ${sourceCommit.slice(0,8)} 与固定文件的 ${pin.commit.slice(0,8)} 不一致`);}
 const inspections=Object.fromEntries((nativeAuthority?NATIVE_PROFILES:families).map(family=>[family,inspectNative(family,{environment})]));
 for(const bundle of Object.values(inspections))ensure([2,3].includes(bundle.schemaVersion)&&bundle.sourceState==='committed'&&bundle.templateCommit===commit,'Bundle 与固定模板来源不匹配');
 const authority=nativeAuthority?releaseNativeAuthority({root,commit,cliSource,sourceCommit,binary,version,inspections,pin,environment,onSourceVerification}):null;
 const entries=families.map(family=>{
  ensure(NATIVE_PROFILES.includes(family),'未知发布 Profile');const template_commit=commit;
  const bundle=inspections[family];
  ensure([2,3].includes(bundle.schemaVersion)&&bundle.sourceState==='committed'&&bundle.templateCommit===template_commit,'Bundle 与固定模板来源不匹配');
  const cli_commit=version.cliCommit||version.commit||bundle.cliCommit;
  ensure((version.sourceState||bundle.cliSourceState)==='committed','发行二进制必须来自已提交的 yss 源码');
  return {...sourceTuple({namespace:'candidate-release',family,cli_commit,template_commit,core_commit:commit,package_name:'yss',version:version.version,template_version:bundle.templateVersion,source_contract_version:2,protocol_version:version.protocolVersion,snapshot_hash:bundle.sourceSnapshotHash,manifest_hash:bundle.manifestHash,bundle_hash:bundle.bundleHash,binary_sha256:binary.digest}),template_path:'.'};
 });
 return {schema_version:2,kind:'template-release-sources',root_commit:commit,families:[...families],entries,...(authority?{source_authority:authority}:{})};
}
export function validateArtifact(artifact,expectedSource){
 const expected=sourceTuple(expectedSource),actual=sourceTuple(artifact?.source_tuple);for(const [field,value]of Object.entries(expected))assert.equal(actual[field],value,`产物来源 tuple 不匹配: ${field}`);
 ensure(actual.package_name==='yss','现役产物生产仅支持 yss；旧执行器从历史恢复包取得');
 ensure(typeof artifact.tarball==='string'&&path.isAbsolute(artifact.tarball),'产物文件路径缺失');
 const stat=fs.lstatSync(artifact.tarball);ensure(stat.isFile()&&!stat.isSymbolicLink(),'产物必须是普通文件');ensure(hash(fs.readFileSync(artifact.tarball))===artifact.tarball_sha256,'产物摘要漂移');
 ensure(artifact.tarball_sha256===actual.binary_sha256,'二进制与来源锁错配');
 if(artifact.installed_root){ensure(installedTreeDigest(artifact.installed_root)===artifact.installed_tree_sha256,'安装树字节、类型或权限漂移');ensure(hash(fs.readFileSync(artifact.binary))===actual.binary_sha256,'安装后二进制漂移');const inspection=JSON.parse(fs.readFileSync(artifact.bundle_manifest));ensure([2,3].includes(inspection.schemaVersion)&&inspection.profile===actual.family&&inspection.templateVersion===actual.template_version&&inspection.templateCommit===actual.template_commit&&inspection.sourceSnapshotHash===actual.snapshot_hash&&inspection.manifestHash===actual.manifest_hash&&inspection.bundleHash===actual.bundle_hash,'安装后 Bundle 来源漂移');}
 return artifact;
}
export function createArtifactCoordinator({produce}){ensure(typeof produce==='function','产物生产者缺失');const records=new Map();return {acquire(source){const tuple=sourceTuple(source),key=hash(JSON.stringify(tuple));if(records.has(key))return validateArtifact(records.get(key),tuple);const artifact=produce(tuple);validateArtifact(artifact,tuple);records.set(key,artifact);return artifact;},records(){return [...records.values()];}};}
/** Copy the exact release binary and export public assets; never execute a legacy private module. */
export function produceCliArtifact({root,source,directory,run,environment=process.env}={}){
 const tuple=sourceTuple(source);ensure(tuple.package_name==='yss','旧 CLI 不再参与产物生产');ensure(typeof run==='function','真实命令生产者缺失');directory=path.resolve(directory);const relative=path.relative(fs.realpathSync(root),directory);ensure(relative.startsWith(`..${path.sep}`)||path.isAbsolute(relative),'生产必须位于仓库外');ensure(!fs.existsSync(directory),'产物目录必须为新目录');
 const pinned=nativeBinary(environment);ensure(pinned.digest===tuple.binary_sha256,'生产二进制与来源 tuple 不匹配');
 fs.mkdirSync(directory,{recursive:true});const installed_root=path.join(directory,'consumer');fs.mkdirSync(installed_root);const binary=path.join(installed_root,process.platform==='win32'?'yss.exe':'yss');fs.copyFileSync(pinned.binary,binary);fs.chmodSync(binary,fs.statSync(pinned.binary).mode&0o777);
 const execution={...environment,YSS_NATIVE_BINARY:binary,YSS_NATIVE_BINARY_SHA256:tuple.binary_sha256};const exported=runNative(['bundle','export','--profile',tuple.family,'--out',path.join(installed_root,'bundle')],{environment:execution,run,cwd:root}).result;
 const bundle_manifest=exported.manifestPath;ensure(path.resolve(bundle_manifest)===path.join(installed_root,'bundle','.yss-bundle.json'),'Bundle manifest 路径不匹配');
 const tarball=path.join(directory,`${tuple.family}-${path.basename(binary)}`);fs.copyFileSync(binary,tarball);fs.chmodSync(tarball,fs.statSync(binary).mode&0o777);
 return validateArtifact({source_tuple:tuple,tarball,packed_tarball_path:tarball,tarball_sha256:hash(fs.readFileSync(tarball)),installed_root,binary,bundle_manifest,snapshot:exported.inspection,snapshot_sha256:tuple.snapshot_hash,manifest_sha256:tuple.manifest_hash,installed_tree_sha256:installedTreeDigest(installed_root)},tuple);
}
/** The two old source-test consumers are superseded by public native behavior tests. */
export function prepareCliSourceConsumer(){throw new TypeError('RETIRED_SOURCE_CONSUMER: 使用 tests/cli-retirement.test.mjs 的原生公开入口覆盖');}
export function validateCliSourceConsumer(){throw new TypeError('RETIRED_SOURCE_CONSUMER: 旧源码回执仅保留在历史归档，不授予当前验证通过');}
export function verifyInstalledCliMigration({artifact,directory,run}={}){
 validateArtifact(artifact,artifact.source_tuple);const family=artifact.source_tuple.family;fs.mkdirSync(directory,{recursive:true});const target=path.join(directory,'instance');const environment={...process.env,YSS_NATIVE_BINARY:artifact.binary,YSS_NATIVE_BINARY_SHA256:artifact.source_tuple.binary_sha256},options={environment,run,cwd:artifact.installed_root};
 initializeNative(family,target,options);runNative(['doctor','--root',target],options);runNative(['diff','--root',target],options);
 const metadata=path.join(target,'.yss.json'),context=fs.readFileSync(path.join(target,'CONTEXT.md'));const user=path.join(target,'src/user.txt');fs.mkdirSync(path.dirname(user),{recursive:true});fs.writeFileSync(user,'uncommitted work');
 const plan=path.join(directory,'plan.json');applyNative('sync',family,target,plan,[],options);assert.deepEqual(fs.readFileSync(path.join(target,'CONTEXT.md')),context);assert.equal(fs.readFileSync(user,'utf8'),'uncommitted work');
 // A bounded native upgrade fixture exercises an actual nonempty transaction.
 // Historical metadata and interrupted journals remain a separate required matrix.
 const meta=JSON.parse(fs.readFileSync(metadata)),managed=path.join(target,'scripts/sync-skills'),oldBytes='// previous managed tool\n',record=meta.managedFiles?.['scripts/sync-skills'];ensure(record?.ownership==='managed','原生升级 fixture 缺少真实 managed baseline');
 fs.writeFileSync(managed,oldBytes);record.baseline.digest=hash(oldBytes);record.lastApplied.digest=hash(oldBytes);meta.baselineDigest=hash(JSON.stringify(meta.managedFiles));fs.writeFileSync(metadata,JSON.stringify(meta,null,2)+'\n');const before=fs.readFileSync(metadata);
 const migrationPlan=path.join(directory,'migration-plan.json');const upgrade=runNative(['migrate','plan','--root',target,'--profile',family,'--out',migrationPlan],options).result;assert.deepEqual(fs.readFileSync(metadata),before,'迁移计划必须只读');ensure(upgrade.changes.some(row=>row.path==='scripts/sync-skills'),'升级计划没有声明受管工具更新');runNative(['migrate','apply','--root',target,'--profile',family,'--plan-file',migrationPlan],options);ensure(fs.readFileSync(managed,'utf8')!==oldBytes,'原生升级没有更新受管资产');
 const noop=runNative(['migrate','plan','--root',target,'--profile',family,'--out',path.join(directory,'noop.json')],options).result;ensure(noop.stats.changed===0&&noop.stats.conflicts===0,'升级后重新规划不幂等');
 runNative(['migrate','rollback','--root',target,'--profile',family],options);assert.deepEqual(fs.readFileSync(metadata),before,'整体回退没有恢复 metadata');ensure(fs.readFileSync(managed,'utf8')===oldBytes&&fs.readFileSync(user,'utf8')==='uncommitted work','回退破坏用户资产');
 return {family,status:'passed',cases:['init','doctor','diff','sync-dry-run','sync-apply','migration-plan-read-only','migration-apply','idempotency','rollback','user-file-preservation'],migration_fixture:'native-managed-upgrade',historical_recovery:'separate-required-gate'};
}
export function prepareArtifactConsumers({artifacts,directory,run}={}){
 ensure(artifacts?.length&&typeof run==='function','共享准备缺少产物或实际命令');ensure(path.isAbsolute(directory)&&!fs.existsSync(directory),'共享准备必须使用新绝对目录');const cli_root=path.join(directory,'cli'),instance_root=path.join(directory,'instances');fs.mkdirSync(cli_root,{recursive:true});fs.mkdirSync(instance_root);const first=artifacts[0];
 validateArtifact(first,first.source_tuple);const binary=path.join(cli_root,path.basename(first.binary));fs.copyFileSync(first.binary,binary);fs.chmodSync(binary,fs.statSync(first.binary).mode&0o777);const environment={YSS_NATIVE_BINARY:binary,YSS_NATIVE_BINARY_SHA256:first.source_tuple.binary_sha256,YSS_DEDICATED_INSTANCE_ROOT:instance_root};const options={run,environment:{...process.env,...environment},cwd:directory};
 const families=[];for(const artifact of artifacts){validateArtifact(artifact,artifact.source_tuple);ensure(artifact.source_tuple.binary_sha256===first.source_tuple.binary_sha256,'四 Profile 二进制来源不一致');const family=artifact.source_tuple.family;ensure(!families.includes(family),'共享准备 Profile 重复');families.push(family);initializeNative(family,path.join(instance_root,family),{...options,full:family==='spec'});}
 return {environment,cli_root,instance_root,families};
}
