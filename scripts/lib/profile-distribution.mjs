import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { loadProfileStatus } from './profile-status.mjs';

/**
 * Profile 实例的分发守卫。
 *
 * Backend 的分发策略是「整目录放行 + 排除清单」：新增一个仅模板源使用的脚本，只要没写进该 Profile 自己的
 * excludePaths，就会进入每一个新实例。本检查以根仓已声明的「仅模板源」脚本为准，核对每个 Profile 有没有同样排除，并保证
 * 不用后缀规则批量移除旧实例已登记的 Skill 测试文件。判定逻辑镜像 yss-cli 的 internal/bundle/producer.go includedByManifest。
 */
export const PROFILES = ['backend'];
export const BUNDLE_PROFILE_REF = '.template-source/distribution/bundle-profile.json';
/** 批量排除这些目录会破坏旧实例迁移；退役必须另外满足逐文件的可信来源合同。 */
const MANAGED_TEST_SUFFIXES = ['tests', 'test'];

/**
 * 根仓排除、但 Profile 实例里确实需要的脚本。写明谁在用它；依赖消失后这一条会自己失效并让检查失败，提示删除。
 */
export const PROFILE_NEEDS = {
  'scripts/generate-lifecycle-artifacts': {
    by: 'scripts/verify-lifecycle-registry',
    reason: 'verify-lifecycle-registry 在 Profile 实例里直接调用它检查派生文档是否漂移',
  },
};

export const INSTANCE_ONLY_EXCLUDES = {
  backend: [
    { path: '.pi/skills', reason: '实例侧 Agent 投影根，模板源不提交' },
    { path: '.cursor/skills', reason: '实例侧 Agent 投影根，模板源不提交' },
    { path: '.codex/skills', reason: '实例侧 Agent 投影根，模板源不提交' },
    { path: '.codex/config.toml', reason: '实例侧本地配置，模板源不提交' },
    { path: '.codex/settings.local.json', reason: '实例侧本地 Codex 配置，模板源不提交' },
    { path: '.codex/skills/.DS_Store', reason: '实例侧本地产物' },
    { path: 'docs/.scratch', reason: '实例侧临时材料目录' },
    { path: 'docs/reviews', reason: '实例侧评审材料目录' },
    { path: 'docs/adr', reason: '实例侧架构决策目录' },
    { path: '.work', reason: '实例侧本地工作包目录' },
  ],

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

const KERNEL_SCOPE = ['.agents/skills', 'scripts', '.template-spec/process', '.template-spec/templates'];
/** Profile 并入根仓后已删除的机制；这些路径重新出现说明同步机制复活。 */
export const RETIRED_MACHINERY = [
  'scripts/sync-profile-skills', 'scripts/lib/profile-skill-sync.mjs', '.template-source/profile-skill-sync.json',
  'scripts/sync-strategic-handoff-tools', 'scripts/verify-strategic-handoff-tools-lock',
  '.template-source/distribution/strategic-handoff-tools.lock.json', '.template-source/distribution/profile-variants.json',
  'scripts/lib/profile-variants.mjs', '.agents/skills/.strategic-design-skills-manifest.json',
];

/** 评估一个 Profile（内核 + _specialist + 该 Profile 的覆盖层），返回违规与例外状态；不写任何文件。 */
export function evaluateProfile({ root, profile, rootManifest }) {
  const overlayRoot = path.join('profiles', profile);
  if (!existsSync(path.join(root, overlayRoot))) fail(`${profile} 缺少覆盖层目录 ${overlayRoot}`);
  const manifest = readManifest(path.join(root, overlayRoot), profile);
  const strip = (prefix) => git(root, ['ls-files', '--', prefix]).split('\n').filter(Boolean).map((file) => [file.slice(prefix.length + 1), file]);
  // 同一路径后面的覆盖前面的：内核 < _specialist < 该 Profile
  const allFiles = git(root, ['ls-files']).split('\n').filter(Boolean);
  const composed = new Map();
  for (const file of allFiles) {
    if (KERNEL_SCOPE.some((scope) => beneath(file, scope))) composed.set(file, file);
  }
  const overlayFiles = [];
  for (const prefix of ['profiles/_specialist', overlayRoot]) for (const [relative, file] of strip(prefix)) { composed.set(relative, file); overlayFiles.push(relative); }
  const tracked = [...composed.keys()];
  const available = new Set([...allFiles.filter((file) => !file.startsWith('profiles/')), ...overlayFiles]);
  const existsInAvailable = (entry) => available.has(entry) || [...available].some((file) => file.startsWith(entry + '/'));
  const rootOnly = list(rootManifest, 'excludePaths').filter((entry) => entry.startsWith('scripts/'));

  const findings = [];
  const staleNeeds = [];
  const instanceOnly = new Map((INSTANCE_ONLY_EXCLUDES[profile] ?? []).map((item) => [item.path, item.reason]));
  for (const entry of list(manifest, 'excludePaths')) {
    const exists = existsInAvailable(entry);
    if (instanceOnly.has(entry)) { if (exists) findings.push({ kind: 'stale-allowlist', path: entry, reason: instanceOnly.get(entry) }); continue; }
    if (!exists) findings.push({ kind: 'stale-exclude-path', path: entry });
  }
  for (const file of tracked) {
    if (/^\.(claude|codex|cursor|pi|codebuddy)\/skills(?:\/|$)/.test(file) && shipped(file, manifest)) {
      if (file.startsWith('.codebuddy/skills/') && list(manifest, 'allowFiles').includes('.codebuddy/skills')) continue;
      findings.push({ kind: 'skill-projection-shipped', path: file });
    }
  }
  for (const entry of rootOnly) {
    const present = tracked.filter((file) => beneath(file, entry));
    if (!present.length || !shipped(present[0], manifest)) continue;
    const need = PROFILE_NEEDS[entry];
    if (need) {
      const user = need.by;
      const text = composed.has(user) && shipped(user, manifest) ? readFileSync(path.join(root, composed.get(user)), 'utf8') : '';
      if (!text.includes(entry)) staleNeeds.push({ entry, by: user });
      continue;
    }
    findings.push({ kind: 'template-source-script-shipped', path: entry, files: present.length });
  }

  const suffixes = list(manifest, 'excludePathSuffixes');
  for (const suffix of MANAGED_TEST_SUFFIXES) {
    if (suffixes.includes(suffix)) findings.push({ kind: 'managed-test-directory-excluded', path: suffix });
  }
  const collateral = new Set();
  for (const file of tracked) {
    for (const part of file.split('/')) {
      for (const suffix of suffixes) if (part !== suffix && part.endsWith(suffix)) collateral.add(`${file}（路径段 ${part} 以 ${suffix} 结尾）`);
    }
  }
  for (const item of collateral) findings.push({ kind: 'suffix-collateral', path: item });
  for (const retired of RETIRED_MACHINERY) {
    if (existsSync(path.join(root, retired))) findings.push({ kind: 'retired-machinery-present', path: retired });
  }
  const gitmodules = path.join(root, '.gitmodules');
  if (existsSync(gitmodules) && /yss-harness-(design|backend|frontend)-agent/.test(readFileSync(gitmodules, 'utf8'))) {
    findings.push({ kind: 'profile-submodule-present', path: '.gitmodules' });
  }
  return { profile, tracked: tracked.length, findings, staleNeeds };
}

export function evaluateAll(root) {
  const rootManifest = readManifest(root, '根仓');
  const profileStatus = loadProfileStatus({ root });
  const reports = PROFILES.map((profile) => evaluateProfile({ root, profile, rootManifest }));
  return { reports, profileStatus, ok: reports.every((report) => !report.findings.length && !report.staleNeeds.length) };
}

const MESSAGES = {
  'skill-projection-shipped': (f) => `已退役的技能投影 ${f.path} 仍随 Profile 分发；只分发 .agents/skills`,
  'template-source-script-shipped': (f) => `根仓声明为「仅模板源」的 ${f.path}（${f.files} 个文件）会随该 Profile 的实例分发；写进该 Profile 的 excludePaths，若实例确实需要它则登记到 PROFILE_NEEDS 并写明原因`,
  'managed-test-directory-excluded': (f) => `excludePathSuffixes: "${f.path}" 会批量移除旧实例已登记的 Skill 文件；在逐文件可信退役合同完成前继续分发，避免迁移冲突`,
  'suffix-collateral': (f) => `后缀规则会误伤 ${f.path}`,
  'retired-machinery-present': (f) => `${f.path} 属于 Profile 并入前的同步机制，已删除，不应重新出现`,
  'profile-submodule-present': (f) => `${f.path} 重新登记了 Profile 子模块；Profile 现在是 profiles/ 下的覆盖层`,
  'stale-exclude-path': (f) => `excludePaths 中的 ${f.path} 在当前模板源与覆盖层都不存在，也不是已登记的实例侧例外；请删除或登记到 INSTANCE_ONLY_EXCLUDES`,
  'stale-allowlist': (f) => `INSTANCE_ONLY_EXCLUDES 中的 ${f.path} 已在模板源出现（${f.reason}），该例外已过期；请删除`,
};

export function formatReport(result) {
  const lines = [];
  if (result.profileStatus) lines.push('Profile 状态: ' + Object.entries(result.profileStatus.profiles).map(([name, entry]) => name + '=' + entry.status).join(', '));
  for (const report of result.reports) {
    if (!report.findings.length && !report.staleNeeds.length) { lines.push(`通过 ${report.profile.padEnd(9)} 已排除仅模板源脚本，未使用测试目录批量排除规则（跟踪 ${report.tracked} 个文件）`); continue; }
    for (const finding of report.findings) lines.push(`违规 ${report.profile}: ${MESSAGES[finding.kind](finding)}`);
    for (const stale of report.staleNeeds) lines.push(`过期 ${report.profile}: PROFILE_NEEDS 里的 ${stale.entry} 不再被 ${stale.by} 引用，请从 PROFILE_NEEDS 删除`);
  }
  return lines.join('\n');
}
