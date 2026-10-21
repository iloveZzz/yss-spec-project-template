import { loadOrchestrationContract } from "../scripts/lib/orchestration-contract.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { composeProfileTree, PROFILE_NAMES } from "../scripts/lib/profile-tree.mjs";
import { loadProfileStatus } from "../scripts/lib/profile-status.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PROFILE_STATUS = loadProfileStatus({ root: ROOT });
const ACTIVE_PROFILES = PROFILE_NAMES.filter((name) => PROFILE_STATUS.profiles[name].status === "active");

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

test("FR-006：现役 Profile 保留 canonical 与 WorkBuddy 技能，不恢复历史投影根", () => {
  for (const profile of PROFILE_NAMES) {
    const tree = composeProfileTree(profile);
    assert.ok(fs.existsSync(path.join(tree, ".agents/skills")));
    assert.ok(fs.existsSync(path.join(tree, ".workbuddy/skills")));
    for (const agent of [".claude", ".codex", ".cursor", ".pi"]) {
      assert.equal(fs.existsSync(path.join(tree, agent, "skills")), false, `${profile}: ${agent}/skills 不应存在`);
    }
  }
});

test("不属于 Profile 的名字被拒绝", () => {
  assert.throws(() => composeProfileTree("spec"), /未知 Profile/);
});

test("Profile 仅保留 spec kernel 与 backend active，Design 不可组合",()=>{
 assert.deepEqual(PROFILE_NAMES,["backend"]);
 assert.deepEqual(Object.keys(PROFILE_STATUS.profiles).sort(),["backend","spec"]);
 assert.deepEqual(PROFILE_STATUS.kernel,["spec"]);assert.deepEqual(PROFILE_STATUS.active,["backend"]);
 assert.throws(()=>composeProfileTree("design"),/未知 Profile/);
});

test("FR-007：两端查询保留各自合同、输出结构与完整内容摘要", () => {
  for (const [profile, skill, unit] of [
    ["spec", "yss-product-lifecycle", "work-unit.entry-triage"],
    ["backend", "harness-orchestrator", "work-unit.harness-entry"],
  ]) {
    const tree = profile === "spec" ? ROOT : composeProfileTree(profile);
    const query = spawnSync(process.execPath, [path.join(tree, "scripts/query-lifecycle-context"), "--work-unit", unit], { cwd: tree, encoding: "utf8" });
    assert.equal(query.status, 0, `${profile}: ${query.stderr}`);
    const { context_sha256, ...result } = JSON.parse(query.stdout);
    const contractRef = '.template-spec/process/orchestration-contract.yaml';
    const loaded = loadOrchestrationContract(ref => fs.readFileSync(path.join(tree, ref)), contractRef);
    assert.deepEqual(result.sources.orchestration_contract, { ref: contractRef, refs: loaded.refs, sha256: loaded.digest });
    for (const ref of loaded.refs) assert.ok(result.sources.read_set.some(row => row.ref === ref && row.sha256 === createHash('sha256').update(fs.readFileSync(path.join(tree, ref))).digest('hex')));
    assert.equal(Object.hasOwn(result.lifecycle, "checks"), profile === "spec");
    assert.equal(Object.hasOwn(result, "presentation"), profile === "spec");
    assert.equal(result.query.work_unit, unit);
    assert.equal(context_sha256, createHash("sha256").update(JSON.stringify(result)).digest("hex"));
  }
});

test("FR-006：现役专用 Profile 的锁与注册表声明 WorkBuddy 投影并保留技能哈希", () => {
  for (const profile of ACTIVE_PROFILES) {
    const tree = composeProfileTree(profile);
    const lock = JSON.parse(fs.readFileSync(path.join(tree, "skills-lock.json"), "utf8"));
    assert.deepEqual(lock.projectionRoots, [".workbuddy/skills"]);
    assert.deepEqual(lock.skills.platform, {});
    for (const entry of Object.values(lock.skills.shared)) {
      assert.deepEqual(entry.targets, [".agents/skills", ".workbuddy/skills"]);
      assert.match(entry.effectiveHash, /^[0-9a-f]{64}$/);
    }
    for (const script of ["verify-skill-registry", "update-skill-lock"]) {
      const result = spawnSync(process.execPath, [path.join(tree, "scripts", script), "--check"], { cwd: tree, encoding: "utf8" });
      assert.equal(result.status, 0, `${profile}: ${script}: ${result.stderr}`);
    }
    const unit = profile === "backend" ? "work-unit.harness-entry" : "work-unit.plan-opportunity";
    const query = spawnSync(process.execPath, [path.join(tree, "scripts/query-lifecycle-context"), "--work-unit", unit, "--check-skills"], { cwd: tree, encoding: "utf8" });
    assert.equal(query.status, 0, `${profile}: ${query.stderr}`);
    const readiness = JSON.parse(query.stdout).skill_readiness;
    assert.ok(readiness.required_skills.length > 0, `${profile}: 必须核验真实工作单元的技能`);
    assert.deepEqual(readiness.issues, []);
    assert.equal(readiness.agent_runtime, "workbuddy");
  }
});
