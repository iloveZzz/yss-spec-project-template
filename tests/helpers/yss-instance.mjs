// 旧协议测试使用原固定 CLI 实际 init 的冻结资产，由当前原生执行器核验；不把旧批准改成新政策。
// 新政策安装链使用 role-independent-draft/installed-fixture.mjs 的现场 init；本夹具不证明受管分发完整性。
import assert from 'node:assert/strict';
import {cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {contextBinary} from '../../scripts/lib/native-context.mjs';

const roots = new Set(); // 退出时统一清理，调用方也可以提前清理
process.on('exit', () => { for (const dir of roots) rmSync(dir, {recursive: true, force: true}); });
const templates = new Map();
const {binary}=contextBinary();
const archive=readFileSync(new URL('./fixtures/native-legacy.json.gz',import.meta.url));
const provenance=JSON.parse(readFileSync(new URL('./fixtures/native-legacy.provenance.json',import.meta.url),'utf8'));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
assert.equal(sha(archive),provenance.archiveSha256,'旧原生夹具归档摘要漂移');
const snapshot=JSON.parse(gunzipSync(archive));

export const hasYss = Boolean(binary);

function templateInstance(profile) {
  if (templates.has(profile)) return templates.get(profile);
  const base = realpathSync(mkdtempSync(path.join(os.tmpdir(), 'yss-instance-template-')));
  process.on('exit', () => rmSync(base, {recursive: true, force: true}));
  const files=snapshot.profiles[profile];assert.ok(files,`缺少冻结旧实例: ${profile}`);
  const root=path.join(base,'inst');
  for(const [ref,file]of Object.entries(files)) {
    assert.ok(!path.isAbsolute(ref)&&!ref.split('/').includes('..'),'旧原生夹具路径越界');
    const bytes=Buffer.from(snapshot.objects[file.sha256],'base64');assert.equal(sha(bytes),file.sha256,ref);
    const target=path.join(root,ref);mkdirSync(path.dirname(target),{recursive:true});writeFileSync(target,bytes,{mode:file.executable?0o755:0o644});
  }
  assert.equal(sha(readFileSync(path.join(root,'.yss.json'))),provenance.profiles[profile].metadataSha256);
  templates.set(profile, root);
  return templates.get(profile);
}

/** 返回一个新的项目根（已 realpath）；调用方负责清理。 */
export function makeRoot(prefix = 'yss-test-', profile = 'spec') {
  assert.ok(['spec','backend'].includes(profile),'unsupported fixture Profile: '+profile);
  const dir = realpathSync(mkdtempSync(path.join(os.tmpdir(), prefix)));
  roots.add(dir);
  cpSync(templateInstance(profile), dir, {recursive: true, verbatimSymlinks: true});
  // Exercise the current Node callers against a real initialized identity. These
  // fixture overlays are not distributed Bundle or managed-file integrity proof.
  const source=path.resolve(import.meta.dirname,'../..');
  cpSync(path.join(source,'scripts/lib'),path.join(dir,'scripts/lib'),{recursive:true});
  const overlay=path.join(source,'profiles',profile,'scripts/lib');if(existsSync(overlay))cpSync(overlay,path.join(dir,'scripts/lib'),{recursive:true});
  for(const name of ['approval-record','approval-current','approval-consumption','approval-record-io','approval-checkpoint-discovery','user-decision','user-decision-reuse','decision-continuation'])rmSync(path.join(dir,'scripts/lib',name+'.mjs'),{force:true});
  for(const skill of ['yss-ddd-scaffold-generator','yss-layered-mvc-scaffold-generator','yss-prototype-stage','yss-stage-decision','yss-technical-design']){const target=path.join(dir,'.agents/skills',skill,'scripts');if(existsSync(target))cpSync(path.join(source,'.agents/skills',skill,'scripts'),target,{recursive:true});}
  // init 留下的已完成事务日志绑定在原路径上，复制后会被识别为身份不符；它只是历史记录，复制件里不需要。
  rmSync(path.join(dir, '.yss', 'transactions'), {recursive: true, force: true});
  return dir;
}
