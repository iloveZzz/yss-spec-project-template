import { existsSync, lstatSync, readdirSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const requiredShared = [
  ".template-spec/agents/yss-skill-registry.yaml",
  ".template-spec/agents/digital-human-roles.yaml",
  ".template-spec/agents/issue-tracker.md",
  ".template-spec/process/lifecycle-registry.yaml",
  ".template-spec/process/lifecycle-artifact-map.md",
];
const oldStaticDirs = [
  "docs/agents", "docs/process", "docs/templates", "docs/user-guide",
  "docs/plan/templates", "docs/api/templates", "docs/architecture/templates",
  "docs/design/templates", "docs/design/tokens", "docs/design/schemas",
  "docs/design/diagrams", "docs/discovery/templates",
];
const oldStaticFiles = new Set([
  "docs/adr/README.md", "docs/architecture/README.md",
  "docs/plan/README.md", "docs/plan/entry-review.md",
  "docs/discovery/README.md", "docs/discovery/IDEATION.md",
  "docs/design/README.md", "docs/design/design.md",
  "docs/design/design-system-sync.yaml", "docs/design/preview.html",
  "docs/design/preview-dark.html", "docs/design/preview.css",
  "docs/design/preview.js", "docs/engineering/backend-platforms.json",
  "docs/engineering/backend-platforms.md",
]);

function staticPath(ref) {
  return oldStaticFiles.has(ref) || oldStaticDirs.some((directory) => ref.startsWith(`${directory}/`));
}

function filesBelow(root, relativePath) {
  const full = path.join(root, relativePath);
  if (!existsSync(full)) return [];
  const entry = lstatSync(full);
  if (!entry.isDirectory()) return [relativePath];
  return readdirSync(full).filter((name) => name !== ".DS_Store")
    .flatMap((name) => filesBelow(root, `${relativePath}/${name}`));
}

export function verifyGovernanceLayout(root, mode) {
  if (!["template-source", "project-instance"].includes(mode)) {
    throw new TypeError(`不支持的仓库身份: ${mode}`);
  }
  for (const ref of requiredShared) {
    if (!existsSync(path.join(root, ref))) throw new TypeError(`缺少共享治理资产: ${ref}`);
  }
  let oldFiles;
  if (mode === "template-source") {
    const result = spawnSync("git", ["ls-files", "-z", "--", "docs"], { cwd: root, encoding: "utf8" });
    if (result.status !== 0) throw new TypeError(result.stderr || "无法读取模板源受控文件清单");
    oldFiles = result.stdout.split("\0").filter(Boolean).filter(staticPath);
    for (const ref of [
      ".template-source/process/maintenance-intensity.yaml",
      ".template-source/process/template-verification-profiles.yaml",
      ".template-source/agents/skills-maintenance.md",
    ]) {
      if (!existsSync(path.join(root, ref))) throw new TypeError(`缺少模板维护资产: ${ref}`);
    }
  } else {
    oldFiles = [...new Set([
      ...oldStaticDirs.flatMap((ref) => filesBelow(root, ref)),
      ...[...oldStaticFiles].filter((ref) => existsSync(path.join(root, ref))),
    ])];
    if (existsSync(path.join(root, ".template-source"))) {
      throw new TypeError("项目实例不得包含 .template-source");
    }
  }
  if (oldFiles.length) {
    throw new TypeError(`旧治理文件仍位于 docs/，需显式迁移: ${oldFiles.sort().join(", ")}`);
  }
  return { mode, shared: requiredShared.length, legacy: 0 };
}
