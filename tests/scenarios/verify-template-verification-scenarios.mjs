import {inspectNative} from '../../.template-source/scripts/lib/native-yss.mjs';
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { loadVerificationProfiles, planTemplateVerification } from "../../scripts/lib/template-verification.mjs";
import { runCommandToFiles, runGroups } from "../../scripts/lib/template-verification-runner.mjs";

const releaseBaseline = [
  "pnpm --dir .template-source/tooling/node test",
  "pnpm --dir .template-source/tooling/node check:vendor",
  "scripts/sync-skills --check",
  "scripts/update-skill-lock --check",
  "scripts/verify-skill-registry",
  "scripts/verify-skill-governance",
  "node --check .agents/skills/yss-tactical-design/scripts/validate-tactical-design.mjs",
  "node --check .agents/skills/yss-tactical-design/tests/run-scenarios.mjs",
  "node .agents/skills/yss-tactical-design/tests/run-scenarios.mjs",
  "scripts/verify-yss-dto-openapi-profile",
  "scripts/verify-yss-dto-openapi-scenarios",
  "scripts/verify-digital-human-roles",
  "scripts/verify-digital-human-roles-scenarios",
  "scripts/verify-approval-record --history .template-spec/templates/approval-record-template.yaml",
  "scripts/verify-lifecycle-registry",
  "yss context check --root . --json",
  "scripts/verify-context-contract-scenarios",
  "scripts/verify-context-reconciliation-scenarios",
  "scripts/verify-plan-requirements-context-scenarios",
  "scripts/verify-lifecycle-checkpoint .template-spec/process/templates/lifecycle-checkpoint-template.yaml",
  "scripts/verify-subagent-task-package-scenarios",
  "scripts/verify-digital-human-task-package-scenarios",
  "scripts/verify-lifecycle-scenarios",
  "scripts/verify-lifecycle-transition-scenarios",
  "scripts/verify-maintenance-intensity-scenarios",
  "scripts/verify-governance-release",
  "scripts/verify-implementation-path-scenarios",
  "scripts/verify-repository-scope-scenarios",
  "scripts/verify-scaffold-generator-scenarios",
  "scripts/verify-prototype-backend-scaffold-scenarios",
  "scripts/verify-matt-yss-integration-scenarios",
  "scripts/verify-yss-implementation-contract-compiler-scenarios",
  "scripts/generate-yss-skill-boundaries --check",
  "scripts/audit-yss-backend-skills --check",
  "scripts/verify-retired-skill-ids",
  "scripts/verify-yss-ui-scenarios",
  "scripts/verify-yss-prototype-contract-scenarios",
  "node .agents/skills/yss-prototype-stage/scripts/prototype-contract.mjs validate-evidence .template-spec/design/templates/prototype-evidence-template.yaml --allow-template",
  "scripts/verify-openapi-yaml-first-scenarios",
  "scripts/verify-openapi-json-handoff-scenarios"
].sort();

const release = planTemplateVerification({ profile: "release", changedFiles: [] });
assert.equal(release.effective_profile, "release");
const releaseCommands = new Set(release.commands.map((entry) => entry.command));
assert.deepEqual(releaseBaseline.filter((command) => !releaseCommands.has(command)), [], "release profile 必须保留现役发布门禁行为命令");
assert.ok(releaseCommands.has("node scripts/verify-template-verification-scenarios"), "release profile 必须验证两档核验路由本身");
assert.ok(releaseCommands.has("node --test tests/cli-retirement.test.mjs"), "release profile 必须保留 CLI 快速场景");
assert.ok(release.commands.some(entry=>entry.command.includes('backend-delivery-terminal.test.mjs')));
const instanceManifest = inspectNative('spec').manifest;
assert.ok(instanceManifest.excludePaths.includes("scripts/lib/template-verification-runner.mjs"), "模板验证 runner 不得分发到 project-instance");
assert.throws(() => loadVerificationProfiles(`
schema_version: 1
profiles: { fast: {}, release: {} }
groups:
  invalid:
    commands: [{ run: check, lane: 1 }]
`), /lane 无效/);

const docsOnly = planTemplateVerification({ profile: "fast", selection:"legacy", changedFiles: [".template-spec/user-guide/example.md"] });
assert.equal(docsOnly.effective_profile, "fast");
assert.equal(docsOnly.compatibility_required, false);
assert.equal(release.compatibility_required, true);
assert.throws(()=>planTemplateVerification({changedFiles:['.template-source/tooling/node/package.json']}),/INCOMPLETE_VERIFICATION_INPUTS/);
assert.throws(()=>planTemplateVerification({changedFiles:['.github/workflows/template-ci.yml']}),/INCOMPLETE_VERIFICATION_INPUTS/);
assert.ok(docsOnly.groups.includes("hygiene"));
assert.ok(!docsOnly.groups.includes("skills"), "文档内循环不得运行无关 skill 投影检查");

const skillChange = planTemplateVerification({ profile: "fast", selection:"legacy", changedFiles: [".agents/skills/maintaining-skills/SKILL.md"] });
assert.ok(skillChange.groups.includes("skills"));
assert.ok(skillChange.groups.includes("hygiene"));

for (const file of [".template-source/distribution/bundle-profile.json", ".template-source/scripts/lib/native-yss.mjs"]) {
  const cli = planTemplateVerification({ profile: "fast", selection:"legacy", changedFiles: [file] });
  assert.ok(cli.groups.includes("cli-sync"), `${file} 运行原生 CLI 快速组`);
  assert.equal(cli.effective_profile, "fast");
  const candidateCli = planTemplateVerification({ profile: "release", changedFiles: [file] });
  assert.ok(candidateCli.groups.includes("candidate-integrity"));
  assert.ok(candidateCli.groups.includes("cli-sync"));
}
const otherSubmodule = planTemplateVerification({ profile: "fast", selection:"legacy", changedFiles: ["submodules/another-agent/src/index.js"] });
assert.ok(otherSubmodule.groups.includes("implementation"));
assert.ok(!otherSubmodule.groups.includes("cli-sync"));

const prototypeContractChange = planTemplateVerification({ profile: "fast", selection:"legacy", changedFiles: ["scripts/verify-yss-prototype-contract-scenarios"] });
assert.ok(prototypeContractChange.groups.includes("implementation"), "原型契约脚本变化必须运行实现压力场景");

const candidate = planTemplateVerification({ profile: "release", changedFiles: [".template-spec/process/harness-process-tailoring.md"] });
assert.equal(candidate.effective_profile, "release", "release 保持完整阻断");
assert.equal(candidate.strategy, "release");
assert.ok(candidate.groups.includes("maintenance"));
assert.ok(candidate.groups.includes("candidate-integrity"));

assert.throws(
  () => planTemplateVerification({ profile: "release", changedFiles: ["new-unmapped-root/file.txt"] }),
  /UNKNOWN_VERIFICATION_PATH|未映射|未知路径/,
  "未知路径须在计划阶段拒绝，不能生成看似完整的可执行计划",
);

const core = planTemplateVerification({profile:'fast',changedFiles:['scripts/lib/template-verification.mjs']});
assert.equal(core.effective_profile,'fast');assert.equal(core.source_requirement,'current');
assert.ok(core.commands.some(row=>row.command.includes('verification-selection.test.mjs')));
const strict=planTemplateVerification({profile:'release',changedFiles:['scripts/lib/template-verification.mjs']});
assert.equal(strict.source_requirement,'committed');assert.deepEqual(strict.commands,release.commands);
assert.throws(() => loadVerificationProfiles(`
schema_version: 1
profiles: { fast: {}, release: {} }
groups:
  invalid:
    commands: [{ run: check, require_committed_for: [fast] }]
`), /require_committed_for/);

const entryRule = planTemplateVerification({ profile: "release", changedFiles: ["AGENTS.md"] });
assert.equal(entryRule.effective_profile, "release", "Agent 入口规则变化必须 fail-safe 到完整门禁");

const schedulerPlan = {
  groups: ["alpha", "beta"],
  commands: [
    { group: "alpha", command: "shared", when: null, lane: "one", resources: [], parallel_unless_env: [] },
    { group: "alpha", command: "parallel", when: null, lane: "two", resources: ["fixture"], parallel_unless_env: ["SERIAL_TEST"] },
    { group: "beta", command: "shared", when: null, lane: null, resources: [], parallel_unless_env: [] },
  ],
};
let active = 0;
let peak = 0;
const calls = [];
const execute = async (command) => {
  calls.push(command);
  active += 1;
  peak = Math.max(peak, active);
  await new Promise((resolve) => setTimeout(resolve, 30));
  active -= 1;
  return { command, code: 0, duration_ms: 30 };
};
const scheduled = await runGroups(schedulerPlan, "template-source", 3, { cwd: "/fixture", environment: {}, execute });
assert.equal(peak, 2, "不同 lane 应受总并发上限调度");
assert.deepEqual(calls.sort(), ["parallel", "shared"], "相同命令只执行一次");
assert.equal(scheduled.find((group) => group.group === "beta").results[0].reused, true);

const lockedPlan = {
  groups: ["left", "right"],
  commands: [
    { group: "left", command: "left", lane: null, resources: ["shared-root"], parallel_unless_env: [] },
    { group: "right", command: "right", lane: null, resources: ["shared-root"], parallel_unless_env: [] },
  ],
};
active = 0;
peak = 0;
calls.length = 0;
await runGroups(lockedPlan, "template-source", 2, { cwd: "/fixture", environment: {}, execute });
assert.equal(peak, 1, "声明相同资源的命令必须互斥");

active = 0;
peak = 0;
calls.length = 0;
await runGroups(schedulerPlan, "template-source", 3, { cwd: "/fixture", environment: { SERIAL_TEST: "1" }, execute });
assert.equal(peak, 1, "存在外部实例覆盖时必须回退组内串行");

const failedPlan = {
  groups: ["failed", "independent"],
  commands: [
    { group: "failed", command: "fail", lane: null, resources: [], parallel_unless_env: [] },
    { group: "failed", command: "must-not-run", lane: null, resources: [], parallel_unless_env: [] },
    { group: "independent", command: "continue", lane: null, resources: [], parallel_unless_env: [] },
  ],
};
calls.length = 0;
await runGroups(failedPlan, "template-source", 2, { cwd: "/fixture", environment: {}, execute: async (command) => {
  calls.push(command);
  return { command, code: command === "fail" ? 1 : 0, duration_ms: 1 };
} });
assert.deepEqual(calls.sort(), ["continue", "fail"], "失败组停止后续命令，独立组继续");

const logRoot = mkdtempSync(path.join(os.tmpdir(), "yss-runner-log-test-"));
try {
  const spooled = await runCommandToFiles(`${JSON.stringify(process.execPath)} -e "process.stdout.write('out');process.stderr.write('err')"`, {
    cwd: process.cwd(), environment: process.env, logRoot, sequence: 0,
  });
  assert.equal(spooled.code, 0);
  assert.equal(readFileSync(spooled.stdoutFile, "utf8"), "out");
  assert.equal(readFileSync(spooled.stderrFile, "utf8"), "err");
  assert.equal(Object.hasOwn(spooled, "stdout"), false, "子进程输出不得累计在结果对象中");
} finally {
  rmSync(logRoot, { recursive: true, force: true });
}

process.stdout.write("模板 fast/release 核验路由场景验证通过\n");
