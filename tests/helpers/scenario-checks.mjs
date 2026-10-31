import {loadOrchestrationContract} from '../../scripts/lib/orchestration-contract.mjs';
import { existsSync, readFileSync, mkdtempSync, rmSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { buildDecisionFixture, buildImplementationFixture } from "../../scripts/fixtures/user-decision/build-fixture.mjs";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { parseDocument } from "../../scripts/vendor/yaml.mjs";
import { lifecycleTransitionContract, validateImplementationEntry, validateNextRoute } from "../../scripts/lib/lifecycle-transition.mjs";
import { decisionDigest } from "../../scripts/lib/native-user-decision.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const rawRead = (relative) => readFileSync(path.join(root, relative), "utf8");
const read = (relative) => relative === ".template-spec/process/orchestration-contract.yaml" ? JSON.stringify(loadOrchestrationContract(rawRead, relative).value) : rawRead(relative);
function ensure(condition, message) { if (!condition) throw new TypeError(message); }
function exists(relative) { return existsSync(path.join(root, relative)); }
function includesAll(actual, expected) { return Array.isArray(actual) && expected.every((item) => actual.includes(item)); }

const profiles = {
  lifecycle: {
    message: "六类生命周期压力场景验证通过",
    files: [".agents/skills/yss-product-lifecycle/SKILL.md", ".template-spec/process/orchestration-contract.yaml", ".template-spec/process/lifecycle-registry.yaml"],
    markers: [[".agents/skills/yss-product-lifecycle/SKILL.md", "不创建产品规格、原型或批准"], [".template-spec/process/orchestration-contract.yaml", "ready-for-agent"]]
  },
  prototype: {
    message: "原型到后端脚手架及后续 YSS 代码生成压力场景验证通过",
    files: [".agents/skills/yss-ddd-scaffold-generator/scripts/generate_scaffold.mjs", ".agents/skills/yss-implementation-contract-compiler/references/compiler-contract.yaml"],
    markers: [[".agents/skills/yss-implementation-contract-compiler/references/compiler-contract.yaml", "controlled-generation"]]
  },
  implementationContractCompiler: {
    message: "YSS implementation contract compiler stage 7 scenarios passed",
    files: [".agents/skills/yss-implementation-contract-compiler/references/compiler-contract.yaml", ".agents/skills/yss-implementation-contract-compiler/SKILL.md"],
    markers: [[".agents/skills/yss-implementation-contract-compiler/references/compiler-contract.yaml", "impact_to_capabilities"], [".agents/skills/yss-implementation-contract-compiler/SKILL.md", "required_capabilities"]]
  },
  openapiYaml: {
    message: "OpenAPI YAML-first 场景验证通过",
    files: [
      ".template-spec/templates/openapi-spec-template.yaml",
      ".agents/skills/yss-openapi-governance/SKILL.md",
      ".agents/skills/yss-openapi-draft-review/SKILL.md",
      ".agents/skills/yss-openapi-draft-review/references/semantic-review.md",
      ".template-spec/api/templates/openapi-draft-review-checklist.md",
      ".template-spec/api/templates/openapi-draft-validation-record-template.yaml",
      ".template-spec/process/schemas/openapi-draft-validation-record.schema.json",
      "scripts/verify-openapi-draft-validation-record",
      "scripts/lib/api-contract-decision.mjs"
    ],
    markers: [
      [".template-spec/templates/openapi-spec-template.yaml", "openapi: 3.1.0"],
      [".agents/skills/yss-openapi-governance/SKILL.md", "property path"],
      [".agents/skills/yss-openapi-draft-review/SKILL.md", "Structural Validation"],
      [".agents/skills/yss-openapi-draft-review/SKILL.md", "(references/semantic-review.md)"],
      [".agents/skills/yss-openapi-draft-review/references/semantic-review.md", "omit-to-preserve"],
      [".template-spec/api/templates/openapi-draft-review-checklist.md", "P0 字段级追踪矩阵"],
      [".template-spec/api/templates/openapi-draft-review-checklist.md", "Create / Update requiredness"],
      [".template-spec/process/schemas/openapi-draft-validation-record.schema.json", "openapi-draft-validation"],
      ["scripts/lib/api-contract-decision.mjs", "NEEDS.openapiValidation"]
    ]
  },
  openapiJson: {
    message: "OpenAPI YAML-first JSON handoff scenarios passed",
    files: [".template-spec/api/templates/openapi-json-export-record-template.md"],
    markers: [[".template-spec/api/templates/openapi-json-export-record-template.md", "SHA-256"]]
  },
  yssDtoWire: {
    message: "YSS DTO OpenAPI wire-shape scenarios passed",
    files: [
      ".agents/skills/yss-dto/references/openapi-wire-profile.yaml",
      ".agents/skills/yss-dto/SKILL.md",
      ".agents/skills/yss-openapi-governance/SKILL.md",
      ".agents/skills/yss-openapi-draft-review/SKILL.md",
      ".agents/skills/yss-openapi-draft-review/references/semantic-review.md",
      ".template-spec/api/templates/openapi-draft-review-checklist.md",
      "scripts/verify-yss-dto-openapi-profile"
    ],
    markers: [
      [".agents/skills/yss-dto/SKILL.md", "x-yss-response-wrapper"],
      [".agents/skills/yss-openapi-governance/SKILL.md", "verify-yss-dto-openapi-profile"],
      [".agents/skills/yss-openapi-draft-review/SKILL.md", "(references/semantic-review.md)"],
      [".agents/skills/yss-openapi-draft-review/references/semantic-review.md", "offset`, `needTotalCount`, and `tempTotalCount"],
      [".template-spec/api/templates/openapi-draft-review-checklist.md", "DTO wire shape"]
    ]
  }
};

export function runScenario(name) {
  const profile = profiles[name];
  if (!profile) throw new TypeError(`未知 Node 场景: ${name}`);
  for (const file of profile.files) ensure(exists(file), `缺少场景资产: ${file}`);
  for (const [file, marker] of profile.markers) ensure(read(file).includes(marker), `场景资产缺少标记 ${marker}: ${file}`);
  if (name === "lifecycle") {
    const result = spawnSync("scripts/verify-lifecycle-registry", [], { cwd: root, encoding: "utf8" });
    ensure(result.status === 0, result.stderr || result.stdout);
    const registry = parseDocument(read(".template-spec/process/lifecycle-registry.yaml"), { uniqueKeys: true }).toJS({ maxAliasCount: 0 });
    const contract = parseDocument(read(".template-spec/process/orchestration-contract.yaml"), { uniqueKeys: true }).toJS({ maxAliasCount: 0 });
    ensure(contract.ready_for_agent?.requires_vertical_slice_ticket === true && contract.ready_for_agent?.parent_ticket_as_implementation_ref === "forbidden", "ready_for_agent 未强制垂直切片且禁止父 Ticket 实现引用");
    ensure(includesAll(contract.ready_for_agent?.required, ["ticket_decomposition_result_ref", "vertical_slice_ticket_ref", "vertical_slice_ticket_role", "vertical_slice_ticket_kind"]), "ready_for_agent 缺少 Ticket 正式化必填字段");
    ensure(contract.ticket_formalization?.implementation_predecessor === "work-unit.ticket-decomposition" && contract.ticket_formalization?.vertical_slice_ticket?.parent_ticket_ref_forbidden === true, "Ticket 正式化实现前置或父 Ticket 禁止规则缺失");
    ensure(contract.transition_graph?.implementation_requires_predecessor === "work-unit.ticket-decomposition", "生命周期转换图未声明实现前置工作单元");
    ensure(JSON.stringify(contract.transition_graph?.forbidden_shortcuts) === JSON.stringify([
      { from: "work-unit.spec-synthesis", to: "work-unit.implementation-repository-preparation" },
      { from: "work-unit.prototype-design-v2", to: "work-unit.implementation-repository-preparation" },
      { from: "work-unit.spec-synthesis", to: "work-unit.slice-implementation" },
      { from: "work-unit.prototype-design-v2", to: "work-unit.slice-implementation" },
      { from: "work-unit.technical-analysis", to: "work-unit.slice-implementation" },
      { from: "work-unit.technical-analysis", to: "work-unit.ticket-decomposition" },
    ]), "生命周期转换图缺少工程准备、Ticket 正式化与实现越级阻断");
    ensure(contract.transition_graph?.routes?.["work-unit.implementation-repository-preparation"]?.includes("work-unit.ticket-decomposition"), "实现仓库准备未成为 Ticket 正式化前置");
    ensure(contract.implementation_repository_preparation?.check === "check.implementation-repositories-ready", "实现仓库准备聚合门禁缺失");
    ensure(lifecycleTransitionContract.next_routes["work-unit.ticket-decomposition"]?.includes("work-unit.slice-implementation"), "转换校验器未允许 Ticket 正式化后进入实现");
  }
  if (name === "yssDtoWire") {
    const result = spawnSync("scripts/verify-yss-dto-openapi-profile", [], { cwd: root, encoding: "utf8" });
    ensure(result.status === 0, result.stderr || result.stdout);
  }
  process.stdout.write(`${profile.message}\n`);
}
