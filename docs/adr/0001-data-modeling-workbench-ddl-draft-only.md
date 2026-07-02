# ADR-0001: 数据建模工作台只生成 DDL 草案不执行迁移

## 状态

已接受

## 日期

2026-07-02

## 背景

企业数据模型协作工作台 MVP 需要在发布模型版本后导出 PostgreSQL DDL 草案，用于数仓开发和人工变更流程交接。PRD、交互说明、系统架构和数据架构均明确：P0 不连接生产数据库，不自动执行建表、改表或数据库迁移。

该决策触碰 AGENTS 安全红线中的数据库迁移脚本、原生 SQL 和认证授权边界。若系统提供 DDL 执行端点，容易绕过现有数据库变更审批、DBA review、回滚方案和安全审计。

## 决策

数据建模工作台 P0 只生成 PostgreSQL DDL 草案文本或文件，不提供任何数据库连接、DDL 执行、数据库迁移或一键落库端点。

具体约束：

1. OpenAPI 不暴露 database connection、execute DDL、migration / migrate 类路径。
2. 发布请求必须携带 `ddlDraftAcknowledged: true`，确认 DDL 仅为草案。
3. DDL 草案只能从结构化物理模型生成，不接收用户自由 SQL 作为执行输入。
4. 导出的 SQL 文件必须标识“草案 / 人工确认后进入外部数据库变更流程”。
5. DDL 生成器、SQL 文本、数据库迁移脚本只能作为草案进入人工 review，标记 `TODO-HUMAN-REVIEW`。

## 考虑的替代方案

| 方案 | 优点 | 缺点 | 结论 |
|------|------|------|------|
| 系统直接执行 DDL | 交付路径短，自动化程度高。 | 风险高，绕过数据库变更审批和回滚流程，触碰安全红线。 | 拒绝。 |
| 系统生成可执行迁移脚本 | 便于 DBA 复用，仍有一定自动化。 | 迁移脚本属于安全红线，只能生成模板或草案，仍需人工确认。 | P0 不做；后续如做必须单独 ADR 和人工 review。 |
| 只生成 DDL 草案 | 安全边界清晰，适合 MVP 和内部协作交接。 | 无法一键落库，需要外部人工流程。 | 采用。 |

## 后果

### 正面影响

- 明确产品边界，降低数据库误变更风险。
- OpenAPI 和实现不会包含危险执行端点。
- 保留与现有数据库变更审批、DBA review 和回滚流程的衔接。

### 负面影响

- 发布后仍需人工确认和外部变更流程。
- DDL 草案到实际落库之间可能存在人工调整。

### 风险

- 用户可能误把草案当成可执行脚本直接使用。
- DDL 生成器仍可能生成不合理类型或约束。
- 后续需求可能推动“一键落库”，需要重新评审安全边界。

## 相关

- `docs/api/specs/data-modeling-workbench.yaml`
- `docs/api/freeze/2026-07-02-data-modeling-workbench-openapi-freeze.md`
- `docs/architecture/2026-07-02-data-modeling-workbench-design-review-rerun.md`
- `docs/architecture/2026-07-02-data-modeling-workbench-data-architecture.md`
