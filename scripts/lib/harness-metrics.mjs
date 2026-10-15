import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, lstatSync, readFileSync, readdirSync, realpathSync } from "node:fs";
import path from "node:path";

export const SCHEMA_VERSION = 1;
export const RESIDENT_FILES = ["AGENTS.md", "CONTEXT.md", ".agents/skills/yss-product-lifecycle/SKILL.md"];
// 只计真实 agent JSON；缺少输出时不推算或宣称达标。
export const DAILY_START_PROFILE = "route-agent-v1";
export const DAILY_START_FILES = ["AGENTS.md", "CONTEXT.md"];
export const DAILY_START_SECTIONS = [];
export const PIPELINE_WINDOW_DAYS = 30;
// 最近一次结构性减负（submodule 与 Profile 同步机制移除，AR-02/AR-06）的日期；从这里起算的占比不受旧指针提交拖累。
export const PIPELINE_STRUCTURAL_BASELINE = "2026-10-12";
// 管道提交的路径口径（附录 A）。路径被删除后口径保持不变，前后才可比。
const PIPELINE_PATTERNS = [
  /^skills-lock\.json$/,
  /^submodules\//,
  /\.lock\.json$/,
  /manifest\.json$/,
  /^\.(codex|cursor|pi|claude)\/skills\//,
  /(^|\/)profile-skill-sync\.json$/,
  /(^|\/)pnpm-lock\.yaml$/,
  /(^|\/)source-lock[^/]*\.json$/,
];
export const PROJECTION_ROOT_CANDIDATES = [".codex/skills", ".cursor/skills", ".pi/skills", ".claude/skills"];
const PROFILE_OVERLAYS = ["backend", "design"];

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

/** 流程目录的三种口径：全部文件（历史可比）、根层说明文档、编排合同分片。 */
function processCounts(directory) {
  const docs = existsSync(directory)
    ? readdirSync(directory, { withFileTypes: true }).filter((entry) => entry.isFile() && entry.name.endsWith(".md")).length
    : 0;
  return { files: countFiles(directory), docs, shards: countFiles(path.join(directory, "orchestration")) };
}

export function isPipelinePath(file) {
  return PIPELINE_PATTERNS.some((pattern) => pattern.test(file));
}

function runGit(root, args) {
  return execFileSync("git", ["-C", root, "-c", "core.quotePath=false", ...args], { encoding: "utf8", maxBuffer: 256 * 1024 * 1024, stdio: ["ignore", "pipe", "ignore"] });
}

function plainArgument(value, name) {
  if (typeof value !== "string" || value === "" || value.startsWith("-") || /[\0\n]/.test(value)) throw new TypeError(`${name} 参数无效: ${JSON.stringify(value)}`);
  return value;
}

/**
 * 近一个窗口内，只改管道文件（锁、指针、投影、清单）的非合并提交占比。
 * 默认窗口是 rev 的提交时间往前 30 天，因此同一个提交上的结果可重复；可用 since、until、rev 复现历史口径。
 * 不是仓库根目录（含子目录）或没有提交时返回 null，不读取上层仓库的历史。没有改动任何文件的提交不计入。
 */
export function pipelineCommitStats(root, { since, until, rev } = {}) {
  const explicitRev = rev !== undefined;
  const revision = explicitRev ? plainArgument(rev, "rev") : "HEAD";
  if (since !== undefined) plainArgument(since, "since");
  if (until !== undefined) plainArgument(until, "until");
  let committed;
  try {
    const top = runGit(root, ["rev-parse", "--show-toplevel"]).trim();
    if (realpathSync(top) !== realpathSync(root)) return null;
    committed = runGit(root, ["log", "-1", "--format=%cI", revision, "--"]).trim();
  } catch {
    if (explicitRev) throw new TypeError(`rev 无法解析: ${revision}`);
    return null;
  }
  if (!committed) return null;
  const windowEnd = until ?? committed;
  let windowStart = since;
  if (windowStart === undefined) {
    const end = Date.parse(windowEnd);
    if (Number.isNaN(end)) throw new TypeError("since 需要显式给出：until 不是可解析的时间");
    windowStart = new Date(end - PIPELINE_WINDOW_DAYS * 86400000).toISOString();
  }
  const output = runGit(root, ["log", "--no-merges", "--no-renames", "--name-only", "-z", "--format=%x1e%H", `--since=${windowStart}`, `--until=${windowEnd}`, revision, "--"]);
  let total = 0;
  let pipelineOnly = 0;
  let touching = 0;
  for (const chunk of output.split("\x1e").slice(1)) {
    const files = chunk.split("\0").slice(1).map((name) => name.replace(/^\n/, "")).filter(Boolean);
    if (!files.length) continue;
    total += 1;
    const pipeline = files.filter(isPipelinePath).length;
    if (pipeline) touching += 1;
    if (pipeline === files.length) pipelineOnly += 1;
  }
  return {
    window: { rev: revision, since: windowStart, until: windowEnd },
    total,
    pipeline_only: pipelineOnly,
    touching_pipeline: touching,
    pipeline_only_ratio: total ? Math.round((pipelineOnly / total) * 1000) / 1000 : null,
  };
}

/** daily 起步字节：入口文件整份，加上实际 agent JSON 的 UTF-8 字节。 */
export function dailyStartStats(root, agentJSON = null) {
  const files = DAILY_START_FILES.map(rel => ({ path: rel, bytes: existsSync(path.join(root, rel)) ? readFileSync(path.join(root, rel)).length : null }));
  const outputBytes = agentJSON === null ? null : Buffer.byteLength(agentJSON, 'utf8');
  const complete = outputBytes !== null && files.every(item => item.bytes !== null);
  const total = complete ? files.reduce((sum, item) => sum + item.bytes, outputBytes) : null;
  return { profile: DAILY_START_PROFILE, files, sections: [], agent_output_bytes: outputBytes, total_bytes: total, budget_bytes: 10240, within_budget: complete ? total <= 10240 : null };
}

export function collectMetrics(root = process.cwd(), options = {}) {
  const resident = RESIDENT_FILES.map((rel) => {
    const file = path.join(root, rel);
    return { path: rel, bytes: existsSync(file) ? readFileSync(file).length : null };
  });
  const canonicalRoot = path.join(root, ".agents/skills");
  const canonical = skillStats(canonicalRoot);
  const canonicalNames = new Set(listDirs(canonicalRoot).filter((entry) => entry.isDirectory()).map((entry) => entry.name));
  // Profile 并入后每个 Profile 只有覆盖层目录；旧的子模块键名保留，便于与基线对比。
  const profiles = Object.fromEntries(PROFILE_OVERLAYS.map((short) => {
    const name = `yss-harness-${short}-agent`;
    const dir = path.join(root, "profiles", short);
    const stats = skillStats(path.join(dir, ".agents/skills"));
    return [name, { present: existsSync(dir), skills: stats.skills, claude: stats.claude, codex: stats.codex }];
  }));
  const processStats = processCounts(path.join(root, ".template-spec/process"));
  return {
    schema_version: SCHEMA_VERSION,
    resident_context: { files: resident, total_bytes: resident.reduce((sum, item) => sum + (item.bytes ?? 0), 0) },
    daily_start: dailyStartStats(root, options.agentJSON ?? null),
    pipeline_commits: pipelineCommitStats(root, options),
    pipeline_commits_since_structural_baseline: pipelineCommitStats(root, { rev: options.rev, since: PIPELINE_STRUCTURAL_BASELINE, until: options.until }),
    skills: { canonical: { ...canonical, root: ".agents/skills" }, profiles },
    projection_roots: projectionStats(root, canonicalNames),
    process_files: processStats.files,
    process_docs: processStats.docs,
    process_shards: processStats.shards,
    timings_ms: { ci_gate: null, agent_hook: null },
  };
}

export function digest(text) {
  return createHash("sha256").update(text).digest("hex");
}
