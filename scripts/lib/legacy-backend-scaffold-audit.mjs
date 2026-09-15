import { createHash } from "node:crypto";
import { lstat, readFile, readdir } from "node:fs/promises";
import path from "node:path";

const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const normalizedDigest = (value) => String(value ?? "").replace(/^sha256:/, "");

async function collectFiles(root) {
  const files = [];
  async function visit(directory) {
    for (const entry of (await readdir(directory, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
      if ([".git", "target", "node_modules"].includes(entry.name)) continue;
      const target = path.join(directory, entry.name);
      const relative = path.relative(root, target).split(path.sep).join("/");
      if (entry.isDirectory()) await visit(target);
      else files.push({ relative, target, symlink: entry.isSymbolicLink() });
    }
  }
  await visit(root);
  return files;
}

function isBusinessFile(relative, manifest) {
  if (relative === manifest.bootstrap_main_source || /(^|\/)package-info\.java$/.test(relative)) return false;
  return /(^|\/)src\/(main|test)\/java\/.+\.java$/.test(relative)
    || /(^|\/)src\/main\/resources\/.+\.(sql|xml|ya?ml|properties)$/.test(relative)
    || /(^|\/)(db|mapper|repository|controller|domain)(\/|$)/i.test(relative)
    || /(^|\/)(Controller|Repository|Mapper|Aggregate|Entity)\.java$/i.test(relative);
}

export async function auditLegacyBackendScaffold(projectRoot, { manifestRef = ".yss/scaffold-generation.json" } = {}) {
  const root = path.resolve(projectRoot);
  const manifestFile = path.resolve(root, manifestRef);
  const relativeManifest = path.relative(root, manifestFile);
  if (relativeManifest.startsWith("..") || path.isAbsolute(relativeManifest)) throw new TypeError("Manifest 必须位于项目根内");
  const manifestBytes = await readFile(manifestFile).catch(() => { throw new TypeError(`Manifest 不可读取: ${manifestRef}`); });
  let manifest;
  try { manifest = JSON.parse(manifestBytes); } catch { throw new TypeError("Manifest 必须是 JSON 对象"); }
  if (manifest?.schema_version !== 3) throw new TypeError("恢复审计只接受历史 v3 Manifest");
  if (!Array.isArray(manifest?.ownership?.generated_files)) throw new TypeError("历史 v3 Manifest 缺少 ownership.generated_files");

  const generated = new Map(manifest.ownership.generated_files.map((entry) => [entry.path, entry]));
  const generatedFileDrift = [];
  for (const [relative, entry] of generated) {
    const target = path.resolve(root, relative);
    const inside = path.relative(root, target);
    if (inside.startsWith("..") || path.isAbsolute(inside)) {
      generatedFileDrift.push({ path: relative, reason: "path-outside-project" });
      continue;
    }
    try {
      const info = await lstat(target);
      if (!info.isFile()) generatedFileDrift.push({ path: relative, reason: "not-a-regular-file" });
      else {
        const actual = sha256(await readFile(target));
        if (actual !== normalizedDigest(entry.sha256)) generatedFileDrift.push({ path: relative, reason: "digest-drift", expected: normalizedDigest(entry.sha256), actual });
      }
    } catch (error) {
      if (error.code === "ENOENT") generatedFileDrift.push({ path: relative, reason: "missing" });
      else throw error;
    }
  }

  const files = await collectFiles(root);
  const unownedFiles = files.map((entry) => entry.relative).filter((relative) => relative !== manifestRef && !generated.has(relative));
  const businessFiles = files
    .filter((entry) => entry.symlink || (unownedFiles.includes(entry.relative) && isBusinessFile(entry.relative, manifest)))
    .map((entry) => entry.relative);
  const premature = businessFiles.length > 0;
  const state = premature ? "premature-implementation-detected" : generatedFileDrift.length > 0 ? "generated-file-drift" : "unchanged-mechanical-scaffold";
  return {
    schema_version: 1,
    kind: "legacy-backend-scaffold-ownership-audit",
    status: state === "unchanged-mechanical-scaffold" ? "reconcilable" : "blocked",
    manifest_ref: manifestRef,
    manifest_digest: `sha256:${sha256(manifestBytes)}`,
    manifest_schema_version: 3,
    ownership_state: state,
    premature_implementation: premature,
    generated_file_drift: generatedFileDrift,
    business_files: businessFiles,
    unowned_files: unownedFiles,
    recovery_requirements: state === "unchanged-mechanical-scaffold"
      ? ["approved-current-technical-design", "data-architecture-decision", "gate.engineering-contract-approved", "recovery-approval"]
      : ["preserve-all-files", "design-reconciliation", "difference-review", "current-user-approval"],
  };
}
