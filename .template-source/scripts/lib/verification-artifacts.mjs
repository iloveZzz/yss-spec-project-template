import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {NATIVE_PROFILES, nativeBinary, nativeDigest as hash, inspectNative, initializeNative, runNative, applyNative} from './native-yss.mjs';
const ensure=(ok,message)=>{if(!ok)throw new TypeError(message);};
const templates={spec:null,design:'yss-harness-design-agent',backend:'yss-harness-backend-agent',frontend:'yss-harness-frontend-agent'};
const historicalPackages={spec:'create-yss-spec',design:'create-yss-harness-design',backend:'create-yss-harness-backend',frontend:'create-yss-harness-frontend'};
function git(root,args){const result=spawnSync('git',args,{cwd:root,encoding:'utf8'});ensure(result.status===0,result.stderr||'无法核验固定 Git 来源');return result.stdout.trim();}
function gitlink(root,commit,ref){const match=/^160000 commit ([a-f0-9]{40})\t/.exec(git(root,['ls-tree',commit,'--',ref]));ensure(match,`缺少固定模板 gitlink: ${ref}`);return match[1];}
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
export function collectReleaseSources({root,commit,families=NATIVE_PROFILES,environment=process.env}={}){
 ensure(/^[a-f0-9]{40}$/.test(commit),'模板来源必须为完整 SHA');ensure(families.length&&new Set(families).size===families.length,'发布 Profile 集合非法');
 const binary=nativeBinary(environment),version=runNative(['version'],{environment}).result;
 ensure(version.sourceState==='committed','发行二进制必须来自已提交的 yss 源码');
 const cliSource=environment.YSS_NATIVE_SOURCE_ROOT;
 ensure(typeof cliSource==='string'&&path.isAbsolute(cliSource),'YSS_NATIVE_SOURCE_ROOT 必须显式指定固定 yss 源码绝对目录');
 const cliStat=fs.lstatSync(cliSource);ensure(cliStat.isDirectory()&&!cliStat.isSymbolicLink()&&fs.realpathSync(cliSource)===path.resolve(cliSource),'yss 源码必须使用真实普通目录');
 ensure(git(cliSource,['rev-parse','--show-toplevel'])===cliSource,'yss 源码必须是仓库根');
 ensure(/^module\s+github\.com\/iloveZzz\/yss-cli\s*$/m.test(fs.readFileSync(path.join(cliSource,'go.mod'),'utf8')),'yss 源码 module 身份不匹配');
 ensure(git(cliSource,['status','--porcelain','--untracked-files=normal','--ignore-submodules=none'])==='','发行 yss 源码要求干净固定工作树');
 const sourceCommit=git(cliSource,['rev-parse','HEAD']);ensure(sourceCommit===version.cliCommit,'yss 源码实际提交与二进制 CLI commit 错配');
 const entries=families.map(family=>{
  ensure(NATIVE_PROFILES.includes(family),'未知发布 Profile');const template_path=templates[family]?`submodules/${templates[family]}`:'.',template_commit=templates[family]?gitlink(root,commit,template_path):commit;
  const bundle=inspectNative(family,{environment});
  ensure([2,3].includes(bundle.schemaVersion)&&bundle.sourceState==='committed'&&bundle.templateCommit===template_commit,'Bundle 与固定模板来源不匹配');
  const cli_commit=version.cliCommit||version.commit||bundle.cliCommit;
  ensure((version.sourceState||bundle.cliSourceState)==='committed','发行二进制必须来自已提交的 yss 源码');
  return {...sourceTuple({namespace:'candidate-release',family,cli_commit,template_commit,core_commit:commit,package_name:'yss',version:version.version,template_version:bundle.templateVersion,source_contract_version:2,protocol_version:version.protocolVersion,snapshot_hash:bundle.sourceSnapshotHash,manifest_hash:bundle.manifestHash,bundle_hash:bundle.bundleHash,binary_sha256:binary.digest}),template_path};
 });
 return {schema_version:2,kind:'template-release-sources',root_commit:commit,families:[...families],entries};
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
