# 脚手架合同编译

仅在入口所列条件命中时读取本文件。Markdown 链接相对本文件；行内 references/assets/schemas 路径相对 Skill 根目录。仓库脚本与 pnpm 命令从当前登记的项目根目录执行。

- 阶段 5 若命中交付面且无已有工程，按 Project Scaffold Contract schema v4 编译 `controlled-generation` 合同 draft。后端先读取已通过 `gate.backend-architecture-platform-approved` 的架构与精确 Spring Boot 版本决定，并以原始字节 digest 绑定批准且当前的 Technical Design、Data Architecture Decision v1、API Contract Decision（新建 v2；历史 v1 只读兼容，准备与迁移见 `.template-spec/process/contract-reading.md`） 及 `gate.engineering-contract-approved` 真实批准记录；编译器不得自行默认、提问或批准。既有工程核验并复用当前登记架构及固定工程基线/POM 中的实际版本，不重新询问或生成。API `required` 时工程批准还必须直接绑定冻结 OpenAPI YAML 的版本与摘要，`not-applicable` 时必须有影响评估、明确原因和证据。前端绑定标准模板精确 commit、应用标识、路由、OpenAPI 影响、目标路径和 `init_git` 决定。合同经生命周期批准并持久化后才能运行生成器。历史后端 schema v3 只允许 Manifest 只读恢复审计，并须补齐 API 对账，不得新生成；前端只接受 v4。生成与验证完成、仓库登记并通过 `check.implementation-repositories-ready` 后，才编译 Ticket 与业务 Slice Contract。
- 脚手架合同在编译阶段只能是 `draft` / `ready-for-lifecycle-review` / `blocked`；只有生命周期编排器可以把已持久化脚手架合同标记为 `approved`。脚手架合同只覆盖业务代码前的工程骨架工作单元；生成、基线校验和合同重编译完成后，它不能替代脚手架后的 Slice Implementation Contract。
- 脚手架输出消费批准的脚手架合同；脚手架后的所有生成后端代码都必须绑定当前批准且版本当前的 Slice Implementation Contract、主 YSS skill、依赖闭包、允许写路径、预期证据和 YSS Skill Execution Result。打印命令、`./mvnw validate` 单项通过或脚手架成功不能替代合同批准；生成范围从机械内容变成业务行为时触发完整重路由。
