import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

/**
 * Profile 实例的分发守卫。
 *
 * backend / frontend / design 的分发策略是「整目录放行 + 排除清单」：新增一个仅模板源使用的脚本，只要没写进该 Profile 自己的
 * excludePaths，就会进入每一个新实例。本检查以根仓已声明的「仅模板源」脚本为准，核对每个 Profile 有没有同样排除，并保证
 * 技能目录里的测试目录不分发。判定逻辑镜像 yss-cli 的 internal/bundle/producer.go includedByManifest。
 */
export const PROFILES = ['backend', 'design', 'frontend'];
export const BUNDLE_PROFILE_REF = '.template-source/distribution/bundle-profile.json';
/** 必须被后缀规则排除的路径段名：技能目录里的测试目录。 */
export const REQUIRED_SUFFIXES = ['tests', 'test'];

/**
 * 根仓排除、但 Profile 实例里确实需要的脚本。写明谁在用它；依赖消失后这一条会自己失效并让检查失败，提示删除。
 */
export const PROFILE_NEEDS = {
  'scripts/generate-lifecycle-artifacts': {
    by: 'scripts/verify-lifecycle-registry',
    reason: 'verify-lifecycle-registry 在 Profile 实例里直接调用它检查派生文档是否漂移',
  },
};

const fail = (message) => { throw new TypeError(`PROFILE_DISTRIBUTION: ${message}`); };
const list = (manifest, key) => (Array.isArray(manifest?.[key]) ? manifest[key] : []);

export function beneath(ref, prefix) {
  const base = prefix.replace(/\/$/, '');
  return ref === base || ref.startsWith(`${base}/`);
}

/** 镜像 includedByManifest（非 init 路径）：某个路径会不会随分发策略进入实例。 */
export function shipped(ref, manifest) {
  const root = ref.split('/')[0];
  if (list(manifest, 'allowFiles').some((allow) => beneath(ref, allow))) return true;
  const allowedRoots = new Set(list(manifest, 'allowRootEntries'));
  const allowedFiles = new Set(list(manifest, 'allowRootFiles'));
  if (allowedRoots.size + allowedFiles.size > 0 && !allowedRoots.has(root) && !allowedFiles.has(ref)) return false;
  if (new Set([...list(manifest, 'excludeRootEntries'), ...list(manifest, 'excludeRootFiles')]).has(root)) return false;
  if (list(manifest, 'excludePaths').some((entry) => beneath(ref, entry))) return false;
  for (const suffix of list(manifest, 'excludePathSuffixes')) if (ref.split('/').some((part) => part.endsWith(suffix))) return false;
  return true;
}

function git(repo, args) {
  const result = spawnSync('git', ['-C', repo, ...args], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (result.status !== 0) fail(`git ${args.join(' ')} 失败: ${(result.stderr ?? '').trim()}`);
  return result.stdout;
}

function readManifest(repo, label) {
  const file = path.join(repo, BUNDLE_PROFILE_REF);
  if (!existsSync(file)) fail(`缺少 ${label} 的分发策略 ${BUNDLE_PROFILE_REF}`);
  try { return JSON.parse(readFileSync(file, 'utf8')).manifest ?? fail(`${label} 的分发策略没有 manifest`); } catch (error) {
    if (error instanceof TypeError && error.message.startsWith('PROFILE_DISTRIBUTION')) throw error;
    return fail(`${label} 的分发策略不是有效 JSON: ${error.message}`);
  }
}

/** 评估一个 Profile，返回违规与例外状态；不写任何文件。 */
export function evaluateProfile({ root, profile, rootManifest }) {
  const repo = path.join(root, 'submodules', `yss-harness-${profile}-agent`);
  if (!existsSync(path.join(repo, '.git'))) fail(`${profile} 的 Profile 仓库未检出，无法评估`);
  const manifest = readManifest(repo, profile);
  const tracked = git(repo, ['ls-files']).split('\n').filter(Boolean);
  const rootOnly = list(rootManifest, 'excludePaths').filter((entry) => entry.startsWith('scripts/'));

  const findings = [];
  const staleNeeds = [];
  for (const entry of rootOnly) {
    const present = tracked.filter((file) => beneath(file, entry));
    if (!present.length || !shipped(present[0], manifest)) continue;
    const need = PROFILE_NEEDS[entry];
    if (need) {
      const user = need.by;
      const text = tracked.includes(user) && shipped(user, manifest) ? readFileSync(path.join(repo, user), 'utf8') : '';
      if (!text.includes(entry)) staleNeeds.push({ entry, by: user });
      continue;
    }
    findings.push({ kind: 'template-source-script-shipped', path: entry, files: present.length });
  }

  const suffixes = list(manifest, 'excludePathSuffixes');
  for (const required of REQUIRED_SUFFIXES) {
    if (!suffixes.includes(required)) findings.push({ kind: 'test-directory-not-excluded', path: required });
  }
  const collateral = new Set();
  for (const file of tracked) {
    for (const part of file.split('/')) {
      for (const suffix of suffixes) if (part !== suffix && part.endsWith(suffix)) collateral.add(`${file}（路径段 ${part} 以 ${suffix} 结尾）`);
    }
  }
  for (const item of collateral) findings.push({ kind: 'suffix-collateral', path: item });
  return { profile, tracked: tracked.length, findings, staleNeeds };
}

export function evaluateAll(root) {
  const rootManifest = readManifest(root, '根仓');
  const reports = PROFILES.map((profile) => evaluateProfile({ root, profile, rootManifest }));
  return { reports, ok: reports.every((report) => !report.findings.length && !report.staleNeeds.length) };
}

const MESSAGES = {
  'template-source-script-shipped': (f) => `根仓声明为「仅模板源」的 ${f.path}（${f.files} 个文件）会随该 Profile 的实例分发；写进该 Profile 的 excludePaths，若实例确实需要它则登记到 PROFILE_NEEDS 并写明原因`,
  'test-directory-not-excluded': (f) => `分发策略缺少 excludePathSuffixes: "${f.path}"，技能目录里的测试目录会随实例分发`,
  'suffix-collateral': (f) => `后缀规则会误伤 ${f.path}`,
};

export function formatReport(result) {
  const lines = [];
  for (const report of result.reports) {
    if (!report.findings.length && !report.staleNeeds.length) { lines.push(`通过 ${report.profile.padEnd(9)} 已排除仅模板源脚本，测试目录不分发（跟踪 ${report.tracked} 个文件）`); continue; }
    for (const finding of report.findings) lines.push(`违规 ${report.profile}: ${MESSAGES[finding.kind](finding)}`);
    for (const stale of report.staleNeeds) lines.push(`过期 ${report.profile}: PROFILE_NEEDS 里的 ${stale.entry} 不再被 ${stale.by} 引用，请从 PROFILE_NEEDS 删除`);
  }
  return lines.join('\n');
}
