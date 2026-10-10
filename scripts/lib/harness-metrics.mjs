import { createHash } from "node:crypto";
import { existsSync, lstatSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";

export const SCHEMA_VERSION = 1;
export const RESIDENT_FILES = ["AGENTS.md", "CONTEXT.md", ".agents/skills/yss-product-lifecycle/SKILL.md"];
export const PROJECTION_ROOT_CANDIDATES = [".codex/skills", ".cursor/skills", ".pi/skills", ".claude/skills"];
const PROFILE_SUBMODULES = ["yss-harness-backend-agent", "yss-harness-design-agent", "yss-harness-frontend-agent"];

function listDirs(directory) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).filter((entry) => !entry.name.startsWith(".")).sort((a, b) => a.name.localeCompare(b.name));
}

function frontmatter(text) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text);
  return match ? match[1] : "";
}

function scalar(raw) {
  const value = raw.trim();
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) return value.slice(1, -1);
  return value;
}

/** 读取 frontmatter 顶层 description 与 disable-model-invocation；不依赖 YAML 库，只覆盖技能文件实际使用的写法。 */
export function parseSkillFrontmatter(text) {
  const lines = frontmatter(text).split(/\r?\n/);
  let description = "";
  let disableModelInvocation = false;
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const key = /^([A-Za-z][\w-]*):\s*(.*)$/.exec(line);
    if (!key) continue;
    if (key[1] === "disable-model-invocation") disableModelInvocation = scalar(key[2]) === "true";
    if (key[1] !== "description") continue;
    const inline = key[2].trim();
    if (/^[>|][+-]?$/.test(inline) || inline === "") {
      const block = [];
      while (index + 1 < lines.length && (/^\s+/.test(lines[index + 1]) || lines[index + 1] === "")) block.push(lines[++index].trim());
      description = block.join(" ").replace(/\s+/g, " ").trim();
    } else {
      description = scalar(inline).replace(/\s+/g, " ").trim();
    }
  }
  return { description, disableModelInvocation };
}

function codexImplicitAllowed(skillDirectory) {
  const file = path.join(skillDirectory, "agents", "openai.yaml");
  if (!existsSync(file)) return true;
  return !/^\s*allow_implicit_invocation:\s*false\s*$/m.test(readFileSync(file, "utf8"));
}

export function skillStats(skillsRoot) {
  const stats = {
    root: skillsRoot,
    exists: existsSync(skillsRoot),
    skills: 0,
    description_chars_all: 0,
    claude: { implicit_skills: 0, implicit_description_chars: 0, explicit_skills: 0 },
    codex: { implicit_skills: 0, implicit_description_chars: 0, explicit_skills: 0 },
    largest_skill_md_bytes: [],
  };
  if (!stats.exists) return stats;
  const sizes = [];
  for (const entry of listDirs(skillsRoot)) {
    if (!entry.isDirectory() && !entry.isSymbolicLink()) continue;
    const directory = path.join(skillsRoot, entry.name);
    const file = path.join(directory, "SKILL.md");
    if (!existsSync(file)) continue;
    const text = readFileSync(file, "utf8");
    const { description, disableModelInvocation } = parseSkillFrontmatter(text);
    stats.skills += 1;
    stats.description_chars_all += description.length;
    sizes.push({ skill: entry.name, bytes: Buffer.byteLength(text) });
    const claudeImplicit = !disableModelInvocation;
    const codexImplicit = !disableModelInvocation && codexImplicitAllowed(directory);
    for (const [runtime, implicit] of [["claude", claudeImplicit], ["codex", codexImplicit]]) {
      if (implicit) {
        stats[runtime].implicit_skills += 1;
        stats[runtime].implicit_description_chars += description.length;
      } else {
        stats[runtime].explicit_skills += 1;
      }
    }
  }
  stats.largest_skill_md_bytes = sizes.sort((a, b) => b.bytes - a.bytes).slice(0, 3);
  return stats;
}

export function projectionStats(root, canonicalNames) {
  return PROJECTION_ROOT_CANDIDATES.flatMap((rel) => {
    const directory = path.join(root, rel);
    if (!existsSync(directory)) return [];
    const result = { root: rel, entries: 0, symlinks: 0, full_copies: 0, runtime_only: 0 };
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (entry.name.startsWith(".")) continue;
      result.entries += 1;
      if (lstatSync(path.join(directory, entry.name)).isSymbolicLink()) result.symlinks += 1;
      else if (canonicalNames.has(entry.name)) result.full_copies += 1;
      else result.runtime_only += 1;
    }
    return [result];
  });
}

function countFiles(directory) {
  if (!existsSync(directory)) return 0;
  let total = 0;
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) total += countFiles(full);
    else if (entry.isFile() && entry.name !== ".DS_Store") total += 1;
  }
  return total;
}

export function collectMetrics(root = process.cwd()) {
  const resident = RESIDENT_FILES.map((rel) => {
    const file = path.join(root, rel);
    return { path: rel, bytes: existsSync(file) ? readFileSync(file).length : null };
  });
  const canonicalRoot = path.join(root, ".agents/skills");
  const canonical = skillStats(canonicalRoot);
  const canonicalNames = new Set(listDirs(canonicalRoot).filter((entry) => entry.isDirectory()).map((entry) => entry.name));
  const profiles = Object.fromEntries(PROFILE_SUBMODULES.map((name) => {
    const dir = path.join(root, "submodules", name);
    const stats = skillStats(path.join(dir, ".agents/skills"));
    return [name, { present: existsSync(dir), skills: stats.skills, claude: stats.claude, codex: stats.codex }];
  }));
  return {
    schema_version: SCHEMA_VERSION,
    resident_context: { files: resident, total_bytes: resident.reduce((sum, item) => sum + (item.bytes ?? 0), 0) },
    skills: { canonical: { ...canonical, root: ".agents/skills" }, profiles },
    projection_roots: projectionStats(root, canonicalNames),
    process_files: countFiles(path.join(root, ".template-spec/process")),
    timings_ms: { ci_gate: null, agent_hook: null },
  };
}

export function digest(text) {
  return createHash("sha256").update(text).digest("hex");
}
