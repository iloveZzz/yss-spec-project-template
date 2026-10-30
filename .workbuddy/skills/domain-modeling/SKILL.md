---
name: domain-modeling
description: 梳理项目的业务词汇、责任范围和关键决策；讨论术语、编辑 CONTEXT.md 或记录 ADR 时使用。
---

已核验 `matt-spec-v1` 的 Spec 工作不因 installation=governed 强制阶段政策、Context、ADR、研究包或批准套件。仅主动术语归档需要时维护已有 Context；缺失时可在规格整理候选，不自动建文件。当前任务使用技能内方法，真实审批由 life 消费决定，技术/API/实施资格留给下游。其他 Profile 保留各自实际合同。


# 业务词汇与关键决策

在设计过程中主动澄清业务词汇、责任范围和关键决策：质疑含糊说法，用边界与失败场景检验规则，并在结论稳定时写入词汇表或决策记录。仅仅读取 `CONTEXT.md` 不需要调用本技能；只有准备改变业务语言或关键决策时才使用。

## File structure

YSS repositories use exactly one root context file:

```
/
├── CONTEXT.md
├── docs/
│   └── adr/
│       ├── 0001-event-sourced-orders.md
│       └── 0002-postgres-for-write-model.md
└── src/
```

不要创建嵌套 `CONTEXT.md` 或 `CONTEXT-MAP.md`。多个业务责任区统一记录在根词汇表的 `适用业务责任区` 列中；内部仍使用稳定 `ContextId`。第一次确有必要记录 ADR 时再创建 `docs/adr/`。未启用治理的工程缺少根 `CONTEXT.md` 时，可在当前讨论或授权草稿中整理事实、候选词、规则和未决项；不因此阻断普通需求，也不自动建 Context。正式治理要求该文件时，缺失仍是合同错误，停止受影响生命周期工作；已有非法身份或不支持 Context 版本不能回退普通路径。

## During the session

### 对照词汇表检查冲突

When the user uses a term that conflicts with the existing language in `CONTEXT.md`, call it out immediately. "Your glossary defines 'cancellation' as X, but you seem to mean Y — which is it?"

### 澄清含糊语言

When the user uses vague or overloaded terms, propose a precise canonical term. "You're saying 'account' — do you mean the Customer or the User? Those are different things."

### 讨论具体业务故事

讨论业务关系时，用具体故事和失败案例检验它们，促使用户明确概念边界、规则责任和例外结果。

### Cross-reference with code

When the user states how something works, check whether the code agrees. If you find a contradiction, surface it: "Your code cancels entire Orders, but you just said partial cancellation is possible — which is right?"

### Update CONTEXT.md inline

当前任务允许维护词汇表、词义和适用责任区已确认时，及时更新现有根 `CONTEXT.md`，格式见 [CONTEXT-FORMAT.md](./CONTEXT-FORMAT.md)。普通草稿任务只更新指定草稿；只有用户要求归档稳定业务词汇且必要身份均有依据时才新建根 Context。不得猜 ContextId、将未决同义词写成确认，也不能默认填 Global；缺身份时保留在草稿并报告需要的决定。

`CONTEXT.md` 不得包含实现细节。不要把它当作 Spec、草稿区或实现决策仓库；它只是一份稳定业务词汇表。

### Offer ADRs sparingly

Only offer to create an ADR when all three are true:

1. **Hard to reverse** — the cost of changing your mind later is meaningful
2. **Surprising without context** — a future reader will wonder "why did they do it this way?"
3. **The result of a real trade-off** — there were genuine alternatives and you picked one for specific reasons

If any of the three is missing, skip the ADR. Use the format in [ADR-FORMAT.md](./ADR-FORMAT.md).
