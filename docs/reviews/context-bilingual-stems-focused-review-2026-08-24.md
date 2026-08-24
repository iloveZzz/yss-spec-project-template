# CONTEXT 英文标识词干聚焦审查

Status: `ready-for-human`

## 范围与分级

- 强度：L2
- 触发：`local-rule`、`template-structure`
- 理由：`CONTEXT.md` 表头与分区改变统一语言契约；`AGENTS.md` 改变 Agent 对业务术语英文词干和代码 / 契约命名的读取路径。未改生命周期门禁、Ticket 状态、生成语义、发布语义或 `verify-template` 核心校验器。
- 变更资产：`CONTEXT.md`、`AGENTS.md`、`docs/agents/domain.md`、相关模板与用户指南、wiki raw / 命中文章
- 未变更：`.agents/skills/**` skill 正文、`skills-lock.json` 语义（wiki 仅对齐已有 live 中的 `yss-antd-design` 摘录）、ADR
- escalation: `none`

## 最小反例

`docs/reviews/context-bilingual-stems-counterexample-2026-08-24.txt`

改前 `CONTEXT.md` 只有三列和 `## 术语表`；`AGENTS.md` 第 3 节不要求 PascalCase `英文标识`。

## Fresh verification

`docs/reviews/context-bilingual-stems-fresh-verification-2026-08-24.txt`

`scripts/verify-template` 输出 `模板发布校验通过`。未新增 CONTEXT schema lint。

## 聚焦独立审查清单

请非实施者确认：

- [ ] `英文标识` 是 PascalCase 词干，不是英语释义；流程术语可空为 `—`，业务术语必填。
- [ ] 模板源 `## 业务术语` 没有虚构产品行。
- [ ] 变形规则只在 `CONTEXT.md` 文首定义；`AGENTS.md` 只留硬门禁指针，未复制第三套规则。
- [ ] 未把类全名、表名、接口路径写进词汇表；工程后缀仍以 YSS skill 为准。
- [ ] 未改 `domain-modeling` 的 `CONTEXT-FORMAT.md`，也未改其他 skill 正文。
- [ ] 未把新校验接入 `scripts/verify-template`，未宣布可发布。
- [ ] Spec / Ticket / 审查模板只引用词干追溯，没有新开生命周期门禁。

独立审查完成前，本记录保持 `ready-for-human`。`docs/reviews/context-bilingual-stems-l2-checkpoint-2026-08-24.yaml` 仅用于 schema 校验，`escalation` 已写明不得当作 L2 通过；非实施者勾选本清单前，不声称可合并或可发布。
