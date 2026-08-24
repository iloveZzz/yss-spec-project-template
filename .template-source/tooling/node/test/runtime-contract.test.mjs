import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { execFileSync } from "node:child_process";
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

test("repository_scope git-submodule is a first-class layout distinct from harness-apps", async () => {
  const {
    LAYOUT_POLICIES,
    gitSubmoduleScaffoldViolation,
    implementationWriteViolation,
    inspectCheckoutState,
    inspectWorkingTreeScope,
    isWorkingTreeWritable,
    regularDirectoryMisreadViolation,
    validRepositoryScope,
    violationRepositoryScope
  } = await import(path.join(repositoryRoot, "scripts/lib/repository-scope-policy.mjs"));
  const { makeGitlinkFixture } = await import(path.join(repositoryRoot, "scripts/lib/git-submodule-fixtures.mjs"));
  const record = {
    repository_scope: "git-submodule",
    layout_policy: LAYOUT_POLICIES["git-submodule"],
    project_root: "apps/backend/billing-service/",
    gitlink_path: "apps/backend/billing-service",
    git_entry_mode: "160000",
    git_url: "https://example.invalid/billing-service.git",
    gitmodules_name: "backend-billing-service",
    superproject_git_url: "https://example.invalid/harness.git",
    checkout_state: "attached-branch",
    scaffold_status: "existing"
  };
  assert.equal(validRepositoryScope(record), true);
  assert.match(violationRepositoryScope({ ...record, layout_policy: "harness-apps-multi-project" }), /layout_policy/);
  assert.match(violationRepositoryScope({ ...record, git_entry_mode: "" }), /git_entry_mode must be 160000/);
  assert.match(violationRepositoryScope({ ...record, checkout_state: "empty-gitlink", scaffold_status: "required" }), /empty or uninitialized/);
  assert.match(violationRepositoryScope({ ...record, checkout_state: "detached-head", scaffold_status: "required" }), /regular directory/);
  assert.match(violationRepositoryScope({
    repository_scope: "harness-apps",
    layout_policy: "harness-apps-multi-project",
    project_root: "apps/backend/billing-service/",
    gitlink_path: "apps/backend/billing-service"
  }), /git-submodule identity/);
  const empty = makeGitlinkFixture({ checkout: "empty-gitlink" });
  const detached = makeGitlinkFixture({ checkout: "detached-head" });
  const attached = makeGitlinkFixture({ checkout: "attached-branch" });
  try {
    const emptyTarget = path.join(empty.superproject, empty.mount);
    assert.equal(inspectCheckoutState(empty.superproject, emptyTarget), "empty-gitlink");
    assert.match(regularDirectoryMisreadViolation({ checkout_state: "empty-gitlink" }), /regular directory/);
    assert.match(gitSubmoduleScaffoldViolation(empty.superproject, path.join(empty.superproject, "apps/backend"), "billing-service", { force: true }), /--force/);
    const harnessInspection = inspectWorkingTreeScope(empty.superproject, {
      repository_scope: "harness-apps",
      project_root: "apps/backend/billing-service/"
    });
    assert.equal(harnessInspection.writable, false);
    assert.match(harnessInspection.violation, /不得登记为 harness-apps/);
    const emptyInspection = inspectWorkingTreeScope(empty.superproject, {
      ...record,
      checkout_state: "empty-gitlink"
    });
    assert.equal(emptyInspection.writable, false);
    assert.equal(isWorkingTreeWritable(emptyInspection), false);
    assert.match(emptyInspection.violation, /regular directory/);
    assert.match(implementationWriteViolation(empty.superproject, path.join(emptyTarget, "src/Foo.java")), /普通目录写入/);
    const detachedTarget = path.join(detached.superproject, detached.mount);
    assert.equal(inspectCheckoutState(detached.superproject, detachedTarget), "detached-head");
    const detachedInspection = inspectWorkingTreeScope(detached.superproject, {
      ...record,
      checkout_state: "detached-head"
    });
    assert.equal(detachedInspection.writable, false);
    assert.match(detachedInspection.violation, /regular directory/);
    assert.match(gitSubmoduleScaffoldViolation(detached.superproject, path.join(detached.superproject, "apps/backend"), "billing-service"), /gitlink 不得由脚手架覆盖/);
    assert.match(gitSubmoduleScaffoldViolation(detached.superproject, detachedTarget, "nested-service"), /普通目录写入/);
    assert.equal(gitSubmoduleScaffoldViolation(empty.superproject, path.join(empty.superproject, "output"), "plain-service"), null);
    const attachedInspection = inspectWorkingTreeScope(attached.superproject, record);
    assert.equal(inspectCheckoutState(attached.superproject, path.join(attached.superproject, attached.mount)), "attached-branch");
    assert.equal(attachedInspection.writable, true);
    assert.equal(attachedInspection.violation, null);
    assert.equal(
      inspectWorkingTreeScope(path.resolve(repositoryRoot), { ...record, checkout_state: "empty-gitlink" }).writable,
      false
    );
  } finally {
    empty.cleanup();
    detached.cleanup();
    attached.cleanup();
  }
});

test("Node lifecycle registry verifier preserves the published semantic baseline", () => {
  const output = execFileSync("node", ["scripts/node-verify-lifecycle-registry.mjs"], {
    cwd: repositoryRoot,
    encoding: "utf8"
  });
  assert.match(output, /生命周期注册表验证通过/);
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
