import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isTemplateSource } from "./repository-mode.mjs";
import { loadSkillRegistry } from "./skill-registry.mjs";
import { treeHash, validateStrategicDesignSkillManifest, validateYssUiSkillManifest } from "./skill-supply-chain.mjs";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function fail(message) {
  throw new TypeError(message);
}

export function validateSkillGovernance({ read = (relative) => readFileSync(path.join(ROOT, relative), "utf8"), exists = (relative) => existsSync(path.join(ROOT, relative)) } = {}) {
  const globalRules = read(".agents/rules/yss-ai-skills.md");
  const tableSkill = read(".agents/skills/ytable-usage/SKILL.md");
  const pageSkill = read(".agents/skills/yss-ui-business-page-generation/SKILL.md");

  for (const marker of ["trigger: always_on", "docs/agents/yss-skill-registry.yaml", ".agents/skills/yss-ui/SKILL.md", "原型阶段"]) {
    if (!globalRules.includes(marker)) fail(`YSS UI 薄入口缺少路由标记: ${marker}`);
  }
  for (const staleHeading of ["## Available Skills", "## Mandatory Workflow"]) {
    if (globalRules.includes(staleHeading)) fail(`YSS UI 薄入口不得回流技能清单或实现步骤: ${staleHeading}`);
  }
  const cursorRules = read(".cursorrules");
  for (const marker of ["yss-project.yaml", "docs/agents/yss-skill-registry.yaml", "yss-ui-business-page-generation", ".cursor/skills"]) {
    if (!cursorRules.includes(marker)) fail(`Cursor 薄入口缺少路由标记: ${marker}`);
  }
  if (cursorRules.includes("YSS AI SKILLS START")) fail("Cursor 薄入口不得回流技能清单");

  if (/toolbar-config\.custom.{0,30}(必须|必需)|必须.{0,30}toolbar-config\.custom/.test(globalRules)) {
    fail("全局规则不得把 toolbar-config.custom 作为无条件要求");
  }
  for (const marker of ["主操作必须放入 `#toolbar-right`", "只有确实需要列设置时才使用", "toolbar-config"] ) {
    if (!globalRules.includes(marker)) fail(`全局规则缺少条件化表格工具栏规则: ${marker}`);
  }
  for (const marker of ["无需配置 `:toolbar-config=\"{ custom: true }\"`", "仅在业务明确需要列设置时才传入"]) {
    if (!tableSkill.includes(marker)) fail(`YTable 专项技能缺少条件化工具栏规则: ${marker}`);
  }
  if (!pageSkill.includes("仅在业务明确需要列设置时才传入")) {
    fail("业务页面 canonical 技能缺少条件化 toolbar-config 规则");
  }

  const yssUiManifest = validateYssUiSkillManifest(JSON.parse(read(".agents/skills/.yss-skills-manifest.json")));
  const lock = JSON.parse(read("skills-lock.json"));
  for (const skill of yssUiManifest.skills) {
    const skillPath = `.agents/skills/${skill.canonical}/SKILL.md`;
    if (!exists(skillPath)) fail(`yss-ui 前端清单缺少 canonical skill: ${skill.canonical}`);
    const item = lock.skills?.shared?.[skill.canonical];
    if (!item || item.source !== yssUiManifest.source || item.sourceRevision !== yssUiManifest.source_revision) {
      fail(`yss-ui skill 缺少一致的来源锁定: ${skill.canonical}`);
    }
    if (item.skillPath !== `${yssUiManifest.source_root}/${skill.upstream}/SKILL.md` || item.upstreamHash !== skill.upstream_hash) {
      fail(`yss-ui skill 上游路径或 hash 不一致: ${skill.canonical}`);
    }
    const content = read(skillPath);
    for (const match of content.matchAll(/\.\.\/([a-z0-9-]+)\/SKILL\.md/g)) {
      if (!exists(`.agents/skills/${match[1]}/SKILL.md`)) fail(`${skill.canonical} 引用了不存在的本地 skill: ${match[1]}`);
    }
  }
  const yssUiSkill = read(".agents/skills/yss-ui/SKILL.md");
  if (!yssUiSkill.includes("`YFormily` 是新代码 canonical name")) fail("yss-ui 必须把 YFormily 声明为新代码 canonical name");
  if (!yssUiSkill.includes("| 新建或改造完整业务页面 | `yss-ui-business-page-generation` |")) fail("yss-ui 缺少完整业务页面生成路由");
  if (!yssUiSkill.includes("原型阶段不得调用本技能") || yssUiSkill.includes("prototype-component-facts")) fail("yss-ui 必须保持生产实现边界，不得暴露原型模式");
  const expectedServer = { command: "npx", args: ["-y", "@yss-ui/mcp"] };
  for (const config of yssUiManifest.mcp.project_configs) {
    if (!exists(config.path)) fail(`缺少 yss-ui MCP 项目配置: ${config.path}`);
    const document = JSON.parse(read(config.path));
    if (JSON.stringify(document?.[config.container]?.[yssUiManifest.mcp.server_name]) !== JSON.stringify(expectedServer)) {
      fail(`yss-ui MCP 配置不一致: ${config.path}`);
    }
  }
  const mcpGuide = read(yssUiManifest.mcp.global_install_guide);
  for (const marker of ["npx -y @yss-ui/mcp install codex", "不写用户主目录", "get_codegen_rules", "list_components"]) {
    if (!mcpGuide.includes(marker)) fail(`YSS UI MCP 指南缺少边界或自检标记: ${marker}`);
  }

  const strategicManifest = validateStrategicDesignSkillManifest(JSON.parse(read(".agents/skills/.strategic-design-skills-manifest.json")));
  const strategicIds = ["prototype-review", "yss-prototype-stage", "yss-design-system", "yss-antd-design", "yss-antdv-next-design", "yss-stage-decision"];
  if (JSON.stringify(strategicManifest.skills.map(({ canonical }) => canonical).sort()) !== JSON.stringify(strategicIds.slice().sort())) {
    fail("战略设计 skills 清单必须恰好覆盖六项公共技能");
  }
  for (const skill of strategicManifest.skills) {
    if (isTemplateSource(ROOT)) {
      const upstreamDirectory = path.join(ROOT, "submodules/yss-harness-design-agent", strategicManifest.source_root, skill.upstream);
      if (!existsSync(path.join(upstreamDirectory, "SKILL.md"))) fail(`战略设计上游 skill 不存在: ${skill.upstream}`);
      if (treeHash(upstreamDirectory) !== skill.upstream_hash) fail(`战略设计上游 hash 漂移: ${skill.upstream}`);
    }
    const item = lock.skills?.shared?.[skill.canonical];
    if (!item || item.source !== strategicManifest.source || item.sourceRevision !== strategicManifest.source_revision || item.upstreamHash !== skill.upstream_hash) {
      fail(`战略设计 skill 缺少一致的来源锁定: ${skill.canonical}`);
    }
    if (item.effectiveHash !== item.upstreamHash && item.adaptationRef !== strategicManifest.adaptation_ref) {
      fail(`战略设计 skill 差异缺少薄适配引用: ${skill.canonical}`);
    }
  }

  const registry = loadSkillRegistry();
  const canonicalIds = new Set(registry.skills.map((skill) => skill.id));
  const aliases = new Map(registry.skills.flatMap((skill) => skill.aliases.map((alias) => [alias, skill.id])));
  const legacy = new Set(["api-integration", "use-table-height", "use-tree-height"]);
  for (const alias of legacy) {
    if (exists(`.agents/skills/${alias}`)) fail(`legacy alias 不得存在独立 canonical 目录: ${alias}`);
    if (!aliases.has(alias)) fail(`legacy alias 未登记: ${alias}`);
  }
  if (exists(".agents/skills/page-module-development") || exists(".agents/skills/yss-page-module-development") || aliases.has("page-module-development")) {
    fail("page-module-development / yss-page-module-development 已退役，不得保留物理目录或运行时 alias");
  }
  if (exists(".agents/skills/high-fidelity-html-prototype") || aliases.has("high-fidelity-html-prototype")) {
    fail("high-fidelity-html-prototype 已退役，不得保留物理目录或运行时 alias");
  }
  const prototypeStage = read(".agents/skills/yss-prototype-stage/SKILL.md");
  const prototypeAdapter = read(".agents/skills/yss-prototype-stage/references/product-design-adapter.md");
  const prototypeEvidence = read("docs/design/templates/prototype-evidence-template.yaml");
  const projectDesign = read("docs/design/design.md");
  const antdvCompatibility = read(".agents/skills/yss-ui/references/antdv-compatibility.md");
  for (const marker of ["product-design-adapter.md", "Prototype Evidence schema v4", "Visual Baseline schema v1", "H1", "H2", "原型阶段不得调用 `yss-ui`"]) {
    if (!prototypeStage.includes(marker)) fail(`原型阶段合同缺少 YSS adapter 标记: ${marker}`);
  }
  for (const marker of ["prepare-static", "prepare-flow", "vue-antdv-next", "react-antd-6", "fact pack", "ConfigProvider", "1440x900", "390x844"]) {
    if (!prototypeAdapter.includes(marker)) fail(`Product Design adapter 缺少执行约束: ${marker}`);
  }
  for (const marker of ["schema_version: 4", "visual_baseline", "prototype_profile", "visual_review", "flow_review", "implementation_handoff", "project_token_baseline_digest", "verification/design-qa.md"]) {
    if (!prototypeEvidence.includes(marker)) fail(`原型证据模板缺少 schema v4 字段: ${marker}`);
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
  return { checked: true, legacy_aliases: legacy.size, yss_ui_skills: yssUiManifest.skills.length };
}
