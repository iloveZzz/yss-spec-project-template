import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {NATIVE_PROFILES, nativeBinary, nativeDigest as hash, inspectNative, initializeNative, runNative, applyNative} from './native-yss.mjs';
import {readNativeYssPin, verifyPinnedBinary} from './yss-cli-pin.mjs';
const ensure=(ok,message)=>{if(!ok)throw new TypeError(message);};
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
 ensure(native,'来源包身份不匹配');
 ensure(typeof source.version==='string'&&source.version.length>0,'来源版本缺失');
 for(const field of ['snapshot_hash','manifest_hash','core_digest','core_lock_hash','bundle_hash','binary_sha256'])if(source[field]!==undefined)ensure(/^[a-f0-9]{64}$/.test(source[field]),`来源 ${field} 必须为 SHA-256`);
 if(native){ensure(source.protocol_version===1&&source.source_contract_version===2,'原生来源合同或协议版本不支持');ensure(typeof source.template_version==='string'&&source.template_version.length>0,'原生来源缺少 template_version');for(const field of ['snapshot_hash','manifest_hash','bundle_hash','binary_sha256'])ensure(/^[a-f0-9]{64}$/.test(source[field]||''),`原生来源缺少 ${field}`);}
 const fields=['namespace','family','cli_commit','template_commit','core_commit','package_name','version','snapshot_hash','manifest_hash','core_digest','core_lock_hash',...(native?['source_contract_version','protocol_version','template_version','bundle_hash','binary_sha256']:[])];
 return Object.fromEntries(fields.filter(key=>source[key]!==undefined).map(key=>[key,source[key]]));
}
export function assertSupportedReleaseIdentity(cli,bundle){
 const supported=(value,min)=>{const m=/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.exec(value||'');return !!m&&BigInt(m[1])>=BigInt(min);};
 ensure(supported(cli?.version,3)&&/^[a-f0-9]{40}$/.test(cli?.cliCommit||'')&&cli.cliCommit!=='d67bc777198174a92cc3f58e4f26ce9f0daef2d9','CLI 版本或来源不受支持');
 ensure(supported(bundle?.templateVersion,5)&&/^[a-f0-9]{40}$/.test(bundle?.templateCommit||'')&&bundle.templateCommit!=='1e49127842c358caf552af8ebec58f438a35c5a6','模板版本或来源不受支持');
}
export function collectReleaseSources({root,commit,families=NATIVE_PROFILES,environment=process.env,onSourceVerification}={}){
 ensure(/^[a-f0-9]{40}$/.test(commit),'模板来源必须为完整 SHA');ensure(families.length&&new Set(families).size===families.length,'发布 Profile 集合非法');
 ensure(environment.YSS_NATIVE_BINARY_OVERRIDE!=='1','发布验证不接受 YSS_NATIVE_BINARY_OVERRIDE');
 const binary=nativeBinary(environment),version=runNative(['version'],{environment}).result;
 ensure(version.sourceState==='committed','发行二进制必须来自已提交的 yss 源码');
 const cliSource=environment.YSS_NATIVE_SOURCE_ROOT;
 ensure(typeof cliSource==='string'&&path.isAbsolute(cliSource),'YSS_NATIVE_SOURCE_ROOT 必须显式指定固定 yss 源码绝对目录；本机可运行 eval "$(node .template-source/scripts/ensure-native-yss.mjs)" 导出');
 const cliStat=fs.lstatSync(cliSource);ensure(cliStat.isDirectory()&&!cliStat.isSymbolicLink()&&fs.realpathSync(cliSource)===path.resolve(cliSource),'yss 源码必须使用真实普通目录');
 ensure(git(cliSource,['rev-parse','--show-toplevel'])===cliSource,'yss 源码必须是仓库根');
 ensure(/^module\s+github\.com\/iloveZzz\/yss-cli\s*$/m.test(fs.readFileSync(path.join(cliSource,'go.mod'),'utf8')),'yss 源码 module 身份不匹配');
 ensure(git(cliSource,['status','--porcelain','--untracked-files=normal','--ignore-submodules=none'])==='','发行 yss 源码要求干净固定工作树');
 const sourceCommit=git(cliSource,['rev-parse','HEAD']);ensure(sourceCommit===version.cliCommit,'yss 源码实际提交与二进制 CLI commit 错配');
 // 发布验证只接受固定文件登记的二进制与源码提交；平台验收由维护者人工记录，不在此校验。
 const pin=readNativeYssPin(root,environment);
 if(pin){ensure(verifyPinnedBinary({digest:binary.digest,pin,environment}).pinned,'发布验证必须使用固定的 yss 二进制，不接受 YSS_NATIVE_BINARY_OVERRIDE');ensure(sourceCommit===pin.commit,`yss 源码提交 ${sourceCommit.slice(0,8)} 与固定文件的 ${pin.commit.slice(0,8)} 不一致`);}
 const inspections=Object.fromEntries(families.map(family=>[family,inspectNative(family,{environment})]));
 for(const bundle of Object.values(inspections))ensure([2,3,4,5].includes(bundle.schemaVersion)&&bundle.sourceState==='committed','Bundle 必须来自已提交的模板来源');
 const entries=families.map(family=>{
  ensure(NATIVE_PROFILES.includes(family),'未知发布 Profile');const template_commit=inspections[family].templateCommit;
  const bundle=inspections[family];
  assertSupportedReleaseIdentity(version,bundle);
  ensure([2,3,4,5].includes(bundle.schemaVersion)&&bundle.sourceState==='committed'&&/^[a-f0-9]{40}$/.test(bundle.templateCommit||''),'Bundle 必须来自已提交的模板来源');
  const cli_commit=version.cliCommit||version.commit||bundle.cliCommit;
  ensure((version.sourceState||bundle.cliSourceState)==='committed','发行二进制必须来自已提交的 yss 源码');
  return {...sourceTuple({namespace:'candidate-release',family,cli_commit,template_commit,core_commit:commit,package_name:'yss',version:version.version,template_version:bundle.templateVersion,source_contract_version:2,protocol_version:version.protocolVersion,snapshot_hash:bundle.sourceSnapshotHash,manifest_hash:bundle.manifestHash,bundle_hash:bundle.bundleHash,binary_sha256:binary.digest}),template_path:'.'};
 });
 return {schema_version:2,kind:'template-release-sources',root_commit:commit,families:[...families],entries};
}
export function validateArtifact(artifact,expectedSource){
 const expected=sourceTuple(expectedSource),actual=sourceTuple(artifact?.source_tuple);for(const [field,value]of Object.entries(expected))assert.equal(actual[field],value,`产物来源 tuple 不匹配: ${field}`);
 ensure(actual.package_name==='yss','现役产物生产仅支持 yss；旧执行器从历史恢复包取得');
 ensure(typeof artifact.tarball==='string'&&path.isAbsolute(artifact.tarball),'产物文件路径缺失');
 const stat=fs.lstatSync(artifact.tarball);ensure(stat.isFile()&&!stat.isSymbolicLink(),'产物必须是普通文件');ensure(hash(fs.readFileSync(artifact.tarball))===artifact.tarball_sha256,'产物摘要漂移');
 ensure(artifact.tarball_sha256===actual.binary_sha256,'二进制与来源锁错配');
 if(artifact.installed_root){ensure(installedTreeDigest(artifact.installed_root)===artifact.installed_tree_sha256,'安装树字节、类型或权限漂移');ensure(hash(fs.readFileSync(artifact.binary))===actual.binary_sha256,'安装后二进制漂移');const inspection=JSON.parse(fs.readFileSync(artifact.bundle_manifest));ensure([2,3,4,5].includes(inspection.schemaVersion)&&inspection.profile===actual.family&&inspection.templateVersion===actual.template_version&&inspection.templateCommit===actual.template_commit&&inspection.sourceSnapshotHash===actual.snapshot_hash&&inspection.manifestHash===actual.manifest_hash&&inspection.bundleHash===actual.bundle_hash,'安装后 Bundle 来源漂移');}
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
export function verifyInstalledCliMigration({artifact,directory,run}={}){
 validateArtifact(artifact,artifact.source_tuple);const family=artifact.source_tuple.family;fs.mkdirSync(directory,{recursive:true});const target=path.join(directory,'instance');const environment={...process.env,YSS_NATIVE_BINARY:artifact.binary,YSS_NATIVE_BINARY_SHA256:artifact.source_tuple.binary_sha256},options={environment,run,cwd:artifact.installed_root};
 initializeNative(family,target,options);runNative(['doctor','--root',target],options);runNative(['diff','--root',target],options);
 const gitEnvironment={...Object.fromEntries(Object.entries(environment).filter(([name])=>!name.startsWith('GIT_'))),GIT_CONFIG_NOSYSTEM:'1',GIT_CONFIG_GLOBAL:os.devNull,GIT_TERMINAL_PROMPT:'0'};
 const git=(...args)=>{const argv=['-c','user.name=YSS verification','-c','user.email=verification@example.invalid','-c','commit.gpgsign=false',...args],result=run?run('git',argv,target,gitEnvironment):spawnSync('git',argv,{cwd:target,env:gitEnvironment,encoding:'utf8'});ensure(result.status===0&&!result.error&&!result.signal,`Git fixture 失败: ${result.stderr||result.error||result.signal}`);};
 const metadata=path.join(target,'.yss.json'),contextPath=path.join(target,'CONTEXT.md');
 if(!fs.existsSync(contextPath))fs.writeFileSync(contextPath,'# 用户上下文\n这是受管升级测试中的用户资料。\n');
 const context=fs.readFileSync(contextPath),user=path.join(target,'src/user.txt');fs.mkdirSync(path.dirname(user),{recursive:true});fs.writeFileSync(user,'user data');
 git('init','-q');git('add','-A');git('commit','-qm','initial fixture');
 const plan=path.join(directory,'plan.json');applyNative('sync',family,target,plan,[],options);assert.deepEqual(fs.readFileSync(contextPath),context);assert.equal(fs.readFileSync(user,'utf8'),'user data');
 // A bounded native upgrade fixture exercises an actual nonempty transaction.
 // Historical metadata and interrupted journals remain a separate required matrix.
 const managedRef=family==='spec'?'.agents/skills/yss-product-lifecycle/SKILL.md':'scripts/sync-skills';
 const meta=JSON.parse(fs.readFileSync(metadata)),managed=path.join(target,managedRef),oldBytes='// previous managed tool\n',record=meta.managedFiles?.[managedRef];ensure(record?.ownership==='managed','原生升级 fixture 缺少真实 managed baseline');
 fs.writeFileSync(managed,oldBytes);record.baseline.digest=hash(oldBytes);record.lastApplied.digest=hash(oldBytes);meta.baselineDigest=hash(JSON.stringify(meta.managedFiles));fs.writeFileSync(metadata,JSON.stringify(meta,null,2)+'\n');const before=fs.readFileSync(metadata);
 git('add','-A');git('commit','-qm','previous managed source');
 const migrationPlan=path.join(directory,'migration-plan.json');const upgrade=runNative(['sync','--root',target,'--profile',family,'--plan','--out',migrationPlan],options).result;assert.deepEqual(fs.readFileSync(metadata),before,'升级计划必须只读');ensure(upgrade.changes.some(row=>row.path===managedRef),'升级计划没有声明受管工具更新');runNative(['sync','--root',target,'--profile',family,'--apply','--plan-file',migrationPlan],options);ensure(fs.readFileSync(managed,'utf8')!==oldBytes,'原生升级没有更新受管资产');
 git('add','-A');git('commit','-qm','completed sync');
 const noop=runNative(['sync','--root',target,'--profile',family,'--plan','--out',path.join(directory,'noop.json')],options).result;ensure(noop.changes.length===0&&!(noop.conflicts?.length),'升级后重新规划不幂等');
 assert.deepEqual(fs.readFileSync(contextPath),context,'同步没有保留用户上下文');ensure(fs.readFileSync(user,'utf8')==='user data','同步破坏用户资产');
 return {family,status:'passed',cases:['init','doctor','diff','sync-dry-run','sync-apply','migration-plan-read-only','migration-apply','idempotency','git-baseline','user-file-preservation'],migration_fixture:'native-managed-upgrade'};
}
export function prepareArtifactConsumers({artifacts,directory,run}={}){
 ensure(artifacts?.length&&typeof run==='function','共享准备缺少产物或实际命令');ensure(path.isAbsolute(directory)&&!fs.existsSync(directory),'共享准备必须使用新绝对目录');const cli_root=path.join(directory,'cli'),instance_root=path.join(directory,'instances');fs.mkdirSync(cli_root,{recursive:true});fs.mkdirSync(instance_root);const first=artifacts[0];
 validateArtifact(first,first.source_tuple);const binary=path.join(cli_root,path.basename(first.binary));fs.copyFileSync(first.binary,binary);fs.chmodSync(binary,fs.statSync(first.binary).mode&0o777);const environment={YSS_NATIVE_BINARY:binary,YSS_NATIVE_BINARY_SHA256:first.source_tuple.binary_sha256,YSS_DEDICATED_INSTANCE_ROOT:instance_root};const options={run,environment:{...process.env,...environment},cwd:directory};
 const families=[];for(const artifact of artifacts){validateArtifact(artifact,artifact.source_tuple);ensure(artifact.source_tuple.binary_sha256===first.source_tuple.binary_sha256,'四 Profile 二进制来源不一致');const family=artifact.source_tuple.family;ensure(!families.includes(family),'共享准备 Profile 重复');families.push(family);initializeNative(family,path.join(instance_root,family),{...options,full:family==='spec'});}
 return {environment,cli_root,instance_root,families};
}
