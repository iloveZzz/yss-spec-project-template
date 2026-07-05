# 架构设计 (Architecture) — 从需求到技术方案

> **Phase: Design**

---

## 四类架构产物

架构设计按生命周期逐步产出，不要求一次性完成所有细节。

| 产物 | 产出阶段 | 重点问题 | 建议文件 |
|------|----------|----------|----------|
| 业务架构 | 机会探索 / Discovery / 产品定义 | 用户是谁、价值流是什么、产品在业务生态中的边界在哪里 | `<feature>-business-architecture.md` |
| 产品总体设计 / 功能架构 | PRD 初稿之后、页面 / 原型 / 交互设计之前 | 用户主流程、业务对象、功能域、模块边界、页面/API/数据影响、优先级、依赖和 MVP 非目标范围是什么 | `<feature>-product-overview-design.md` 或 `<feature>-functional-architecture.md` |
| 系统概要设计 / 系统总体架构 | 工程基线 / 系统 / 数据架构设计 | 服务/模块如何构建、部署、集成、运维、回滚和演进 | `<feature>-system-overview-design.md`、`<feature>-system-architecture.md` 或 `<feature>-architecture.md` |
| 数据架构 | 详细设计 / 持久化开发前 | 概念/逻辑/物理模型、元模型、版本、血缘、查询、索引和存储策略是什么 | `<feature>-data-architecture.md` |

对于数据模型、元数据管理、ER 设计、版本管理或血缘分析类产品，数据架构是核心产品能力，必须在 Repository / MyBatis / 持久化开发前完成；如果 OpenAPI schema 依赖元模型，也必须在 OpenAPI Freeze 前完成。

推荐配套图：

```text
docs/architecture/diagrams/<feature>-business-capability.excalidraw
docs/architecture/diagrams/<feature>-functional-modules.excalidraw
docs/architecture/diagrams/<feature>-system-architecture.excalidraw
docs/architecture/diagrams/<feature>-data-model.excalidraw
```

使用 `excalidraw-diagram-generator` 生成图时，图只作为审查辅助；发现的问题必须回写到 PRD、OpenAPI、ADR、系统 / 数据架构设计 或对应架构文档。

推荐模板：

- `docs/design/templates/product-overview-design-template.md`：PRD 初稿之后、页面 / 原型 / 交互设计之前的产品总体设计 / 功能架构评审稿。
- `docs/architecture/templates/system-overview-design-template.md`：系统 / 数据架构与工程契约设计审查阶段的系统概要设计评审稿，承接 API 影响分析 / 契约草案 / OpenAPI Draft 与工程基线，并在 OpenAPI Freeze 前反向校验 Draft。

---

## AI 四种角色

### 方案生成器
```python
delegate_task(
    goal="为'[功能]'生成 3 种技术方案并做 trade-off 对比",
    context="评估维度：复杂度/安全/性能/扩展性/契合度/开发成本"
)
```

### 预审者 — 六维度审查
```python
delegate_task(
    goal="从可扩展性、安全性、性能、可靠性、可维护性、成本六个维度预审此方案",
    context="每个维度打分 1-5，评分<3 给出替代方案"
)
```

### ADR 记录者
```python
delegate_task(
    goal="根据技术讨论记录，自动生成 ADR",
    context="使用 docs/adr/template.md 模板"
)
```

### 图表生成者
```python
delegate_task(
    goal="使用 excalidraw-diagram-generator 生成架构图",
    context="根据阶段选择：业务能力图/功能模块图/系统架构图/ER 图/血缘图/数据流图"
)
```

---

## 六维度审查清单 (39项)

详见 [templates/architecture-review-checklist.md](templates/architecture-review-checklist.md)

| 维度 | 项数 | 关键检查 |
|------|------|---------|
| 可扩展性 | 6 | 独立部署、无状态、服务边界 |
| 安全性 | 10 | 认证链路、密码存储、注入防护 |
| 性能 | 8 | 索引、缓存、N+1、连接池 |
| 可靠性 | 5 | 降级、重试、幂等、健康检查 |
| 可维护性 | 6 | ADR、OpenAPI、日志、监控 |
| 成本 | 4 | YAGNI、按需、冷数据归档 |

---

## Deep Module 治理

当出现模块难改、测试 seam 不清晰、逻辑散落、Agent 难以理解代码路径时，优先使用 `improve-codebase-architecture` 和 `codebase-design`。

落地产物：

- [templates/architecture-deepening-template.md](templates/architecture-deepening-template.md)：记录 deepening candidate。
- `CONTEXT.md`：沉淀领域术语。
- `docs/adr/`：记录硬以回滚、非显而易见、存在真实取舍的架构决策。

架构讨论必须使用统一术语：`module`、`interface`、`seam`、`adapter`、`depth`、`leverage`、`locality`。

---

## AI-Human Loop

```
需求 → AI 3方案对比 → 架构师选方向 → AI 详细方案
→ AI 六维预审 → 架构师签字 → ADR 记录 → 进入实现
```
