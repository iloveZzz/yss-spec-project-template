const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const crypto = require("node:crypto");
const { spawnSync } = require("node:child_process");

const repoRoot = path.resolve(__dirname, "../../..");
const cliBin = path.join(repoRoot, "packages/create-yss-spec/bin/create-yss-spec.js");
const metadataFileName = ".yss-template.json";

function sha256(content) {
  return crypto.createHash("sha256").update(content).digest("hex");
}

test("interactive init generates a template instance in an empty directory", () => {
  const sandboxDir = fs.mkdtempSync(path.join(os.tmpdir(), "create-yss-spec-"));
  const targetDir = path.join(sandboxDir, "demo-project");
  const input = ["Demo Project", "Data Platform", "12", targetDir].join("\n") + "\n";

  const result = spawnSync(process.execPath, [cliBin], {
    cwd: repoRoot,
    encoding: "utf8",
    input,
  });

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /初始化完成/);
  assert.match(result.stdout, /下一步建议/);
  assert.ok(fs.existsSync(path.join(targetDir, "AGENTS.md")));
  assert.ok(fs.existsSync(path.join(targetDir, "README.md")));
  assert.ok(fs.existsSync(path.join(targetDir, metadataFileName)));
  assert.ok(fs.existsSync(path.join(targetDir, "docs/templates/prd-template.md")));
  assert.equal(fs.existsSync(path.join(targetDir, ".git")), false);
  assert.equal(fs.existsSync(path.join(targetDir, "packages")), false);
  assert.equal(
    fs.existsSync(path.join(targetDir, "scripts/sync-cli-template.js")),
    false,
  );
  assert.equal(
    fs.existsSync(path.join(targetDir, ".claude/settings.local.json")),
    false,
  );
  assert.equal(
    fs.existsSync(path.join(targetDir, ".codex/hooks.json")),
    false,
  );
  assert.equal(
    fs.existsSync(path.join(targetDir, ".codex/settings.local.json")),
    false,
  );
  assert.equal(fs.existsSync(path.join(targetDir, ".pi/settings.json")), false);
  assert.equal(fs.existsSync(path.join(targetDir, ".codebuddy")), false);
  assert.equal(fs.existsSync(path.join(targetDir, ".qoder")), false);
  assert.equal(fs.existsSync(path.join(targetDir, ".qwen")), false);

  const agentsContent = fs.readFileSync(path.join(targetDir, "AGENTS.md"), "utf8");
  const readmeContent = fs.readFileSync(path.join(targetDir, "README.md"), "utf8");
  const metadata = JSON.parse(
    fs.readFileSync(path.join(targetDir, metadataFileName), "utf8"),
  );

  assert.match(agentsContent, /项目名称：\*\* Demo Project/);
  assert.match(agentsContent, /业务领域：\*\* Data Platform/);
  assert.match(agentsContent, /团队规模：\*\* 12/);
  assert.doesNotMatch(agentsContent, /\[填写\]/);
  assert.match(readmeContent, /^# Demo Project/m);
  assert.equal(metadata.templateName, "create-yss-spec");
  assert.equal(metadata.templateVersion, "1.0.0");
  assert.equal(metadata.variables.projectName, "Demo Project");
  assert.equal(metadata.variables.businessDomain, "Data Platform");
});

test("dry-run previews the plan without writing or deleting files", () => {
  const sandboxDir = fs.mkdtempSync(path.join(os.tmpdir(), "create-yss-spec-"));
  const targetDir = path.join(sandboxDir, "preview-project");

  const result = spawnSync(
    process.execPath,
    [
      cliBin,
      "--project-name",
      "Preview Project",
      "--business-domain",
      "Fixed Income",
      "--target-dir",
      targetDir,
      "--dry-run",
    ],
    {
      cwd: repoRoot,
      encoding: "utf8",
    },
  );

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /dry-run/i);
  assert.equal(fs.existsSync(targetDir), false);
  assert.equal(fs.existsSync(path.join(targetDir, "AGENTS.md")), false);

  fs.mkdirSync(targetDir, { recursive: true });
  const existingFile = path.join(targetDir, "keep.txt");
  fs.writeFileSync(existingFile, "existing", "utf8");

  const forceDryRunResult = spawnSync(
    process.execPath,
    [
      cliBin,
      "--project-name",
      "Preview Project",
      "--business-domain",
      "Fixed Income",
      "--target-dir",
      targetDir,
      "--dry-run",
      "--force",
    ],
    {
      cwd: repoRoot,
      encoding: "utf8",
    },
  );

  assert.equal(forceDryRunResult.status, 0, forceDryRunResult.stderr);
  assert.equal(fs.readFileSync(existingFile, "utf8"), "existing");
  assert.equal(fs.existsSync(path.join(targetDir, "AGENTS.md")), false);
});

test("non-empty target requires --force, and --git-init initializes a repository", () => {
  const sandboxDir = fs.mkdtempSync(path.join(os.tmpdir(), "create-yss-spec-"));
  const targetDir = path.join(sandboxDir, "existing-project");

  fs.mkdirSync(targetDir, { recursive: true });
  fs.writeFileSync(path.join(targetDir, "keep.txt"), "existing", "utf8");

  const blockedResult = spawnSync(
    process.execPath,
    [
      cliBin,
      "--project-name",
      "Force Project",
      "--business-domain",
      "Macro Research",
      "--target-dir",
      targetDir,
    ],
    {
      cwd: repoRoot,
      encoding: "utf8",
    },
  );

  assert.notEqual(blockedResult.status, 0);
  assert.match(blockedResult.stderr, /非空/);

  const forcedResult = spawnSync(
    process.execPath,
    [
      cliBin,
      "--project-name",
      "Force Project",
      "--business-domain",
      "Macro Research",
      "--target-dir",
      targetDir,
      "--force",
      "--git-init",
    ],
    {
      cwd: repoRoot,
      encoding: "utf8",
    },
  );

  assert.equal(forcedResult.status, 0, forcedResult.stderr);
  assert.ok(fs.existsSync(path.join(targetDir, "AGENTS.md")));
  assert.ok(fs.existsSync(path.join(targetDir, ".git")));
});

test("manifest-driven optional flags affect rendered output and example docs", () => {
  const sandboxDir = fs.mkdtempSync(path.join(os.tmpdir(), "create-yss-spec-"));
  const targetDir = path.join(sandboxDir, "customized-project");

  const result = spawnSync(
    process.execPath,
    [
      cliBin,
      "--project-name",
      "Custom Project",
      "--business-domain",
      "Cross Asset",
      "--target-dir",
      targetDir,
      "--issue-tracker",
      "gitlab",
      "--no-example-docs",
    ],
    {
      cwd: repoRoot,
      encoding: "utf8",
    },
  );

  assert.equal(result.status, 0, result.stderr);

  const readmeContent = fs.readFileSync(path.join(targetDir, "README.md"), "utf8");

  assert.match(readmeContent, /默认 Issue Tracker：gitlab/);
  assert.equal(
    fs.existsSync(path.join(targetDir, "docs/discovery/IDEATION.md")),
    false,
  );
});

test("repo development mode ignores untracked files from the template source", () => {
  const sandboxDir = fs.mkdtempSync(path.join(os.tmpdir(), "create-yss-spec-"));
  const targetDir = path.join(sandboxDir, "tracked-only-project");
  const sentinelName = ".tmp-create-yss-spec-untracked.txt";
  const sentinelPath = path.join(repoRoot, sentinelName);

  fs.writeFileSync(sentinelPath, "untracked", "utf8");

  try {
    const result = spawnSync(
      process.execPath,
      [
        cliBin,
        "--project-name",
        "Tracked Only Project",
        "--business-domain",
        "Platform",
        "--target-dir",
        targetDir,
      ],
      {
        cwd: repoRoot,
        encoding: "utf8",
      },
    );

    assert.equal(result.status, 0, result.stderr);
    assert.equal(fs.existsSync(path.join(targetDir, sentinelName)), false);
  } finally {
    fs.rmSync(sentinelPath, { force: true });
  }
});

test("sync rejects projects without template metadata", () => {
  const sandboxDir = fs.mkdtempSync(path.join(os.tmpdir(), "create-yss-spec-"));

  const result = spawnSync(process.execPath, [cliBin, "sync"], {
    cwd: sandboxDir,
    encoding: "utf8",
  });

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /模板元数据|模板实例仓库/);
});

test("sync updates unchanged managed files and restores missing managed files", () => {
  const sandboxDir = fs.mkdtempSync(path.join(os.tmpdir(), "create-yss-spec-"));
  const targetDir = path.join(sandboxDir, "sync-project");

  const initResult = spawnSync(
    process.execPath,
    [
      cliBin,
      "--project-name",
      "Sync Project",
      "--business-domain",
      "Operations",
      "--target-dir",
      targetDir,
    ],
    {
      cwd: repoRoot,
      encoding: "utf8",
    },
  );

  assert.equal(initResult.status, 0, initResult.stderr);

  const metadataPath = path.join(targetDir, metadataFileName);
  const readmePath = path.join(targetDir, "README.md");
  const restoredPath = path.join(targetDir, "docs/templates/spec-delta-template.md");
  const originalReadme = fs.readFileSync(readmePath, "utf8");
  const metadata = JSON.parse(fs.readFileSync(metadataPath, "utf8"));

  const legacyReadme = originalReadme.replace("默认 Issue Tracker：github", "默认 Issue Tracker：jira");
  fs.writeFileSync(readmePath, legacyReadme, "utf8");
  fs.rmSync(restoredPath, { force: true });

  metadata.templateVersion = "0.9.0";
  metadata.managedFiles["README.md"].contentHash = sha256(legacyReadme);
  delete metadata.managedFiles["docs/templates/spec-delta-template.md"];
  fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2) + "\n", "utf8");

  const syncResult = spawnSync(process.execPath, [cliBin, "sync"], {
    cwd: targetDir,
    encoding: "utf8",
  });

  assert.equal(syncResult.status, 0, syncResult.stderr);
  assert.match(syncResult.stdout, /同步完成/);
  assert.match(syncResult.stdout, /0\.9\.0/);
  assert.match(syncResult.stdout, /1\.0\.0/);
  assert.equal(fs.readFileSync(readmePath, "utf8"), originalReadme);
  assert.ok(fs.existsSync(restoredPath));

  const syncedMetadata = JSON.parse(fs.readFileSync(metadataPath, "utf8"));
  assert.equal(syncedMetadata.templateVersion, "1.0.0");
  assert.equal(
    syncedMetadata.managedFiles["README.md"].contentHash,
    sha256(originalReadme),
  );
  assert.ok(
    syncedMetadata.managedFiles["docs/templates/spec-delta-template.md"],
  );
});

test("sync dry-run previews changes without mutating files or metadata", () => {
  const sandboxDir = fs.mkdtempSync(path.join(os.tmpdir(), "create-yss-spec-"));
  const targetDir = path.join(sandboxDir, "sync-preview-project");

  const initResult = spawnSync(
    process.execPath,
    [
      cliBin,
      "--project-name",
      "Preview Sync Project",
      "--business-domain",
      "Research",
      "--target-dir",
      targetDir,
    ],
    {
      cwd: repoRoot,
      encoding: "utf8",
    },
  );

  assert.equal(initResult.status, 0, initResult.stderr);

  const metadataPath = path.join(targetDir, metadataFileName);
  const readmePath = path.join(targetDir, "README.md");
  const restoredPath = path.join(targetDir, "docs/templates/spec-delta-template.md");
  const originalReadme = fs.readFileSync(readmePath, "utf8");
  const metadata = JSON.parse(fs.readFileSync(metadataPath, "utf8"));
  const legacyReadme = originalReadme.replace("默认 Issue Tracker：github", "默认 Issue Tracker：youtrack");

  fs.writeFileSync(readmePath, legacyReadme, "utf8");
  fs.rmSync(restoredPath, { force: true });

  metadata.templateVersion = "0.8.0";
  metadata.managedFiles["README.md"].contentHash = sha256(legacyReadme);
  delete metadata.managedFiles["docs/templates/spec-delta-template.md"];
  const beforeDryRunMetadata = `${JSON.stringify(metadata, null, 2)}\n`;
  fs.writeFileSync(metadataPath, beforeDryRunMetadata, "utf8");

  const result = spawnSync(process.execPath, [cliBin, "sync", "--dry-run"], {
    cwd: targetDir,
    encoding: "utf8",
  });

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /sync dry-run/i);
  assert.match(result.stdout, /0\.8\.0/);
  assert.match(result.stdout, /1\.0\.0/);
  assert.match(result.stdout, /update: README\.md/);
  assert.match(result.stdout, /add: docs\/templates\/spec-delta-template\.md/);
  assert.equal(fs.readFileSync(readmePath, "utf8"), legacyReadme);
  assert.equal(fs.existsSync(restoredPath), false);
  assert.equal(fs.readFileSync(metadataPath, "utf8"), beforeDryRunMetadata);
});

test("sync skips locally modified managed files and reports removed managed files", () => {
  const sandboxDir = fs.mkdtempSync(path.join(os.tmpdir(), "create-yss-spec-"));
  const targetDir = path.join(sandboxDir, "sync-protected-project");

  const initResult = spawnSync(
    process.execPath,
    [
      cliBin,
      "--project-name",
      "Protected Sync Project",
      "--business-domain",
      "Governance",
      "--target-dir",
      targetDir,
    ],
    {
      cwd: repoRoot,
      encoding: "utf8",
    },
  );

  assert.equal(initResult.status, 0, initResult.stderr);

  const metadataPath = path.join(targetDir, metadataFileName);
  const readmePath = path.join(targetDir, "README.md");
  const restoredPath = path.join(targetDir, "docs/templates/spec-delta-template.md");
  const removedPath = path.join(targetDir, "docs/legacy-note.md");
  const metadata = JSON.parse(fs.readFileSync(metadataPath, "utf8"));
  const localReadme = `${fs.readFileSync(readmePath, "utf8")}\n本地说明：不要覆盖\n`;

  fs.writeFileSync(readmePath, localReadme, "utf8");
  fs.rmSync(restoredPath, { force: true });
  fs.writeFileSync(removedPath, "legacy note", "utf8");

  metadata.templateVersion = "0.9.0";
  delete metadata.managedFiles["docs/templates/spec-delta-template.md"];
  metadata.managedFiles["docs/legacy-note.md"] = {
    type: "copy",
    contentHash: sha256("legacy note"),
  };
  fs.writeFileSync(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`, "utf8");

  const result = spawnSync(process.execPath, [cliBin, "sync"], {
    cwd: targetDir,
    encoding: "utf8",
  });

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /跳过文件：1/);
  assert.match(result.stdout, /删除差异：1/);
  assert.match(result.stdout, /README\.md/);
  assert.match(result.stdout, /docs\/legacy-note\.md/);
  assert.match(result.stdout, /git diff|git status/);
  assert.equal(fs.readFileSync(readmePath, "utf8"), localReadme);
  assert.ok(fs.existsSync(restoredPath));
  assert.ok(fs.existsSync(removedPath));
});
