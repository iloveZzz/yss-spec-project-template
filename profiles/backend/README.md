# Backend 技能覆盖层

Backend 的 `project` 与 `skills` 两种安装均预装 41 项技能，可用库共 53 项，其余 12 项按需补装。共享源与本目录覆盖按文件合成，安装数量和内容由实际运行 CLI 的 Bundle 决定。

承接 Spec 的业务规则、验收与产品原型说明，完成所需拆分、架构/技术/详细设计、脚手架、开发、测试和构建部署手册。`implement` 组织当前研发任务，`to-tickets` 细化实现 Slice，`yss-technical-design` 统一设计深度，`yss-backend-testing` 负责一般测试。DDD 内部建模才使用 `yss-tactical-design`；MVC 保留既有 Service 边界。Backend `prototype` 只验证技术假设，不承担产品 UI。

按任务选择已安装能力，局部修复只完成受影响部分；TDD 仅在明确要求测试优先时采用。完整交付优先更新既有 README/运维说明，结构参考 `.template-spec/templates/build-deploy-guide-template.md`；部署只交付手册，不创建 CI/CD、云资源或执行部署。无需阶段门禁、合同资格或统一测试报告。

入口见 `AGENTS.md`；专有技能源为 `.agents/skills`，WorkBuddy 为 `.workbuddy/skills` 的有效完整副本。根 `./mvnw` 优先，保留业务权限、校验、事务、错误处理与文件保护。提交、推送、PR/MR、发布、交接和索引写入沿用对应动作授权；预装和读取方法本身不授权这些动作。
