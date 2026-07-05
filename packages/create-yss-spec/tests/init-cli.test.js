const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const repoRoot = path.resolve(__dirname, "../../..");
const cliBin = path.join(repoRoot, "packages/create-yss-spec/bin/create-yss-spec.js");

test("interactive init generates a template instance in an empty directory", () => {
  const sandboxDir = fs.mkdtempSync(path.join(os.tmpdir(), "create-yss-spec-"));
  const targetDir = path.join(sandboxDir, "demo-project");
  const input = ["Demo Project", "Data Platform", targetDir].join("\n") + "\n";

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

  assert.match(agentsContent, /项目名称：\*\* Demo Project/);
  assert.match(agentsContent, /业务领域：\*\* Data Platform/);
  assert.doesNotMatch(agentsContent, /\[填写\]/);
  assert.match(readmeContent, /^# Demo Project/m);
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
