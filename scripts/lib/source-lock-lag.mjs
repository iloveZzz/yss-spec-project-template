import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

/** yss-cli 的来源锁：固定四个模板各自的提交，Bundle 与 Node 预言机都以它为准。 */
export const SOURCE_LOCK_REF = 'submodules/yss-cli/docs/source-lock.json';
export const BUNDLE_PROFILE_REF = '.template-source/distribution/bundle-profile.json';

/**
 * 允许落后的「会进入 Bundle 的输入」提交数上限。
 * 依据：上一次刷新（d947b648 → cad38300）时落后 19 个提交，其中 7 个触及 Bundle 输入，Node/Go 预言机已经裁决分歧；
 * 所以阈值必须小于 7。只数输入提交，是因为文档与维护记录类提交不会改变 Bundle，不该让门禁变红。
 */
export const MAX_LAG_COMMITS = 5;

function git(repo, args) {
  const result = spawnSync('git', ['-C', repo, ...args], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  return { status: result.status, stdout: result.stdout ?? '', stderr: (result.stderr ?? '').trim() };
}

function readJson(file, label) {
  if (!existsSync(file)) throw new TypeError(`SOURCE_LOCK_LAG: 缺少 ${label}（${file}）；子模块未初始化时无法评估落后程度`);
  try { return JSON.parse(readFileSync(file, 'utf8')); } catch (error) { throw new TypeError(`SOURCE_LOCK_LAG: ${label} 不是有效 JSON: ${error.message}`); }
}

/** 按 Bundle 策略生成 git pathspec：只包含会进入 Bundle 的根与文件，排除策略明确排除的路径。 */
export function bundleInputPathspecs(manifest) {
  const list = (key) => (Array.isArray(manifest?.[key]) ? manifest[key] : []);
  const include = [...list('allowRootEntries'), ...list('allowRootFiles'), ...list('allowFiles')];
  if (!include.length) throw new TypeError('SOURCE_LOCK_LAG: bundle-profile.json 的 manifest 没有 allowRootEntries / allowRootFiles，无法界定 Bundle 输入');
  const exclude = [...list('excludeRootEntries'), ...list('excludeRootFiles'), ...list('excludePaths')].map((entry) => `:(exclude)${entry}`);
  return [...include, ...exclude];
}

/** 锁里每个条目的落后程度：锁定提交到该模板当前 HEAD 之间，触及 Bundle 输入的提交数。 */
export function measureLag(root, { max = MAX_LAG_COMMITS } = {}) {
  const lock = readJson(path.join(root, SOURCE_LOCK_REF), '来源锁');
  if (!lock.profiles || typeof lock.profiles !== 'object') throw new TypeError('SOURCE_LOCK_LAG: 来源锁缺少 profiles');
  const rows = [];
  for (const [profile, source] of Object.entries(lock.profiles)) {
    const repo = path.resolve(root, source.sourcePath ?? '.');
    if (!existsSync(path.join(repo, '.git'))) throw new TypeError(`SOURCE_LOCK_LAG: ${profile} 的模板仓库 ${source.sourcePath} 未检出，无法评估`);
    const pinned = source.templateCommit;
    if (!/^[0-9a-f]{40}$/.test(pinned ?? '')) throw new TypeError(`SOURCE_LOCK_LAG: ${profile} 的 templateCommit 不是完整提交号`);
    if (git(repo, ['cat-file', '-e', `${pinned}^{commit}`]).status !== 0) throw new TypeError(`SOURCE_LOCK_LAG: ${profile} 的锁定提交 ${pinned.slice(0, 8)} 在 ${source.sourcePath} 里不存在；浅克隆需要完整历史`);
    const manifest = readJson(path.join(repo, BUNDLE_PROFILE_REF), `${profile} 的 Bundle 策略`).manifest;
    const specs = bundleInputPathspecs(manifest);
    const counted = git(repo, ['rev-list', '--count', `${pinned}..HEAD`, '--', ...specs]);
    const total = git(repo, ['rev-list', '--count', `${pinned}..HEAD`]);
    if (counted.status !== 0 || total.status !== 0) throw new TypeError(`SOURCE_LOCK_LAG: ${profile} 无法统计提交（${counted.stderr || total.stderr}）；锁定提交需是当前 HEAD 的祖先`);
    const lag = Number(counted.stdout.trim());
    rows.push({ profile, pinned, head: git(repo, ['rev-parse', 'HEAD']).stdout.trim(), lag, all_commits: Number(total.stdout.trim()), status: lag > max ? 'stale' : 'ok' });
  }
  return { max, rows, ok: rows.every((row) => row.status === 'ok') };
}

export function formatReport(report) {
  const lines = report.rows.map((row) => `${row.status === 'ok' ? '通过' : '落后'} ${row.profile.padEnd(9)} 锁定 ${row.pinned.slice(0, 8)}，触及 Bundle 输入的提交落后 ${row.lag}（全部提交 ${row.all_commits}），上限 ${report.max}`);
  if (!report.ok) lines.push('修复：在 yss-cli 运行 tools/refresh-source-lock.mjs 刷新来源锁并重新生成 Bundle（先确认目标提交已推送），再更新本仓 submodules/yss-cli 指针。');
  return lines.join('\n');
}
