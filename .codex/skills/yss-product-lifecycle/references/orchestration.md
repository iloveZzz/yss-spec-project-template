# 编排执行协议

## 有界推进循环

1. 识别模式、仓库身份、任务规模和影响面。
2. `setup readiness`：核对 tracker、五态标签和领域文档布局。
3. 加载父 Ticket/checkpoint 与真实资产，计算最近可信阶段。
4. 评估资产、门禁和 `stale`，选择第一个未阻塞工作单元。
5. 调用一个最小 Matt/YSS 专项 skill，验收输出并回写状态与证据。
6. 若仍在授权和自动推进边界内，回到第 3 步；否则暂停。

不要仅输出下一个提示词后结束 `orchestrate`/`resume`。不要因进入业务代码阶段而退出主控；应把实现交给专项 skill，并在返回后继续核验。

## Setup readiness

| 状态 | 判定 | 动作 |
|---|---|---|
| `ready` | tracker、标签和领域布局兼容 | 继续 |
| `missing` | 必要配置缺失 | 路由 `setup-matt-pocock-skills` |
| `conflict` | 持久配置、主远端或真实标签不一致 | 暂停并提出迁移方案，不覆盖 |
| `degraded` | 目标平台不可用 | 建本地待发布草案，不改投平台 |
| `not-applicable` | `template-source` | 只验证模板契约 |

真实 tracker 标签也必须检查；仅有 `docs/agents/triage-labels.md` 不代表远端标签存在。

tracker 冲突按 `docs/agents/issue-tracker.md` 裁决：用户明确选择优先，其次是当前实现/管理仓库的主远端；凭据不可用时降级为本地待发布草案，不自动改投其他平台。恢复前记录最终平台、真实五态标签检查结果和待发布草案位置。

## 必须暂停

- Spec baseline、需求冻结、原型确认、OpenAPI Freeze、Architecture Review 或安全红线等待人工裁决。
- 需要目标仓库、外部凭据、发布窗口或其他新授权。
- 状态与证据冲突且无法可靠重建。
- 专项 skill 失败或返回不可验收结果。
- 即将作出可合并、可发布或完成结论。

暂停输出：门禁、证据、责任人、推荐答案、一个问题、恢复动作。

## Wayfinder 完成判定

“无 frontier”不等于完成。只有以下条件同时成立，才能 `wayfinder → handoff → to-spec`：

- open child tickets 为 0；
- 不存在 open blocked 或 open claimed child ticket；
- `Not yet specified` 无剩余 fog；
- destination 已清晰。

Decision ticket 产生决策，不是实现切片，不得标记 `ready-for-agent`。

## `grill-with-docs` 退出判定

进入 `to-spec` 前必须区分已确认项与未决项，并确认用户、问题、MVP、非目标、成功标准、术语/ADR 候选和测试 seam。事实问题走 `research`；需 runnable 反馈的问题走 `handoff → prototype → handoff`。存在未回流 blocker 时不得进入 Spec baseline。

Prototype 回流必须有可核验证据：来源 handoff、prototype 资产或运行记录、结论、被更新的 Spec/设计/ADR/Ticket 引用、剩余未决项和返回 handoff。仅在对话中声称“已验证”不算回流完成。
