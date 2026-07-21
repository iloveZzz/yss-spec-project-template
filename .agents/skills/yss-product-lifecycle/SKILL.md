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
- 文件存在不等于就绪。按内容、审查结论和上游新鲜度评估资产。
- 父 Ticket/checkpoint 的状态只是索引；与真实资产冲突时，以权威资产为准并修复索引。
- 上游变化按依赖图精准传播 `stale`；不要无条件重跑完整阶段。
- Matt 五态保持原义。只有解除阻塞、门禁通过且可直接实现的垂直切片才能使用 `ready-for-agent`。
- `orchestrate`/`resume` 连续执行安全工作单元，直到人工门禁、真实阻塞、新授权、实现/发布裁决或专项失败。
- 进入实现后继续主控，通过 `yss-router`、`implement`、`tdd` 和 YSS 专项 skills 执行；独立审查和 fresh verification 后才能作完成判断。
- 跨线程、仓库、原型分支或上下文边界时使用 `handoff` 或等价记录。

状态和依赖规则见 [state-model.md](references/state-model.md) 与 [artifact-dependencies.md](references/artifact-dependencies.md)；Matt/YSS 对应见 [matt-yss-adapter.md](references/matt-yss-adapter.md)。
机器可执行的模式、readiness、Wayfinder、影响传播和回流字段见 [orchestration-contract.yaml](references/orchestration-contract.yaml)。说明文档与该契约冲突时必须暂停并修订权威资产，不得猜测。

## 输出

始终输出：模式、当前阶段、影响面、证据、资产/门禁状态、阻塞项、本轮动作、下一工作单元、暂停或继续理由、Ticket 同步和 Git checkpoint 判断。

暂停时只提出一个具体人工决策，并给出推荐答案与确认后的恢复动作。`audit`/`route` 不得写文件、Ticket、标签或 Git。
