import { createHash } from "node:crypto";
import { chmodSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const sourceRoot = path.join(root, ".agents/skills");
const managed = ["skills", "skills.sh.json", ".yss-export-manifest.json"];
const forbidden = ["AGENTS.md", "CONTEXT.md", "docs", "skills-lock.json", ".agents", ".claude", ".codex", ".pi", ".qoder", ".trae"];
const hash = (content) => createHash("sha256").update(content).digest("hex");
const fail = (message) => { throw new TypeError("export-yss-skills: " + message); };

function files(directory, prefix = "") {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name)).flatMap((entry) => {
    if (entry.name === ".DS_Store") return [];
    const absolute = path.join(directory, entry.name);
    const relative = prefix ? prefix + "/" + entry.name : entry.name;
    const stat = lstatSync(absolute);
    if (stat.isSymbolicLink()) fail("symbolic links are not allowed: " + absolute);
    if (stat.isDirectory()) return files(absolute, relative);
    if (stat.isFile()) return [[relative, absolute]];
    fail("unsupported source entry: " + absolute);
  });
}

function parseFrontmatter(bytes, source) {
  const match = /^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/.exec(bytes.toString("utf8"));
  if (!match) fail("invalid frontmatter: " + source);
  const fields = {};
  for (const line of match[1].split(/\r?\n/)) {
    const index = line.indexOf(":");
    if (index < 0) continue;
    const key = line.slice(0, index).trim();
    let value = line.slice(index + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    fields[key] = value;
  }
  for (const key of ["name", "description"]) if (typeof fields[key] !== "string" || !fields[key]) fail("frontmatter " + key + " must be a string: " + source);
  return fields;
}

function sanitize(text, relative) {
  if (relative.endsWith("assets/wrapper/.mvn/maven.config")) return "# Optional consuming-project Maven deployment configuration.\n# Configure repository URLs and profiles in the consuming project or CI.\n";
  const directory = path.posix.dirname(relative);
  const prefixPath = path.posix.relative("skills/" + (directory === "." ? "" : directory), "skills");
  const prefix = prefixPath ? prefixPath + "/" : "";
  let value = text.replace(/(YSS_SKILLS_ROOT\s*=\s*["']?)\/path\/to\/\.agents\/skills/g, "$1__YSS_SKILLS_ROOT_PATH__");
  value = value.replace(/\/path\/to\/\.agents\/skills/g, "$YSS_SKILLS_ROOT");
  value = value.replace(/(?:\$\{base_project\}\/)?(?:\/path\/to\/)?\.(?:agents|claude|codex|pi|qoder|trae)\/skills\//g, prefix);
  value = value.replace(/\.(?:agents|claude|codex|pi|qoder|trae)\/skills\b/g, "the canonical public skill source");
  value = value.replace(/\/path\/to\/skill-creator/g, "skill-creator").replace(/(?<![\w.])\/path\//g, "./path/");
  value = value.replace(/\/(?:Users|home|private)\/[^\s"'()<>\]]+/g, "<local-path-removed>").replace(/\/tmp\//g, "./tmp/");
  value = value.replace(/yss-spec-project-template/g, "the consuming project").replace(/\$\{base_project\}/g, "the consuming project");
  value = value.replace(/\[([^\]]*)\]\(https?:\/\/192\.168\.[^\s)]+\)/g, "$1").replace(/https?:\/\/192\.168\.[^\s)]+/g, "the consuming project optional YSS documentation");
  if (relative.includes("/assets/docs/guide/")) value = value.replace(/(\]\(\.\/)guide\//g, "$1");
  if (relative.includes("/assets/docs/")) value = value.replace(/\[([^\]]+)\]\(\/(guide|components|hooks|utils)(\/[^)#]+)?(#[^)]*)?\)/g, (_all, label, section, suffix, fragment = "") => {
    if (section === "utils") return label;
    const route = suffix ? suffix.slice(1) : null;
    const target = section === "guide" ? (route ? "./" + route + ".md" : "./") : section === "components" ? "../components/" + route + ".md" : (route ? "../hooks/" + route + ".md" : "../hooks/");
    return "[" + label + "](" + target + fragment + ")";
  });
  value = value.replace(/((?:["']?(?:password|passwd|secret|token|api[_-]?key|access[_-]?key)["']?\s*[:=]\s*["']))[^"'\r\n]*(["'])/gi, "$1CHANGE_ME$2");
  value = value.replace(/(["'])(?:admin123|guest|123456)\1/gi, "$1CHANGE_ME$1").replace(/__YSS_SKILLS_ROOT_PATH__/g, "./path/to/yss-skills");
  if (relative.endsWith("SKILL.md") && !value.includes("消费项目上下文")) {
    const header = /^---[ \t]*\r?\n[\s\S]*?\r?\n---[ \t]*(?:\r?\n|$)/.exec(value);
    if (header) value = header[0] + "\n> **消费项目上下文：** 本公开技能包不携带消费项目的 AGENTS.md、CONTEXT.md 或 docs/。文档中出现的这些路径均指可选的消费项目上下文；技能自身所需的参考资料、资源和脚本已随技能一同提供。\n" + value.slice(header[0].length);
  }
  return value.split(/\r?\n/).map((line) => line.replace(/[ \t]+$/, "")).join("\n").replace(/\n*$/, "") + "\n";
}

function validateLinks(skillsRoot) {
  for (const [relative, absolute] of files(skillsRoot)) {
    if (!relative.endsWith(".md")) continue;
    for (const found of readFileSync(absolute, "utf8").matchAll(/!?\[[^\]]*\]\(([^)]+)\)/g)) {
      let href = found[1].trim().split(/[ \t]+/, 1)[0];
      if (href.startsWith("<") && href.endsWith(">")) href = href.slice(1, -1);
      if (!href || /^(#|https?:\/\/|mailto:|<|\$\{)/.test(href)) continue;
      const target = href.split("#", 1)[0];
      if (!target) continue;
      const resolved = path.resolve(path.dirname(absolute), target);
      if (resolved !== skillsRoot && !resolved.startsWith(skillsRoot + path.sep)) fail("link escapes public export: " + relative + " -> " + href);
      if (!existsSync(resolved)) fail("broken internal link: " + relative + " -> " + href);
    }
  }
}

function validate(output, skillNames) {
  for (const name of skillNames) {
    const source = path.join(output, "skills", name, "SKILL.md");
    if (!existsSync(source) || !lstatSync(source).isFile()) fail("missing exported skill: " + source);
  }
  for (const entry of forbidden) if (existsSync(path.join(output, entry))) fail("forbidden project file in public export: " + entry);
  for (const [_relative, absolute] of files(path.join(output, "skills"))) {
    const bytes = readFileSync(absolute);
    if (bytes.includes(0)) continue;
    const text = bytes.toString("utf8");
    if (/-----BEGIN (?:[A-Z0-9 ]+ )?PRIVATE KEY-----|(?:ghp_|github_pat_|github_token_|xox[baprs]-)[A-Za-z0-9_-]+|AKIA[0-9A-Z]{16}/.test(text)) fail("suspicious credential-like content: " + absolute);
    if (/(?:^|[^.\w])\/(?:Users|home|private|tmp)\//.test(text)) fail("absolute local path in public export: " + absolute);
    if (/\.(?:agents|claude|codex|pi|qoder|trae)\/skills/.test(text)) fail("Agent root path in public export: " + absolute);
  }
  validateLinks(path.join(output, "skills"));
}

function loadConfig() {
  let data;
  try { data = JSON.parse(readFileSync(path.join(root, "yss-public-skills.json"), "utf8")); } catch (error) { fail("invalid yss-public-skills.json: " + error.message); }
  if (!Array.isArray(data.skills) || !data.skills.length || new Set(data.skills).size !== data.skills.length || data.skills.some((item) => !/^yss-[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item))) fail("yss-public-skills.json skills must be a unique non-empty skill-directory array");
  if (data.canonical_root !== ".agents/skills") fail("canonical_root must be .agents/skills");
  if (!Array.isArray(data.groupings) || !data.groupings.length) fail("yss-public-skills.json groupings must be a non-empty array");
  const grouped = data.groupings.flatMap((group) => {
    if (!group || typeof group.title !== "string" || !group.title || typeof group.description !== "string" || !Array.isArray(group.skills) || !group.skills.length || group.skills.some((skill) => !data.skills.includes(skill))) fail("invalid public skill grouping");
    return group.skills;
  });
  if (new Set(grouped).size !== grouped.length || [...grouped].sort().join("\0") !== [...data.skills].sort().join("\0")) fail("public grouping must cover every listed skill exactly once");
  return data;
}

function ensureOutput(output) {
  if (!existsSync(sourceRoot) || lstatSync(sourceRoot).isSymbolicLink()) fail("canonical skill root is missing or a symbolic link");
  const canonical = realpathSync(sourceRoot);
  if (output === canonical || output.startsWith(canonical + path.sep) || canonical.startsWith(output + path.sep)) fail("output directory must not overlap canonical skills: " + output);
  if (existsSync(output) && lstatSync(output).isSymbolicLink()) fail("output directory must not be a symbolic link: " + output);
  if (existsSync(output)) {
    for (const entry of managed) if (existsSync(path.join(output, entry)) && lstatSync(path.join(output, entry)).isSymbolicLink()) fail("managed export path must not be a symbolic link: " + path.join(output, entry));
    for (const entry of forbidden) if (existsSync(path.join(output, entry))) fail("forbidden project file in public export: " + entry);
  }
}

function build(output, data) {
  ensureOutput(output); mkdirSync(output, { recursive: true });
  for (const entry of managed) rmSync(path.join(output, entry), { recursive: true, force: true });
  mkdirSync(path.join(output, "skills"), { recursive: true });
  const exported = [];
  for (const directory of data.skills) {
    const source = path.join(sourceRoot, directory);
    if (!existsSync(source) || lstatSync(source).isSymbolicLink() || !lstatSync(source).isDirectory()) fail("listed skill directory invalid: " + source);
    const skillFile = path.join(source, "SKILL.md");
    if (!existsSync(skillFile) || !lstatSync(skillFile).isFile()) fail("listed skill has no SKILL.md: " + skillFile);
    const fields = parseFrontmatter(readFileSync(skillFile), skillFile);
    const normalized = fields.name.toLowerCase().replace(/[\s_]+/g, "-");
    if (exported.some((item) => item.name.toLowerCase().replace(/[\s_]+/g, "-") === normalized)) fail("duplicate normalized skill name: " + fields.name);
    const destination = path.join(output, "skills", directory); mkdirSync(destination, { recursive: true });
    const listed = [];
    for (const [relative, absolute] of files(source)) {
      const target = path.join(destination, relative); mkdirSync(path.dirname(target), { recursive: true });
      const bytes = readFileSync(absolute); const decoded = bytes.toString("utf8");
      writeFileSync(target, bytes.includes(0) || decoded.includes("\uFFFD") ? bytes : sanitize(decoded, directory + "/" + relative));
      chmodSync(target, lstatSync(absolute).mode & 0o7777); listed.push(relative);
    }
    exported.push({ directory, name: fields.name, description: fields.description, files: listed.sort() });
  }
  const names = Object.fromEntries(exported.map((item) => [item.directory, item.name]));
  writeFileSync(path.join(output, "skills.sh.json"), JSON.stringify({ "$schema": "https://skills.sh/schemas/skills.sh.schema.json", notGrouped: "bottom", groupings: data.groupings.map((group) => ({ ...group, skills: group.skills.map((directory) => names[directory]) })) }, null, 2) + "\n");
  const generated = Object.fromEntries(files(path.join(output, "skills")).map(([relative, absolute]) => [relative, hash(readFileSync(absolute))]));
  writeFileSync(path.join(output, ".yss-export-manifest.json"), JSON.stringify({ format_version: 1, source: { repository: data.repository, canonical_root: data.canonical_root }, skills: exported, generated_files_sha256: generated }, null, 2) + "\n");
  validate(output, data.skills);
}

function fileMap(directory) {
  const output = new Map();
  for (const entry of managed) {
    const target = path.join(directory, entry);
    if (!existsSync(target)) { output.set(entry, null); continue; }
    if (lstatSync(target).isDirectory()) for (const [relative, absolute] of files(target)) output.set(entry + "/" + relative, readFileSync(absolute));
    else output.set(entry, readFileSync(target));
  }
  return output;
}

export function exportSkills(argv = process.argv.slice(2)) {
  if (argv.includes("-h") || argv.includes("--help")) return "Usage: scripts/export-yss-skills --output DIR [--check]";
  const position = argv.indexOf("--output");
  if (position < 0 || !argv[position + 1]) fail("--output is required");
  const output = path.resolve(argv[position + 1]); const data = loadConfig();
  if (!argv.includes("--check")) { build(output, data); return "Exported " + data.skills.length + " YSS skills to " + output; }
  ensureOutput(output); if (!existsSync(output) || !lstatSync(output).isDirectory()) fail("export directory does not exist: " + output);
  const temporary = mkdtempSync(path.join(tmpdir(), "yss-export-check-"));
  try {
    build(temporary, data); validate(output, data.skills);
    const expected = fileMap(temporary); const actual = fileMap(output);
    if (expected.size !== actual.size || [...expected].some(([key, value]) => !actual.has(key) || !value.equals(actual.get(key)))) fail("export is out of date; managed file list or content differs");
    return "YSS public export is up to date: " + output;
  } finally { rmSync(temporary, { recursive: true, force: true }); }
}
