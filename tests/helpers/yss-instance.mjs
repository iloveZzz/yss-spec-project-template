// 测试用项目根：有固定版本 yss 时给出「现场 yss init 一次、之后按需复制」的真实 spec 实例，批准与用户决定的校验才能真正委托给 yss；
// 校验只能使用原生执行器；缺执行器直接失败，不制造合成根回退。
import {cpSync, existsSync, mkdtempSync, realpathSync, rmSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {contextBinary} from '../../scripts/lib/native-context.mjs';

const roots = new Set(); // 退出时统一清理，调用方也可以提前清理
process.on('exit', () => { for (const dir of roots) rmSync(dir, {recursive: true, force: true}); });
const templates = new Map();
const {binary}=contextBinary();

export const hasYss = Boolean(binary);

function templateInstance(profile) {
  if (templates.has(profile)) return templates.get(profile);
  const base = realpathSync(mkdtempSync(path.join(os.tmpdir(), 'yss-instance-template-')));
  process.on('exit', () => rmSync(base, {recursive: true, force: true}));
  const init = spawnSync(binary, ['init', '--profile', profile, '--root', path.join(base, 'inst'), '--project-name', 'test'], {encoding: 'utf8'});
  if (init.status !== 0) throw new Error(`yss init 失败：${init.stderr || init.stdout}`);
  templates.set(profile, path.join(base, 'inst'));
  return templates.get(profile);
}

/** 返回一个新的项目根（已 realpath）；调用方负责清理。 */
export function makeRoot(prefix = 'yss-test-', profile = 'spec') {
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
