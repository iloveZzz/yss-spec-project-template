import { createHash } from "node:crypto";
import { cpSync, existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, realpathSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const SOURCE_ROOT = path.join(ROOT, ".agents/skills");
const LOCK_PATH = path.join(ROOT, "skills-lock.json");
const YSS_UI_MANIFEST_PATH = path.join(SOURCE_ROOT, ".yss-skills-manifest.json");
export const PROJECTION_ROOTS = [".claude/skills", ".codex/skills", ".cursor/skills", ".hermes/skills", ".pi/skills", ".qoder/skills", ".trae/skills"];
export const OBSOLETE = new Set(["to-" + "prd", "to-" + "issues", "design-an-interface", "qa", "request-refactor-plan", "ubiquitous-language", "edit-article", "obsidian-vault", "writing-great-skills", "code-review-process", "yss-domain-modeling", "yss-dir", "yss-duckdb", "yss-file", "yss-filerunner", "yss-db2mybatis", "yss-mail", "yss-mapper-dynamic", "yss-quality", "yss-sql-condition", "yss-sql-tpl", "yss-valuation", "yss-variable", "yss-openapi", "web-design-engineer", "web-video-presentation", "wireframe-prototype", "wizard", "git-guardrails-claude-code", "claude-handoff", "batch-grill-me", "product-design-prototype", "yss-dictionary", "yss-jdbc", "yss-log", "yss-taskflow", "yss-backend-scaffold-application", "yss-backend-scaffold-domain", "yss-backend-scaffold-infrastructure", "yss-backend-scaffold-web"]);
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
    if (rel.split("/").includes("__pycache__") || /\.(pyc|pyo)$/.test(rel)) return [];
    return entry.isFile() || entry.isSymbolicLink() ? [[rel, absolute]] : [];
  });
}
export function treeHash(directory) {
  const digest = createHash("sha256");
  for (const [name, file] of treeFiles(directory).sort(([left], [right]) => left.localeCompare(right))) {
    digest.update(name).update("\0").update(readFileSync(file)).update("\0");
  }
  return digest.digest("hex");
}

/**
 * 校验并返回 YSS UI 前端 skills 与 MCP 的上游集成合同。
 *
 * @param {unknown} manifest 待校验的清单对象
 * @returns {Record<string, any>} 已校验的清单
 */
export function validateYssUiSkillManifest(manifest) {
  if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) throw new TypeError("yss-ui 清单必须是对象");
  const requiredStrings = ["source", "source_type", "source_root", "source_revision", "adaptation_ref"];
  for (const field of requiredStrings) {
    if (typeof manifest[field] !== "string" || !manifest[field].trim()) throw new TypeError(`yss-ui 清单缺少 ${field}`);
  }
  if (manifest.schema_version !== 2) throw new TypeError("yss-ui 清单 schema_version 必须为 2");
  if (!/^[0-9a-f]{40}$/.test(manifest.source_revision)) throw new TypeError("yss-ui source_revision 必须是完整 Git SHA");
  if (!manifest.package || typeof manifest.package.name !== "string" || typeof manifest.package.version !== "string") {
    throw new TypeError("yss-ui 清单缺少 package name/version");
  }
  if (!Array.isArray(manifest.skills) || !manifest.skills.length) throw new TypeError("yss-ui 清单缺少 skills");
  const upstreamNames = new Set();
  const canonicalNames = new Set();
  for (const skill of manifest.skills) {
    if (!skill || typeof skill.upstream !== "string" || typeof skill.canonical !== "string") throw new TypeError("yss-ui skill 缺少 upstream/canonical");
    if (skill.upstream === "java-backend-commit") throw new TypeError("yss-ui 前端清单不得包含 java-backend-commit");
    if (upstreamNames.has(skill.upstream)) throw new TypeError(`upstream 重复: ${skill.upstream}`);
    if (canonicalNames.has(skill.canonical)) throw new TypeError(`canonical 重复: ${skill.canonical}`);
    if (!/^[0-9a-f]{64}$/.test(skill.upstream_hash ?? "")) throw new TypeError(`${skill.canonical} 缺少有效 upstream_hash`);
    upstreamNames.add(skill.upstream);
    canonicalNames.add(skill.canonical);
  }
  const mcp = manifest.mcp;
  if (!mcp || typeof mcp.package !== "string" || typeof mcp.version !== "string" || typeof mcp.components_version !== "string" || typeof mcp.server_name !== "string") {
    throw new TypeError("yss-ui 清单缺少 MCP package/version/server 信息");
  }
  if (!Array.isArray(mcp.project_configs) || !mcp.project_configs.length) throw new TypeError("yss-ui 清单缺少 MCP project_configs");
  const configPaths = new Set();
  for (const config of mcp.project_configs) {
    if (!config || typeof config.path !== "string" || !["mcpServers", "servers"].includes(config.container)) throw new TypeError("yss-ui MCP project_config 无效");
    if (configPaths.has(config.path)) throw new TypeError(`yss-ui MCP config path 重复: ${config.path}`);
    configPaths.add(config.path);
  }
  if (typeof mcp.global_install_guide !== "string" || !mcp.global_install_guide) throw new TypeError("yss-ui MCP 缺少 global_install_guide");
  return manifest;
}

function loadYssUiSkillManifest() {
  return validateYssUiSkillManifest(JSON.parse(readFileSync(YSS_UI_MANIFEST_PATH, "utf8")));
}
function git(args) { return spawnSync("git", args, { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }); }
function tracked(relativePath) { return git(["ls-files", "-z", "--", relativePath]).stdout.length > 0; }
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
export function syncSkills({ check = false } = {}) {
  const lock = parseLock();
  const shared = sharedFromLock(lock);
  const absent = shared.filter((name) => !lstatSafe(path.join(SOURCE_ROOT, name))?.isDirectory());
  if (absent.length) throw new TypeError(`锁文件声明的共享 skills 缺少权威内容: ${absent.join(", ")}`);
  const obsolete = [...new Set([...shared.filter((name) => OBSOLETE.has(name)), ...obsoleteCanonicalResidues(skillNames(SOURCE_ROOT))])];
  if (obsolete.length) throw new TypeError(`obsolete skills remain in canonical root: ${obsolete.join(", ")}`);
  const drift = [];
  for (const root of PROJECTION_ROOTS) {
    const projection = path.join(ROOT, root);
    ensureSafeProjection(projection);
    if (!check) mkdirSync(projection, { recursive: true });
    const allowed = [...shared, ...Object.keys(lock.skills?.platform?.[root] ?? {})];
    for (const entry of unlockedProjectionEntries(entries(projection), allowed, (name) => tracked(relative(path.join(projection, name)))).filter((entry) => !OBSOLETE.has(entry.name))) {
      const target = path.join(projection, entry.name);
      if (!check && entry.isSymbolicLink() && !existsSync(target)) rmSync(target, { force: true });
      else drift.push(`unlocked projection: ${relative(target)}`);
    }
    for (const name of shared) {
      const source = path.join(SOURCE_ROOT, name);
      const target = path.join(projection, name);
      const info = lstatSafe(target);
      if (check) {
        if (info?.isSymbolicLink()) {
          if (!existsSync(target) || realpathSync(target) !== realpathSync(source)) drift.push(`projection target mismatch: ${relative(target)}`);
        } else if (!info?.isDirectory()) drift.push(`missing projection: ${relative(target)}`);
        else if (treeHash(source) !== treeHash(target)) drift.push(`projection drift: ${relative(target)}`);
      } else if (info?.isSymbolicLink() && existsSync(target) && realpathSync(target) === realpathSync(source)) {
        continue;
      } else {
        rmSync(target, { recursive: true, force: true });
        if (!info || !tracked(relative(target))) symlinkSync(path.relative(projection, source), target, "dir");
        else cpSync(source, target, { recursive: true, preserveTimestamps: true });
      }
    }
    for (const name of OBSOLETE) {
      const target = path.join(projection, name);
      if (check) { if (existsSync(target) || lstatSafe(target)?.isSymbolicLink()) drift.push(`obsolete projection: ${relative(target)}`); }
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
function metadata(name, skillPath, directory, previous, canonical = false, sources = {}, upstreamRoot = null) {
  const old = previous[name] ?? {};
  let recordedPath = old.skillPath ?? skillPath;
  if (canonical && /^\.(claude|codex|cursor|hermes|pi|qoder|trae)\/skills\//.test(recordedPath)) recordedPath = skillPath;
  const result = { source: old.source ?? "project", sourceType: old.sourceType ?? "local", skillPath: recordedPath, effectiveHash: treeHash(directory) };
  const sourceInfo = sources[result.source];
  if (sourceInfo?.revision) result.sourceRevision = sourceInfo.revision;
  let upstreamDirectory = null;
  if (upstreamRoot && result.source === "mattpocock/skills") {
    upstreamDirectory = path.join(upstreamRoot, recordedPath).replace(/\/SKILL\.md$/, "");
    if (!existsSync(upstreamDirectory)) throw new TypeError(`${name} 的上游路径不存在: ${recordedPath}`);
    result.upstreamHash = treeHash(upstreamDirectory);
  } else if (old.upstreamHash ?? old.computedHash) result.upstreamHash = old.upstreamHash ?? old.computedHash;
  if (result.upstreamHash && result.effectiveHash !== result.upstreamHash) {
    const adaptationRef = old.adaptationRef ?? (result.source === "mattpocock/skills" ? "docs/process/MATT-POCOCK-ENGINEERING-SKILLS.md" : null);
    if (adaptationRef) result.adaptationRef = adaptationRef;
  }
  return result;
}
export function updateSkillLock(arguments_ = process.argv.slice(2)) {
  const oldLock = parseLock(); const previous = priorMetadata(oldLock); const sources = sourceRevisionMap(oldLock, arguments_); const upstreamRoot = option(arguments_, "upstream-root");
  const yssUiManifest = loadYssUiSkillManifest();
  sources[yssUiManifest.source] = { ...(sources[yssUiManifest.source] ?? {}), revision: yssUiManifest.source_revision };
  const yssUiSkills = new Map(yssUiManifest.skills.map((skill) => [skill.canonical, skill]));
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
  const targets = [".agents/skills", ...PROJECTION_ROOTS];
  const shared = Object.fromEntries(sharedNames.map((name) => {
    const item = metadata(name, `.agents/skills/${name}/SKILL.md`, path.join(SOURCE_ROOT, name), previous, true, sources, upstreamRoot);
    const yssUiSkill = yssUiSkills.get(name);
    if (yssUiSkill) {
      item.source = yssUiManifest.source;
      item.sourceType = yssUiManifest.source_type;
      item.skillPath = `${yssUiManifest.source_root}/${yssUiSkill.upstream}/SKILL.md`;
      item.sourceRevision = yssUiManifest.source_revision;
      item.upstreamHash = yssUiSkill.upstream_hash;
      if (item.effectiveHash !== item.upstreamHash) item.adaptationRef = yssUiManifest.adaptation_ref;
      else delete item.adaptationRef;
    }
    item.targets = targets;
    return [name, item];
  }));
  const platform = {};
  for (const root of PROJECTION_ROOTS) {
    const location = path.join(ROOT, root); const prior = oldLock?.version === 3 ? Object.keys(oldLock.skills?.platform?.[root] ?? {}) : skillNames(location).filter((name) => !sharedNames.includes(name));
    const names = [...new Set([...prior, ...platformAdds.filter(([key]) => key === root).map(([, name]) => name)])].filter((name) => !removals.has(name) && !sharedNames.includes(name) && !OBSOLETE.has(name)).sort();
    if (!names.length) continue;
    const absentPlatform = names.filter((name) => !lstatSafe(path.join(location, name))?.isDirectory());
    if (absentPlatform.length) throw new TypeError(`锁文件声明的平台 skills 缺少内容 (${root}): ${absentPlatform.join(", ")}`);
    platform[root] = Object.fromEntries(names.map((name) => { const item = metadata(name, `${root}/${name}/SKILL.md`, path.join(location, name), previous, false, sources, upstreamRoot); item.targets = [root]; return [name, item]; }));
  }
  const manifest = { version: 3, generatedBy: "scripts/update-skill-lock", canonicalRoot: ".agents/skills", projectionRoots: PROJECTION_ROOTS, sources, skills: { shared, platform } };
  const rendered = `${JSON.stringify(manifest, null, 2)}\n`;
  if (arguments_.includes("--check")) { if (!existsSync(LOCK_PATH) || readFileSync(LOCK_PATH, "utf8") !== rendered) throw new TypeError("skills-lock.json is stale; run scripts/update-skill-lock"); return "skills-lock.json matches distributed skills"; }
  writeFileSync(LOCK_PATH, rendered); return `updated skills-lock.json with ${sharedNames.length} shared skills and ${Object.values(platform).reduce((sum, group) => sum + Object.keys(group).length, 0)} platform skills`;
}
