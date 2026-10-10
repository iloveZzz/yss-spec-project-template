import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { verifyGovernanceLayout } from "../scripts/lib/governance-layout.mjs";

test("当前模板 AGENTS 必须有完整标记，历史兼容不能掩盖来源丢失", t => {
  const root = mkdtempSync(path.join(os.tmpdir(), "agents-layout-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  execFileSync("git", ["init", "-q", root]);
  for (const ref of [".template-spec/agents/yss-skill-registry.yaml", ".template-spec/agents/digital-human-roles.yaml", ".template-spec/agents/issue-tracker.md", ".template-spec/process/lifecycle-registry.yaml", ".template-spec/process/lifecycle-artifact-map.md", ".template-source/process/maintenance-intensity.yaml", ".template-source/process/template-verification-profiles.yaml", ".template-source/agents/skills-maintenance.md"]) {
    mkdirSync(path.dirname(path.join(root, ref)), { recursive: true });
    writeFileSync(path.join(root, ref), "fixture\n");
  }
  const start = "<!-- YSS_TEMPLATE_SOURCE_ONLY_START -->", end = "<!-- YSS_TEMPLATE_SOURCE_ONLY_END -->";
  for (const invalid of ["## 模板源维护\n旧来源", start, end, end + start, start + start + end, start + end + end]) {
    writeFileSync(path.join(root, "AGENTS.md"), invalid);
    assert.throws(() => verifyGovernanceLayout(root, "template-source"), /AGENTS_SOURCE_ONLY_MARKERS/);
  }
  writeFileSync(path.join(root, "AGENTS.md"), `${start}\n任意标题\n${end}\n产品规则`);
  assert.equal(verifyGovernanceLayout(root, "template-source").mode, "template-source");
  const child = path.join(root, "submodules/yss-harness-design-agent/AGENTS.md");
  mkdirSync(path.dirname(child), { recursive: true });
  writeFileSync(child, "没有标记");
  assert.throws(() => verifyGovernanceLayout(root, "template-source"), /yss-harness-design-agent/);
});
