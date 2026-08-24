# CONTEXT 英文标识词干聚焦审查

Status: `Approved`

审查者：非实施者（focused-independent）
固定点：`7f6158b5f4997c81ebc0440366938a6d37484d76`（main）
候选：`3a855f8d9df5ad96d9daf55dfbb493ff77ba16f9`（HEAD）
结论：Approved

本结论只覆盖 L2 聚焦清单。不是模板发布裁决，不是合并裁决，不得声称可发布。

## 范围与分级

- 强度：L2
- 触发：`local-rule`、`template-structure`
- 理由：`CONTEXT.md` 表头与分区改变统一语言契约；`AGENTS.md` 改变 Agent 对业务术语英文词干和代码 / 契约命名的读取路径。未改生命周期门禁、Ticket 状态、生成语义、发布语义或 `verify-template` 核心校验器。
- 变更资产：`CONTEXT.md`、`AGENTS.md`、`docs/agents/domain.md`、相关模板与用户指南、wiki raw / 命中文章
- 未变更：`.agents/skills/**` skill 正文、`skills-lock.json` 语义（wiki 仅对齐已有 live 中的 `yss-antd-design` 摘录）、ADR、`docs/process/lifecycle-registry.yaml`、`scripts/verify-template`
- escalation: 非实施者已在候选 `3a855f8` 完成 focused-independent 审查，结论 Approved；不得声称可发布

## 最小反例

`docs/reviews/context-bilingual-stems-counterexample-2026-08-24.txt`

审查者对照 `git show 7f6158b:CONTEXT.md` 文首与 `git show 7f6158b:AGENTS.md` 第 3 节：改前只有 `## 术语表` 三列；`AGENTS.md` 第 3 节最后一条仅为「实施前读取 `CONTEXT.md`」，不要求 PascalCase `英文标识`。反例与固定点一致。不把实施者自述当作证据。

## Fresh verification

`docs/reviews/context-bilingual-stems-fresh-verification-2026-08-24.txt` 记录实施者在 `de5a8f1` 跑过 `scripts/verify-template`。本审查**不采信**该自述作为完成证据。

本审查实际核对：`scripts/verify-template` 相对固定点无 diff；证据文件与审查正文均未宣布可发布。审查者只改了本文件与 checkpoint YAML。编排器应在本次写入后重新执行 `scripts/verify-template`，作为覆盖审查文档的 fresh verification。

## 聚焦独立审查清单

- [x] `英文标识` 是 PascalCase 词干，不是英语释义；流程术语可空为 `—`，业务术语必填。
  - 通过。`CONTEXT.md:5` 定义「PascalCase 词干，不是英语释义」；`CONTEXT.md:11` 规定流程术语填 `—`、不回溯补译；`CONTEXT.md:80` 规定业务术语每一行必须有 PascalCase `英文标识`。`## 流程术语` 共 62 行（`CONTEXT.md:15-76`），`英文标识` 列全部为 `—`，无英语释义填入该列。
- [x] 模板源 `## 业务术语` 没有虚构产品行。
  - 通过。`CONTEXT.md:78-80` 仅有节标题与「模板源不放虚构业务行」说明，无表行。用户指南示例（如 `docs/user-guide/产品生命周期工作流.md`）明确标注「不要把虚构行写入模板源 `## 业务术语`」。
- [x] 变形规则只在 `CONTEXT.md` 文首定义；`AGENTS.md` 只留硬门禁指针，未复制第三套规则。
  - 通过。完整变形（类名 = 词干 + YSS 工程后缀；字段 / JSON property camelCase；数据库列 snake_case；枚举 UPPER_SNAKE）仅出现在 `CONTEXT.md:5` 与其 wiki raw 副本。`AGENTS.md:34` 只要求业务术语已有 PascalCase `英文标识`，并指向「按 `CONTEXT.md` 文首规则变形」，未复述四类变形。`AGENTS.md` 中无 `camelCase` / `snake_case` / `UPPER_SNAKE`。
- [x] 未把类全名、表名、接口路径写进词汇表；工程后缀仍以 YSS skill 为准。
  - 通过。`CONTEXT.md:5` 写明工程后缀以 YSS skill 和当前工程惯例为准，不作为领域词写入本表。对 `CONTEXT.md` 检索 `com.`、`/api/`、`/v1/`、`CREATE TABLE` 无命中。既有流程术语「YSS 响应包装」仍用 `Result` / `SingleResult` 等语义简称（`CONTEXT.md:32`），不是 FQCN。`docs/agents/domain.md` 与用户指南同步禁止类全名 / 表名 / 接口路径。
- [x] 未改 `domain-modeling` 的 `CONTEXT-FORMAT.md`，也未改其他 skill 正文。
  - 通过。`git diff 7f6158b...HEAD -- .agents/skills` 为空，含 `.agents/skills/domain-modeling/CONTEXT-FORMAT.md`。
- [x] 未把新校验接入 `scripts/verify-template`，未宣布可发布。
  - 通过。`git diff 7f6158b...HEAD -- scripts/verify-template` 为空；`scripts/` 下无 `英文标识` / `PascalCase` / CONTEXT schema 新检查。本文件、checkpoint、fresh-verification、counterexample 均只写「未声称可发布」，没有发布结论。
- [x] Spec / Ticket / 审查模板只引用词干追溯，没有新开生命周期门禁。
  - 通过。`docs/templates/spec-template.md:76`、`docs/templates/vertical-slice-ticket-template.md:132`、`docs/templates/review-report-template.md:69`、`docs/templates/requirement-freeze-template.md` 只增加词干回写 / 追溯检查。`git diff 7f6158b...HEAD -- docs/process/lifecycle-registry.yaml` 为空；注册表无新 `gate.*`。

独立审查已完成。`docs/reviews/context-bilingual-stems-l2-checkpoint-2026-08-24.yaml` 的 `escalation` 已改为记录非实施者在候选 `3a855f8` 完成 focused-independent 审查。仍不得声称可合并或可发布。

## 附加核对

- Wiki refresh：`wiki/raw/AGENTS.md` / `CONTEXT.md` / 模板 raw 与 live 字节一致。`wiki/raw/yss-skill-registry.yaml` 与 `wiki/raw/skills-lock-names.md` 补入的 `yss-antd-design` 在固定点 live 已存在（`7f6158b:AGENTS.md:81`、`docs/agents/yss-skill-registry.yaml:286`、`skills-lock.json`）。命中文章只对齐词干句子，无 skill 投影文章改写。符合「除对齐既有 `yss-antd-design` 摘录外不改 skill 语义」。
- Checkpoint 曾把 `focused-independent-review` 预填为 `pass`，而本审查文件当时仍为 `ready-for-human`。该预填不构成审查通过；本轮由非实施者勾选后，`result: pass` 才有效。
- 非阻断观察：checkpoint `changed_assets` 未列出 `docs/templates/requirement-freeze-template.md`、`docs/user-guide/**` 与 `wiki/**`。不影响七项清单结论。

## drift / violation / new_impacts

无。未发现路径越界、未执行清单核对、或把词干规则升级为生命周期门禁 / 核心校验器。

## 编排器后续

审查者只写入本文件与 L2 checkpoint YAML。请重新执行 `scripts/verify-template`（覆盖审查文档写入后的候选），不要沿用 `de5a8f1` 的实施者自述。
