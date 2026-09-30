# DDD 受控生成与验证

仅在入口所列条件命中时读取本文件。Markdown 链接相对本文件；行内 references/assets/schemas 路径相对 Skill 根目录。Skill 自带的 bin/scripts 命令从 Skill 根目录执行；明确注明 repository root 的包装命令仍从项目根目录执行。

## 优先流程

1. 确认服务级 `scaffold_request_id`、已通过 `gate.backend-architecture-platform-approved` 的 `domain-driven` 架构与精确 Spring Boot 版本选择及 digest、项目名、基础包名、Maven 项目坐标、父 POM GAV、YSS Components BOM 版本、输出目录和批准 Profile。Java `base_package` 与 Maven `group_id` 是两个独立输入，不得相互推导；脚手架发生在 Ticket 正式化前，不使用 `slice_id` 伪造切片身份。
   Harness 内输出目录必须是 `apps/backend/` 容器，生成器再以 `project_name` 创建 `apps/backend/<project>/`；禁止使用 `app/backend/`、`app/frontend/` 或把 `apps/backend/` 之外的容器根当作后端项目根。
2. 优先运行 `node scripts/generate_and_verify_scaffold.mjs`，在同一个受控工作流中生成骨架并执行真实 Maven 验证。`generate_scaffold.mjs` 只是底层生成原语，单独返回 0 不代表脚手架完成。
3. 检查生成的模块名、POM、机械启动入口、基础配置文件和包路径。
4. 受控工作流必须在生成项目根目录实际执行 `./mvnw validate`、`./mvnw test` 和 `./mvnw package`；三条命令全部返回 0 后才能报告完成。
5. 三条 Wrapper 命令通过只得到 `empty-scaffold-verified`。如需声称已满足下游技能的首切片就绪条件，必须使用 `node scripts/run_first_slice_verification.mjs` 校验批准且版本当前的 Slice Implementation Contract、完整分层产物、当前合同 freshness 与根 Wrapper；只有验证器成功更新 Manifest 后才得到 `first-slice-verified`。

受控验证命令由本 skill 的 `node scripts/run_scaffold_verification.mjs` 固定执行；验证器先检查 `.yss/scaffold-generation.json` 的合同元数据和 Wrapper、Java、项目级 Maven settings/profile、仓库凭据是否就绪，再在指定 evidence 目录写入每条命令的 stdout/stderr、`exit_code`、`failure_category`、耗时、执行时间和 `scaffold-verification.json`。仓库或凭据失败归为 `repository-access`，与 `project-model`、`compilation`、`bootstrap-entrypoint`、`test-failure`、`packaging` 分开；任何一条命令失败或未执行都必须阻断。
