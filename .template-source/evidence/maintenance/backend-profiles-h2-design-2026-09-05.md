# 后端架构 Profile 与 H2 验证基线

本记录持久化本任务 Q1–Q42 已由用户确认的设计；最新 H2 决策覆盖早先外部数据库脚手架矩阵。仓库为 `template-source`，产品 Spec、Ticket、OpenAPI 和 context_reconciliation 为 not-applicable：本轮维护可复用工具和合同，不创建产品资产。

## 已确认合同

- 架构族为 `domain-driven` / `layered-mvc`；Profile 为 `target-domain-model`、`layered-mvc-service`、`mvc-data-analysis-v1`。
- DDD 保留 domain/application/infrastructure/adapter/bootstrap；通用 MVC 核心 server/service/repository，按能力增加 adapter/client/feign-client；数据分析 MVC 固定 server/core/client/repository/adapter/feign-client。
- yss-domain 仅支持 DDD。现有 Application、Repository、Web 技能按 Profile 分诊并加载独立参考文件；组件规则共享。MVC 复杂领域行为触发架构复审，用户继续 MVC 时记录理由和残余风险。
- MVC service/core 拥有用例、事务和内部模型，允许 spring-tx，禁止 Spring MVC 和具体数据库依赖。repository 拥有数据库实现；adapter 只负责外部集成。数据分析 core 不依赖 client DTO；server 完成 wire/internal 转换。
- 通用 MVC 私有 DTO 位于 server，对外发布契约位于可选 client；数据分析 wire DTO 位于 client。结构校验在 HTTP 边界，业务规则在 service/core，HTTP 错误翻译和脱敏在 server。
- Registry 使用 backend.ddd-domain-behavior/ddd-persistence-mybatis/ddd-http-api 与 backend.mvc-service-behavior/mvc-persistence-mybatis/mvc-http-api。旧统一 Recipe deprecated/read-only；新合同拒绝，旧合同通过摘要漂移回编译器。
- architecture_family/profile、模块闭包和摘要贯穿工程基线、Manifest、Slice Contract、工作单元和执行结果；不同 Manifest kind 共享 architecture_identity schema。
- 数据分析初始化器 canonical ID 为 yss-mvc-data-analysis-project-initializer，旧 ID deprecated/read-only；生命周期持有正式服务初始化工作单元。父项目保留决策与引用；子项目独立 Git/project-instance/生命周期，并显式导入战略上下文。
- 所有脚手架固定 verification_database=h2、production_database=not-bound，不接受外部数据库参数。H2 只在显式 scaffold-local/测试中启用；普通启动无数据库绑定，本地验证关闭外部基础设施。除 H2 和既有框架外，不另引外部数据库驱动或数据源组件。
- 不生成业务 API、SQL、DDL、表、Mock 数据或空 schema/data 文件；移除 with-mock。生产数据库由后续批准的数据存储接入工作单元处理。
- 共享 MapStruct/Lombok 技能从基线读取 Java 版本，三个 Profile 均验证 Java 8 和 annotation processors/binding。Alibaba 通用规则共享，方言规则按数据库适用；平台覆盖记录在基线，安全强制项不豁免。
- 三个 Profile 的 CompatibilityProbe 仅在临时测试 fixture 中生成，覆盖完整 HTTP/业务/持久化、转换、校验、错误链路并执行 ./mvnw validate/test/package。模板验证通过才可晋升 supported；用户工程自己的业务首切片必须独立验证。
- first-slice verifier 使用共享核心和 Profile 专属规则。完整 skillUtils 继续锁定分发，由合同选择最小执行闭包。
- 旧项目不自动迁移；本轮不提交、不推送、不发布。当前工作区已有用户修改，按现有字节增量维护。

## 实施顺序与验收

1. 架构身份事实源、schema、Registry 与编译器：拒绝缺失身份、架构错配、旧 Recipe 和摘要漂移。
2. Skill Profile、Web 生成器及三类 H2 初始化链路：路径/依赖正确，正式输出无业务内容。
3. 生命周期、分发与首切片验证：各 Profile 的真实 Maven 证据；无法访问内部依赖时保留 draft 并记录阻塞。
4. 同步 canonical 投影、锁文件和子模板，执行专项检查及 verify-template-fast；按实际结果更新 L3 checkpoint。

当前状态：核心分流、H2 生成、MVC Skill 和双模板同步已落地；验收未全部闭合。实际证据与剩余工作见同目录 `backend-profiles-h2-checkpoint-2026-09-05.md`，不构成 implementation-ready 或 supported 声明。
