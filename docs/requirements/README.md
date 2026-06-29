# 需求定义 (Requirements) — 从想法到可执行定义

> **Phase: Requirements | 输入: Discovery | 输出: PRD + Stories + 验收条件**

---

## AI 三步法

### Step 1: 生成 PRD 初稿

```python
delegate_task(
    goal="根据发现报告生成 PRD 初稿",
    context="""
    输入：发现报告 (市场+竞品+用户)
    输出：背景/用户画像/场景/功能需求/NFR/验收条件/边界/技术影响
    """
)
```

### Step 2: 补充边界场景

```python
delegate_task(
    goal="对 PRD 做边界场景挖掘",
    context="""
    从以下角度挖掘遗漏场景：
    空值/并发/权限/网络异常/数据量极端/时间相关/国际化
    """
)
```

### Step 3: 拆解 User Stories

```python
delegate_task(
    goal="将 PRD 拆解为可估算的 User Stories",
    context="""
    格式: As a / I want / So that
    附带 Gherkin 验收条件 + 优先级(P0/P1/P2) + AI风险标注
    """
)
```

---

## PRD 模板结构

1. 背景与目标 (痛点/商业目标/成功指标)
2. 用户画像 (Persona)
3. 用户场景 (Scenario)
4. 功能需求 (表格)
5. 非功能需求 (性能/安全/可用性)
6. 验收条件 (Gherkin: Given/When/Then)
7. 边界条件与异常
8. 技术影响分析
9. 风险标注

---

## AI-Human Loop

```
Discovery报告 → AI生成PRD → PM审核
→ AI补充边界 → PM确认 → AI拆解Stories
→ 团队估算 → AI标注风险 → TechLead确认 → 进入Architecture
```
