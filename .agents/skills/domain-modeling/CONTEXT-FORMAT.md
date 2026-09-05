# YSS 业务词汇表合同

## 位置与版本

每个 YSS Git 仓库只允许一个大小写精确的根目录 `CONTEXT.md`。禁止嵌套 `CONTEXT.md`、`CONTEXT-MAP.md`、跨仓相对路径和绝对路径引用。独立仓库各自拥有自己的根词汇表，通过结构化 handoff 同步，不共同写一个文件。

文件顶部必须声明：

```yaml
---
context_schema_version: 1
---
```

缺失或不支持的版本必须返回 `migration-required`，不得猜测格式。

## 标准结构

```md
# 业务上下文

本文档只记录稳定业务语言，不记录实现细节、计划草稿或架构说明。

## 流程术语

| 术语 | 含义 | 英文标识 | 避免 / 备注 |
|---|---|---|---|
| Spec | 产品研发规格。 | — |  |

## 业务术语

| 术语 | 含义 | 英文标识 | 适用业务责任区 | 避免 / 备注 |
|---|---|---|---|---|
| 准入决定 | 合规审查形成的准入结论。 | AdmissionDecision | ComplianceReview | 避免：`审批结果` |
```

## 术语身份

- 业务术语的稳定身份是 `<ContextId>/<EnglishIdentifier>`，例如 `ComplianceReview/AdmissionDecision`。
- 跨业务责任区共享且含义完全一致的术语使用 `Global/<EnglishIdentifier>`。
- `英文标识` 与 `ContextId` 使用 PascalCase；非 `Global` 的 ContextId 必须来自当前业务边界与规则设计的内部 `contexts[].context_id`。
- 同一业务责任区内中文术语、英文标识和禁用别名不得冲突。不同责任区可以拥有同名局部术语，但引用必须带 ContextId。
- `Global` 术语不得被局部上下文用相同中文术语或英文标识重新定义；语义不同的词不应声明为 Global。
- 流程术语的 `英文标识` 固定为 `—`，只由 `template-source` 维护；`project-instance` 只维护业务术语。

## 内容边界

- 只写已经确认、稳定且未来资产需要复用的业务语言。候选、猜测和未决术语保留在 Discovery、业务边界与规则设计或 `context_delta`。
- 定义保持一到两句，说明概念是什么；不要写类全名、表名、接口路径、实现步骤或计划。
- 禁用别名使用 `避免：别名一、别名二`；需要补充说明时追加 `；备注：...`。
- 术语稳定时立即回写。工作单元完成、门禁批准或阶段转换前仍须执行 context reconciliation。

## 机器验证

使用根目录 `scripts/verify-context-contract` 校验位置、版本、表格、术语身份、适用业务责任区和引用。业务资产只使用结构化 `context_ref: CONTEXT.md` 与 `term_refs`，不得使用 `CONTEXT.md#Term` 或 `contexts/<ContextId>/CONTEXT.md`。校验器兼容旧项目的 `适用限界上下文` 表头，但新模板只写 `适用业务责任区`。
