---
name: domain-modeling
description: 梳理项目的业务词汇、责任范围和关键决策；讨论术语、编辑 CONTEXT.md 或记录 ADR 时使用。
---

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

不要创建嵌套 `CONTEXT.md` 或 `CONTEXT-MAP.md`。多个业务责任区统一记录在根词汇表的 `适用业务责任区` 列中；内部仍使用稳定 `ContextId`。第一次确有必要记录 ADR 时再创建 `docs/adr/`。YSS 仓库缺少根 `CONTEXT.md` 属于合同错误，必须先修复再继续生命周期工作。

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

When a term is resolved, update `CONTEXT.md` right there. Don't batch these up — capture them as they happen. Use the format in [CONTEXT-FORMAT.md](./CONTEXT-FORMAT.md).

`CONTEXT.md` 不得包含实现细节。不要把它当作 Spec、草稿区或实现决策仓库；它只是一份稳定业务词汇表。

### Offer ADRs sparingly

Only offer to create an ADR when all three are true:

1. **Hard to reverse** — the cost of changing your mind later is meaningful
2. **Surprising without context** — a future reader will wonder "why did they do it this way?"
3. **The result of a real trade-off** — there were genuine alternatives and you picked one for specific reasons

If any of the three is missing, skip the ADR. Use the format in [ADR-FORMAT.md](./ADR-FORMAT.md).
