---
name: yss-product-lifecycle
description: Use when starting, continuing, auditing, or routing a YSS product/module/change across Discovery, Spec, design, OpenAPI, architecture, Tickets, implementation, review, release, or retrospective; or when lifecycle assets, gates, Matt flows, YSS skills, or readiness are unclear.
---

# YSS Product Lifecycle

YSS 产品研发的全生命周期主控编排器。它决定阶段、条件门禁、状态和工作顺序；Matt skills 提供通用工作流，YSS skills 提供专项实现规则。编排器持续主控，但不得绕过专项 skill 直接规定业务实现。

## 启动

1. 读取根目录 `yss-project.yaml`；非法或缺失时停止并进入迁移检查。
2. 读取 `CONTEXT.md`、相关 ADR、父 Ticket/checkpoint、当前资产与 tracker 配置。
3. `template-source` 只走模板维护流程；不得生成具体产品 Spec、原型、OpenAPI 或切片 Ticket。
4. `project-instance` 以 `docs/process/lifecycle-artifact-map.md` 和 `docs/process/harness-process-tailoring.md` 为阶段、门禁和裁剪事实来源。

YSS 仓库以本 skill 为直接入口，不机械嵌套调用 `ask-matt`。`ask-matt` 仅在用户显式调用时作为 Matt 通用导航，且不得修改 Matt skills。

## 选择模式

| 请求 | 模式 | 副作用 |
|---|---|---|
| “该怎么做/下一步” | `route` | 只读 |
| “推进/完成” | `orchestrate` | 在授权范围内有界推进 |
| “继续之前工作” | `resume` | 先重建并核验状态，再有界推进 |
| “是否可开发/合并/发布” | `audit` | 严格只读，不顺带修复 |

用户显式模式优先；无法判断时用 `route`。执行协议见 [orchestration.md](references/orchestration.md)。

## 核心规则

- 保留 8 个主阶段；21 个门禁全部按影响面条件强制。命中项必须达到 `approved`，未命中项记录 `not-applicable` 和原因。
- 有效 `yss-project.yaml` 存在时，`ask-matt` 和 `setup-matt-pocock-skills` 只能作为子流程；最终入口、仓库身份和模式裁决归本编排器。
- `template-source` 命中产品 flow 时必须返回 `blocked`（`template-source-product-artifact-forbidden`），不得继续到产品资产或 Ticket 生成。
- 文件存在不等于就绪。按内容、审查结论和上游新鲜度评估资产。
- 父 Ticket/checkpoint 的状态只是索引；与真实资产冲突时，以权威资产为准并修复索引。
- 上游变化按依赖图精准传播 `stale`；不要无条件重跑完整阶段。
- Matt 五态保持原义。只有解除阻塞、门禁通过且可直接实现的垂直切片才能使用 `ready-for-agent`。
- `orchestrate`/`resume` 连续执行安全工作单元，直到人工门禁、真实阻塞、新授权、实现/发布裁决或专项失败。
- 进入实现后继续主控，通过 `yss-router`、`implement`、`tdd` 和 YSS 专项 skills 执行；独立审查和 fresh verification 后才能作完成判断。
- Setup readiness 每个任务只评估一次并在本轮缓存；只有 tracker、主远端、真实标签或配置变化时重查。
- 小改动和中等变更允许同一独立执行者完成 Review 与 fresh verification；该执行者不得是实现者。新模块、高风险或职责冲突时拆分 Reviewer 与 Verifier。
- 连续自动推进期间累积 Ticket/Git 证据，在人工暂停、handoff、进入实现、合并或发布边界集中 checkpoint；不为每个连续经过的概念阶段重复写同类记录。
- 跨线程、仓库、原型分支或上下文边界时使用 `handoff` 或等价记录。
- 在 Matt 阶段边界（phase boundary）先按 `Continue → /clear → /handoff → subagent → /compact` 判断上下文动作；只在 checkpoint 记录可选 `phase_boundary` 证据，不新增生命周期状态。
- `to-questionnaire` 进入结构化 `external-input-required` 暂停；回答回流后必须重新分类影响面并更新权威资产，不能直接恢复下游实现。
- `wait-what` 只重新解释当前结论，不改变阶段、门禁、Ticket 或 `ready-for-agent` 状态；`wizard` 只处理人工才能完成的步骤，默认临时使用，秘密值不得进入持久化输出。
- Matt `prototype` 是保留在 `prototype/<name>` 分支的单文件可分享 HTML 主来源；YSS 高保真 HTML 原型仍必须经过 Prototype Review、AntD CLI 校验和用户确认，两者不得互相替代。
- Matt skill 返回结果必须先归一化为 `Matt Skill Result`；`drift`、`new_impacts`、`violation`、`stale_candidates`、缺失证据或不完整结果不得推进为 `completed`。

状态和依赖规则见 [state-model.md](references/state-model.md) 与 [artifact-dependencies.md](references/artifact-dependencies.md)；Matt/YSS 对应见 [matt-yss-adapter.md](references/matt-yss-adapter.md)。
机器可执行的模式、readiness、Wayfinder、影响传播和回流字段见 [orchestration-contract.yaml](references/orchestration-contract.yaml)。说明文档与该契约冲突时必须暂停并修订权威资产，不得猜测。

## 输出

始终输出：模式、当前阶段、影响面、证据、资产/门禁状态、阻塞项、本轮动作、下一工作单元、暂停或继续理由、Ticket 同步和 Git checkpoint 判断；调用 Matt skill 时追加 `Matt Skill Result`。

暂停时只提出一个具体人工决策，并给出推荐答案与确认后的恢复动作。`audit`/`route` 不得写文件、Ticket、标签或 Git。
