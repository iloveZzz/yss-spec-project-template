# 业务词汇与决策文档

本文规定 Engineering Skills 在探索仓库、起草 Ticket、设计架构或实施代码前，如何读取和使用业务词汇与决策文档。

## 文档布局

本仓库只维护一份根业务词汇表：

```text
/
├── CONTEXT.md
├── docs/adr/
└── docs/
```

## 探索前读取规则

根据任务影响范围读取：

- 根目录唯一的 `CONTEXT.md`：流程术语、业务术语和统一业务词汇；禁止按业务责任区重复创建。
- `docs/adr/`：与当前任务相关的架构决策。

`CONTEXT.md` 缺失时必须先恢复该合同；`domain-modeling` skill 会在形成稳定术语或关键决策时按需更新业务词汇或 ADR。

## 使用规则

- 在 Spec、Ticket 标题、测试、架构说明和实施总结中使用 `CONTEXT.md` 定义的中文术语。
- 业务术语必须同时有 PascalCase `英文标识`；代码类型 / 字段与契约 property 使用该词干按 `CONTEXT.md` 文首规则变形。不把具体类全名、表名或接口路径写入词汇表。
- `CONTEXT.md` 是业务词汇表，不是需求或实现规格；临时计划和未确认猜测不写入。
- 业务术语身份固定为 `<ContextId>/<EnglishIdentifier>`；`ContextId` 来自已确认的业务责任区，跨责任区共享才使用 `Global`。生命周期资产只保存结构化 snapshot 与双摘要，不使用 Markdown 标题锚点冒充可解析引用。
- 如果提案与现有 ADR 或已冻结术语冲突，必须在继续执行前明确指出冲突。
