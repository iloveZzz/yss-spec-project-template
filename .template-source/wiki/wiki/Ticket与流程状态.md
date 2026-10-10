# Ticket与流程状态

Ticket 是追踪平台中承载功能生命周期或可实现工作单元的通用对象。主 tracker 由 `.template-spec/agents/issue-tracker.md` 持久化，当前模板默认使用 `local-markdown`，根路径为 `.work/`。

合格 `daily` 更新同一普通 Ticket/PR 的范围、验收、工程 / 基线、Skills、实际测试、独立审查和回滚，不生成阶段 checkpoint、正式 Slice 或 `ready-for-agent`。只读调查不创建任何 Ticket 或批准。

正式功能先建父 Ticket，汇总阶段资产、审查、阻塞与证据。业务 Ticket 表达用户行为和可验收结果；阶段工作项记录 Plan、Spec、Design 的有界工作；垂直切片 Ticket 承载可独立验证的实现范围。业务票与阶段工作项不授予 `ready-for-agent`，工作项进度也不替代阶段批准。

| Ticket 状态 | 含义 |
|---|---|
| `needs-triage` | 等待维护者评估 |
| `needs-info` | 等待报告者补充信息 |
| `ready-for-agent` | 必要门禁通过、阻塞边关闭，可直接实现的垂直切片 |
| `ready-for-human` | 资产需要指定数字人或生物人会签，或需要特权访问 |
| `wontfix` | 不会处理 |

Spec、设计、原型、OpenAPI Draft 与待冻结资产使用 `ready-for-human`。`to-tickets` 新建切片初始也使用这一状态；生命周期编排器核验完整就绪条件后，才能提升为 `ready-for-agent`。正式实现还需已批准、已持久化且当前的 Slice Implementation Contract，见 [[切片实现合同]]。

新项目 Local 功能包默认位于 `.work/<feature>/`；执行时解析唯一 `tracker.root`，旧实例沿用受支持的配置根。attach / sync 不移动业务资产，目录存在不能替代配置；缺失、非法或执行器不支持的根先诊断。`parent-ticket.md` 引用实际 checkpoint，`issues/NN-<slug>.md` 分别保存切片或子 Ticket；顶部 `Status:` 使用五态，`## Comments` 保存状态变化原因、证据和下一步。阶段工作项按需进入 `work-items/`，业务票进入 `business-tickets/`；当前执行进度由 checkpoint 持有。冻结合同绑定的需求文件保留冻结时状态，当前执行状态继续写主 tracker。

Git remote 只提供代码托管信息，不改变主 tracker。明确选择的 GitHub / GitLab 暂不可用时，在 Local 功能包保留目标平台，记录 `publication: pending` 与 `pending_publication_to`，恢复后补同步。平台变化不改变门禁、阻塞关系或实现就绪语义。

会签暂停、handoff、实现、合并和发布边界同步范围、证据、风险、会签点、Ticket 状态及下一步。Git checkpoint 只包含本轮范围；提交和推送须用户授权。独立审查和验证见 [[Fresh验证与独立审查]]。

## 来源

- `.template-spec/agents/issue-tracker.md`：1–42、63–84、144–152 行。
- `.template-spec/agents/triage-labels.md`：3–15 行。
- `CONTEXT.md`：46–52 行。
- `AGENTS.md`：5–7、11–19、34–38 行。
- `.agents/skills/yss-product-lifecycle/references/orchestration-contract.yaml`：205–226 行。
