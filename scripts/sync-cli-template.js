const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

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
const trackedRepoState = loadTrackedRepoState();

function loadTrackedRepoState() {
  const result = spawnSync("git", ["ls-files"], {
    cwd: repoRoot,
    encoding: "utf8",
  });

  if (result.status !== 0) {
    return null;
  }

  const files = new Set();
  const directories = new Set();

  for (const entry of result.stdout.split(/\r?\n/)) {
    if (!entry) {
      continue;
    }

    const normalizedEntry = entry.split(path.sep).join("/");
    files.add(normalizedEntry);

    const segments = normalizedEntry.split("/");
    segments.pop();

    let current = "";
    for (const segment of segments) {
      current = current ? `${current}/${segment}` : segment;
      directories.add(current);
    }
  }

  return {
    files,
    directories,
  };
}

function shouldSkipRootEntry(entryName) {
  return (
    excludedRootEntries.has(entryName) || excludedRootFiles.has(entryName)
  );
}

function shouldSkipRelativePath(relativePath) {
  return excludedRelativePaths.has(relativePath.split(path.sep).join("/"));
}

function shouldSkipUntrackedPath(relativePath, isDirectory) {
  if (!trackedRepoState) {
    return false;
  }

  const normalizedPath = relativePath.split(path.sep).join("/");

  if (isDirectory) {
    return !trackedRepoState.directories.has(normalizedPath);
  }

  return !trackedRepoState.files.has(normalizedPath);
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

    if (shouldSkipUntrackedPath(relativePath, entry.isDirectory())) {
      continue;
    }

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
