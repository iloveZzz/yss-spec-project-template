// 测试用项目根：有固定版本 yss 时给出「现场 yss init 一次、之后按需复制」的真实 spec 实例，批准与用户决定的校验才能真正委托给 yss；
// 没有 yss 时退回普通临时目录（测试仍可跑，只是走进程内实现）。
import {cpSync, mkdtempSync, realpathSync, rmSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {contextBinary} from '../../scripts/lib/native-context.mjs';

let template;
let binary;
try { binary = contextBinary().binary; } catch { binary = null; }

export const hasYss = Boolean(binary);

function templateInstance() {
  if (template) return template;
  const base = realpathSync(mkdtempSync(path.join(os.tmpdir(), 'yss-instance-template-')));
  process.on('exit', () => rmSync(base, {recursive: true, force: true}));
  const init = spawnSync(binary, ['init', '--profile', 'spec', '--root', path.join(base, 'inst'), '--project-name', 'test'], {encoding: 'utf8'});
  if (init.status !== 0) throw new Error(`yss init 失败：${init.stderr || init.stdout}`);
  return (template = path.join(base, 'inst'));
}

/** 返回一个新的项目根（已 realpath）；调用方负责清理。 */
export function makeRoot(prefix = 'yss-test-') {
  const dir = realpathSync(mkdtempSync(path.join(os.tmpdir(), prefix)));
  if (!binary) return dir;
  cpSync(templateInstance(), dir, {recursive: true, verbatimSymlinks: true});
  // init 留下的已完成事务日志绑定在原路径上，复制后会被识别为身份不符；它只是历史记录，复制件里不需要。
  rmSync(path.join(dir, '.yss', 'transactions'), {recursive: true, force: true});
  return dir;
}
