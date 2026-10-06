import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {spawnSync} from 'node:child_process';
import {NATIVE_PROFILES, nativeBinary, nativeDigest, decodeNative, runNative, initializeNative, applyNative, inspectNative} from '../.template-source/scripts/lib/native-yss.mjs';

const scratch=t=>{const root=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'yss-native-consumer-')));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));return root;};
const put=(root,ref,bytes,mode=0o644)=>{const file=path.join(root,ref);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,bytes,{mode});return file;};
const tree=root=>{
  if(!fs.existsSync(root))return [];
  return fs.readdirSync(root,{recursive:true}).sort().map(ref=>{const file=path.join(root,ref),stat=fs.lstatSync(file);return [ref,stat.isDirectory()?'directory':stat.isSymbolicLink()?'symlink':'file',stat.mode&0o777,stat.isFile()?nativeDigest(fs.readFileSync(file)):stat.isSymbolicLink()?fs.readlinkSync(file):null];});
};

test('消费版本化 envelope 并拒绝伪成功、错误码替换和未知协议',()=>{
  const ok={outputVersion:1,protocolVersion:1,command:'sync',profile:'spec',status:'ok',code:'OK',result:{}};
  assert.equal(decodeNative({stdout:JSON.stringify(ok),status:0},'sync').code,'OK');
  for(const invalid of [{...ok,protocolVersion:99},{...ok,status:'applied'},{...ok,code:'INPUT_DRIFT'}])assert.throws(()=>decodeNative({stdout:JSON.stringify(invalid),status:0},'sync'));
  assert.throws(()=>decodeNative({stdout:JSON.stringify(ok),status:1},'sync'),/退出码/);
  assert.throws(()=>decodeNative({stdout:JSON.stringify({...ok,status:'error',code:'INPUT_DRIFT'}),status:1},'sync','CONFLICT'),/错误码/);
});

test('二进制固定输入拒绝链接及摘要漂移',t=>{
  const root=scratch(t),binary=put(root,'yss','fixed bytes',0o755);
  assert.equal(nativeBinary({YSS_NATIVE_BINARY:binary}).digest,nativeDigest('fixed bytes'));
  assert.throws(()=>nativeBinary({YSS_NATIVE_BINARY:binary,YSS_NATIVE_BINARY_SHA256:'0'.repeat(64)}),/摘要漂移/);
  fs.symlinkSync(binary,path.join(root,'alias'));
  assert.throws(()=>nativeBinary({YSS_NATIVE_BINARY:path.join(root,'alias')}),/普通文件/);
});

for(const profile of NATIVE_PROFILES)test(`${profile}: 内容来源、预演、幂等同步与用户资产保护`,t=>{
  nativeBinary();const base=scratch(t),target=path.join(base,profile);
  const first=runNative(['init','--profile',profile,'--root',target,'--plan','--out',path.join(base,'init.json')]).result;
  assert.equal(fs.existsSync(target),false,'保存计划不能初始化项目');assert.ok(first.stats.changed>10);
  runNative(['init','--profile',profile,'--root',target,'--apply','--plan-file',path.join(base,'init.json')]);
  const metadata=JSON.parse(fs.readFileSync(path.join(target,'.yss.json'))),inspection=inspectNative(profile);
  assert.equal(metadata.profile,profile);assert.equal(metadata.protocolVersion,1);assert.equal(metadata.templateCommit,inspection.templateCommit);assert.equal(metadata.snapshotHash,inspection.sourceSnapshotHash);
  assert.match(fs.readFileSync(path.join(target,'yss-project.yaml'),'utf8'),/repository_mode:\s*project-instance/);
  for(const ref of ['.template-source','submodules','.github'])assert.equal(fs.existsSync(path.join(target,ref)),false);
  fs.appendFileSync(path.join(target,'CONTEXT.md'),'\n用户自定义备注：保留当前业务词汇。\n');
  const context=fs.readFileSync(path.join(target,'CONTEXT.md'));
  put(target,'src/business.txt','dirty business',0o600);put(target,'.github/workflows/user.yml','name: User\n',0o644);put(target,'.git/index','staged index',0o600);
  const protectedModes=['src/business.txt','.git/index'].map(ref=>fs.statSync(path.join(target,ref)).mode&0o777);
  const before=tree(target),preview=runNative(['sync','--root',target]).result;
  assert.equal(preview.stats.conflicts,0);assert.deepEqual(tree(target),before,'同步预演不能写入');
  applyNative('sync',profile,target,path.join(base,'sync.json'));
  assert.deepEqual(fs.readFileSync(path.join(target,'CONTEXT.md')),context);assert.equal(fs.readFileSync(path.join(target,'src/business.txt'),'utf8'),'dirty business');assert.equal(fs.readFileSync(path.join(target,'.git/index'),'utf8'),'staged index');assert.equal(fs.readFileSync(path.join(target,'.github/workflows/user.yml'),'utf8'),'name: User\n');
  assert.deepEqual(['src/business.txt','.git/index'].map(ref=>fs.statSync(path.join(target,ref)).mode&0o777),protectedModes);
  const repeated=runNative(['sync','--root',target]).result;assert.equal(repeated.stats.changed,0);assert.equal(repeated.stats.conflicts,0);
  const initialized=tree(target);runNative(['init','--profile',profile,'--root',target],{expectedCode:'CONFLICT'});assert.deepEqual(tree(target),initialized);
  runNative(['sync','--root',target,'--force'],{expectedCode:'ARGUMENT'});assert.deepEqual(tree(target),initialized);
});

test('项目内计划输出与后续输入漂移按各自错误码拒绝并保留现场',t=>{
  nativeBinary();const base=scratch(t),target=path.join(base,'project');initializeNative('spec',target);
  put(target,'.git/index','original index');const initial=tree(target);
  runNative(['sync','--root',target,'--plan','--out',path.join(target,'.git/index')],{expectedCode:'PROTECTED'});assert.deepEqual(tree(target),initial);
  const plan=path.join(base,'sync.json');runNative(['sync','--root',target,'--plan','--out',plan]);
  fs.appendFileSync(path.join(target,'CONTEXT.md'),'\n后续用户修改\n');const modified=tree(target);
  runNative(['sync','--root',target,'--apply','--plan-file',plan],{expectedCode:'INPUT_DRIFT'});assert.deepEqual(tree(target),modified);
});

test('公开 Bundle 导出保持完整文件 bytes、mode 和 manifest，拒绝覆盖目录',t=>{
  nativeBinary();const base=scratch(t),out=path.join(base,'export');
  const result=runNative(['bundle','export','--profile','spec','--out',out]).result;
  assert.equal(result.directory,out);const inspection=result.inspection;
  assert.equal(inspection.schemaVersion,2);assert.ok(result.files.length>10);
  for(const entry of result.files){const file=path.join(out,entry.path);assert.equal(nativeDigest(fs.readFileSync(file)),entry.digest,entry.path);assert.equal(fs.statSync(file).mode&0o777,entry.mode,entry.path);}
  const before=tree(out);
  runNative(['bundle','export','--profile','spec','--out',out],{expectedCode:'EXISTS'});assert.deepEqual(tree(out),before);
});

test('Spec 原生阶段资源与 Skill 补装通过保存计划完整闭包安装且保留用户词汇',t=>{
 const base=scratch(t),target=path.join(base,'selected');initializeNative('spec',target);
 const context=fs.readFileSync(path.join(target,'CONTEXT.md')),before=tree(target),plan=path.join(base,'assets.json');
 const assets=runNative(['assets','ensure','stage.system-data-engineering','--profile','spec','--root',target,'--plan','--out',plan]).result;
 assert.deepEqual(tree(target),before);assert.ok(assets.changes.some(row=>row.path==='scripts/backend-delivery'));
 runNative(['assets','ensure','stage.system-data-engineering','--profile','spec','--root',target,'--apply','--plan-file',plan]);
 assert.ok(fs.existsSync(path.join(target,'scripts/backend-delivery')));assert.ok(fs.existsSync(path.join(target,'.agents/skills/yss-implementation-contract-compiler/SKILL.md')));
 applyNative('skills','spec',target,path.join(base,'skill.json'),['ensure','yss-tactical-design']);
 assert.ok(fs.existsSync(path.join(target,'.agents/skills/yss-tactical-design/SKILL.md')));assert.ok(fs.existsSync(path.join(target,'scripts/verify-strategic-handoff-consumption')));
 assert.deepEqual(fs.readFileSync(path.join(target,'CONTEXT.md')),context);
 const metadata=JSON.parse(fs.readFileSync(path.join(target,'.yss.json')));assert.equal(metadata.schemaVersion,2);assert.equal(metadata.bundleSchemaVersion,2);
 const preview=runNative(['sync','--root',target]).result;assert.equal(preview.stats.changed,0);assert.equal(preview.stats.conflicts,0);
});

test('现役 archify 与 yss-research 补装不能绕过 UNPORTED，安装闭包中的真实入口可执行',t=>{
 const base=scratch(t),target=path.join(base,'research');initializeNative('spec',target);
 const context=fs.readFileSync(path.join(target,'CONTEXT.md')),inspection=inspectNative('spec');
 for(const skill of ['archify','yss-research']){
  const requirement=inspection.skillRequirements[skill];assert.ok(requirement,skill);
  assert.equal(requirement.unsupportedReason,undefined,`${skill} 是现役必要能力，UNPORTED 必须阻断`);
  assert.ok(requirement.paths.length>0,`${skill} 不能使用空闭包`);
  const plan=path.join(base,`${skill}.json`),before=tree(target);
  const preview=runNative(['skills','ensure',skill,'--profile','spec','--root',target,'--plan','--out',plan]).result;
  assert.deepEqual(tree(target),before,'保存补装计划不能写入实例');assert.ok(preview.changes.length>0);
  runNative(['skills','ensure',skill,'--profile','spec','--root',target,'--apply','--plan-file',plan]);
  assert.ok(fs.existsSync(path.join(target,'.agents/skills',skill,'SKILL.md')));
 }
 const doctor=spawnSync(process.execPath,['.agents/skills/archify/bin/archify.mjs','doctor'],{cwd:target,encoding:'utf8',timeout:60000});
 assert.equal(doctor.status,0,doctor.stderr);assert.equal(doctor.error,undefined);
 const validator=spawnSync(process.execPath,['.agents/skills/yss-research/scripts/validate-research-package.mjs'],{cwd:target,encoding:'utf8',timeout:60000});
 assert.equal(validator.status,1,validator.stderr);assert.match(validator.stderr,/usage: validate-research-package/);
 assert.doesNotMatch(validator.stderr,/ERR_MODULE_NOT_FOUND|Cannot find module/);
 assert.deepEqual(fs.readFileSync(path.join(target,'CONTEXT.md')),context);
 const preview=runNative(['sync','--root',target]).result;assert.equal(preview.stats.changed,0);assert.equal(preview.stats.conflicts,0);
});
