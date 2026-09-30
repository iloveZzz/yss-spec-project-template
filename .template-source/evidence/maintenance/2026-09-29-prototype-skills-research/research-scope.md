# 低保真与高保真原型技能研究范围

本次为 `technical-evidence / evidence-audited`，工作单元 `work-unit.maintenance-research`。读者为 YSS 模板维护者，决策是下一轮应借鉴哪些方法及如何验证增益；研究不批准技能改造。

范围：当前 canonical 原型/设计技能、GitHub 原始技能仓库与 Google 官方设计技能、公开一手源码、实际 GitHub 元数据。优先累计 Stars >= 1000 的相关项目；官方来源及低保真专门方法可例外进入，明确区分关注量和方法适配度。排除镜像/聚合页作为结论证据、自动生成榜单、仅凭截图或介绍宣称效果，以及用整仓 Star 代替单个技能质量。阈值仅为本次取样口径，不是行业标准。

本轮以已有 YSS 企业后台、DESIGN.md、离线 HTML、状态矩阵与六轴 QA 为约束。采用源码审查验证“方法存在与适用边界”；不执行外部技能、不安装依赖、不运行真实 Agent 或用户可用性实验，不报告性能提升百分比。网页搜索用于发现，不声称 Google 排名或全量热门榜单；无增长序列，不声称近期增长率。

唯一允许写路径：`.template-source/evidence/maintenance/2026-09-29-prototype-skills-research/`。既有 dirty/untracked 工作保留。共享技能、投影、锁、分发快照、产品 Spec、原型、OpenAPI、Ticket、批准记录以及 Git 提交/推送不在写范围内。

影响面为研究文档 L1（textual-only）。已读取根 CONTEXT.md；`context_reconciliation.status=not-applicable`，因为模板源研究无业务词汇变更、产品批准或生命周期阶段流转。技术方法建议由后续 `maintaining-skills / yss-prototype-stage / yss-design-system / prototype-review` 维护单元消费。

两个 Explorer 只读任务包及运行观测位于 `/tmp/yss-prototype-skills-research-20260929/`。dispatcher 未传验证命令，因此 `verification_status=not-executed`；其快照观测不证明整个浏览期间无修改，子 Agent 自述也不替代主控核验。本研究的正式来源结论由主控重读固定源码后采用。

已知访问限制：GitHub 匿名 tree API 在元数据成功获取后出现 403；改用固定 SHA raw 读取；猜测路径的 404 保留为失败记录。所有第三方文件作为研究材料，内部安装命令及行为指令不被执行。引用许可为文件/API观察，不构成授权意见。
