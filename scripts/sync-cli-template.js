const fs = require("node:fs");
const path = require("node:path");

const repoRoot = path.resolve(__dirname, "..");
const packageRoot = path.join(repoRoot, "packages/create-yss-spec");
const targetTemplateRoot = path.join(packageRoot, "template");
const sourceManifestPath = path.join(repoRoot, "template.manifest.json");
const targetManifestPath = path.join(packageRoot, "template.manifest.json");
const manifest = JSON.parse(fs.readFileSync(sourceManifestPath, "utf8"));

const excludedRootEntries = new Set([
  ...manifest.excludeRootEntries,
  "dist",
]);
const excludedRootFiles = new Set(manifest.excludeRootFiles);
const excludedRelativePaths = new Set(manifest.excludePaths);

function shouldSkipRootEntry(entryName) {
  return (
    excludedRootEntries.has(entryName) || excludedRootFiles.has(entryName)
  );
}

function shouldSkipRelativePath(relativePath) {
  return excludedRelativePaths.has(relativePath.split(path.sep).join("/"));
}

function copyDirectory(sourceDir, targetDir, relativeDir = "") {
  const entries = fs.readdirSync(sourceDir, { withFileTypes: true });

  for (const entry of entries) {
    if (!relativeDir && shouldSkipRootEntry(entry.name)) {
      continue;
    }

    const relativePath = relativeDir
      ? path.posix.join(relativeDir, entry.name)
      : entry.name;

    if (shouldSkipRelativePath(relativePath)) {
      continue;
    }

    const sourcePath = path.join(sourceDir, entry.name);
    const targetPath = path.join(targetDir, entry.name);

    if (entry.isDirectory()) {
      fs.mkdirSync(targetPath, { recursive: true });
      copyDirectory(sourcePath, targetPath, relativePath);
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    fs.copyFileSync(sourcePath, targetPath);
  }
}

fs.rmSync(targetTemplateRoot, { recursive: true, force: true });
fs.mkdirSync(targetTemplateRoot, { recursive: true });
copyDirectory(repoRoot, targetTemplateRoot);
fs.copyFileSync(sourceManifestPath, targetManifestPath);

console.log(`Synced template into ${path.relative(repoRoot, targetTemplateRoot)}`);
