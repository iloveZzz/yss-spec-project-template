import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadSkillRegistry } from "./skill-registry.mjs";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function fail(message) {
  throw new TypeError(message);
}

export function validateSkillGovernance({ read = (relative) => readFileSync(path.join(ROOT, relative), "utf8"), exists = (relative) => existsSync(path.join(ROOT, relative)) } = {}) {
  // 当前分支只承载战略设计与产品设计事实；工程页面技能已由主分支维护。
  // 因此这里只验证本分支注册表、兼容 alias 与退役目录，不加载工程技能。

  const registry = loadSkillRegistry();
  const canonicalIds = new Set(registry.skills.map((skill) => skill.id));
  const aliases = new Map(registry.skills.flatMap((skill) => skill.aliases.map((alias) => [alias, skill.id])));
  const legacy = new Set([]);
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
