---
context_schema_version: 1
---
# 业务上下文

本文档是项目的业务词汇表，只记录稳定业务语言，不记录实现细节、计划草稿或架构说明；流程术语见 `## 流程术语` 指向的 process-glossary.md。

`英文标识` 是 PascalCase 词干，不是英语释义。`## 业务术语` 必须填写该列，并使用 `Global` 或“业务边界与规则设计”中已确认的 PascalCase `context_id` 填写 `适用业务责任区`；术语稳定身份仍是 `<ContextId>/<EnglishIdentifier>`，该编号由 Agent 维护，业务人员只需确认名称、含义和适用范围。`## 流程术语` 的英文标识填 `—`。代码类型名、字段名和契约 property 由该词干变形：类名 = 词干 + YSS 工程后缀；字段与 JSON property 为 camelCase；数据库列为 snake_case；枚举常量为 UPPER_SNAKE。工程后缀以 YSS skill 和当前工程惯例为准，不作为业务词写入本表。JSON 与 Java 字段不一致时，以 DTO wire shape / OpenAPI 为准，不在本表另开列。改中文术语、英文标识、含义或适用业务责任区都是统一业务词汇变更，必须先回写本表。`避免 / 备注` 中的禁用别名使用 `避免：别名一、别名二`，其他说明使用 `备注：...`。

只有在计划、分诊、调试或架构讨论中明确沉淀出稳定语言时，才新增术语。

## 消费规则

探索仓库、起草 Spec / Ticket、架构设计和实现前读取根目录唯一的 CONTEXT.md，并按当前影响面读取 docs/adr/。合同缺失时先恢复，不能临时另建词汇表。Spec、Ticket 标题、测试、架构说明和总结使用已确认的中文术语；与冻结术语或 ADR 冲突时先明确冲突。稳定术语由 domain-modeling 维护，临时猜测留在决策前沿。生命周期引用保存结构化 snapshot 与双摘要，不使用 Markdown 伪锚点。流程术语按需读取 process-glossary.md。

## 流程术语

流程术语已迁至 [process-glossary.md](.template-spec/process/process-glossary.md)，按需读取。本节只保留合同要求的表头，`英文标识` 仍填 `—`。

| 术语 | 含义 | 英文标识 | 避免 / 备注 |
|---|---|---|---|

## 业务术语

`project-instance` 在本节新增产品对象。每一行必须有 PascalCase `英文标识`；缺该列视为统一业务词汇未冻结。模板源不放虚构业务行。

| 术语 | 含义 | 英文标识 | 适用业务责任区 | 避免 / 备注 |
|---|---|---|---|---|
