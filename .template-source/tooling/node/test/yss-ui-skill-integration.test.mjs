import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  ROOT,
  validateYssUiSkillManifest,
} from "../../../../scripts/lib/skill-supply-chain.mjs";

const manifestPath = `${ROOT}/.agents/skills/.yss-skills-manifest.json`;

test("yss-ui 业务项目清单覆盖 22 个 app skills 与项目级 MCP 配置", () => {
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const contract = validateYssUiSkillManifest(manifest);

  assert.equal(contract.skills.length, 22);
  assert.equal(contract.source_category, "app");
  assert.deepEqual(contract.excluded_categories, ["library"]);
  assert.deepEqual(contract.excluded_skills, ["java-backend-commit"]);
  assert.equal(contract.skills.some(({ upstream }) => upstream === "java-backend-commit"), false);
  const librarySkills = [
    "release-management",
    "changelog-generation",
    "commit-linting",
    "component-development",
    "component-testing",
    "documentation",
    "release-workflow",
    "yss-create-microapp",
    "sync-internal-dev",
    "skill-development",
  ];
  assert.deepEqual(
    contract.skills.filter(({ upstream }) => librarySkills.includes(upstream)),
    [],
  );
  assert.equal(contract.source, "iloveZzz/yss-ui");
  assert.equal(contract.package.name, "@yss-ui/skills");
  assert.equal(contract.package.version, "1.3.9");
  assert.deepEqual(
    contract.skills
      .filter(({ upstream, canonical }) => upstream !== canonical)
      .map(({ upstream, canonical }) => `${upstream}:${canonical}`),
    [
      "api-integration:yss-api-integration",
      "page-module-development:yss-page-module-development",
      "use-table-height:yss-use-table-height",
      "use-tree-height:yss-use-tree-height",
    ],
  );
  assert.deepEqual(
    contract.mcp.project_configs.map(({ path }) => path),
    [
      ".mcp.json",
      ".agents/mcp_config.json",
      ".cursor/mcp.json",
      ".vscode/mcp.json",
    ],
  );
});

test("yss-ui 上游清单拒绝重复 canonical 与缺失 hash", () => {
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const duplicated = structuredClone(manifest);
  duplicated.skills[1].canonical = duplicated.skills[0].canonical;
  assert.throws(() => validateYssUiSkillManifest(duplicated), /canonical.*重复/);

  const missingHash = structuredClone(manifest);
  delete missingHash.skills[0].upstream_hash;
  assert.throws(() => validateYssUiSkillManifest(missingHash), /upstream_hash/);
});
