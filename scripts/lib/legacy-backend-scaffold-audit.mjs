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
  const retired = manifest?.architecture_profile === "mvc-data-analysis-v1";
  const generic = (manifest?.architecture_family === 'domain-driven' && manifest?.architecture_profile === 'target-domain-model') || (manifest?.architecture_family === 'layered-mvc' && manifest?.architecture_profile === 'layered-mvc-service');
  const legacyStandalone = generic && manifest?.schema_version === 1 && manifest?.kind === 'standalone-backend-scaffold' && manifest?.generation_mode === 'standalone-generation';
  const legacyFormal = generic && manifest?.schema_version === 4 && manifest?.kind === 'backend-scaffold';
  const readOnly = legacyStandalone || legacyFormal;
  if (manifest?.schema_version !== 3 && !(retired && manifest?.schema_version === 4) && !readOnly) throw new TypeError("恢复审计只接受历史 v3、独立 v1 或正式 v4 Manifest");
  if (readOnly && (manifest.reference_example !== undefined || manifest.generation_input?.reference_example !== undefined)) throw new TypeError('历史 Manifest 不得夹带 reference_example');
  const inventory = manifest?.ownership?.generated_files;
  if (!Array.isArray(inventory) || !inventory.length || inventory.some(entry => typeof entry?.path !== 'string' || !/^[a-f0-9]{64}$/.test(normalizedDigest(entry.sha256))) || new Set(inventory.map(entry => entry.path)).size !== inventory.length) throw new TypeError("历史 Manifest 缺少合法且唯一的 ownership.generated_files");

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
      let current = root;
      for (const part of relative.split(/[\\/]/)) {
        current = path.join(current, part);
        if ((await lstat(current)).isSymbolicLink()) throw Object.assign(new Error('linked generated path'), { code: 'SYMLINK' });
      }
      const info = await lstat(target);
      if (!info.isFile()) generatedFileDrift.push({ path: relative, reason: "not-a-regular-file" });
      else {
        const actual = sha256(await readFile(target));
        if (actual !== normalizedDigest(entry.sha256)) generatedFileDrift.push({ path: relative, reason: "digest-drift", expected: normalizedDigest(entry.sha256), actual });
      }
    } catch (error) {
      if (error.code === "ENOENT") generatedFileDrift.push({ path: relative, reason: "missing" });
      else if (error.code === 'SYMLINK') generatedFileDrift.push({ path: relative, reason: 'symlink' });
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
    status: retired ? "retired-read-only" : state === "unchanged-mechanical-scaffold" ? readOnly ? "read-only-audited" : "reconcilable" : "blocked",
    execution_allowed: false,
    lifecycle_transition_allowed: false,
    platform_requalification: false,
    ...(retired ? { retirement: "mvc-data-analysis-v1", lifecycle_transition_allowed: false } : {}),
    manifest_ref: manifestRef,
    manifest_digest: `sha256:${sha256(manifestBytes)}`,
    manifest_schema_version: manifest.schema_version,
    ownership_state: state,
    premature_implementation: premature,
    generated_file_drift: generatedFileDrift,
    business_files: businessFiles,
    unowned_files: unownedFiles,
    recovery_requirements: retired || readOnly ? ["read-only-audit", "no-new-generation-or-transition"] : state === "unchanged-mechanical-scaffold"
      ? ["approved-current-technical-design", "data-architecture-decision", "gate.engineering-contract-approved", "recovery-approval"]
      : ["preserve-all-files", "design-reconciliation", "difference-review", "current-user-approval"],
  };
}
