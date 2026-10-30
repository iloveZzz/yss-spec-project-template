# Spec 工作入口

使用简体中文。当前工程使用 matt-spec-v1 非技术规格流程，按已确认目标和授权连续工作。

先读取 `.yss.json` 的身份与工作流声明及 `.template-spec/process/spec-workflow.json`，身份、来源或受管政策冲突时停止受影响写入，不猜身份或自动迁移。旧实例由人工迁移。

使用 yss-product-lifecycle 路由当前需要：事实由 yss-research 调查，业务决定用 grilling，术语歧义用 domain-modeling；已有讨论足够时直接综合规格。只读分析不初始化或保存。必要初始化和技能缺口在已有授权内自动补齐，缺引导能力时报告具体限制。

主 tracker 配置只读 `.template-spec/agents/issue-tracker.md`。本地 Markdown、GitHub Issues、GitLab Issues 分别作为选定主载体，不创建 Git PR 或正文同步镜像。to-spec 是用户显式入口，普通任务使用共享规格方法。

Spec 负责目标、业务规则、边界、异常、非目标、验收及必要产品设计。AI 按问题和风险选择设计深度，不要求完整原型。技术设计、API、实现切片和实现归下游；下游通过规格及材料引用消费，不固定 Backend，不建独立交接包。

不要求 Plan、checkpoint、阶段批准包或实现资格才能起草规格。仅实际需人工审批的动作取得真实决定，复用有效授权。保存、发布、业务批准和实施资格分别表达，未执行检查不报告通过。

不覆盖用户工作；冲突保留并报告。提交、推送、合并或发行须有对应授权。安装文件、宿主发现和实际调用分别核验，禁止绕过 user-only 限制。规格完成不关闭远程 Issue 或启动下游实现。
