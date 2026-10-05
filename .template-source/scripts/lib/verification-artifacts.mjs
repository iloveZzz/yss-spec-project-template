import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const ensure=(ok,message)=>{if(!ok)throw new TypeError(message);};
const definitions={spec:['create-yss-spec',null,'create-yss-spec'],design:['create-yss-strategic-design','yss-harness-design-agent','create-yss-harness-design'],backend:['create-yss-harness-backend','yss-harness-backend-agent','create-yss-harness-backend'],frontend:['create-yss-harness-frontend','yss-harness-frontend-agent','create-yss-harness-frontend']};
function git(root,args){const result=spawnSync('git',args,{cwd:root,encoding:'utf8'});ensure(result.status===0,result.stderr||'无法核验固定 Git 来源');return result.stdout.trim();}
function gitlink(root,commit,ref){const value=git(root,['ls-tree',commit,'--',ref]);const match=/^160000 commit ([a-f0-9]{40})\t/.exec(value);ensure(match,`缺少固定 gitlink: ${ref}`);return match[1];}
function treeEntries(directory){
 ensure(fs.lstatSync(directory).isDirectory()&&!fs.lstatSync(directory).isSymbolicLink(),'安装目录必须是普通目录');const entries=[];
 const walk=(current,prefix='')=>{for(const name of fs.readdirSync(current).sort()){const file=path.join(current,name),ref=prefix?`${prefix}/${name}`:name,stat=fs.lstatSync(file),mode=stat.mode&0o777;
  if(stat.isDirectory()){entries.push({path:ref,kind:'directory',mode});walk(file,ref);}
  else if(stat.isFile())entries.push({path:ref,kind:'file',mode,sha256:hash(fs.readFileSync(file))});
  else if(stat.isSymbolicLink()){const target=fs.readlinkSync(file),relative=path.relative(directory,path.resolve(path.dirname(file),target));ensure(relative&&!relative.startsWith(`..${path.sep}`)&&relative!=='..'&&!path.isAbsolute(relative),'安装树链接越界');entries.push({path:ref,kind:'symlink',mode,target});}
  else throw new TypeError('安装树包含非文件节点');
 }};walk(directory);return entries;
}
export function installedTreeDigest(directory){return hash(JSON.stringify(treeEntries(directory)));}
export function sourceTuple(source){
 ensure(source&&['candidate-release','plugin-pinned'].includes(source.namespace),'来源必须显式分槽');
 ensure(Object.hasOwn(definitions,source.family),'未知 CLI 家族');
 for(const field of ['cli_commit','template_commit','core_commit'])ensure(/^[a-f0-9]{40}$/.test(source[field]),`来源 ${field} 必须为完整 SHA`);
 for(const field of ['snapshot_hash','manifest_hash','core_digest','core_lock_hash'])if(source[field]!==undefined)ensure(/^[a-f0-9]{64}$/.test(source[field]),`来源 ${field} 必须为 SHA-256`);
 ensure(source.package_name===definitions[source.family][2]&&typeof source.version==='string'&&source.version.length>0,'来源包身份不匹配');
 return Object.fromEntries(['namespace','family','cli_commit','template_commit','core_commit','package_name','version','snapshot_hash','manifest_hash','core_digest','core_lock_hash'].filter(key=>source[key]!==undefined).map(key=>[key,source[key]]));
}
export function collectReleaseSources({root,commit,families=['spec','design','backend','frontend']}={}){
 ensure(/^[a-f0-9]{40}$/.test(commit),'模板来源必须为完整 SHA');
 ensure(Array.isArray(families)&&families.length>0&&new Set(families).size===families.length,'发布家族集合非法');
 const entries=families.map(family=>{
  ensure(Object.hasOwn(definitions,family),'未知发布家族');const [folder,templateFolder,packageName]=definitions[family];
  const cli_path=`submodules/${folder}`,cli_commit=gitlink(root,commit,cli_path),template_path=templateFolder?`submodules/${templateFolder}`:'.';
  const template_commit=templateFolder?gitlink(root,commit,template_path):commit;
  const pkg=JSON.parse(git(path.join(root,cli_path),['show',`${cli_commit}:package.json`]));ensure(pkg.name===packageName,'固定 CLI 包身份不匹配');
  return {...sourceTuple({namespace:'candidate-release',family,cli_commit,template_commit,core_commit:commit,package_name:packageName,version:pkg.version}),cli_path,template_path};
 });
 return {schema_version:1,kind:'template-release-sources',root_commit:commit,families:[...families],entries};
}
export function validateArtifact(artifact,expectedSource){
 const expected=sourceTuple(expectedSource),actual=sourceTuple(artifact?.source_tuple);
 for(const [field,value] of Object.entries(expected))assert.equal(actual[field],value,`产物来源 tuple 不匹配: ${field}`);
 ensure(typeof artifact.tarball==='string'&&path.isAbsolute(artifact.tarball),'产物包路径缺失');
 ensure(!fs.lstatSync(artifact.tarball).isSymbolicLink()&&fs.lstatSync(artifact.tarball).isFile(),'产物必须是普通文件');
 ensure(hash(fs.readFileSync(artifact.tarball))===artifact.tarball_sha256,'产物包摘要漂移');
 if(artifact.installed_root){
  ensure(/^[a-f0-9]{64}$/.test(artifact.installed_tree_sha256)&&installedTreeDigest(artifact.installed_root)===artifact.installed_tree_sha256,'安装树字节、类型或权限漂移');
  const pkg=JSON.parse(fs.readFileSync(path.join(artifact.installed_root,'package.json')));
  ensure(pkg.name===actual.package_name&&pkg.version===actual.version,'安装包身份漂移');
  for(const [file,digest] of [['template.snapshot.json',artifact.snapshot_sha256],['cli-core.lock.json',artifact.core_lock_sha256]])ensure(/^[a-f0-9]{64}$/.test(digest)&&hash(fs.readFileSync(path.join(artifact.installed_root,file)))===digest,'安装后来源材料漂移');
  const snapshot=JSON.parse(fs.readFileSync(path.join(artifact.installed_root,'template.snapshot.json'))),core=JSON.parse(fs.readFileSync(path.join(artifact.installed_root,'cli-core.lock.json')));
  ensure(snapshot.sourceState==='committed'&&snapshot.templateCommit===actual.template_commit&&core.sourceState==='committed'&&core.sourceRevision===actual.core_commit,'安装后的固定来源错配');
  if(actual.family==='spec')ensure(snapshot.requestedRef===actual.template_commit,'安装的 Spec snapshot 固定 requestedRef 错配');
  for(const [field,digest] of [['snapshot_hash',artifact.snapshot_sha256],['core_lock_hash',artifact.core_lock_sha256],['core_digest',core.digest||artifact.core_lock_sha256]])if(actual[field])ensure(actual[field]===digest,'来源 tuple 材料摘要错配');
  if(actual.manifest_hash)ensure(actual.manifest_hash===artifact.manifest_sha256&&hash(fs.readFileSync(path.join(artifact.installed_root,'template.manifest.json')))===actual.manifest_hash,'来源 tuple manifest 摘要错配');
 }
 return artifact;
}
export function createArtifactCoordinator({produce}){
 ensure(typeof produce==='function','产物生产者缺失');const records=new Map();
 return {acquire(source){const tuple=sourceTuple(source),identity=Object.fromEntries(['namespace','family','cli_commit','template_commit','core_commit','package_name','version'].map(field=>[field,tuple[field]])),key=hash(JSON.stringify(identity));if(records.has(key))return validateArtifact(records.get(key),tuple);const artifact=produce(tuple);validateArtifact(artifact,tuple);records.set(key,artifact);return artifact;},records(){return [...records.values()];}};
}

/** All builds and installs are outside the source repository; callers own process logs. */
export function produceCliArtifact({root,source,directory,run}={}){
 const tuple=sourceTuple(source),[folder]=definitions[tuple.family];
 ensure(typeof run==='function','真实命令生产者缺失');
 directory=path.resolve(directory);const relative=path.relative(fs.realpathSync(root),directory);
 ensure(relative.startsWith(`..${path.sep}`)||path.isAbsolute(relative),'包生产必须位于仓库外');
 ensure(!fs.existsSync(directory),'产物目录必须为新目录');fs.mkdirSync(directory,{recursive:true});
 const cli=path.join(directory,'cli'),consumer=path.join(directory,'consumer');
 run('git',['clone','--shared','--no-checkout',path.join(root,'submodules',folder),cli],root);
 run('git',['checkout','--detach',tuple.cli_commit],cli);
 run(process.execPath,['scripts/sync-core.mjs',root,tuple.core_commit],cli);
 if(tuple.family==='spec')run(process.execPath,['scripts/sync-template.js','--require-committed'],cli,{...process.env,YSS_SPEC_TEMPLATE_REPO:pathToFileURL(root).href,YSS_SPEC_TEMPLATE_REF:tuple.template_commit});
 else run(process.execPath,['scripts/sync-template.mjs',path.join(root,source.template_path||`submodules/${definitions[tuple.family][1]}`),tuple.template_commit],cli);
 const snapshot=JSON.parse(fs.readFileSync(path.join(cli,'template.snapshot.json'))),core=JSON.parse(fs.readFileSync(path.join(cli,'cli-core.lock.json')));
 ensure(snapshot.sourceState==='committed'&&snapshot.templateCommit===tuple.template_commit,'产物模板 snapshot 来源错配');
 if(tuple.family==='spec')ensure(snapshot.requestedRef===tuple.template_commit,'Spec snapshot 必须保留固定 requestedRef');
 ensure(core.sourceState==='committed'&&core.sourceRevision===tuple.core_commit,'产物 core 来源错配');
 const packed=run('npm',['pack','--ignore-scripts','--json'],cli);
 const rows=JSON.parse(packed.stdout);ensure(Array.isArray(rows)&&rows.length===1&&typeof rows[0].filename==='string'&&path.basename(rows[0].filename)===rows[0].filename,'npm pack 包输出非法');
 const tarball=path.join(cli,rows[0].filename);run('npm',['install','--prefix',consumer,'--ignore-scripts','--no-audit','--no-fund',tarball],root);
 // Consumers invoke the installed public entrypoint directly. npm's sibling
 // launcher links are redundant and cannot be registered as ordinary evidence.
 fs.rmSync(path.join(consumer,'node_modules','.bin'),{recursive:true,force:true});
 const installed_root=path.join(consumer,'node_modules',tuple.package_name);
 const installedPackage=JSON.parse(fs.readFileSync(path.join(installed_root,'package.json')));
 ensure(installedPackage.name===tuple.package_name&&installedPackage.version===tuple.version,'安装包版本或身份错配');
 for(const file of ['template.snapshot.json','cli-core.lock.json'])ensure(hash(fs.readFileSync(path.join(installed_root,file)))===hash(fs.readFileSync(path.join(cli,file))),'安装后来源材料漂移');
 const manifestFile=path.join(cli,'template.manifest.json');
 ensure(!fs.existsSync(manifestFile)||!snapshot.manifestHash||hash(fs.readFileSync(manifestFile))===snapshot.manifestHash,'snapshot 与模板 manifest 字节错配');
 const snapshot_sha256=hash(fs.readFileSync(path.join(cli,'template.snapshot.json'))),manifest_sha256=fs.existsSync(manifestFile)?hash(fs.readFileSync(manifestFile)):null,core_lock_sha256=hash(fs.readFileSync(path.join(cli,'cli-core.lock.json')));
 const materialTuple=sourceTuple({...tuple,snapshot_hash:snapshot_sha256,...(manifest_sha256?{manifest_hash:manifest_sha256}:{}),core_digest:core.digest||core_lock_sha256,core_lock_hash:core_lock_sha256});
 return {source_tuple:materialTuple,tarball,packed_tarball_path:tarball,tarball_sha256:hash(fs.readFileSync(tarball)),installed_root,cli_root:cli,snapshot,core_lock:core,snapshot_sha256,manifest_sha256,core_lock_sha256,installed_tree_sha256:installedTreeDigest(installed_root)};
}

const sourceMaterials=['template','template.snapshot.json','vendor/cli-core','cli-core.lock.json','resources/upgrade-skill'];
const isMaterial=ref=>sourceMaterials.some(prefix=>ref===prefix||ref.startsWith(`${prefix}/`));
function fixedCliFiles(root,source){
 const [folder]=definitions[source.family],cli=path.join(root,'submodules',folder);
 ensure(gitlink(root,source.core_commit,`submodules/${folder}`)===source.cli_commit,'源码消费 CLI 与固定 gitlink 不匹配');
 const result=spawnSync('git',['ls-tree','-r','-z',source.cli_commit],{cwd:cli,encoding:'utf8',maxBuffer:32*1024*1024});ensure(result.status===0,result.stderr||'CLI 固定源码清单缺失');
 const files=result.stdout.split('\0').filter(Boolean).map(line=>{const match=/^(100644|100755) blob ([a-f0-9]{40})\t(.+)$/.exec(line);ensure(match,'源码消费不允许链接或嵌套 gitlink');return {gitMode:match[1],blob:match[2],ref:match[3]};});
 const batch=spawnSync('git',['cat-file','--batch'],{cwd:cli,input:files.map(row=>row.blob).join('\n')+'\n',maxBuffer:256*1024*1024});ensure(batch.status===0,'CLI 固定源码字节不可读');let offset=0;
 return files.map(({gitMode,blob,ref})=>{
  const end=batch.stdout.indexOf(10,offset);ensure(end>=offset,'CLI 源码 batch 头缺失');const header=/^([a-f0-9]{40}) blob (\d+)$/.exec(batch.stdout.subarray(offset,end).toString());ensure(header&&header[1]===blob,'CLI 源码 batch 身份错配');
  const size=Number(header[2]),start=end+1;ensure(Number.isSafeInteger(size)&&batch.stdout[start+size]===10,'CLI 源码 batch 长度错配');offset=start+size+1;
  return {path:ref,kind:'file',mode:gitMode==='100755'?0o755:0o644,sha256:hash(batch.stdout.subarray(start,start+size))};
 }).sort((a,b)=>a.path.localeCompare(b.path,'en'));
}

/** Fixed CLI source tests need tests/scripts, which the installed package excludes. */
export function prepareCliSourceConsumer({artifact,source=artifact?.source_tuple,root,directory,run}={}){
 const tuple=sourceTuple(source);ensure(tuple.family==='spec','目前仅编译 Spec CLI 固定源码测试消费');validateArtifact(artifact,tuple);
 ensure(typeof run==='function'&&path.isAbsolute(directory)&&!fs.existsSync(directory),'源码消费必须使用新绝对目录和实际命令记录器');
 const relative=path.relative(fs.realpathSync(root),directory);ensure(relative==='..'||relative.startsWith(`..${path.sep}`)||path.isAbsolute(relative),'源码消费目录必须位于仓外');
 const original=fixedCliFiles(root,tuple),[folder]=definitions[tuple.family];fs.mkdirSync(path.dirname(directory),{recursive:true});
 run('git',['clone','--shared','--no-checkout',path.join(root,'submodules',folder),directory],root);run('git',['checkout','--detach',tuple.cli_commit],directory);
 // Git metadata is not execution input; the independently checked original
 // files and generated material remain ordinary, retained evidence files.
 fs.rmSync(path.join(directory,'.git'),{recursive:true,force:true});
 for(const ref of sourceMaterials)fs.rmSync(path.join(directory,ref),{recursive:true,force:true});
 fs.cpSync(artifact.installed_root,directory,{recursive:true,dereference:false});
 const test_files=Object.fromEntries(original.filter(row=>row.path.startsWith('tests/')).map(row=>[row.path,row.sha256]));
 const receipt={schema_version:1,kind:'verification-cli-source-consumer',source_tuple:tuple,consumer_root:fs.realpathSync(directory),source_tree_sha256:installedTreeDigest(directory),fixed_source_manifest_sha256:hash(JSON.stringify(original)),test_files,installed_root:artifact.installed_root,installed_tree_sha256:artifact.installed_tree_sha256,overlay_paths:[...sourceMaterials]};
 validateCliSourceConsumer(receipt,{root,expectedSource:tuple,directory,artifact});return receipt;
}

/** Recompute source expectations from fixed Git bytes, never from the receipt. */
export function validateCliSourceConsumer(receipt,{root,expectedSource,directory,artifact}={}){
 ensure(receipt?.schema_version===1&&receipt.kind==='verification-cli-source-consumer','源码消费回执类型缺失');
 const tuple=sourceTuple(expectedSource);ensure(tuple.family==='spec','源码消费家族不支持');
 const actualTuple=sourceTuple(receipt.source_tuple);for(const [field,value]of Object.entries(tuple))assert.equal(actualTuple[field],value,'源码消费来源 tuple 错配');
 validateArtifact(artifact,actualTuple);
 ensure(path.isAbsolute(directory)&&receipt.consumer_root===fs.realpathSync(directory),'源码消费目录不是独立期望 slot');
 ensure(!fs.lstatSync(directory).isSymbolicLink(),'源码消费目录不能为链接');
 ensure(receipt.installed_root===artifact.installed_root&&receipt.installed_tree_sha256===artifact.installed_tree_sha256,'源码消费安装材料来源错配');
 assert.deepEqual(receipt.overlay_paths,sourceMaterials,'源码消费派生覆盖范围错配');
 const original=fixedCliFiles(root,tuple),actual=treeEntries(directory),byPath=new Map(actual.map(row=>[row.path,row]));
 ensure(receipt.fixed_source_manifest_sha256===hash(JSON.stringify(original)),'源码消费原始固定清单摘要错配');
 assert.deepEqual(receipt.test_files,Object.fromEntries(original.filter(row=>row.path.startsWith('tests/')).map(row=>[row.path,row.sha256])),'源码消费原测试摘要错配');
 for(const entry of original.filter(row=>!isMaterial(row.path)))assert.deepEqual(byPath.get(entry.path),entry,`源码消费原字节、类型或权限漂移: ${entry.path}`);
 const installed=treeEntries(artifact.installed_root);for(const entry of installed)assert.deepEqual(byPath.get(entry.path),entry,`源码消费安装覆盖材料漂移: ${entry.path}`);
 const allowed=new Set([...original.filter(row=>!isMaterial(row.path)).map(row=>row.path),...installed.map(row=>row.path)]);
 for(const ref of [...allowed]){let parent=path.posix.dirname(ref);while(parent!=='.'){allowed.add(parent);parent=path.posix.dirname(parent);}}
 ensure(actual.every(row=>allowed.has(row.path)),'源码消费含未登记或多余文件');
 ensure(/^[a-f0-9]{64}$/.test(receipt.source_tree_sha256)&&installedTreeDigest(directory)===receipt.source_tree_sha256,'源码消费完整树字节、类型或权限漂移');
 return receipt;
}

/** Public installed entrypoints, with an old managed baseline kept in a separate synthetic target. */
export function verifyInstalledCliMigration({artifact,directory,run}={}){
 validateArtifact(artifact,artifact.source_tuple);const family=artifact.source_tuple.family;
 fs.mkdirSync(directory,{recursive:true});const target=path.join(directory,'instance'),entry=path.join(artifact.installed_root,'bin',`${artifact.source_tuple.package_name}.js`);
 const command=(args)=>run(process.execPath,[entry,...args],artifact.installed_root);
 const metadataFile=family==='spec'?'.yss-template.json':`.yss-harness-${family}.json`;
 const init=family==='spec'?[]:['init'];
 command([...init,'--target-dir',target,'--project-name','Migration verification','--business-domain','模板发布验收',...(family==='spec'?['--agent-runtime','codex','--team-size','1','--issue-tracker','github']:[])]);
 command(['doctor','--target-dir',target,'--json']);command(['diff','--target-dir',target,'--json']);
 command(['sync','--target-dir',target,'--dry-run']);command(['sync','--target-dir',target]);
 const metadata=path.join(target,metadataFile),agents=path.join(target,'AGENTS.md'),oldBytes='previous managed agents\n';
 const meta=JSON.parse(fs.readFileSync(metadata));ensure(meta.managedFiles?.['AGENTS.md'],'迁移 fixture 缺少真实 managed baseline');
 fs.writeFileSync(agents,oldBytes);const record=meta.managedFiles['AGENTS.md'];
 if(family==='spec'){record.contentHash=hash(oldBytes);record.identity=`sha256:${record.contentHash}`;}
 else {record.baseline={...record.baseline,digest:hash(oldBytes)};record.lastApplied={...record.baseline};meta.baselineDigest=hash(JSON.stringify(meta.managedFiles));}
 fs.writeFileSync(metadata,JSON.stringify(meta,null,2)+'\n');const before=fs.readFileSync(metadata);
 const user=path.join(target,'src/user.txt');fs.mkdirSync(path.dirname(user),{recursive:true});fs.writeFileSync(user,'uncommitted work');
 const plan=path.join(directory,'plan.json');
 command(['migrate','plan','--target-dir',target,'--output',plan,'--archive-dir',path.join(directory,'archive'),'--json']);
 assert.deepEqual(fs.readFileSync(metadata),before,'迁移 plan 必须只读');
 command(['migrate','apply','--target-dir',target,'--plan',plan,'--json']);
 ensure(fs.readFileSync(agents,'utf8')!==oldBytes,'迁移没有更新旧受管资产');
 const second=JSON.parse(command(['migrate','apply','--target-dir',target,'--plan',plan,'--json']).stdout);ensure(second.reused===true,'同计划迁移未保持幂等');
 const noop=JSON.parse(command(['migrate','plan','--target-dir',target,'--output',path.join(directory,'noop.json'),'--json']).stdout);ensure(noop.operations===0,'升级后的迁移计划不是无操作');
 command(['migrate','rollback','--target-dir',target,'--apply','--json']);
 assert.deepEqual(fs.readFileSync(metadata),before,'回滚没有恢复 metadata');ensure(fs.readFileSync(agents,'utf8')===oldBytes&&fs.readFileSync(user,'utf8')==='uncommitted work','回滚或迁移破坏用户资产');
 return {family,status:'passed',cases:['init','doctor','diff','sync-dry-run','sync-apply','migration-plan-read-only','migration-apply','idempotency','rollback','user-file-preservation']};
}

/** Shared installed consumers: no packing or source-tree writes occur here. */
export function prepareArtifactConsumers({artifacts,directory,run}={}){
 ensure(Array.isArray(artifacts)&&artifacts.length>0&&typeof run==='function','共享准备缺少产物或命令执行器');
 ensure(path.isAbsolute(directory)&&!fs.existsSync(directory),'共享准备必须使用新绝对目录');
 const cliRoot=path.join(directory,'clis'),instanceRoot=path.join(directory,'instances'),environment={YSS_DEDICATED_CLI_ROOT:cliRoot,YSS_DEDICATED_INSTANCE_ROOT:instanceRoot};
 fs.mkdirSync(cliRoot,{recursive:true});fs.mkdirSync(instanceRoot,{recursive:true});
 const families=new Set();
 for(const artifact of artifacts){
  validateArtifact(artifact,artifact.source_tuple);const {family,package_name}=artifact.source_tuple;
  ensure(!families.has(family),'共享准备存在重复家族');families.add(family);
  const cli=path.join(cliRoot,definitions[family][0]);fs.cpSync(artifact.installed_root,cli,{recursive:true,dereference:false});
  ensure(installedTreeDigest(cli)===artifact.installed_tree_sha256,'共享消费副本与已安装产物不匹配');
  environment[`YSS_CLI_${family.toUpperCase()}_ROOT`]=cli;
  const args=family==='spec'?[]:['init'];
  run(process.execPath,[path.join(cli,'bin',`${package_name}.js`),...args,'--target-dir',path.join(instanceRoot,family),'--project-name',`Shared ${family}`,'--business-domain','模板共享验证',...(family==='spec'?['--agent-runtime','codex','--team-size','1','--issue-tracker','github']:[])],cli);
  ensure(installedTreeDigest(cli)===artifact.installed_tree_sha256,'共享准备污染了 CLI 消费副本');
 }
 return {environment,cli_root:cliRoot,instance_root:instanceRoot,families:[...families]};
}
