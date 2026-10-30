import { parseDocument } from "../vendor/yaml.mjs";
import { readRetirementContract } from "./skill-retirement-contract.mjs";
import { syncRetirementProjection } from "./skill-retirement-projection.mjs";
import { createHash } from "node:crypto";
import { readRepositoryMode } from "./repository-mode.mjs";
import { syncWorkBuddyProjections, removeWorkBuddyProjection } from "./workbuddy-projection.mjs";
import { cpSync, existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, readlinkSync, realpathSync, rmSync, symlinkSync, unlinkSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const SOURCE_ROOT = path.join(ROOT, ".agents/skills");
const LOCK_PATH = path.join(ROOT, "skills-lock.json");

// 仅保留需要平台项目目录的投影；WorkBuddy 副本由普通文件生成器维护。
export const PROJECTION_ROOTS = [".claude/skills", ".workbuddy/skills"];
function projectionRootsFor(lock) {
  const identityPath = path.join(ROOT, "yss-project.yaml");
  const isInstance = existsSync(identityPath) && readRepositoryMode(ROOT) === "project-instance";
  if (!isInstance) return PROJECTION_ROOTS;
  const roots = lock?.projectionRoots;
  if (!Array.isArray(roots) || new Set(roots).size !== roots.length || roots.some(root => ![".codex/skills", ".claude/skills", ".cursor/skills", ".pi/skills", ".workbuddy/skills"].includes(root))) throw new TypeError("project-instance skills-lock.json 缺少有效 projectionRoots");
  return [...new Set(roots)];
}

// YSS_RETIREMENT_BEGIN sha256=2fa61f17fe5b8e28b06e86c709fd82772ba4ec906063e1854f8cfad8479c03b0
export const OBSOLETE = new Set(["archify","ask-matt","batch-grill-me","claude-handoff","code-review-process","component-selection-imports","design-an-interface","dispatching-parallel-agents","edit-article","file-export-download","formily-foundation","formily-linkage-effects","formily-mode-slot-detail","formily-step-flow","frontend-commit","git-guardrails-claude-code","grill-me","grill-with-docs","improve-codebase-architecture","loop-me","migrate-to-shoehorn","obsidian-vault","page-form-module","page-list-module","page-skeleton","product-design-prototype","prototype-page-acceptance","qa","request-refactor-plan","research","scaffold-exercises","setup-pre-commit","setup-ts-deep-modules","teach","theme-token-usage","to-issues","to-prd","to-questionnaire","ubiquitous-language","vue3-best-practices","wait-what","web-design-engineer","web-video-presentation","wireframe-prototype","wizard","writing-beats","writing-fragments","writing-great-skills","writing-shape","yedit-table-usage","yss-antd-design","yss-antdv-next-design","yss-api-integration","yss-application-layer-reference","yss-backend-scaffold-adapter","yss-backend-scaffold-application","yss-backend-scaffold-domain","yss-backend-scaffold-infrastructure","yss-backend-scaffold-parent","yss-backend-scaffold-web","yss-components","yss-db2mybatis","yss-dictionary","yss-dir","yss-domain-layer-reference","yss-domain-modeling","yss-duckdb","yss-file","yss-filerunner","yss-formily","yss-formily-schema-generator","yss-frontend-scaffold-generator","yss-harness-upgrade","yss-hook","yss-infrastructure-layer-reference","yss-jdbc","yss-log","yss-mail","yss-mapper-dynamic","yss-microapp-commit","yss-mvc-data-analysis-project-initializer","yss-mvc-design","yss-mvc-scaffold-generator","yss-openapi","yss-page-module-development","yss-quality","yss-router","yss-source-index","yss-sql-condition","yss-sql-tpl","yss-taskflow","yss-ui","yss-ui-business-page-generation","yss-use-table-height","yss-use-tree-height","yss-valuation","yss-variable","yss-web-layer-reference","ytable-usage","ytree-usage"]);
// YSS_RETIREMENT_END
export function obsoleteCanonicalResidues(names, obsolete = OBSOLETE) {
  return names.filter((name) => obsolete.has(name)).sort();
}

function relative(target) { return path.relative(ROOT, target).replaceAll(path.sep, "/"); }
function entries(directory) { return existsSync(directory) ? readdirSync(directory, { withFileTypes: true }) : []; }
export function skillNames(directory) { return entries(directory).filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort(); }
function treeFiles(directory, prefix = "") {
  return entries(directory).flatMap((entry) => {
    if (entry.name === ".DS_Store") return [];
    const absolute = path.join(directory, entry.name);
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) return treeFiles(absolute, rel);
    if (rel.split("/").includes("__pycache__") || /\.(iml|pyc|pyo)$/.test(rel)) return [];
    return entry.isFile() || entry.isSymbolicLink() ? [[rel, absolute]] : [];
  });
}
export function nestedSkillPaths(directory = SOURCE_ROOT) {
  return treeFiles(directory)
    .map(([name]) => name)
    .filter((name) => name.endsWith("/SKILL.md") && name.split("/").length > 2)
    .sort();
}
export function unregisteredNestedSkillPaths(candidates, registeredSources) {
  const registered = new Set(registeredSources);
  return candidates.filter((candidate) => !registered.has(candidate)).sort();
}
export function treeHash(directory) {
  const digest = createHash("sha256");
  for (const [name, file] of treeFiles(directory).sort(([left], [right]) => left.localeCompare(right))) {
    const content = readFileSync(file);
    const normalized = content.includes(0) ? content : Buffer.from(content.toString("utf8").replaceAll("\r\n", "\n"));
    digest.update(name).update("\0").update(normalized).update("\0");
  }
  return digest.digest("hex");
}

// 模板源的锁不记录本地技能的树哈希（architecture-iteration-v1 FR-005）；实例锁由打包器写入 effectiveHash。
// 锁里有这个值时，它必须等于实际的技能树哈希；没有就无需比较。
export function lockedTreeHashMatches(record, actual) {
  return record?.effectiveHash === undefined || record.effectiveHash === actual;
}

// 实例锁里的 effectiveHash 由打包器写在 skillPath 之后；已有该字段时按当前内容重算并保持键序，模板锁没有就不加。
export function withEffectiveHash(item, effectiveHash) {
  return Object.fromEntries(Object.entries(item).flatMap(([key, value]) => key === "skillPath" ? [[key, value], ["effectiveHash", effectiveHash]] : [[key, value]]));
}

// treeHash is the published, normalized Skill digest. A no-op copy needs the
// stricter filesystem comparison so modes, links and raw line endings survive.
function projectionMatchesSource(source, target) {
  const sourceInfo = lstatSafe(source);
  const targetInfo = lstatSafe(target);
  if (!sourceInfo || !targetInfo || (sourceInfo.mode & 0o7777) !== (targetInfo.mode & 0o7777)) return false;
  if (sourceInfo.isSymbolicLink()) return targetInfo.isSymbolicLink() && readlinkSync(source) === readlinkSync(target);
  if (sourceInfo.isFile()) return targetInfo.isFile() && readFileSync(source).equals(readFileSync(target));
  if (!sourceInfo.isDirectory() || !targetInfo.isDirectory()) return false;
  const sourceNames = readdirSync(source).sort();
  const targetNames = readdirSync(target).sort();
  return sourceNames.length === targetNames.length && sourceNames.every((name, index) =>
    name === targetNames[index] && projectionMatchesSource(path.join(source, name), path.join(target, name)));
}

function git(args) { return spawnSync("git", args, { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }); }
function trackedPaths() {
  const result = git(["ls-files", "-z", "--", ...PROJECTION_ROOTS]);
  if (result.status !== 0) throw new TypeError("无法读取 Git 受跟踪路径");
  const paths = new Set();
  for (const file of result.stdout.split("\0").filter(Boolean)) {
    let ref = file;
    while (ref !== ".") { paths.add(ref); ref = path.posix.dirname(ref); }
  }
  return paths;
}
function parseLock() { return existsSync(LOCK_PATH) ? JSON.parse(readFileSync(LOCK_PATH, "utf8")) : null; }
function sharedFromLock(lock) {
  const shared = lock?.version === 3 && lock.skills?.shared;
  if (!shared || typeof shared !== "object") throw new TypeError("skills-lock.json 无法解析；请先运行 scripts/update-skill-lock");
  return Object.keys(shared).sort();
}
function ensureSafeProjection(target) {
  const resolved = path.resolve(target);
  if (!resolved.startsWith(`${ROOT}${path.sep}`) || path.basename(resolved) !== "skills") throw new TypeError(`refusing unsafe projection target: ${target}`);
}
export function unlockedProjectionEntries(candidates, allowedNames, isTracked) {
  const allowed = new Set(allowedNames);
  return candidates.filter((candidate) => candidate.isDirectory() || candidate.isSymbolicLink()).filter((candidate) => !allowed.has(candidate.name) && isTracked(candidate.name));
}
export function unlockedCanonicalEntries(names, allowedNames, hasSkillMd = () => true) {
  const allowed = new Set(allowedNames);
  return names.filter((name) => !allowed.has(name) && !OBSOLETE.has(name) && hasSkillMd(name)).sort();
}
function refreshRetirement(check) {
  const file = path.join(ROOT, ".template-spec/agents/yss-skill-registry.yaml");
  if (!existsSync(file)) return;
  const document = parseDocument(readFileSync(file, "utf8"), { uniqueKeys: true });
  if (document.errors.length) throw document.errors[0];
  const registry = document.toJS({ maxAliasCount: 0 });
  const ids = readRetirementContract(registry, { legacyIds: OBSOLETE });
  if (registry.retirement_contract?.schema_version === 2) {
    const residue = [...ids].filter(id => lstatSafe(path.join(SOURCE_ROOT, id)));
    if (residue.length) throw new TypeError(`retired skills remain in canonical root: ${residue.join(", ")}`);
    syncRetirementProjection({ root: ROOT, ids, check });
  }
  OBSOLETE.clear();
  for (const id of ids) OBSOLETE.add(id);
}
export function syncSkills({ check = false, hashCache = new Map(), workbuddyRepositoryRoot = ROOT, templateSourceRoot = ROOT } = {}) {
  refreshRetirement(check);
  let trackedSet;
  const tracked = ref => (trackedSet ??= trackedPaths()).has(ref);
  const sourceHash = source => {
    if (!hashCache.has(source)) hashCache.set(source, treeHash(source));
    return hashCache.get(source);
  };
  const lock = parseLock();
  const shared = sharedFromLock(lock);
  const projectionRoots = projectionRootsFor(lock);
  const identityPath = path.join(ROOT, "yss-project.yaml");
  const isInstance = existsSync(identityPath) && readRepositoryMode(ROOT) === "project-instance";
  const sourceIdentityPath = path.join(templateSourceRoot, "yss-project.yaml");
  const retireLegacy = !isInstance && existsSync(sourceIdentityPath) && readRepositoryMode(templateSourceRoot) === "template-source";
  if (!check && projectionRoots.includes(".workbuddy/skills") && isInstance) throw new TypeError("WorkBuddy 实例写入须使用 yss skills ensure / sync 事务；此入口只允许 --check");
  const absent = shared.filter((name) => !lstatSafe(path.join(SOURCE_ROOT, name))?.isDirectory());
  if (absent.length) throw new TypeError(`锁文件声明的共享 skills 缺少权威内容: ${absent.join(", ")}`);
  const obsolete = [...new Set([...shared.filter((name) => OBSOLETE.has(name)), ...obsoleteCanonicalResidues(skillNames(SOURCE_ROOT))])];
  if (obsolete.length) throw new TypeError(`obsolete skills remain in canonical root: ${obsolete.join(", ")}`);
  const drift = [];
  for (const root of projectionRoots) {
    const isWorkBuddy = root === ".workbuddy/skills";
    const projection = path.join(isWorkBuddy ? workbuddyRepositoryRoot : ROOT, root);
    if (!isWorkBuddy) ensureSafeProjection(projection);
    if (!check && !isWorkBuddy) mkdirSync(projection, { recursive: true });
    const allowed = [...shared, ...Object.keys(lock.skills?.platform?.[root] ?? {})];
    for (const entry of unlockedProjectionEntries(entries(projection), allowed, (name) => tracked(relative(path.join(projection, name)))).filter((entry) => !OBSOLETE.has(entry.name))) {
      const target = path.join(projection, entry.name);
      if (isWorkBuddy) { drift.push(`unlocked projection: ${relative(target)}`); continue; }
      if (!check && entry.isSymbolicLink() && !existsSync(target)) rmSync(target, { force: true });
      else drift.push(`unlocked projection: ${relative(target)}`);
    }
    if (isWorkBuddy) {
      if (drift.length) throw new TypeError(drift.join("\n"));
      syncWorkBuddyProjections({ repositoryRoot: workbuddyRepositoryRoot, sourceRoot: SOURCE_ROOT, names: shared, check, retireLegacy });
    }
    for (const name of shared) {
      const source = path.join(SOURCE_ROOT, name);
      const target = path.join(projection, name);
      const info = lstatSafe(target);
      if (isWorkBuddy) {
        continue;
      }
      if (check) {
        if (info?.isSymbolicLink()) {
          if (!existsSync(target) || realpathSync(target) !== realpathSync(source)) drift.push(`projection target mismatch: ${relative(target)}`);
        } else if (!info?.isDirectory()) drift.push(`missing projection: ${relative(target)}`);
        else if (sourceHash(source) !== treeHash(target)) drift.push(`projection drift: ${relative(target)}`);
      } else if (info?.isSymbolicLink() && existsSync(target) && realpathSync(target) === realpathSync(source)) {
        continue;
      } else if (info?.isDirectory() && tracked(relative(target)) && projectionMatchesSource(source, target)) {
        continue;
      } else {
        rmSync(target, { recursive: true, force: true });
        if (!info || !tracked(relative(target))) symlinkSync(path.relative(projection, source), target, "dir");
        else cpSync(source, target, { recursive: true, preserveTimestamps: true, verbatimSymlinks: true });
      }
    }
    for (const name of OBSOLETE) {
      const target = path.join(projection, name);
      if (isWorkBuddy) {
        removeWorkBuddyProjection({ repositoryRoot: workbuddyRepositoryRoot, target, check });
        continue;
      }
      if (check) { if (existsSync(target) || lstatSafe(target)?.isSymbolicLink()) drift.push(`obsolete projection: ${relative(target)}`); }
      else if (lstatSafe(target)?.isSymbolicLink()) unlinkSync(target);
      else rmSync(target, { recursive: true, force: true });
    }
  }
  if (drift.length) throw new TypeError(drift.join("\n"));
  return check ? "skill projections are synchronized" : `synchronized ${shared.length} shared skills`;
}
function lstatSafe(target) { try { return lstatSync(target); } catch (error) { if (error.code === "ENOENT") return null; throw error; } }
function priorMetadata(lock) {
  const skills = lock?.skills ?? {};
  if (!["shared", "platform"].some((key) => key in skills)) return skills;
  return { ...skills.shared, ...Object.values(skills.platform ?? {}).reduce((all, group) => ({ ...all, ...group }), {}), ...Object.fromEntries(Object.entries(skills).filter(([key]) => !["shared", "platform"].includes(key))) };
}
function option(arguments_, name) {
  const prefix = `--${name}=`;
  const value = arguments_.find((argument) => argument.startsWith(prefix));
  return value?.slice(prefix.length) || null;
}
function sourceRevisionMap(oldLock, arguments_) {
  const sources = structuredClone(oldLock?.sources ?? {});
  const revision = option(arguments_, "source-revision");
  if (revision) {
    const separator = revision.lastIndexOf(":");
    if (separator <= 0 || separator === revision.length - 1) throw new TypeError("--source-revision 必须使用 source:revision 格式");
    const source = revision.slice(0, separator);
    sources[source] = { ...(sources[source] ?? {}), revision: revision.slice(separator + 1) };
  }
  return sources;
}
function metadata(name, skillPath, directory, previous, canonical = false, sources = {}, upstreamRoot = null, hashCache = new Map()) {
  const old = previous[name] ?? {};
  let recordedPath = old.skillPath ?? skillPath;
  if (canonical && /^\.(codex|cursor|pi|claude|workbuddy)\/skills\//.test(recordedPath)) recordedPath = skillPath;
  if (!hashCache.has(directory)) hashCache.set(directory, treeHash(directory));
  // 本地技能的树哈希不再提交进锁（architecture-iteration-v1 FR-005）：这里只用它判断相对上游是否有改动；
  // 实例锁里的 effectiveHash 由打包器按分发的技能树重算。
  const effectiveHash = hashCache.get(directory);
  const result = { source: old.source ?? "project", sourceType: old.sourceType ?? "local", skillPath: recordedPath };
  const sourceInfo = sources[result.source];
  if (sourceInfo?.revision) result.sourceRevision = sourceInfo.revision;
  let upstreamDirectory = null;
  if (upstreamRoot && result.source === "mattpocock/skills") {
    upstreamDirectory = path.join(upstreamRoot, recordedPath).replace(/\/SKILL\.md$/, "");
    if (!existsSync(upstreamDirectory)) throw new TypeError(`${name} 的上游路径不存在: ${recordedPath}`);
    result.upstreamHash = treeHash(upstreamDirectory);
  } else if (old.upstreamHash ?? old.computedHash) result.upstreamHash = old.upstreamHash ?? old.computedHash;
  if (result.upstreamHash && effectiveHash !== result.upstreamHash) {
    const adaptationRef = old.adaptationRef ?? (result.source === "mattpocock/skills" ? ".template-source/process/MATT-POCOCK-ENGINEERING-SKILLS.md" : null);
    if (adaptationRef) result.adaptationRef = adaptationRef;
  }
  return [result, effectiveHash];
}
export function updateSkillLock(arguments_ = process.argv.slice(2), { hashCache = new Map() } = {}) {
  refreshRetirement(arguments_.includes("--check"));
  const oldLock = parseLock(); const projectionRoots = projectionRootsFor(oldLock); const previous = priorMetadata(oldLock); const sources = sourceRevisionMap(oldLock, arguments_); const upstreamRoot = option(arguments_, "upstream-root");
  if (upstreamRoot && !existsSync(upstreamRoot)) throw new TypeError(`--upstream-root 不存在: ${upstreamRoot}`);
  const additions = arguments_.filter((arg) => arg.startsWith("--add=")).map((arg) => arg.slice(6));
  const removals = new Set(arguments_.filter((arg) => arg.startsWith("--remove=")).map((arg) => arg.slice(9)));
  const platformAdds = arguments_.filter((arg) => arg.startsWith("--add-platform=")).map((arg) => arg.slice(15).split(":", 2));
  const existing = oldLock?.version === 3 && oldLock.skills?.shared ? Object.keys(oldLock.skills.shared) : skillNames(SOURCE_ROOT);
  const sharedNames = [...new Set([...existing, ...additions])].filter((name) => !removals.has(name) && !OBSOLETE.has(name)).sort();
  const absent = sharedNames.filter((name) => !lstatSafe(path.join(SOURCE_ROOT, name))?.isDirectory());
  if (absent.length) throw new TypeError(`锁文件声明的共享 skills 缺少权威内容: ${absent.join(", ")}`);
  const unlocked = unlockedCanonicalEntries(skillNames(SOURCE_ROOT), sharedNames, (name) => lstatSafe(path.join(SOURCE_ROOT, name, "SKILL.md"))?.isFile());
  if (unlocked.length) throw new TypeError(`发现未登记到 skills-lock.json 的已跟踪共享 skills: ${unlocked.join(", ")}\n确认新增后运行 scripts/update-skill-lock --add=<skill-name>`);
  const targets = [".agents/skills", ...projectionRoots];
  const shared = Object.fromEntries(sharedNames.map((name) => {
    const [item, effectiveHash] = metadata(name, `.agents/skills/${name}/SKILL.md`, path.join(SOURCE_ROOT, name), previous, true, sources, upstreamRoot, hashCache);
    item.targets = targets;
    return [name, previous[name]?.effectiveHash === undefined ? item : withEffectiveHash(item, effectiveHash)];
  }));
  const platform = {};
  for (const root of projectionRoots) {
    const location = path.join(ROOT, root); const prior = oldLock?.version === 3 ? Object.keys(oldLock.skills?.platform?.[root] ?? {}) : skillNames(location).filter((name) => !sharedNames.includes(name));
    const names = [...new Set([...prior, ...platformAdds.filter(([key]) => key === root).map(([, name]) => name)])].filter((name) => !removals.has(name) && !sharedNames.includes(name) && !OBSOLETE.has(name)).sort();
    if (!names.length) continue;
    const absentPlatform = names.filter((name) => !lstatSafe(path.join(location, name))?.isDirectory());
    if (absentPlatform.length) throw new TypeError(`锁文件声明的平台 skills 缺少内容 (${root}): ${absentPlatform.join(", ")}`);
    platform[root] = Object.fromEntries(names.map((name) => { const [item] = metadata(name, `${root}/${name}/SKILL.md`, path.join(location, name), previous, false, sources, upstreamRoot, hashCache); item.targets = [root]; return [name, item]; }));
  }
  const manifest = { version: 3, generatedBy: "scripts/update-skill-lock", canonicalRoot: ".agents/skills", projectionRoots, sources, skills: { shared, platform } };
  const rendered = `${JSON.stringify(manifest, null, 2)}\n`;
  const current = existsSync(LOCK_PATH) ? readFileSync(LOCK_PATH, "utf8") : null;
  if (arguments_.includes("--check")) { if (current !== rendered) throw new TypeError("skills-lock.json is stale; run scripts/update-skill-lock"); return "skills-lock.json matches distributed skills"; }
  if (current !== rendered) writeFileSync(LOCK_PATH, rendered);
  return `updated skills-lock.json with ${sharedNames.length} shared skills and ${Object.values(platform).reduce((sum, group) => sum + Object.keys(group).length, 0)} platform skills`;
}
