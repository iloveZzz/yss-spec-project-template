# 退役实施记录

本轮已完成本地退役与能力承接。范围包括模板源、三个专职 Agent 源仓库和四个 CLI 工作树快照；尚未提交、推送或发布本轮变更，不声明可发布。

## 退役与承接

| 项目 | 结果 |
|---|---|
| wait-what | 移除独立 Skill，回到普通解释与写作规范 |
| grill-with-docs | 移除兼容包装，需求澄清与 Context 对账进入生命周期原生工作单元 |
| to-questionnaire | 移除独立入口，问卷与 external-input-required 暂停、答案回流保留在生命周期 reference |
| improve-codebase-architecture | 能力并入 codebase-design 显式审计模式，保留可选 HTML 报告，不隐式授权重构 |
| Data Analytics | 从根模板与 frontend 平台分发移除；不卸载用户全局插件 |
| frontend-commit / java-backend-commit | 保留专项入口，公共授权、暂存保护与 hook 规则进入默认不可发现的 git-commit-core；类型化依赖已登记 |
| prototype | 保留逻辑与状态试验，移除 UI 分支；backend 保持自身试验策略且不引入前端技能 |
| domain.md | 消费规则并入根 CONTEXT.md，删除重复说明并更新 setup 与 CLI 阶段资产清单 |
| 旧流程及 Recipe | 移除架构固定三方案、评分阈值和额外签字流程；生成器不再把三个 deprecated backend Recipe 列为推荐，注册与拒绝语义保留 |
| instantiate-harness | 改为无目标写入、非零退出的退役提示；仅在真实安装、init 和 doctor 通过后启用 |

根模板现为 77 个共享 Skill、1 个平台包；design / backend / frontend 分别为 23 / 59 / 54 个共享 Skill。权威目录、投影、锁、profile 补丁、角色路由、公开导出及四个 CLI 快照已同步。旧路线文档字节保持不变，不作为当前发布权威。

## 验证

- [最终综合报告](verification-closure/report.json)：fast 因核心改动升级为 release，96 项命令通过；唯一失败是 `scripts/verify-strategic-handoff-tools-lock --require-committed`。输入前后未漂移。该门禁导致 4 项后续检查未执行，原始报告保留失败状态。
- 4 项检查已[单独补跑](result.json)并通过。其中修正了 root / design 测试清单中的脚本更名引用；没有降低原检查覆盖。此修正后的 design 快照已重建并通过 bundle 校验。
- Node 工具链 147/147；create-yss-spec 完整套件 200/201，唯一失败为要求 committed 快照的 prepack 测试。最新快照上的 11/11 分发回归通过，覆盖退役请求不写入、Context 消费规则、提交技能最小依赖、幂等、冲突保护及回滚。
- design、backend、frontend 真实包测试分别 1/1、1/1、2/2，通过初始化、接入、诊断、同步及家族边界验证。专职入口、注册表、集成场景、根投影、锁、派生视图及 33 个公开 Skill 导出检查通过。
- 全局 npm 12.1.0 的打包 JSON 输出不符合现有发布集成断言；使用 Node 24.21.0 自带 npm 11.19.0 后该套件 5/5 通过。未修改全局配置或放宽断言。
- 验证器读取大归档的 2 GiB 问题改为分块计算相同摘要；空文件、跨块数据回归通过。原归档未修改。

## 边界与后续

旧初始化入口提示的 backend 0.4.7 / frontend 0.3.7 已真实安装、初始化并通过 doctor，证实替代创建功能可用；这些已发布版本不代表本轮退役变更已发布。本轮四个新快照均为 working-tree，已提交来源门禁与最终打包发布仍待授权提交后重新验证。

未迁移用户实例、未修改历史审批或卸载全局插件。存量同步仍应先预览，保留用户修改并报告冲突。两个忽略的 Python 缓存文件留存在基线记录的外部备份目录；无业务资产被删除。工作期间其他任务提交的来源记录与历史验证证据未纳入本轮交付提交。

本次维护者自检与验证为 L3；未创建产品 Spec、Ticket 或伪造独立审查、发布批准。回退应按[本轮文件摘要](final-source-manifest.json)恢复具体源文件并重生成投影与快照，避免覆盖其他工作。

执行明细见 [机器结果](result.json)、[最终不变量核对](validation/final-invariants.json)和 [验证日志](validation/)；原始报告中的绝对运行路径对应同目录归档的 logs，保留原字节以便审计。
