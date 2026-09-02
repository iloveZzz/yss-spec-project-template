import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadSkillRegistry } from "./skill-registry.mjs";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function fail(message) {
  throw new TypeError(message);
}

export function validateSkillGovernance({ read = (relative) => readFileSync(path.join(ROOT, relative), "utf8"), exists = (relative) => existsSync(path.join(ROOT, relative)) } = {}) {
  const globalRules = read(".agents/rules/yss-ai-skills.md");
  const tableSkill = read(".agents/skills/ytable-usage/SKILL.md");
  const pageSkill = read(".agents/skills/yss-page-module-development/SKILL.md");

  if (/toolbar-config\.custom.{0,30}(必须|必需)|必须.{0,30}toolbar-config\.custom/.test(globalRules)) {
    fail("全局规则不得把 toolbar-config.custom 作为无条件要求");
  }
  for (const marker of ["主操作必须放入 `#toolbar-right`", "只有确实需要列设置时才使用", "toolbar-config"] ) {
    if (!globalRules.includes(marker)) fail(`全局规则缺少条件化表格工具栏规则: ${marker}`);
  }
  for (const marker of ["无需配置 `:toolbar-config=\"{ custom: true }\"`", "仅在业务明确需要列设置时才传入"]) {
    if (!tableSkill.includes(marker)) fail(`YTable 专项技能缺少条件化工具栏规则: ${marker}`);
  }
  if (!pageSkill.includes("只有确实需要列设置时才启用 `toolbar-config.custom`")) {
    fail("页面模块 canonical 技能缺少条件化 toolbar-config 规则");
  }

  const registry = loadSkillRegistry();
  const canonicalIds = new Set(registry.skills.map((skill) => skill.id));
  const aliases = new Map(registry.skills.flatMap((skill) => skill.aliases.map((alias) => [alias, skill.id])));
  const legacy = new Set(["api-integration", "page-module-development", "use-table-height", "use-tree-height"]);
  for (const alias of legacy) {
    if (exists(`.agents/skills/${alias}`)) fail(`legacy alias 不得存在独立 canonical 目录: ${alias}`);
    if (!aliases.has(alias)) fail(`legacy alias 未登记: ${alias}`);
  }
  if (exists(".agents/skills/high-fidelity-html-prototype") || aliases.has("high-fidelity-html-prototype")) {
    fail("high-fidelity-html-prototype 已退役，不得保留物理目录或运行时 alias");
  }
  const prototypeStage = read(".agents/skills/yss-prototype-stage/SKILL.md");
  const prototypeAdapter = read(".agents/skills/yss-prototype-stage/references/product-design-adapter.md");
  const prototypeEvidence = read("docs/design/templates/prototype-evidence-template.yaml");
  const projectDesign = read("docs/design/design.md");
  const antdvCompatibility = read(".agents/skills/yss-ui/references/antdv-compatibility.md");
  for (const marker of ["product-design-adapter.md", "schema v2", "ant-design-v6", "ant-design-vue-4.x", "accessibility_verification"]) {
    if (!prototypeStage.includes(marker)) fail(`原型阶段合同缺少 YSS adapter 标记: ${marker}`);
  }
  for (const marker of ["antd@6.x", "pnpm", "ConfigProvider", "visual_semantic_mapping", "react_only_api_not_copied", "1440x900", "390x844", "verification/design-qa.md"]) {
    if (!prototypeAdapter.includes(marker)) fail(`Product Design adapter 缺少执行约束: ${marker}`);
  }
  for (const marker of ["schema_version: 2", "design_standard: ant-design-v6", "runtime_component_library: ant-design-vue-4.x", "actual_antd_version", "visual_semantic_mapping", "accessibility_verification", "verification/design-qa.md"]) {
    if (!prototypeEvidence.includes(marker)) fail(`原型证据模板缺少 schema v2 字段: ${marker}`);
  }
  if (prototypeEvidence.includes("与官方 #1677ff / Inter / 8px")) fail("原型证据模板仍把 Inter/8px 误写为官方 v6 默认差异");
  if (projectDesign.includes("`antdv6-design.md`")) fail("design.md 仍引用不存在的 antdv6-design.md");
  for (const marker of ["Ant Design v6", "Ant Design Vue 4.x", "版本号不同本身不是冲突", "visual_semantic_mapping"]) {
    if (!antdvCompatibility.includes(marker)) fail(`AntDV 兼容策略缺少双轨边界: ${marker}`);
  }
  for (const skill of registry.skills) {
    if (!canonicalIds.has(skill.id)) fail(`注册表 canonical skill 无效: ${skill.id}`);
    if (skill.maturity === "deprecated") {
      for (const field of ["replaced_by", "migration_deadline", "cleanup_status"]) {
        if (!skill[field] || typeof skill[field] !== "string") fail(`deprecated 技能缺少 ${field}: ${skill.id}`);
      }
    }
  }
  return { checked: true, legacy_aliases: legacy.size };
}
