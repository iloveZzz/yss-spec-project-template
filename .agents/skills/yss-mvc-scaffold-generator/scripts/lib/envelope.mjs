import { cp, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { HARNESS_ROOT, MODULES, PROJECT_SCRIPT_FILES, exists, fail } from "./runtime.mjs";
import { put } from "./storage.mjs";

const TEMPLATE_SOURCE_COMMAND = /scripts\/(?:verify-template(?:-fast|-candidate)?|sync-skills|update-skill-lock|export-yss-skills|verify-upstream-skill-source|verify-maintenance-checkpoint|verify-implementation-path-scenarios|gitworks)/g;
const TEMPLATE_SOURCE_SECTION = /(^## 4\. `template-source` 模板维护路由[^\S\r\n]*$)[\s\S]*?(?=^## 5\. `project-instance` 产品研发路由[^\S\r\n]*$)/m;

function removeTemplateSourceCommands(content) {
  return content.replace(TEMPLATE_SOURCE_COMMAND, "上游 Harness 专用命令");
}

export function renderProjectInstanceAgents(content) {
  if (!TEMPLATE_SOURCE_SECTION.test(content)) fail("无法定位 AGENTS.md 的模板维护章节边界");
  return content.replace(
    TEMPLATE_SOURCE_SECTION,
    "$1\n\n当前仓库是 `project-instance`，模板维护只在上游 Harness 执行。\n\n"
  );
}

export async function writeProjectEnvelope(o) {
  await put(o.targetDir, "yss-project.yaml", "schema_version: 1\nrepository_mode: project-instance");
  await put(o.targetDir, ".artifact-workspace.yaml", `schema_version: 1\nkind: service\nservice_id: ${o.projectName}\nowner: ${JSON.stringify(o.gitAuthor)}`);
  await cp(path.join(HARNESS_ROOT, "AGENTS.md"), path.join(o.targetDir, "AGENTS.md"));
  const generatedAgents = await readFile(path.join(o.targetDir, "AGENTS.md"), "utf8");
  await writeFile(path.join(o.targetDir, "AGENTS.md"), renderProjectInstanceAgents(generatedAgents)
    .replaceAll(".agents/skills", "../skillUtils/.agents/skills")
    .replaceAll(".codex/skills", "../skillUtils/.codex/skills"), "utf8");
  await put(o.targetDir, "CONTEXT.md", "# 领域上下文\n\n## 业务术语\n\n| 术语 | 定义 | 英文标识 | 避免 / 备注 |\n|---|---|---|---|\n| 分析数据集 | 支撑一个数据分析功能的表结构、字段语义和查询边界。 | AnalysisDataset | 具体业务术语在需求分析后补充 |\n| 分析结果 | 数据分析接口返回的分页明细或聚合结果。 | AnalysisResult | 不表示未经约束的原始结果集 |");
  for (const relative of ["docs/agents", "docs/process", "docs/templates", "docs/architecture/templates"]) {
    const source = path.join(HARNESS_ROOT, relative);
    if (!await exists(source)) fail(`项目实例治理资产不存在: ${source}`);
    await cp(source, path.join(o.targetDir, relative), { recursive: true });
  }
  const integrationPath = path.join(o.targetDir, "docs/process/implementation-repo-integration.md");
  const integration = (await readFile(integrationPath, "utf8"))
    .replace("模板仓库至少执行：", "以下命令仅由上游 Harness 模板源执行，项目实例不分发这些模板维护工具：")
    .replace(/scripts\/sync-skills --check\r?\nscripts\/update-skill-lock --check\r?\nscripts\/verify-template/, "在 Harness 模板源执行 Skill 投影同步、锁文件检查和模板发布校验。");
  await writeFile(integrationPath, integration, "utf8");
  const checklistPath = path.join(o.targetDir, "docs/templates/build-architecture-checklist-template.md");
  await writeFile(checklistPath, (await readFile(checklistPath, "utf8")).replace("scripts/verify-implementation-path-scenarios", "node scripts/implementation-path-policy"), "utf8");
  for (const relative of ["AGENTS.md", "docs/process/implementation-repo-integration.md", "docs/process/harness-process-tailoring.md", "docs/templates/build-architecture-checklist-template.md"]) {
    const target = path.join(o.targetDir, relative);
    await writeFile(target, removeTemplateSourceCommands(await readFile(target, "utf8")), "utf8");
  }
  const agentReadmePath = path.join(o.targetDir, "docs/agents/README.md");
  const agentReadme = (await readFile(agentReadmePath, "utf8"))
    .replace("Engineering Skills 的安装、升级和验证说明", "项目实例使用共享 `skillUtils` 的版本检查说明")
    .replace("GitLab、MR、CI 和自动 gitworks 的技能配置与使用规则", "GitLab、MR 和 CI 的 `glab` 使用规则");
  await writeFile(agentReadmePath, agentReadme, "utf8");
  const issueTrackerPath = path.join(o.targetDir, "docs/agents/issue-tracker.md");
  await writeFile(issueTrackerPath, (await readFile(issueTrackerPath, "utf8")).replace("当平台为 GitLab 时，优先使用 `glab` 或项目快捷入口 `scripts/gitworks`。", "当平台为 GitLab 时，使用已认证的 `glab`。"), "utf8");
  const tailoringPath = path.join(o.targetDir, "docs/process/harness-process-tailoring.md");
  await writeFile(tailoringPath, (await readFile(tailoringPath, "utf8")).replace("使用 `scripts/verify-maintenance-checkpoint <file>` 或通过 stdin 传入 YAML / JSON 做只读校验。触发项 ID 与最低等级只由 `docs/process/maintenance-intensity.yaml` 维护；校验器消费该策略。未知触发项必须先更新该权威策略和场景，不能静默接受。", "维护 checkpoint 校验只在上游 Harness 模板源执行。触发项 ID 与最低等级只由 `docs/process/maintenance-intensity.yaml` 维护；未知触发项必须先更新该权威策略和场景，不能静默接受。"), "utf8");
  await put(o.targetDir, "docs/agents/skills-maintenance.md", "# 项目实例 Skill 环境\n\n本项目不维护或发布共享 Skill。共享 Skill 位于相邻的 `../skillUtils`，版本由项目根 `skills-lock.json` 锁定。\n\n开发前执行：\n\n```bash\nnpm run check-agent-environment\n```\n\n输出 `READY` 表示工具版本、兼容协议、Agent 投影和 canonical Skill hash 一致。输出 `NOT_READY` 时停止功能实现，使用上游 Harness 的项目初始化或刷新流程更新 `skillUtils`；不要在项目内手工同步、导出或覆盖共享 Skill。\n\n项目实例只消费已提交的 `scripts/lib/*.mjs` 和 `scripts/vendor/*.mjs`。模板发布、Skill 投影生成、上游来源验证和公开导出均属于 Harness 模板源维护，不在本项目执行。");
  await put(o.targetDir, "docs/agents/gitlab-workflow-skills.md", "# GitLab 工作流\n\n本项目不分发 GitLab 包装脚本。需要查看 MR、Pipeline 或 CI 时，使用已认证的 `glab`，并先确认当前仓库的 `origin` 指向目标 GitLab 项目。\n\n常用只读命令：\n\n```bash\ngit status --short --branch\nglab mr list\nglab ci list\nglab ci status\n```\n\n创建分支、commit、push、MR 或触发 Pipeline 都必须遵守 `AGENTS.md` 的显式授权和 checkpoint 规则。Token 只通过 `glab auth login` 或环境变量管理，不写入仓库文件。");
  for (const relative of PROJECT_SCRIPT_FILES) await cp(path.join(HARNESS_ROOT, "scripts", relative), path.join(o.targetDir, "scripts", relative));
  for (const relative of ["lib", "vendor"]) await cp(path.join(HARNESS_ROOT, "scripts", relative), path.join(o.targetDir, "scripts", relative), { recursive: true });
  for (const relative of ["package.json", "skills-lock.json", ".nvmrc"]) {
    const source = path.join(HARNESS_ROOT, relative);
    if (await exists(source)) await cp(source, path.join(o.targetDir, relative));
  }
  await put(o.targetDir, "skills-lock.json", JSON.stringify({ version: 1, distribution: { mode: "sibling-directory", skillUtilsDir: "../skillUtils", required: true, compatibility: "skill-utils-v1", requiredToolVersion: "1.0.0" }, skills: { source: "../skillUtils/skills-lock.json", validation: "scripts/check-agent-environment.mjs" } }, null, 2));
  await put(o.targetDir, "package.json", JSON.stringify({ name: o.projectName, private: true, scripts: { "check-agent-environment": "node scripts/check-agent-environment.mjs", "verify-project": "node scripts/verify-lifecycle-registry", "verify-dto": "node scripts/verify-yss-dto-openapi-profile" } }, null, 2));
  await put(o.targetDir, "docs/process/analysis-project.yaml", `project_name: ${o.projectName}\nproject_type: data-analysis\nrepository_scope: external-repository\nimplementation_root: .\nruntime_java: 8\npersistence_profile: yss-mybatis-plus\nid_strategy: ASSIGN_ID\ndatabase:\n  type: ${o.database}\n  runtime_connection: true\n  metadata_contract: docs/data-model\nquery:\n  sql_mode: readonly\n  allowed_statement_types: [select, with]\n  parameter_binding_required: true\nmodules:\n${MODULES.map((module) => `  - ${module}`).join("\n")}\nworkflow:\n  - requirement-and-data-contract\n  - specification-freeze\n  - vertical-slice-implementation\n  - automated-gates\n  - single-release-confirmation\n  - runtime-monitoring`);
  await put(o.targetDir, "docs/process/implementation-repo-registry.yaml", `schema_version: 1\nprojects:\n  - project_type: backend\n    project_name: ${o.projectName}\n    project_root: .\n    git_root: .\n    repository_scope: external-repository\n    scaffold_status: initialized\n    default_branch: main\n    allowed_write_paths:\n      - .\n    verification_commands:\n      - mvnw com.coveo:fmt-maven-plugin:2.9.1:check\n      - mvnw validate\n      - mvnw test\n      - mvnw package\n    expected_evidence_files:\n      - docs/.scratch/<feature>/verification/yss-skill-execution-result.yaml\n      - docs/.scratch/<feature>/verification/fresh-verification.md\n    ci: not-configured\n    rollback_point: initial-empty-repository`);
  await put(o.targetDir, "docs/.scratch/.gitkeep", "# Local lifecycle artifacts are created in feature subdirectories.");
  await put(o.targetDir, "docs/service/service-overview.md", `# ${o.projectName} 服务说明\n\nOwner: ${o.gitAuthor}\n\n## 职责\n\n提供数据分析服务能力；具体业务职责在产品服务登记和功能 Spec 中维护。\n\n## 非职责\n\n## 依赖服务\n`);
  await put(o.targetDir, "docs/service/module-map.md", `# ${o.projectName} Module 地图\n\n| Module | 职责 | 主要 Interface |\n|---|---|---|\n| server | Web 入口与运行配置 | HTTP Controller |\n| core | 领域与应用行为 | Domain/Application Interface |\n| client | 对外 DTO 与客户端契约 | Request/Response |\n| repository | 数据持久化 | Gateway/Repository |\n| adapter | 外部系统适配 | Adapter |\n| feign-client | 服务间调用客户端 | Feign Interface |\n`);
  await put(o.targetDir, "docs/service/current-capabilities.md", "# 当前能力\n\n本文件是发布时生成的派生阅读视图，普通功能开发不手工修改。功能详情位于 `docs/features/`，开发中功能位于 `docs/.scratch/`。\n");
  await put(o.targetDir, "docs/engineering/data-analysis-java-conventions.md", `# 数据分析 Java 工程规范\n\n变量、参数和字段必须使用业务含义名称。public 类、接口和方法必须有简体中文 Javadoc；Controller 类和公开接口方法使用初始化时读取的 Git user.name（本项目为 @author ${o.gitAuthor}）和生成时的 @date，方法参数、返回值分别使用 @param、@return 完整说明。Javadoc 正文、@author、@date、@param、@return 必须分行；Mapping 注解、方法签名、方法体不得压缩在同一行。\n`);
  await put(o.targetDir, ".gitignore", "target/\n**/target/\n.idea/\n*.iml\n.env\n.env.*\n!.env.example\n.local/\n");
}
