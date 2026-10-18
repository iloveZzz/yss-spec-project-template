import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { composeProfileTree } from "../scripts/lib/profile-tree.mjs";
import { loadProfileStatus } from "../scripts/lib/profile-status.mjs";
import { OBSOLETE, treeHash } from "../scripts/lib/skill-supply-chain.mjs";
import { parseDocument } from "../scripts/vendor/yaml.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const STATUS = loadProfileStatus({ root: ROOT });

function skillDirectories(root) {
  return fs.readdirSync(path.join(root, ".agents/skills"), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

function lockSkills(root) {
  const lock = JSON.parse(fs.readFileSync(path.join(root, "skills-lock.json"), "utf8"));
  return [...Object.keys(lock.skills?.shared ?? {}), ...Object.values(lock.skills?.platform ?? {}).flatMap((group) => Object.keys(group ?? {}))].sort();
}

function registrySkills(root) {
  const document = parseDocument(fs.readFileSync(path.join(root, ".template-spec/agents/yss-skill-registry.yaml"), "utf8"), { uniqueKeys: true });
  assert.equal(document.errors.length, 0, document.errors[0]?.message);
  const data = document.toJS({ maxAliasCount: 0 });
  return (data.skills ?? []).map((entry) => entry.directory ?? entry.name ?? entry.id).filter(Boolean).sort();
}

function assertSetsEqual({ dirs, lock, registry }, label) {
  assert.deepEqual(lock, dirs, label + ": 锁与物理技能目录不一致");
  assert.deepEqual(registry, dirs, label + ": 注册表与物理技能目录不一致");
}

test("内核技能、锁与注册表集合一致且无退役 ID", () => {
  const dirs = skillDirectories(ROOT);
  const lock = lockSkills(ROOT);
  const registry = registrySkills(ROOT);
  assertSetsEqual({ dirs, lock, registry }, "spec");
  for (const name of dirs) assert.equal(OBSOLETE.has(name), false, name);
});

test("现役 Profile 组合技能、锁、注册表与 effectiveHash 一致", () => {
  for (const profile of STATUS.active) {
    const tree = composeProfileTree(profile);
    const dirs = skillDirectories(tree);
    assertSetsEqual({ dirs, lock: lockSkills(tree), registry: registrySkills(tree) }, profile);
    const lock = JSON.parse(fs.readFileSync(path.join(tree, "skills-lock.json"), "utf8"));
    for (const name of dirs) {
      assert.equal(OBSOLETE.has(name), false, profile + ": 退役技能 " + name);
      const entry = lock.skills.shared[name];
      assert.ok(entry?.effectiveHash, profile + ": 缺少锁条目 " + name);
      assert.equal(entry.effectiveHash, treeHash(path.join(tree, ".agents/skills", name)), profile + ": effectiveHash 漂移 " + name);
    }
    for (const name of ["architecture-agent", "backend-agent", "harness-orchestrator", "test-agent"]) {
      assert.ok(dirs.includes(name), profile + ": 缺少覆盖层技能 " + name);
    }
  }
});

test("legacy Profile 保持可组合与可读取，退役内容由状态豁免", () => {
  for (const profile of STATUS.legacy) {
    const tree = composeProfileTree(profile);
    const dirs = skillDirectories(tree);
    assertSetsEqual({ dirs, lock: lockSkills(tree), registry: registrySkills(tree) }, profile);
    assert.ok(STATUS.profiles[profile].reason);
    assert.ok(STATUS.profiles[profile].migration);
  }
  assert.ok(skillDirectories(composeProfileTree("design")).includes("ask-matt"), "design 旧内容应保留 ask-matt 供迁移读取");
});
