import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isTemplateSource } from "./repository-mode.mjs";
import { loadSkillRegistry } from "./skill-registry.mjs";
import { OBSOLETE } from "./skill-supply-chain.mjs";

import { readRetirementContract } from './skill-retirement-contract.mjs';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

export const RETIRED_FRONTEND_SKILLS = ["file-export-download", "formily-foundation", "formily-linkage-effects", "formily-mode-slot-detail", "formily-step-flow", "frontend-commit", "theme-token-usage", "yedit-table-usage", "yss-api-integration", "yss-formily", "yss-formily-schema-generator", "yss-frontend-scaffold-generator", "yss-hook", "yss-ui", "yss-ui-business-page-generation", "ytable-usage", "ytree-usage"];

function fail(message) {
  throw new TypeError(message);
}

export function validateSkillGovernance({ read = (relative) => readFileSync(path.join(ROOT, relative), "utf8"), exists = (relative) => existsSync(path.join(ROOT, relative)) } = {}) {
  const registry = loadSkillRegistry();
  const retired = readRetirementContract(registry, {legacyIds: OBSOLETE});
  const cursorRules = read(".cursorrules");
  for (const marker of ["yss-project.yaml", ".template-spec/agents/yss-skill-registry.yaml", ".agents/skills", ".claude/skills"]) {
    if (!cursorRules.includes(marker)) fail(`Cursor 薄入口缺少路由标记: ${marker}`);
  }
  if (cursorRules.includes("YSS AI SKILLS START")) fail("Cursor 薄入口不得回流技能清单");

  // 前端技能整线退役（2026-10-17）：前端由独立规格与 CLI 维护，本模板不得回流前端技能、上游清单或 YSS UI MCP 配置。
  for (const id of RETIRED_FRONTEND_SKILLS) {
    if (!retired.has(id)) fail(`退役前端技能未登记到 OBSOLETE: ${id}`);
    if (exists(`.agents/skills/${id}`) || exists(`.claude/skills/${id}`)) fail(`退役前端技能不得保留物理目录或投影: ${id}`);
  }
  for (const ref of [".agents/skills/.yss-skills-manifest.json", ".agents/rules/yss-ai-skills.md", ".agents/mcp_config.json", ".cursor/mcp.json", ".vscode/mcp.json", ".template-spec/user-guide/yss-ui-mcp.md"]) {
    if (exists(ref)) fail(`前端技能退役后不得保留: ${ref}`);
  }

  const canonicalIds = new Set(registry.skills.map((skill) => skill.id));
  const aliases = new Map(registry.skills.flatMap((skill) => skill.aliases.map((alias) => [alias, skill.id])));
  const legacy = new Set();
  if (exists(".agents/skills/page-module-development") || exists(".agents/skills/yss-page-module-development") || aliases.has("page-module-development")) {
    fail("page-module-development / yss-page-module-development 已退役，不得保留物理目录或运行时 alias");
  }
  if (exists(".agents/skills/high-fidelity-html-prototype") || aliases.has("high-fidelity-html-prototype")) {
    fail("high-fidelity-html-prototype 已退役，不得保留物理目录或运行时 alias");
  }
  for (const id of ["yss-antd-design", "yss-antdv-next-design"]) {
    if (exists(`.agents/skills/${id}`) || canonicalIds.has(id)) fail(`原型 Provider 已退役: ${id}`);
  }
  const prototypeStage = read(".agents/skills/yss-prototype-stage/SKILL.md");
  const prototypeAdapter = read(".agents/skills/yss-prototype-stage/references/product-design-adapter.md");
  const prototypeEvidence = read(".template-spec/design/templates/prototype-evidence-template.yaml");
  const projectDesign = read(".template-spec/design/design.md");
  for (const marker of ["product-design-adapter.md", "Prototype Evidence schema v4", "Visual Baseline schema v1", "H1", "H2", "原型阶段不得调用生产组件库"]) {
    if (!prototypeStage.includes(marker)) fail(`原型阶段合同缺少 YSS adapter 标记: ${marker}`);
  }
  for (const marker of ["prepare-static", "prepare-flow", "html-css-js", "offline-html-v1", "seal-project", "design-contract", "1440x900", "390x844"]) {
    if (!prototypeAdapter.includes(marker)) fail(`Product Design adapter 缺少执行约束: ${marker}`);
  }
  for (const marker of ["schema_version: 4", "visual_baseline", "prototype_profile", "visual_review", "flow_review", "implementation_handoff", "project_token_baseline_digest", "verification/design-qa.md"]) {
    if (!prototypeEvidence.includes(marker)) fail(`原型证据模板缺少 schema v4 字段: ${marker}`);
  }
  if (prototypeEvidence.includes("与官方 #1677ff / Inter / 8px")) fail("原型证据模板仍把 Inter/8px 误写为官方 v6 默认差异");
  if (projectDesign.includes("`antdv6-design.md`")) fail("design.md 仍引用不存在的 antdv6-design.md");
  for (const skill of registry.skills) {
    if (!canonicalIds.has(skill.id)) fail(`注册表 canonical skill 无效: ${skill.id}`);
    if (skill.maturity === "deprecated") {
      if (!skill.replacement_skill || typeof skill.replacement_skill !== "string") fail(`deprecated 技能缺少 replacement_skill: ${skill.id}`);
      if (!skill.deprecation || typeof skill.deprecation !== "object") fail(`deprecated 技能缺少 deprecation: ${skill.id}`);
      if (skill.deprecation.new_use !== "forbidden") fail(`deprecated 技能必须禁止新用法: ${skill.id}`);
      if (!["migration-only", "remove-ready"].includes(skill.deprecation.cleanup_status)) fail(`deprecated 技能 cleanup_status 无效: ${skill.id}`);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(skill.deprecation.remove_after ?? "")) fail(`deprecated 技能 remove_after 无效: ${skill.id}`);
    }
  }
  return { checked: true, legacy_aliases: legacy.size, retired_frontend_skills: RETIRED_FRONTEND_SKILLS.length };
}
