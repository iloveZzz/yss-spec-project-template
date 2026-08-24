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
  const legacy = new Set(["api-integration", "page-module-development", "use-table-height", "use-tree-height", "yss-ui-business-page-generation"]);
  for (const alias of legacy) {
    if (exists(`.agents/skills/${alias}`)) fail(`legacy alias 不得存在独立 canonical 目录: ${alias}`);
    if (!aliases.has(alias)) fail(`legacy alias 未登记: ${alias}`);
  }
  if (exists(".agents/skills/high-fidelity-html-prototype") || aliases.has("high-fidelity-html-prototype")) {
    fail("high-fidelity-html-prototype 已退役，不得保留物理目录或运行时 alias");
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
