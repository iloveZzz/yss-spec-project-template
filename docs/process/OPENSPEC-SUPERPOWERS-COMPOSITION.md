# OpenSpec × Superpowers × Skill Composition — 研发自动化集成方案

> **三层架构：OpenSpec(契约) + Superpowers(方法论) + Skill Composition(编排)**

---

## 架构总览

| 层级 | 组件 | 职责 |
|------|------|------|
| **契约层** | OpenAPI 3.1 Spec | 前后端 Agent 共同语言 |
| **方法论层** | Superpowers (spike/plan/tdd/review/debug/simplify) | Agent 协作模式 |
| **编排层** | cronjob / webhook / delegate_task | 自动化流水线 |

---

## OpenSpec — API 契约驱动

### 工作流

```
Step 1: 基于 PRD 生成 API 契约草案 (OpenAPI 3.1 Draft)
Step 2: 结合工程基线、架构设计 / OpenSpec / Comet 行为规格和设计审查校验 Draft
Step 3: 冻结 API 契约 (OpenAPI 3.1 Freeze)
Step 4: 后端按冻结 Spec 实现端点
Step 5: 前端从冻结 Spec 生成 types
Step 6: 测试按冻结 Spec 做契约测试 (Contract Testing)
```

```python
# Sprint 0: 先生成 API 契约草案，并在开发前冻结
delegate_task(
    goal="根据产品需求，设计并输出 OpenAPI 3.1 Draft",
    context="""
    需要定义的端点：GET/POST/PUT/DELETE ...
    输出：OpenAPI 3.1 Draft YAML → docs/api/specs/[feature].yaml
    后续：经工程基线、Architecture / OpenSpec / Comet design 和设计审查后 Freeze，再进入前后端实现
    """
)
```

---

## Superpowers — 方法论 Skill 生态

| Skill | 阶段 | 触发 |
|-------|------|------|
| `spike` | 可行性验证 | "先试试", "验证下" |
| `plan` | 需求→计划 | "做个计划", "/plan" |
| `test-driven-development` | 编码 | 任何写代码时（铁律） |
| `requesting-code-review` | 审查 | "提交", "commit" |
| `simplify-code` | 清理 | "简化", "清理代码" |
| `systematic-debugging` | 调试 | 任何 bug / test failure |
| `architecture-diagram` | 架构 | "画架构图" |

### 编排模式

```
Spike → Plan → TDD Build(并行) → Review(Fail-Closed) → Simplify(3agent) → Commit
```

---

## Skill Composition — 自动化流水线

### Cronjob 驱动

```python
cronjob(action="create", schedule="0 9 * * *",
    prompt="运行全量测试 + 覆盖率检查 + 安全扫描 → 报告",
    deliver="telegram:...")
```

### Webhook 驱动

```python
# PR Opened → 自动触发 AI Review (GitHub Actions webhook → agent)
```

### Kanban 多 Agent 队列

```bash
agentctl kanban create --title "实现[功能]" \
  --skills "test-driven-development,requesting-code-review"
```

---

## 完整流水线

```
Spike → Spec → Plan → TDD Build(并行) → Review → Simplify → Deploy → Retro
  │                                                           │
  └──── cronjob 定时 ──── webhook 事件 ──── kanban 队列 ──────┘
```
