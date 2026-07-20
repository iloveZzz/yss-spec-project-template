# 需求定义 (Requirements) — 从想法到可执行定义

> **Phase: Requirements | 输入: Discovery | 输出: Spec + Stories + 验收条件**

---

## Engineering Skills 流程

默认需求链路：

```text
grill-with-docs -> to-spec -> API 影响分析 / 契约草案 -> Architecture 反审 -> OpenAPI Freeze -> to-tickets
```

进入开发前必须满足：

- [ ] Spec 使用 [../templates/spec-template.md](../templates/spec-template.md)。
- [ ] OpenAPI 影响明确为“无”或已产出契约草案 / review-only Draft；进入开发前必须冻结 `docs/api/specs/*.yaml`。
- [ ] 测试决策明确主要测试 seam。
- [ ] AI / 人工审查点标注风险 / 人工确认项。
- [ ] 后续 Ticket 使用 [../templates/vertical-slice-ticket-template.md](../templates/vertical-slice-ticket-template.md)，不得按层横向拆分。

## AI 三步法

### Step 1: 生成 Spec 初稿

```python
delegate_task(
    goal="根据发现报告生成 Spec 初稿",
    context="""
    输入：发现报告 (市场+竞品+用户)
    输出：背景/用户画像/场景/功能需求/NFR/验收条件/边界/技术影响
    """
)
```

### Step 2: 补充边界场景

```python
delegate_task(
    goal="对 Spec 做边界场景挖掘",
    context="""
    从以下角度挖掘遗漏场景：
    空值/并发/权限/网络异常/数据量极端/时间相关/国际化
    """
)
```

### Step 3: 拆解用户故事

```python
delegate_task(
    goal="将 Spec 拆解为可估算的用户故事",
    context="""
    格式: As a / I want / So that
    附带 Gherkin 验收条件 + 优先级(P0/P1/P2) + AI风险标注
    """
)
```

---

## Spec 模板结构

1. 问题陈述 / 解决方案
2. 用户故事
3. 功能需求 / 非功能需求
4. 验收标准
5. OpenAPI 影响
6. 测试决策
7. AI / 人工审查点
8. 非目标范围
9. 风险

---

## AI-Human Loop

```
Discovery报告 → AI生成Spec → PM审核
→ AI补充边界 → PM确认 → AI拆解Stories
→ 团队估算 → AI标注风险 → TechLead确认 → 进入Architecture
```
