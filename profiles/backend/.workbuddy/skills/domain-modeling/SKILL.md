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

不要创建嵌套 `CONTEXT.md` 或 `CONTEXT-MAP.md`。多个业务责任区统一记录在根词汇表的 `适用业务责任区` 列中；内部仍使用稳定 `ContextId`。第一次确有必要记录 ADR 时再创建 `docs/adr/`。工程缺少根 `CONTEXT.md` 时，可在当前讨论或授权草稿中整理事实、候选词、规则和未决项；不因此阻断普通需求，也不自动建 Context。实际写入遇到身份冲突或不支持的 Context 版本时，仅暂停受影响写入并说明缺口；其他讨论继续，不借普通草稿绕过身份校验。

### 提问前查找既有决定

先用根 `CONTEXT.md`、原 Spec 的相关条款和当前有效答复核对词义及适用责任区。已有决定能裁决行为时，引用具体出处。若两种解释会改变权限、判定时点或动作结果，而这些材料仍不足，按项目根 `.template-spec/agents/issue-tracker-operations.md` 的「查找既有业务决定」查阅相关工单。即使没有票号，也按需搜索本项目已配置、可读取的工单，包括已关闭项。

同一个词确实指向不同业务对象时，用各自已确认的名称说明区别。遇到含糊的名称，按适用责任区提出具体称谓及依据。本次需要确定稳定术语而词义或身份仍不明时，围绕该分歧确认。涉及业务结果时，用一个能区分两种解释的场景提问。

### 讨论具体业务故事

讨论业务关系时，用具体故事和失败案例检验概念边界、规则责任和例外结果。例如，事项已转交乙，甲再从旧页面撤回。沿原条款找出判权时点。若要区分提交与处理，可让甲先提交、转交随后生效，再判断系统处理撤回时谁有资格。只有不同解释会改变结果且依据不足时，才带着两种结果请业务方决定。

规则跨业务责任区时，按已有 `ContextId` 区分两端术语及其含义。用一个真实动作核对谁维护权威事实、谁在什么时点采用它、过期或无法读取时允许什么结果。按本次写入授权把稳定词义归入根词汇表，把行为和例外落在原规则或验收。工程侧字段、事件或调用方式由现有设计承接。只有两端的含义及适用条件确实一致，才使用已有的共享术语身份。

### Cross-reference with code

核对代码怎样实现该行为。若适用的业务决定清楚，指出偏差及受影响的场景。若两项仍有效的业务决定互相冲突，带上双方出处和一个结果会不同的例子请业务方裁决。

### Update CONTEXT.md inline

当前任务允许维护词汇表、词义和适用责任区已确认时，及时更新现有根 `CONTEXT.md`，格式见 [CONTEXT-FORMAT.md](./CONTEXT-FORMAT.md)。普通草稿任务只更新指定草稿；只有用户要求归档稳定业务词汇且必要身份均有依据时才新建根 Context。不得猜 ContextId、将未决同义词写成确认，也不能默认填 Global；缺身份时保留在草稿并报告需要的决定。

`CONTEXT.md` 不得包含实现细节。不要把它当作 Spec、草稿区或实现决策仓库；它只是一份稳定业务词汇表。

### Offer ADRs sparingly

Only offer to create an ADR when all three are true:

1. **Hard to reverse** — the cost of changing your mind later is meaningful
2. **Surprising without context** — a future reader will wonder "why did they do it this way?"
3. **The result of a real trade-off** — there were genuine alternatives and you picked one for specific reasons

If any of the three is missing, skip the ADR. Use the format in [ADR-FORMAT.md](./ADR-FORMAT.md).
