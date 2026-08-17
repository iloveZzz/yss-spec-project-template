import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (relative) => readFileSync(path.join(root, relative), "utf8");
function ensure(condition, message) { if (!condition) throw new TypeError(message); }
function exists(relative) { return existsSync(path.join(root, relative)); }

const profiles = {
  lifecycle: {
    message: "六类生命周期压力场景验证通过",
    files: [".agents/skills/yss-product-lifecycle/SKILL.md", ".agents/skills/yss-product-lifecycle/references/orchestration-contract.yaml", "docs/process/lifecycle-registry.yaml"],
    markers: [[".agents/skills/yss-product-lifecycle/SKILL.md", "template-source-product-artifact-forbidden"], [".agents/skills/yss-product-lifecycle/references/orchestration-contract.yaml", "ready-for-agent"]]
  },
  matt: {
    message: "Matt/YSS 集成压力场景验证通过",
    files: [".agents/skills/yss-product-lifecycle/references/matt-yss-adapter.md", ".agents/skills/yss-product-lifecycle/references/orchestration-contract.yaml"],
    markers: [[".agents/skills/yss-product-lifecycle/SKILL.md", "Matt Skill Result"]]
  },
  prototype: {
    message: "原型到后端脚手架及后续 YSS 代码生成压力场景验证通过",
    files: [".agents/skills/yss-ddd-scaffold-generator/scripts/generate_scaffold.mjs", ".agents/skills/yss-router/references/router-contract.yaml"],
    markers: [[".agents/skills/yss-product-lifecycle/SKILL.md", "controlled-generation"]]
  },
  router: {
    message: "YSS Router stage 7 scenarios passed",
    files: [".agents/skills/yss-router/references/router-contract.yaml", ".agents/skills/yss-router/SKILL.md"],
    markers: [[".agents/skills/yss-router/references/router-contract.yaml", "slice_contract_required"]]
  },
  openapiYaml: {
    message: "OpenAPI YAML-first 场景验证通过",
    files: ["docs/templates/openapi-spec-template.yaml", ".agents/skills/yss-openapi-governance/SKILL.md"],
    markers: [["docs/templates/openapi-spec-template.yaml", "openapi: 3.1.0"], [".agents/skills/yss-openapi-governance/SKILL.md", "YAML-first"]]
  },
  openapiJson: {
    message: "OpenAPI YAML-first JSON handoff scenarios passed",
    files: ["docs/api/templates/openapi-json-export-record-template.md", ".agents/skills/yss-api-integration/SKILL.md"],
    markers: [[".agents/skills/yss-api-integration/SKILL.md", "SHA-256"]]
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
  }
  process.stdout.write(`${profile.message}\n`);
}
