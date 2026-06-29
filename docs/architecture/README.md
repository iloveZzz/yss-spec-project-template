# 架构设计 (Architecture) — 从需求到技术方案

> **Phase: Design**

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
    goal="生成系统架构图 (SVG)",
    context="包含：部署架构/数据流/服务通信"
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
