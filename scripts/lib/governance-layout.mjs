import { existsSync, lstatSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import {parseAsset} from "./structured-assets.mjs";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readInstanceMetadata } from "./instance-metadata.mjs";

// Only passive, Bundle-owned references retained by an explicit skills migration.
// The distribution-policy test keeps this list aligned with skillReferences.
export const retainedTemplateSourceReferences = {
  spec: [
    ".template-source/design/design-system-sync.yaml",
    ".template-source/design/preview-dark.html",
    ".template-source/design/preview.css",
    ".template-source/design/preview.html",
    ".template-source/design/preview.js",
    ".template-source/process/MATT-POCOCK-ENGINEERING-SKILLS.md",
    ".template-source/process/maintenance-intensity.yaml",
  ],
  backend: [".template-source/process/MATT-POCOCK-ENGINEERING-SKILLS.md"],
};

function verifyRetainedReferences(root) {
  const fail = () => { throw new TypeError("项目实例的 .template-source 只能保留完整且未修改的受管参考"); };
  const instance = readInstanceMetadata(root);
  if (instance?.kind !== "native") fail();
  const metadata = instance.metadata;
  const refs = metadata?.distribution?.retainedTemplateSourceReferences;
  const allowed = retainedTemplateSourceReferences[metadata?.profile];
  if (metadata?.schemaVersion !== 5 || metadata?.distribution?.installation !== "governed" || !Array.isArray(refs) || !allowed || refs.some(ref => typeof ref !== "string" || !allowed.includes(ref)) || new Set(refs).size !== refs.length || refs.some((ref, i) => i && refs[i - 1] >= ref)) fail();
  const seen = [];
  function walk(ref) {
    const entry = lstatSync(path.join(root, ref));
    if (entry.isSymbolicLink()) fail();
    if (entry.isDirectory()) {
      if (!refs.some(item => item.startsWith(`${ref}/`))) fail();
      for (const name of readdirSync(path.join(root, ref)).sort()) walk(`${ref}/${name}`);
      return;
    }
    if (!entry.isFile() || !refs.includes(ref)) fail();
    const item = metadata.managedFiles?.[ref];
    const expected = item?.lastApplied;
    const source = item?.baselineSource;
    if (item?.ownership !== "managed" || item?.disposition || source?.kind !== "bundle" || source.path !== ref || !/^[a-f0-9]{40}$/.test(metadata.templateCommit || "") || !/^[a-f0-9]{64}$/.test(metadata.snapshotHash || "") || !/^[a-f0-9]{64}$/.test(metadata.bundleHash || "") || source.templateCommit !== metadata.templateCommit || source.snapshotHash !== metadata.snapshotHash || source.bundleHash !== metadata.bundleHash || !expected || expected.type !== "file" || JSON.stringify(item.baseline) !== JSON.stringify(expected) || !/^[a-f0-9]{64}$/.test(expected.digest || "") || source.templateDigest !== expected.digest || expected.mode !== (entry.mode & 0o777)) fail();
    if (createHash("sha256").update(readFileSync(path.join(root, ref))).digest("hex") !== expected.digest) fail();
    seen.push(ref);
  }
  walk(".template-source");
  if (JSON.stringify(seen.sort()) !== JSON.stringify(refs)) fail();
}

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
  const identity = parseAsset(readFileSync(path.join(root,"yss-project.yaml")),"yss-project.yaml");
  const required = identity.schema_version === 2 && mode === "project-instance" ? requiredShared.filter(ref => !ref.endsWith("digital-human-roles.yaml")) : requiredShared;
  for (const ref of required) {
    if (!existsSync(path.join(root, ref))) throw new TypeError(`缺少共享治理资产: ${ref}`);
  }
  let oldFiles;
  if (mode === "template-source") {
    for (const ref of ["AGENTS.md", ...["backend"].map(profile => `profiles/${profile}/AGENTS.md`)]) {
      if (ref !== "AGENTS.md" && !existsSync(path.join(root, ref))) continue;
      const source = readFileSync(path.join(root, ref), "utf8");
      const start = "<!-- YSS_TEMPLATE_SOURCE_ONLY_START -->", end = "<!-- YSS_TEMPLATE_SOURCE_ONLY_END -->";
      if (source.split(start).length !== 2 || source.split(end).length !== 2 || source.indexOf(end) < source.indexOf(start)) {
        throw new TypeError(`AGENTS_SOURCE_ONLY_MARKERS: 当前模板来源必须有一对顺序正确的标记: ${ref}`);
      }
    }
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
    let hasSource = true;
    try { lstatSync(path.join(root, ".template-source")); }
    catch (error) { if (error?.code !== "ENOENT") throw error; hasSource = false; }
    if (hasSource) verifyRetainedReferences(root);
  }
  if (oldFiles.length) {
    throw new TypeError(`旧治理文件仍位于 docs/，需显式迁移: ${oldFiles.sort().join(", ")}`);
  }
  return { mode, shared: requiredShared.length, legacy: 0 };
}
