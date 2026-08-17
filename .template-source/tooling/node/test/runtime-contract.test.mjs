import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";

const toolingRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repositoryRoot = path.resolve(toolingRoot, "../../..");

test("Node runtime contract exposes a vendored YAML parser for distributed scripts", async () => {
  const yaml = await import(path.join(repositoryRoot, "scripts/vendor/yaml.mjs"));
  const document = yaml.parseDocument("schema_version: 1\nrepository_mode: template-source\n", {
    maxAliasCount: 0
  });
  assert.equal(document.errors.length, 0);
  assert.equal(document.toJSON().repository_mode, "template-source");
});

test("YAML aliases are rejected before a repository manifest is materialized", async () => {
  const { readRepositoryMode } = await import(path.join(repositoryRoot, "scripts/lib/repository-mode.mjs"));
  const fixture = await mkdtemp(path.join(tmpdir(), "yss-alias-"));
  try {
    await writeFile(path.join(fixture, "yss-project.yaml"), "schema_version: &version 1\nrepository_mode: template-source\ncopy: *version\n");
    assert.throws(() => readRepositoryMode(fixture), /无法解析|必须只声明/);
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
});

test("repository mode public seam is executable by Node", async () => {
  const { readRepositoryMode } = await import(path.join(repositoryRoot, "scripts/lib/repository-mode.mjs"));
  assert.equal(readRepositoryMode(repositoryRoot), "template-source");
});

test("vendored XML parser rejects DOCTYPE and preserves scalar text", async () => {
  const { parseXmlDocument } = await import(path.join(repositoryRoot, "scripts/vendor/xml.mjs"));
  assert.throws(() => parseXmlDocument("<!DOCTYPE settings><settings/>"), /DOCTYPE/);
  const parsed = parseXmlDocument("<settings><username>001</username></settings>", { expectedRoot: "settings" });
  assert.equal(parsed.settings.username, "001");
});

test("implementation path policy preserves harness and external-repository boundaries", async () => {
  const { violation } = await import(path.join(repositoryRoot, "scripts/lib/implementation-path-policy.mjs"));
  assert.equal(violation("apps/backend/project1/"), null);
  assert.match(violation("app/backend/project1/"), /singular app implementation root/);
  assert.match(violation("apps/backend/"), /container root/);
  assert.equal(violation("app/backend/project1/", { enforceHarness: false }), null);
});

test("Node lifecycle registry verifier preserves the published semantic baseline", () => {
  const output = execFileSync("node", ["scripts/node-verify-lifecycle-registry.mjs"], {
    cwd: repositoryRoot,
    encoding: "utf8"
  });
  assert.match(output, /生命周期注册表验证通过/);
});

test("template script scanner reports legacy runtime references and source extensions", async () => {
  const scannerPath = path.join(repositoryRoot, "scripts/lib/verify-template-scripts.mjs");
  const fixture = await mkdtemp(path.join(tmpdir(), "yss-script-scan-"));
  const scriptsRoot = path.join(fixture, "scripts");
  const optionalScriptsRoot = path.join(fixture, ".template-source/scripts");
  const runScannerWithEnv = (environment, ...roots) => spawnSync(
    process.execPath,
    [scannerPath, ...roots],
    {
      cwd: fixture,
      encoding: "utf8",
      env: { ...process.env, ...environment },
    },
  );
  try {
    await mkdir(scriptsRoot, { recursive: true });
    await mkdir(optionalScriptsRoot, { recursive: true });
    await mkdir(path.join(scriptsRoot, ".hidden-dir"), { recursive: true });
    await mkdir(path.join(scriptsRoot, "ignored-dir"), { recursive: true });
    await writeFile(path.join(scriptsRoot, "clean.sh"), "#!/usr/bin/env bash\n", "utf8");
    await writeFile(path.join(scriptsRoot, "notes.md"), "ruby is documented here\n", "utf8");
    await writeFile(path.join(scriptsRoot, ".hidden.sh"), "#!/usr/bin/env ruby\n", "utf8");
    await writeFile(path.join(scriptsRoot, ".hidden-dir/hidden.sh"), "#!/usr/bin/env ruby\n", "utf8");
    await writeFile(path.join(scriptsRoot, "ignored.sh"), "#!/usr/bin/env ruby\n", "utf8");
    await writeFile(path.join(scriptsRoot, "ignored.rb"), "puts 'ignored'\n", "utf8");
    await writeFile(path.join(scriptsRoot, "ignored-dir/ignored.sh"), "#!/usr/bin/env ruby\n", "utf8");
    await writeFile(path.join(scriptsRoot, "ignored-by-ignore.sh"), "#!/usr/bin/env ruby\n", "utf8");
    await writeFile(path.join(scriptsRoot, "ignored-by-rgignore.sh"), "#!/usr/bin/env ruby\n", "utf8");
    await writeFile(path.join(scriptsRoot, "ignored-by-git-exclude.sh"), "#!/usr/bin/env ruby\n", "utf8");
    await writeFile(path.join(scriptsRoot, "ignored-by-global-excludes.sh"), "#!/usr/bin/env ruby\n", "utf8");
    await writeFile(path.join(optionalScriptsRoot, "clean.sh"), "#!/usr/bin/env bash\n", "utf8");
    await writeFile(
      path.join(scriptsRoot, "binary.sh"),
      Buffer.from([0, 35, 33, 47, 117, 115, 114, 47, 98, 105, 110, 47, 101, 110, 118, 32, 114, 117, 98, 121, 10]),
    );
    await writeFile(path.join(fixture, ".gitignore"), "scripts/ignored.sh\nscripts/ignored.rb\nscripts/ignored-dir/\n", "utf8");
    await writeFile(path.join(fixture, ".ignore"), "scripts/ignored-by-ignore.sh\n", "utf8");
    await writeFile(path.join(fixture, ".rgignore"), "scripts/ignored-by-rgignore.sh\n", "utf8");
    execFileSync("git", ["init", "--quiet"], { cwd: fixture });
    await writeFile(
      path.join(fixture, ".git/info/exclude"),
      "scripts/ignored-by-git-exclude.sh\n",
      "utf8",
    );
    const globalIgnore = path.join(fixture, "global-ignore");
    const globalConfig = path.join(fixture, "global-config");
    await writeFile(globalIgnore, "scripts/ignored-by-global-excludes.sh   \n", "utf8");
    await writeFile(globalConfig, `[core]\n\texcludesFile = ${globalIgnore}\n`, "utf8");

    const clean = runScannerWithEnv(
      { GIT_CONFIG_GLOBAL: globalConfig },
      "scripts",
      ".template-source/scripts",
    );
    assert.equal(clean.status, 0, clean.stderr);
    assert.equal(clean.stdout, "");
    assert.equal(clean.stderr, "");

    await writeFile(path.join(scriptsRoot, "legacy.sh"), "#!/usr/bin/env ruby\n", "utf8");
    await writeFile(path.join(scriptsRoot, "legacy.rb"), "puts 'legacy'\n", "utf8");

    const violations = runScannerWithEnv(
      { GIT_CONFIG_GLOBAL: globalConfig },
      "scripts",
      ".template-source/scripts",
    );
    assert.equal(violations.status, 1);
    assert.match(violations.stdout, /scripts\/legacy\.sh:1:\#!\/usr\/bin\/env ruby/);
    assert.match(violations.stderr, /活跃 Ruby/);

    await rm(path.join(scriptsRoot, "legacy.sh"));
    const extensionViolation = runScannerWithEnv(
      { GIT_CONFIG_GLOBAL: globalConfig },
      "scripts",
      ".template-source/scripts",
    );
    assert.equal(extensionViolation.status, 1);
    assert.equal(extensionViolation.stdout.trim(), "scripts/legacy.rb");
    assert.match(extensionViolation.stderr, /\.rb 路径/);

    const selfScan = spawnSync(
      process.execPath,
      [scannerPath, "scripts"],
      {
        cwd: repositoryRoot,
        encoding: "utf8",
        env: { ...process.env, GIT_CONFIG_GLOBAL: globalConfig },
      },
    );
    assert.equal(selfScan.status, 0, selfScan.stderr);
    assert.equal(selfScan.stdout, "");

    const fileRootFailure = runScannerWithEnv(
      { GIT_CONFIG_GLOBAL: globalConfig },
      "scripts/clean.sh",
    );
    assert.equal(fileRootFailure.status, 1);
    assert.match(fileRootFailure.stderr, /模板脚本扫描失败/);

    const worktreeFixture = path.join(fixture, "worktree");
    const commonGitDirectory = path.join(fixture, "common-git");
    await mkdir(path.join(worktreeFixture, "scripts"), { recursive: true });
    await mkdir(path.join(commonGitDirectory, "info"), { recursive: true });
    await mkdir(path.join(commonGitDirectory, "worktrees/example"), { recursive: true });
    await writeFile(
      path.join(worktreeFixture, ".git"),
      `gitdir: ${path.join(commonGitDirectory, "worktrees/example")}\n`,
      "utf8",
    );
    await writeFile(
      path.join(commonGitDirectory, "worktrees/example/commondir"),
      "../..\n",
      "utf8",
    );
    await writeFile(
      path.join(commonGitDirectory, "info/exclude"),
      "scripts/worktree-ignored.sh\n",
      "utf8",
    );
    await writeFile(
      path.join(worktreeFixture, "scripts/worktree-ignored.sh"),
      "#!/usr/bin/env ruby\n",
      "utf8",
    );
    const worktreeScan = spawnSync(
      process.execPath,
      [scannerPath, "scripts"],
      {
        cwd: worktreeFixture,
        encoding: "utf8",
        env: { ...process.env, GIT_CONFIG_GLOBAL: globalConfig },
      },
    );
    assert.equal(worktreeScan.status, 0, worktreeScan.stderr);
    assert.equal(worktreeScan.stdout, "");

    const scannerAlias = process.platform === "darwin"
      ? scannerPath.replace(/^\/private\/tmp(?=\/)/, "/tmp")
      : scannerPath;
    const missingRoot = spawnSync(
      process.execPath,
      [scannerAlias, "missing-scripts"],
      { cwd: fixture, encoding: "utf8" },
    );
    assert.notEqual(missingRoot.status, 0);
    assert.match(missingRoot.stderr, /模板脚本扫描失败/);
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
});

test("public skill export preserves its portable manifest and blocks workstation paths", async () => {
  const output = await mkdtemp(path.join(tmpdir(), "yss-public-export-"));
  try {
    execFileSync("scripts/export-yss-skills", ["--output", output], { cwd: repositoryRoot, encoding: "utf8" });
    execFileSync("scripts/export-yss-skills", ["--output", output, "--check"], { cwd: repositoryRoot, encoding: "utf8" });
    const manifest = JSON.parse(await (await import("node:fs/promises")).readFile(path.join(output, ".yss-export-manifest.json"), "utf8"));
    const catalogue = JSON.parse(await (await import("node:fs/promises")).readFile(path.join(output, "skills.sh.json"), "utf8"));
    assert.equal(manifest.format_version, 1);
    assert.equal(manifest.source.canonical_root, ".agents/skills");
    assert.ok(manifest.skills.every((skill) => Array.isArray(skill.files) && skill.files.includes("SKILL.md")));
    assert.equal(catalogue.$schema, "https://skills.sh/schemas/skills.sh.schema.json");
    assert.equal(catalogue.notGrouped, "bottom");
    const exported = await (await import("node:fs/promises")).readFile(path.join(output, "skills/yss-design-system/SKILL.md"), "utf8");
    assert.doesNotMatch(exported, /\/Users\/zhudaoming|\.agents\/skills/);
  } finally {
    await rm(output, { recursive: true, force: true });
  }
});

test("evidence index writes pending and checkpointed Node records with legacy failure semantics", async () => {
  const fixture = await mkdtemp(path.join(tmpdir(), "yss-evidence-index-"));
  const review = path.join(fixture, ".template-source/evidence/reviews/sample.md");
  const command = path.join(repositoryRoot, ".template-source/scripts/evidence-index");
  const environment = { ...process.env, YSS_EVIDENCE_INDEX_ROOT: fixture };
  const run = (args, options = {}) => execFileSync(command, args, { cwd: fixture, encoding: "utf8", env: environment, stdio: ["ignore", "pipe", "pipe"], ...options });
  try {
    await mkdir(path.dirname(review), { recursive: true });
    await writeFile(review, "# Sample evidence\n");
    execFileSync("git", ["init", "--quiet"], { cwd: fixture });
    execFileSync("git", ["config", "user.email", "test@example.invalid"], { cwd: fixture });
    execFileSync("git", ["config", "user.name", "Node fixture"], { cwd: fixture });
    execFileSync("git", ["add", "."], { cwd: fixture });
    execFileSync("git", ["commit", "--quiet", "-m", "archive source"], { cwd: fixture });
    assert.match(run(["--write", "--pending"]), /pending/);
    assert.match(run(["--check"]), /pending/);
    await writeFile(review, "# Changed evidence\n");
    assert.throws(() => run(["--write", "--archive-commit", "HEAD"]), /当前文件与 archive checkpoint 不一致/);
    await writeFile(review, "# Sample evidence\n");
    assert.match(run(["--write", "--archive-commit", "HEAD"]), /complete/);
    execFileSync("git", ["rm", "--quiet", ".template-source/evidence/reviews/sample.md"], { cwd: fixture });
    assert.match(run(["--check"]), /complete/);
    const index = await readFile(path.join(fixture, ".template-source/evidence/reviews/index.yaml"), "utf8");
    assert.match(index, /status: complete/);
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
});
