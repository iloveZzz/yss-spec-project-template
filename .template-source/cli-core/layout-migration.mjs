import * as fs from "node:fs";
import { descriptor, ensure, hash, safe, same } from "./io.mjs";

const oldDirs = [
  "docs/agents", "docs/process", "docs/templates", "docs/user-guide",
  "docs/plan/templates", "docs/api/templates", "docs/architecture/templates",
  "docs/design/templates", "docs/design/tokens", "docs/design/schemas",
  "docs/design/diagrams", "docs/discovery/templates",
];
const oldFiles = [
  "docs/adr/README.md", "docs/architecture/README.md",
  "docs/plan/README.md", "docs/plan/entry-review.md",
  "docs/discovery/README.md", "docs/discovery/IDEATION.md",
  "docs/design/README.md", "docs/design/design.md",
  "docs/design/design-system-sync.yaml", "docs/design/preview.html",
  "docs/design/preview-dark.html", "docs/design/preview.css",
  "docs/design/preview.js", "docs/engineering/backend-platforms.json",
  "docs/engineering/backend-platforms.md",
];
const trackerFrom = "docs/agents/issue-tracker.md";
const trackerTo = ".template-spec/agents/issue-tracker.md";

function collect(target) {
  const found = new Set();
  function visit(ref) {
    const file = safe(target, ref);
    let entry;
    try { entry = fs.lstatSync(file); }
    catch (error) { if (error.code === "ENOENT") return; throw error; }
    ensure(!entry.isSymbolicLink(), `旧治理路径为符号链接: ${ref}`, "PATH");
    if (entry.isFile()) { found.add(ref); return; }
    ensure(entry.isDirectory(), `旧治理路径不是普通文件或目录: ${ref}`, "PATH");
    for (const name of fs.readdirSync(file)) {
      if (name !== ".DS_Store") visit(`${ref}/${name}`);
    }
  }
  for (const ref of [...oldDirs, ...oldFiles]) visit(ref);
  return [...found].sort();
}

export function prepareLayoutMigration(target, meta, files, opts) {
  const legacyFiles = collect(target);
  if (!legacyFiles.length) return { legacyFiles, replacements: new Map(), deletions: [] };
  ensure(opts.command !== "diff" && opts.migrateLayout, `旧治理目录需显式 --migrate-layout: ${legacyFiles.join(", ")}`, "LAYOUT");
  const replacements = new Map();
  const deletions = [];
  for (const from of legacyFiles) {
    const to = `.template-spec/${from.slice("docs/".length)}`;
    const before = descriptor(target, from);
    const destination = descriptor(target, to);
    if (from === trackerFrom) {
      ensure(files.has(trackerTo), `当前模板缺少 tracker 目标: ${trackerTo}`, "LAYOUT");
      const bytes = fs.readFileSync(safe(target, from));
      ensure(!destination || destination.digest === hash(bytes), `项目 tracker 新旧配置不一致: ${from}`, "LAYOUT");
      if (!destination) replacements.set(to, bytes);
    } else {
      const baseline = meta?.managedFiles?.[from]?.baseline;
      ensure(baseline && same(before, baseline), `旧治理文件缺少可信基线或已修改: ${from}`, "LAYOUT");
      ensure(files.has(to) || !destination, `目标路径已有文件且当前模板未分发: ${to}`, "LAYOUT");
    }
    deletions.push({ path: from, before, after: null });
  }
  return { legacyFiles, replacements, deletions };
}
