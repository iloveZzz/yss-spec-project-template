# DDD 受控生成与验证

仅在入口所列条件命中时读取本文件。Markdown 链接相对本文件；行内 references/assets/schemas 路径相对 Skill 根目录。Skill 自带的 bin/scripts 命令从 Skill 根目录执行；明确注明 repository root 的包装命令仍从项目根目录执行。

## 优先流程

1. 确认服务级 `scaffold_request_id`、已通过 `gate.backend-architecture-platform-approved` 的 `domain-driven` 架构与精确 Spring Boot 版本选择及 digest、项目名、基础包名、Maven 项目坐标、父 POM GAV、YSS Components BOM 版本、输出目录和批准 Profile。Java `base_package` 与 Maven `group_id` 是两个独立输入，不得相互推导；脚手架发生在 Ticket 正式化前，不使用 `slice_id` 伪造切片身份。
   Harness 内默认以 `apps/backend/` 为输出父容器，生成器以 `project_name` 创建具体项目；其他父目录按合同中的实际项目根和写范围核验。
2. 按 [Maven settings 与工程检查](engineering-checks.md) 核验已有显式配置或用户目录的 settings；缺少可用配置时先询问用户文件路径或必要仓库信息。优先运行 `node scripts/generate_and_verify_scaffold.mjs`，在同一个受控工作流中生成骨架并执行真实 Maven 验证。`generate_scaffold.mjs` 只是底层生成原语，单独返回 0 不代表脚手架完成。
3. 检查生成的模块名、POM、机械启动入口、基础配置文件和包路径。
4. 受控工作流必须在生成项目根目录实际执行 `./mvnw validate`、`./mvnw test` 和 `./mvnw package`；三条命令全部返回 0 后才能报告完成。
5. 三条 Wrapper 命令通过只得到 `empty-scaffold-verified`。如需声称已满足下游技能的首切片就绪条件，必须使用 `node scripts/run_first_slice_verification.mjs` 校验批准且版本当前的 Slice Implementation Contract、完整分层产物、当前合同 freshness 与根 Wrapper；只有验证器成功更新 Manifest 后才得到 `first-slice-verified`。

受控验证命令由本 skill 的 `node scripts/run_scaffold_verification.mjs` 固定执行；验证器先检查 `.yss/scaffold-generation.json` 的合同元数据、Wrapper 与所选 Maven settings，再在指定 evidence 目录写入配置来源、路径和摘要，以及每条命令的 stdout/stderr、`exit_code`、`failure_category`、耗时、执行时间和 `scaffold-verification.json`。用户 settings 自行提供仓库与认证时，无须重复配置模板环境变量；选择项目环境模板时仍核验相应变量。所选 settings 同时用于依赖核验与本地启动打包。仓库或凭据失败归为 `repository-access`，与 `project-model`、`compilation`、`bootstrap-entrypoint`、`test-failure`、`packaging` 分开；任何一条命令失败或未执行都必须阻断。
