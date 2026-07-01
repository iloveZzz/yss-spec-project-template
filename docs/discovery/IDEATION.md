# 机会构想 (Ideation) — 发现与需求之间的假设生成

> **Phase：生成可验证假设，再用 Discovery 事实校准。AI 是发散、挑战和组合机会的加速器。**

---

## 定位：机会探索环中的假设生成

Ideation 不等同于 Superpowers `brainstorming`：

| 项 | 定位 | 输出 |
|---|---|---|
| Ideation Agent | 产品机会探索角色，回答“可能做什么、是否值得探索” | 候选机会、假设、挑战点、组合方案 |
| Discovery Agent | 事实验证角色，回答“证据支持什么、用户真实痛点是什么” | 市场、竞品、用户洞察、MVP 边界输入 |
| Superpowers `brainstorming` | 方法论 skill，回答“某个已选方向如何形成技术方案” | 设计说明、方案取舍、风险识别、进入计划前的批准点 |

推荐关系：

```text
市场 / 竞品 / 用户事实 <-> 机会构想假设 <-> MVP 边界
```

如果只有一个模糊主题，可以先 Ideation 再 Discovery；如果已经有竞品、用户或行业材料，应先 Discovery 再 Ideation。二者循环到 PRD 前，必须收敛用户、痛点、做什么、不做什么和成功标准。

---

## AI 在机会构想中的四种角色

### 1. 发散者 — 产生大量想法

```python
delegate_task(
    goal="对'[主题]'做机会构想，至少产生 30 个候选机会",
    context="""
    不要过滤。不讨论可行性。数量优先。
    思考维度：功能/体验/运营/技术/商业模式
    输出：30+ 个候选机会，每个一句话 + 维度标签
    """
)
```

### 2. 挑战者 — 魔鬼代言人

```python
delegate_task(
    goal="对这 5 个候选机会，站在反对者角度逐一挑战",
    context="对每个候选机会：用户为什么不买账？技术上最大的坑？竞品失败过吗？"
)
```

### 3. 连接者 — 发现模式

```python
delegate_task(
    goal="分析 30 个候选机会，找出隐藏的模式和可组合的机会",
    context="归类为 5-7 个主题 / 识别可组合的 / 标注低垂果实 vs 登月计划"
)
```

### 4. 记录者 — 结构化输出

```python
delegate_task(
    goal="将机会构想输出整理为结构化文档",
    context="按主题分类 + 假设-证据-风险矩阵 + Top 5 + Next Steps"
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
人类提主题或 Discovery 事实 → AI 发散候选机会 → 人类选择 Top 10
→ AI 挑战者分析 → Discovery 验证证据 → AI 连接者找模式
→ 收敛 MVP 边界 → 确认是否进入 PRD / Comet 或 Superpowers brainstorming 技术方案设计
```
