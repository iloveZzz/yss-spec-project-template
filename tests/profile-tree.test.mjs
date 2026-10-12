import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { composeProfileTree, PROFILE_NAMES } from "../scripts/lib/profile-tree.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("FR-008：Profile 目录 = 内核 + _specialist + 该 Profile 的覆盖层，后面的覆盖前面的（只应用分发清单对 .agents/skills 的排除）", () => {
  for (const profile of PROFILE_NAMES) {
    const tree = composeProfileTree(profile);
    // 内核文件进入每个 Profile
    assert.ok(fs.existsSync(path.join(tree, "scripts/lib/strategic-handoff.mjs")), `${profile}: 内核脚本`);
    // 覆盖层文件覆盖内核同路径文件
    // 该 Profile 分发清单排除的内核技能不在组合目录里
    const policy = JSON.parse(fs.readFileSync(path.join(tree, ".template-source/distribution/bundle-profile.json"), "utf8"));
    const omittedSkills = policy.manifest.excludePaths.filter((entry) => entry.startsWith(".agents/skills/"));
    assert.ok(omittedSkills.length > 0, `${profile}: 应有被排除的内核技能`);
    for (const entry of omittedSkills) assert.equal(fs.existsSync(path.join(tree, entry)), false, `${profile}: ${entry}`);
    for (const layer of ["_specialist", profile]) {
      const overlay = path.join(ROOT, "profiles", layer);
      for (const ref of ["scripts/lib/skill-supply-chain.mjs", "scripts/lib/skill-registry.mjs"]) {
        if (fs.existsSync(path.join(overlay, ref))) assert.deepEqual(fs.readFileSync(path.join(tree, ref)), fs.readFileSync(path.join(overlay, ref)), `${profile}: ${layer}/${ref}`);
      }
    }
  }
});

test("FR-008：覆盖层里的投影链接在组合目录里指向该 Profile 自己的 .agents/skills", () => {
  const tree = composeProfileTree("backend");
  const links = fs.readdirSync(path.join(tree, ".codex/skills"), { withFileTypes: true }).filter((entry) => entry.isSymbolicLink());
  assert.ok(links.length > 0);
  for (const link of links) {
    const target = path.join(tree, ".codex/skills", link.name);
    assert.equal(fs.realpathSync(target), fs.realpathSync(path.join(tree, ".agents/skills", link.name)));
  }
});

test("不属于 Profile 的名字被拒绝", () => {
  assert.throws(() => composeProfileTree("spec"), /未知 Profile/);
});
