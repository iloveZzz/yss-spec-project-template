# 头脑风暴 (Ideation) — 发现与需求的上游输入

> **Phase：先发散，再验证。AI 是发散思维的加速器。**

---

## 定位：创新漏斗的最前端

```
┌──────────┐    ┌──────────┐    ┌──────────┐
│ Ideation │ →  │Discovery │ →  │Requirements│
│ 头脑风暴  │    │ 发现验证  │    │  需求收敛   │
│ 100个想法 │    │ 10个验证  │    │  3个PRD    │
└──────────┘    └──────────┘    └──────────┘
```

---

## AI 在头脑风暴中的四种角色

### 1. 发散者 — 产生大量想法

```python
delegate_task(
    goal="对'[主题]'做发散式头脑风暴，至少产生 30 个想法",
    context="""
    不要过滤。不讨论可行性。数量优先。
    思考维度：功能/体验/运营/技术/商业模式
    输出：30+ 个想法，每个一句话 + 维度标签
    """
)
```

### 2. 挑战者 — 魔鬼代言人

```python
delegate_task(
    goal="对这 5 个想法，站在反对者角度逐一挑战",
    context="对每个想法：用户为什么不买账？技术上最大的坑？竞品失败过吗？"
)
```

### 3. 连接者 — 发现模式

```python
delegate_task(
    goal="分析 30 个想法，找出隐藏的模式和可组合的机会",
    context="归类为 5-7 个主题 / 识别可组合的 / 标注低垂果实 vs 登月计划"
)
```

### 4. 记录者 — 结构化输出

```python
delegate_task(
    goal="将头脑风暴输出整理为结构化文档",
    context="按主题分类 + 想法-可行性矩阵 + Top 5 + Next Steps"
)
```

---

## 方法库

### How Might We (HMW)
```
用户痛点 → "我们如何..." → 针对每个 HMW 产生想法
```

### Crazy 8s
```
8 分钟画 8 个方案草图 → 投票选出最佳
```

### SCAMPER
```
Substitute / Combine / Adapt / Modify / Put to another use / Eliminate / Reverse
```

---

## AI-Human Loop

```
人类提主题 → AI 发散 50 个想法 → 人类投票 Top 10
→ AI 挑战者分析 → 人类讨论 → AI 连接者找模式
→ AI 输出报告 → 确认 → 进入 Discovery
```
