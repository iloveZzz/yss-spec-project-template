import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {createHash} from 'node:crypto';import {nativeInstalledSkillRefs,readInstanceMetadata} from '../scripts/lib/instance-metadata.mjs';
const sha=x=>createHash('sha256').update(x).digest('hex');

function installedPlatformContract() {
 const prefix='.codex/skills/product-design';
 const sourceRef=prefix+'/.codex-plugin/plugin.json', entryRef=prefix+'/skills/index/SKILL.md';
 const record={baseline:{type:'file',digest:'a'.repeat(64),mode:0o644},lastApplied:{type:'file',digest:'a'.repeat(64),mode:0o644},ownership:'managed'};
 return {sourceRef,entryRef,metadata:{distribution:{runtimes:['codex'],installedSkills:['product-design']},managedFiles:{[sourceRef]:structuredClone(record),[entryRef]:structuredClone(record)}},
  lock:{version:3,canonicalRoot:'.agents/skills',projectionRoots:['.codex/skills'],skills:{shared:{},platform:{'.codex/skills':{'product-design':{targets:['.codex/skills']}}}}},
  sources:{platformSkills:[{id:'product-design',root:'.codex/skills',aliases:['product-design:index']}],platformManifests:{[prefix]:{skills:'./skills/'}}}};
}
test('原生平台 Skill 必需入口由固定 manifest 与注册 alias 指定，缺 record 不得按物理存在豁免', () => {
 const f=installedPlatformContract();
 assert.deepEqual(nativeInstalledSkillRefs(f.metadata,f.lock,f.sources),[f.sourceRef,f.entryRef]);
 delete f.metadata.managedFiles[f.entryRef];
 assert.throws(()=>nativeInstalledSkillRefs(f.metadata,f.lock,f.sources),/INSTANCE_DISTRIBUTION:.*必需受管记录.*skills\/index\/SKILL.md/);
});
test('原生 installedSkills 必须有已声明来源，锁内合法用户扩展不冒充模板安装', () => {
 const f=installedPlatformContract();
 f.lock.skills.shared['local-user-skill']={targets:['.agents/skills','.codex/skills']};
 f.lock.skills.platform['.codex/skills']['local-user-group']={targets:['.codex/skills']};
 assert.deepEqual(nativeInstalledSkillRefs(f.metadata,f.lock,f.sources),[f.sourceRef,f.entryRef]);
 f.metadata.distribution.installedSkills.push('unknown-installed');
 assert.throws(()=>nativeInstalledSkillRefs(f.metadata,f.lock,f.sources),/INSTANCE_DISTRIBUTION:.*未知.*unknown-installed/);
});
test('原生已安装平台组的普通用户归属辅助记录不转换为受管入口', () => {
 const f=installedPlatformContract();
 for(const ownership of ['user-owned','protected'])f.metadata.managedFiles['.codex/skills/product-design/local-'+ownership+'.txt']={...structuredClone(f.metadata.managedFiles[f.entryRef]),ownership};
 assert.deepEqual(nativeInstalledSkillRefs(f.metadata,f.lock,f.sources),[f.sourceRef,f.entryRef]);
 f.metadata.managedFiles[f.entryRef].ownership='protected';
 assert.throws(()=>nativeInstalledSkillRefs(f.metadata,f.lock,f.sources),/受管记录不能被豁免.*SKILL.md/);
});
test('原生平台 Skill 未声明 source、alias 或越界来源路径时明确拒绝', async t => {
 for(const kind of ['registry','alias','manifest','absolute','parent','backslash'])await t.test(kind,()=>{
  const f=installedPlatformContract();
  if(kind==='registry')f.sources.platformSkills=[];
  else if(kind==='alias')f.sources.platformSkills[0].aliases=[];
  else if(kind==='manifest')f.sources.platformManifests={};
  else f.sources.platformManifests['.codex/skills/product-design'].skills={absolute:'/skills/',parent:'./../skills/',backslash:'skills\\index'}[kind];
  assert.throws(()=>nativeInstalledSkillRefs(f.metadata,f.lock,f.sources),/INSTANCE_DISTRIBUTION:/);
 });
});
test('原生共享 Skill 的 canonical 与所选投影入口始终需要非豁免基线', () => {
 const f=installedPlatformContract();
 f.metadata.distribution.installedSkills=['shared-skill'];
 f.lock.skills.shared={'shared-skill':{targets:['.agents/skills','.codex/skills']}};
 f.lock.skills.platform={};
 const canonical='.agents/skills/shared-skill/SKILL.md',projection='.codex/skills/shared-skill/SKILL.md';
 const record=structuredClone(f.metadata.managedFiles[f.entryRef]);
 f.metadata.managedFiles={[canonical]:record,[projection]:structuredClone(record)};
 assert.deepEqual(nativeInstalledSkillRefs(f.metadata,f.lock,f.sources),[canonical,projection]);
 delete f.metadata.managedFiles[canonical];
 assert.throws(()=>nativeInstalledSkillRefs(f.metadata,f.lock,f.sources),/必需受管记录.*\.agents/);
 f.metadata.managedFiles[canonical]={...record,ownership:'user-owned'};
 assert.throws(()=>nativeInstalledSkillRefs(f.metadata,f.lock,f.sources),/受管记录不能被豁免/);
});
test('原生平台来源必须正向绑定所选运行时与 targets', () => {
 const f=installedPlatformContract();
 f.metadata.distribution.runtimes=['cursor'];
 assert.throws(()=>nativeInstalledSkillRefs(f.metadata,f.lock,f.sources),/运行时不一致/);
 f.metadata.distribution.runtimes=['codex'];f.lock.skills.platform['.codex/skills']['product-design'].targets=['.cursor/skills'];
 assert.throws(()=>nativeInstalledSkillRefs(f.metadata,f.lock,f.sources),/targets 不一致/);
});
test('native metadata supplies managed bytes and rejects damaged lineage',t=>{const root=fs.mkdtempSync(path.join(os.tmpdir(),'yss-native-meta-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));const managed={'README.md':{baseline:{type:'file',digest:'a'.repeat(64),mode:420},lastApplied:{type:'file',digest:'a'.repeat(64),mode:420},ownership:'managed'}};const meta={schemaVersion:1,protocolVersion:1,profile:'spec',profileId:'harness.spec-template',templateSourceState:'committed',templateCommit:'a'.repeat(40),snapshotHash:'a'.repeat(64),manifestHash:'b'.repeat(64),variables:{},distribution:{mode:'selected'},managedFiles:managed,baselineDigest:sha(JSON.stringify(managed))};fs.writeFileSync(path.join(root,'.yss.json'),JSON.stringify(meta));assert.equal(readInstanceMetadata(root).kind,'native');meta.baselineDigest='0'.repeat(64);fs.writeFileSync(path.join(root,'.yss.json'),JSON.stringify(meta));assert.throws(()=>readInstanceMetadata(root),/基线摘要不一致/);});
test('unknown native identity never falls back to archived legacy metadata',t=>{const root=fs.mkdtempSync(path.join(os.tmpdir(),'yss-native-meta-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));fs.writeFileSync(path.join(root,'.yss.json'),'{"schemaVersion":99}');fs.writeFileSync(path.join(root,'.yss-template.json'),'{"managedFiles":{}}');assert.throws(()=>readInstanceMetadata(root),/未知 native/);});

test('插件 binding 存在但缺少原生身份时不能回退为旧实例', t => {
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'yss-native-meta-'));
 t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 fs.writeFileSync(path.join(root,'.yss-template.json'),'{"managedFiles":{}}');
 fs.writeFileSync(path.join(root,'.yss-backend-plugin.json'),JSON.stringify({schema_version:2,plugin:'yss-backend-delivery',profile:'spec'}));
 assert.throws(()=>readInstanceMetadata(root),/binding.*原生身份/);
});

function nativeFixture(t, version=2, profile='spec') {
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'yss-native-meta-'));
 t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const metadata={schemaVersion:version,protocolVersion:1,profile,
  profileId:{spec:'harness.spec-template',backend:'harness.backend-delivery',design:'harness.business-ddd-strategy-handoff'}[profile],
  templateSourceState:'committed',templateCommit:'a'.repeat(40),snapshotHash:'b'.repeat(64),manifestHash:'c'.repeat(64),
  variables:{},distribution:{mode:'selected'},managedFiles:{},baselineDigest:sha('{}')};
 if(version>=2)Object.assign(metadata,{bundleSchemaVersion:version,bundleHash:'d'.repeat(64),cliSourceState:'committed',cliCommit:'e'.repeat(40)});
 if(version===5)metadata.distribution.installation='governed';
 const save=()=>fs.writeFileSync(path.join(root,'.yss.json'),JSON.stringify(metadata));save();
 return {root,metadata,save};
}
test('metadata v3/4/5 绑定模板基线与保留决定，并保留本地0600权限', async t => {
 for(const version of [3,4,5])await t.test(`Schema ${version}`,t=>{
 const f=nativeFixture(t,version);
 const baseline={type:'file',digest:'a'.repeat(64),mode:420};
 const applied={type:'file',digest:'b'.repeat(64),mode:384};
 const item={baseline,lastApplied:applied,ownership:'managed-customizable',baselineSource:{kind:'bundle',templateCommit:f.metadata.templateCommit,snapshotHash:f.metadata.snapshotHash,bundleHash:f.metadata.bundleHash,path:'AGENTS.md',variant:'initial',templateDigest:'c'.repeat(64)},disposition:{choice:'keep-local',target:baseline,applied}};
 f.metadata.managedFiles={'AGENTS.md':item};f.metadata.baselineDigest=sha(JSON.stringify(f.metadata.managedFiles));f.save();
 assert.equal(readInstanceMetadata(f.root).metadata.managedFiles['AGENTS.md'].lastApplied.mode,384);
 item.disposition.applied={...applied,digest:'0'.repeat(64)};f.metadata.baselineDigest=sha(JSON.stringify(f.metadata.managedFiles));f.save();
 assert.throws(()=>readInstanceMetadata(f.root),/保留决定与基线矛盾/);
 });
});
test('后端插件 binding 必须匹配原生家族和来源，保留旧 metadata 不改变身份', async t => {
 const profile='spec';
 for(const version of [2,3,4,5])await t.test(`Schema ${version}`, async t=>{
  const f=nativeFixture(t,version,profile);
  const ref=profile==='spec'?'.yss-backend-plugin.json':'.yss-product-design-plugin.json';
  const legacy=profile==='spec'?'.yss-template.json':'.yss-harness-design.json';
  const binding={schema_version:2,plugin:profile==='spec'?'yss-backend-delivery':'yss-product-design',profile,
   template_commit:f.metadata.templateCommit,bundle_hash:f.metadata.bundleHash,binary_sha256:'f'.repeat(64)};
  const put=value=>fs.writeFileSync(path.join(f.root,ref),JSON.stringify(value));
  if(version<4)fs.writeFileSync(path.join(f.root,legacy),'{"managedFiles":{}}');
  put(binding);assert.equal(readInstanceMetadata(f.root).kind,'native');
  for(const [key,value] of [['schema_version',99],['plugin','unknown-plugin'],['profile','frontend'],['template_commit','0'.repeat(40)],['bundle_hash','0'.repeat(64)],['binary_sha256','broken-digest']]) {
   put({...binding,[key]:value});assert.throws(()=>readInstanceMetadata(f.root),/binding 与原生身份或来源不一致/,key);
  }
  put(binding);
  fs.writeFileSync(path.join(f.root,ref),'{"schema_version":2,"schema_version":99}');
  assert.throws(()=>readInstanceMetadata(f.root),/ASSET_PARSE|Map keys must be unique/);
 });
});

test('metadata5 明确区分技能与治理安装，身份查询不创建治理资格或资产', async t => {
 for(const profile of ['spec','backend'])for(const installation of ['skills','governed'])await t.test(`${profile}/${installation}`,t=>{
  const f=nativeFixture(t,5,profile);f.metadata.distribution.installation=installation;f.save();
  const before=fs.readFileSync(path.join(f.root,'.yss.json'));
  const result=readInstanceMetadata(f.root);
  assert.equal(result.kind,'native');assert.equal(result.profile,profile);
  assert.equal(result.metadata.distribution.installation,installation);
  assert.deepEqual(fs.readFileSync(path.join(f.root,'.yss.json')),before);
  assert.deepEqual(fs.readdirSync(f.root),['.yss.json']);
 });
});

test('未知安装方式、旧身份选择技能安装及技能实例绑定治理插件均拒绝', async t => {
 for(const installation of [undefined,'unknown'])await t.test(`metadata5/${installation}`,t=>{
  const f=nativeFixture(t,5);f.metadata.distribution.installation=installation;f.save();
  assert.throws(()=>readInstanceMetadata(f.root),/installation/);
 });
 for(const version of [3,4])await t.test(`legacy metadata${version}/skills`,t=>{
  const f=nativeFixture(t,version);f.metadata.distribution.installation='skills';f.save();
  assert.throws(()=>readInstanceMetadata(f.root),/installation/);
 });
 await t.test('metadata5/skills/plugin-binding',t=>{
  const f=nativeFixture(t,5);f.metadata.distribution.installation='skills';f.save();
  fs.writeFileSync(path.join(f.root,'.yss-backend-plugin.json'),JSON.stringify({schema_version:2,plugin:'yss-backend-delivery',profile:'spec',template_commit:f.metadata.templateCommit,bundle_hash:f.metadata.bundleHash,binary_sha256:'f'.repeat(64)}));
  assert.throws(()=>readInstanceMetadata(f.root),/binding 与原生身份或来源不一致/);
 });
});

test('metadata4/5 不接受并存的旧家族身份或未知 schema，查询不追随身份链接', async t => {
 for(const version of [4,5])await t.test(`Schema ${version}`,t=>{
  const f=nativeFixture(t,version);
  fs.writeFileSync(path.join(f.root,'.yss-template.json'),'{}');
  assert.throws(()=>readInstanceMetadata(f.root),/不接受家族 metadata/);
  fs.rmSync(path.join(f.root,'.yss-template.json'));
  f.metadata.schemaVersion=6;f.save();assert.throws(()=>readInstanceMetadata(f.root),/未知 native/);
  f.metadata.schemaVersion=version;f.save();
  const file=path.join(f.root,'.yss.json'), saved=path.join(f.root,'saved.json');
  fs.renameSync(file,saved);fs.symlinkSync(saved,file);
  assert.throws(()=>readInstanceMetadata(f.root),/身份路径必须为普通文件/);
 });
});
test('Schema 1/2 的同家族旧 metadata 只作 lineage，未知家族仍拒绝', async t => {
 for(const version of [1,2])await t.test(`Schema ${version}`,t=>{
  const f=nativeFixture(t,version);
  fs.writeFileSync(path.join(f.root,'.yss-template.json'),'{"managedFiles":{"historic":{"contentHash":"obsolete"}}}');
  fs.writeFileSync(path.join(f.root,'.yss-plugin.json'),'historical opaque bytes');
  assert.equal(readInstanceMetadata(f.root).kind,'native');
  fs.rmSync(path.join(f.root,'.yss-template.json'));
  fs.writeFileSync(path.join(f.root,'.yss-harness-design.json'),'{"managedFiles":{}}');
  assert.throws(()=>readInstanceMetadata(f.root),/家族身份矛盾|Design.*移除/);
 });
});

test('Design 身份与插件只作为拒绝信号，原件保持不变', async t => {
 for(const ref of ['.yss-harness-design.json','.yss-product-design-plugin.json'])await t.test(ref,t=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'removed-design-'));
  t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  const file=path.join(root,ref);fs.writeFileSync(file,'{}\n',{mode:0o600});
  assert.throws(()=>readInstanceMetadata(root),/Design.*移除/);
  assert.equal(fs.readFileSync(file,'utf8'),'{}\n');
  assert.equal(fs.statSync(file).mode&0o777,0o600);
  assert.deepEqual(fs.readdirSync(root),[ref]);
 });
 const f=nativeFixture(t,3,'design');
 assert.throws(()=>readInstanceMetadata(f.root),/Design.*移除/);
});

test('原生实例可以声明 claude 运行时，投影根必须与运行时一一对应', () => {
 const none={platformSkills:[],platformManifests:{}};
 const lock={version:3,canonicalRoot:'.agents/skills',projectionRoots:['.claude/skills'],skills:{shared:{},platform:{}}};
 const metadata={distribution:{runtimes:['claude'],installedSkills:[]},managedFiles:{}};
 assert.deepEqual(nativeInstalledSkillRefs(metadata,lock,none),[]);
 assert.throws(()=>nativeInstalledSkillRefs(metadata,{...lock,projectionRoots:['.codex/skills']},none),/INSTANCE_DISTRIBUTION:.*Skill 平台范围与实例运行时不一致/);
 assert.throws(()=>nativeInstalledSkillRefs({distribution:{runtimes:['claude','unknown-runtime'],installedSkills:[]},managedFiles:{}},lock,none),/INSTANCE_DISTRIBUTION:.*未知或重复运行时声明/);
});

test('本地工作树模板必须绑定不可变 tree 且由工作树 CLI 执行', t => {
 const f=nativeFixture(t,3);
 Object.assign(f.metadata,{templateSourceState:'working-tree',templateVersion:'worktree:'+'f'.repeat(40),cliSourceState:'working-tree'});f.save();
 assert.equal(readInstanceMetadata(f.root).kind,'native');
 f.metadata.templateVersion='worktree:HEAD';f.save();assert.throws(()=>readInstanceMetadata(f.root),/来源/);
 f.metadata.templateVersion='worktree:'+'f'.repeat(40);f.metadata.cliSourceState='committed';f.save();assert.throws(()=>readInstanceMetadata(f.root),/来源/);
});

test('metadata4/5 的 Spec 身份只读取绑定历史来源，不启用 Design 原政策',async t=>{
 for(const version of [4,5])await t.test(`Schema ${version}`,t=>{
 const f=nativeFixture(t,version);
 for(const source_profile of ['spec','backend','design']) {
  const bytes=JSON.stringify({schema_version:1,kind:'governance-original-source',source_profile,files:{}}),digest=sha(bytes),ref=`.template-spec/compatibility/governance-history/${digest}/manifest.json`;
  fs.mkdirSync(path.dirname(path.join(f.root,ref)),{recursive:true});fs.writeFileSync(path.join(f.root,ref),bytes,{mode:0o600});f.metadata.governanceHistory={ref,digest};f.save();
  if(source_profile==='design')assert.throws(()=>readInstanceMetadata(f.root),/历史来源 Profile/);
  else assert.equal(readInstanceMetadata(f.root).profile,'spec');
  assert.equal(fs.readFileSync(path.join(f.root,ref),'utf8'),bytes);
  assert.equal(fs.statSync(path.join(f.root,ref)).mode&0o777,0o600);
 }
 const history=f.metadata.governanceHistory;
 f.metadata.governanceHistory={...history,ref:'../manifest.json'};f.save();assert.throws(()=>readInstanceMetadata(f.root),/历史来源绑定/);
 f.metadata.governanceHistory=history;f.save();
 fs.appendFileSync(path.join(f.root,history.ref),'\n');assert.throws(()=>readInstanceMetadata(f.root),/历史来源摘要/);
 });
});
