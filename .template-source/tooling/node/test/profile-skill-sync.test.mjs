import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { applyProfileSkillSync, planProfileSkillSync, reportProfileSkillSync } from "../../../../scripts/lib/profile-skill-sync.mjs";

function fixture() {
  const root = mkdtempSync(path.join(tmpdir(), "profile-skill-sync-"));
  const profile = path.join(root, "profiles/dev");
  mkdirSync(path.join(root, ".agents/skills/exact"), { recursive: true });
  mkdirSync(path.join(root, ".agents/skills/adapted"), { recursive: true });
  mkdirSync(path.join(profile, ".agents/skills/exact"), { recursive: true });
  mkdirSync(path.join(profile, ".agents/skills/adapted"), { recursive: true });
  mkdirSync(path.join(profile, ".agents/skills/retired"), { recursive: true });
  writeFileSync(path.join(profile, "yss-project.yaml"), "schema_version: 1\nrepository_mode: template-source\n");
  writeFileSync(path.join(root, ".agents/skills/exact/SKILL.md"), "new\n");
  writeFileSync(path.join(profile, ".agents/skills/exact/SKILL.md"), "old\n");
  writeFileSync(path.join(root, ".agents/skills/adapted/SKILL.md"), "owner: parent\n");
  writeFileSync(path.join(profile, ".agents/skills/adapted/SKILL.md"), "owner: child\n");
  writeFileSync(path.join(profile, ".agents/skills/retired/SKILL.md"), "retired\n");
  const config = { schema_version: 1, profiles: { dev: {
    target: "profiles/dev",
    exact: [{ id: "exact" }],
    adapted: [{ id: "adapted", strategy: "replace", replacements: [{ file: "SKILL.md", from: "parent", to: "child" }] }],
    retired: ["retired"],
    local_only: ["role-agent"],
    excluded: ["unrelated"],
    upstream: [],
  } } };
  return { root, profile, config };
}

const clean = () => new Set();

test("plans exact, adapted, and retired changes without writing", () => {
  const { root, profile, config } = fixture();
  const plan = planProfileSkillSync({ root, config, dirtyProvider: clean });
  assert.deepEqual(plan.changes.map(({ status }) => status).sort(), ["retired", "updated"]);
  assert.equal(readFileSync(path.join(profile, ".agents/skills/exact/SKILL.md"), "utf8"), "old\n");
  assert.equal(reportProfileSkillSync(plan).counts.updated, 1);
});

test("apply is idempotent and preserves the declared adaptation", () => {
  const { root, profile, config } = fixture();
  const first = planProfileSkillSync({ root, config, dirtyProvider: clean });
  applyProfileSkillSync({ root, config, plan: first });
  const second = planProfileSkillSync({ root, config, dirtyProvider: clean });
  assert.equal(second.changes.length, 0);
  assert.equal(readFileSync(path.join(profile, ".agents/skills/adapted/SKILL.md"), "utf8"), "owner: child\n");
  assert.equal(existsSync(path.join(profile, ".agents/skills/retired")), false);
});

test("a changed adaptation baseline reports adaptation_conflict", () => {
  const { root, config } = fixture();
  config.profiles.dev.adapted[0].replacements[0].from = "missing";
  const plan = planProfileSkillSync({ root, config, dirtyProvider: clean });
  assert.ok(plan.issues.some(({ status }) => status === "adaptation_conflict"));
});

test("missing dependencies and path traversal are rejected", () => {
  const { root, config } = fixture();
  config.profiles.dev.exact.push({ id: "missing" });
  assert.ok(planProfileSkillSync({ root, config, dirtyProvider: clean }).issues.some(({ status }) => status === "missing_dependency"));
  config.profiles.dev.target = "../outside";
  assert.throws(() => planProfileSkillSync({ root, config, dirtyProvider: clean }), /越界/);
});

test("dirty target changes block apply", () => {
  const { root, config } = fixture();
  const dirtyProvider = () => new Set([".agents/skills/exact/SKILL.md"]);
  const plan = planProfileSkillSync({ root, config, dirtyProvider });
  assert.ok(plan.issues.some(({ message }) => message === "目标含未提交改动"));
  assert.throws(() => applyProfileSkillSync({ root, config, plan }), /预检失败/);
});

test("apply rolls back earlier writes when a later write fails", () => {
  const { root, profile, config } = fixture();
  const plan = planProfileSkillSync({ root, config, dirtyProvider: clean });
  let writes = 0;
  assert.throws(() => applyProfileSkillSync({
    root,
    config,
    plan,
    write(target, content) {
      writes += 1;
      if (writes === 1) {
        writeFileSync(target, content);
        throw new Error("injected failure");
      }
      writeFileSync(target, content);
    },
  }), /injected failure/);
  assert.equal(readFileSync(path.join(profile, ".agents/skills/exact/SKILL.md"), "utf8"), "old\n");
});

test("profile-owned adaptations require their declared markers", () => {
  const { root, config } = fixture();
  config.profiles.dev.adapted = [{ id: "adapted", strategy: "profile-owned", required_markers: ["not-present"] }];
  const plan = planProfileSkillSync({ root, config, dirtyProvider: clean });
  assert.ok(plan.issues.some(({ status, marker }) => status === "adaptation_conflict" && marker === "not-present"));
});

test("a skill cannot be synchronized in both source directions", () => {
  const { root, config } = fixture();
  config.profiles.dev.upstream = ["exact"];
  assert.throws(() => planProfileSkillSync({ root, config, dirtyProvider: clean }), /违反单向来源规则/);
});

test("an unclassified same-name difference is reported", () => {
  const { root, profile, config } = fixture();
  mkdirSync(path.join(root, ".agents/skills/stray"), { recursive: true });
  mkdirSync(path.join(profile, ".agents/skills/stray"), { recursive: true });
  writeFileSync(path.join(root, ".agents/skills/stray/SKILL.md"), "parent\n");
  writeFileSync(path.join(profile, ".agents/skills/stray/SKILL.md"), "child\n");
  const plan = planProfileSkillSync({ root, config, dirtyProvider: clean });
  assert.ok(plan.issues.some(({ skill, status }) => skill === "stray" && status === "unregistered_difference"));
});

test("a file patch replays only against its registered source baseline", () => {
  const { root, profile, config } = fixture();
  const source = readFileSync(path.join(root, ".agents/skills/adapted/SKILL.md"));
  const hash = createHash("sha256");
  hash.update("SKILL.md");
  hash.update("\0");
  hash.update(source);
  hash.update("\0");
  const baseline = hash.digest("hex");
  mkdirSync(path.join(root, ".template-source/patches"), { recursive: true });
  writeFileSync(path.join(root, ".template-source/patches/adapted.patch"), [
    "--- a/SKILL.md",
    "+++ b/SKILL.md",
    "@@ -1 +1 @@",
    "-owner: parent",
    "+owner: child",
    "",
  ].join("\n"));
  config.profiles.dev.adapted = [{ id: "adapted", strategy: "patch", patch: ".template-source/patches/adapted.patch", source_tree_sha256: baseline }];
  assert.equal(planProfileSkillSync({ root, config, dirtyProvider: clean }).issues.length, 0);
  writeFileSync(path.join(root, ".agents/skills/adapted/SKILL.md"), "owner: changed\n");
  assert.ok(planProfileSkillSync({ root, config, dirtyProvider: clean }).issues.some(({ status, message }) => status === "adaptation_conflict" && message.includes("适配基线冲突")));
  writeFileSync(path.join(root, ".agents/skills/adapted/SKILL.md"), source);
  writeFileSync(path.join(root, ".template-source/patches/adapted.patch"), [
    "--- a/SKILL.md",
    "+++ b/SKILL.md",
    "@@ -1 +1 @@",
    "-owner: absent",
    "+owner: child",
    "",
  ].join("\n"));
  assert.ok(planProfileSkillSync({ root, config, dirtyProvider: clean }).issues.some(({ status, message }) => status === "adaptation_conflict" && message.includes("补丁无法重放")));
});
