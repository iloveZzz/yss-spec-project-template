# 编排执行协议

## 有界推进循环

1. 识别模式、仓库身份、任务规模和影响面。
2. `setup readiness`：每个任务只执行一次，核对 tracker、五态标签和领域文档布局，并在本轮缓存结果；仅在 tracker、主远端、真实标签或配置变化时重查。
3. 加载父 Ticket/checkpoint 与真实资产，计算最近可信阶段。
4. 评估资产、门禁和 `stale`，选择第一个未阻塞工作单元。
5. 调用一个最小 Matt/YSS 专项 skill，将结果归一化为 `Matt Skill Result`，验收输出并回写状态与证据。
6. 若仍在授权和自动推进边界内，回到第 3 步；否则暂停。

不要仅输出下一个提示词后结束 `orchestrate`/`resume`。不要因进入业务代码阶段而退出主控；应把实现交给专项 skill，并在返回后继续核验。

连续阶段自动推进时累积 Ticket 同步和 Git 判断证据，在人工暂停、handoff、进入实现、合并或发布边界集中 checkpoint。发生阻塞、责任人变化或资产需要单独批准时立即落 checkpoint，不因合并记录而丢失阶段因果关系。

## 阶段边界

Matt phase boundary 是工作阶段之间的上下文决策，不是新的生命周期状态。按以下顺序判断，第一项适用即停止判断：

1. **Continue**：下一阶段需要当前会话作为 primary source，或当前上下文仍在 smart zone 内。
2. **`/clear`**：当前探索、死路和决策对下一阶段完全无关。
3. **`/handoff`**：内容必须跨新 harness、新目录、同事或中途分叉的 side task 携带。
4. **Subagent**：工作单元边界清晰，可以在无人值守时完成并返回报告。
5. **`/compact`**：同一 harness、同一目录且上下文仍相关，但需要压缩后继续；它是最后选项。

在 checkpoint 记录 `phase_boundary.decision`；使用 `handoff`、subagent 或 `compact` 时同时记录契约要求的引用。phase boundary 不得改变生命周期阶段、门禁或 Ticket 五态。

## Setup readiness

Readiness 结果在同一任务内复用。只有 tracker、主远端、真实标签或配置发生变化，才重新执行检查；不得把 `setup-matt-pocock-skills` 当作每阶段或每工作单元的固定动作。

| 状态 | 判定 | 动作 |
|---|---|---|
| `ready` | tracker、Local `Status:` 或远程标签和领域布局兼容 | 继续 |
| `missing` | 必要配置缺失 | 路由 `setup-matt-pocock-skills` |
| `conflict` | 多个持久配置或真实标签/Local 状态互相矛盾 | 暂停并提出迁移方案，不覆盖 |
| `degraded` | 已选择的 GitHub/GitLab 不可用 | 建 `docs/.scratch/<feature>/` 待发布草案，不改投平台 |
| `not-applicable` | `template-source` | 只验证模板契约 |

远程 tracker 必须检查真实标签；Local Markdown 必须检查功能包目录和 Ticket 顶部的 `Status:`。仅有 `docs/agents/triage-labels.md` 不代表远程标签存在，也不能替代 Local 文件状态检查。

tracker 选择和冲突按 `docs/agents/issue-tracker.md` 裁决：已持久化 tracker 配置优先，本模板默认 `local-markdown`，Local root 为 `docs/.scratch/`；用户在初始化/迁移时明确选择 GitHub/GitLab 后才切换，Git remote 只代表代码托管。Local 主 tracker 不要求远程 Ticket；只有已选择远程平台但凭据不可用时，才降级为 `docs/.scratch/<feature>/` 待发布草案，不自动改投其他平台。发现根 `.scratch/` 或 `docs/requirements/tickets/` 旧资产时，保留 `migration_ref` 并暂停写入；新旧路径同时存在时返回 `conflict`。恢复前记录最终平台、真实五态标签或 Local `Status:` 检查结果和草案位置。

## Matt flow 进入条件

- `to-spec` 只能在 `grill-with-docs` 退出条件满足且没有未回流 runnable blocker 时进入；产物默认为 `ready-for-human`。
- `to-tickets` 只能在 OpenAPI Freeze 或无 API 影响记录完成后进入，并且只能生成垂直切片 Ticket。
- `implement` 无论是多会话还是单会话，都必须满足 `ready-for-agent` 公式、批准并持久化的 Slice Implementation Contract 和 Build Architecture Checklist。
- Matt Result 出现 `drift`、`new_impacts`、`stale_candidates`、`violation`、`missing_evidence`、空 `evidence_refs` 或缺少必需字段时暂停当前工作单元。

## 审查与验证

- 小改动和中等变更可由同一独立执行者完成 `code-review` 与 fresh verification，并在同一报告中分别记录 findings、命令、结果和残余风险。
- 该执行者必须独立于实现者；新模块、高风险变更、职责冲突或需双人控制时，Reviewer 与 Verifier 分开。
- `code-review` 是唯一默认代码审查 skill。GitLab、CI、Sonar、Alibaba Java 等治理事实作为仓库规则或专项检查输入，不再叠加第二个通用审查 skill。

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

Matt `prototype` 的回流还必须注明 `prototype_branch`，并保留单文件 HTML 主来源；YSS 高保真 HTML 原型另走阶段 4 的评审、AntD CLI 校验和用户确认，不得用 throwaway prototype 替代。

`to-questionnaire` 未收到答案时使用 `external-input-required` 暂停，记录问卷、接收人、所需输出和恢复路由；收到答案后记录 response、重新分类影响面和更新后的权威资产，再回到 `grill-with-docs` 或 `to-spec`。

Release 与 Retrospective 属于生命周期编排器拥有的工作单元。发布和复盘前都必须重新取得 fresh verification；发布还需要发布/回滚证据和独立审查，复盘还需要复盘记录和治理回流判断，再回流权威资产。
