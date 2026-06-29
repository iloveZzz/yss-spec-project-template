# PDCA × Scrum × AI — 研发流程管理框架

> **PDCA 是持续改进的引擎。Scrum 是交付节奏的骨架。AI 是每个环节的加速器。**

---

## 一、整体架构

```
                          ┌──────────────────────────────────────┐
                          │           产品愿景 (Vision)            │
                          └────────────────┬─────────────────────┘
                                           │
          ┌────────────────────────────────┼────────────────────────────────┐
          │                                ▼                                │
          │   ┌────────────────────────────────────────────────────────┐   │
          │   │                  Sprint 循环 (2周)                       │   │
          │   │                                                        │   │
          │   │   P (Plan)          D (Do)         C (Check)    A (Act) │   │
          │   │   ─────────        ───────         ──────────   ─────── │   │
          │   │   Sprint          TDD 编码         Sprint       Sprint  │   │
          │   │   Planning         AI Review       Review       Retro   │   │
          │   │   ─────────        ───────         ──────────   ─────── │   │
          │   │   需求拆解         前后端并行        Demo 展示    改进计划  │   │
          │   │   任务估算         AI 自测          质量检查    知识沉淀   │   │
          │   │   容量规划         持续集成         反馈收集    流程优化   │   │
          │   └────────────────────────────────────────────────────────┘   │
          │                                │                                │
          │                                ▼                                │
          │                   可工作软件 + 改进措施                           │
          └────────────────────────────────────────────────────────────────┘
```

---

## 二、PDCA 在 AI 增强研发中的具体映射

### P — Plan（计划）

| Scrum 活动 | AI 增强 | Agent | 产出物 |
|-----------|---------|-------|--------|
| Product Backlog 梳理 | AI 从发现报告生成 Epics 和 User Stories | Plan Agent | 优先级排序的 Backlog |
| Sprint Planning | AI 建议 Sprint 容量，拆分任务 | Plan Agent | Sprint Backlog |
| 任务估算 | AI 基于历史数据预测 Velocity | Plan Agent | 估算 Story Points |
| 风险识别 | AI 标注高风险任务 | Plan Agent | 风险清单 |

**AI-Human Loop in Plan：**
```
PO 提出 Sprint Goal → AI 拆解 Backlog → 团队 Review → AI 生成 Sprint Backlog → PO 确认
```

### D — Do（执行）

| 活动 | AI 增强 | Agent | 产出物 |
|------|---------|-------|--------|
| 每日编码 | TDD 循环 + 前后端并行 | Code Agent × 2 | 代码 + 测试 |
| 每日站会 | AI 自动汇总昨日完成/今日计划/阻塞项 | Standup Agent | Daily Standup 摘要 |
| 代码审查 | 独立审查 + 安全扫描 | Review Agent × 2 | 审查报告 |
| 技术障碍 | AI 辅助调试 + 方案建议 | Debug Agent | 解决方案 |

**AI-Human Loop in Do：**
```
开发者领取任务 → Code Agent 生成代码（TDD）→ Review Agent 独立审查
→ 开发者 Review + 修复 → 合并
```

### C — Check（检查）

| 活动 | AI 增强 | Agent | 产出物 |
|------|---------|-------|--------|
| Sprint Review | AI 生成 Demo 脚本 + 实际 vs 计划对比 | Review Agent | Sprint Review 报告 |
| 质量检查 | CI 流水线 + 覆盖率报告 + AI 质量评分 | Test Agent | 质量仪表板 |
| Bug 趋势 | AI 分析 Bug 趋势和热点模块 | Ops Agent | Bug 分析报告 |
| 用户反馈 | AI 聚合用户反馈 + 情感分析 | Insight Agent | 反馈摘要 |

**AI-Human Loop in Check：**
```
Sprint 结束 → AI 生成质量报告 → 团队 Demo → 干系人反馈
→ AI 汇总反馈要点 → 输入下一 Sprint Planning
```

### A — Act（改进）

| 活动 | AI 增强 | Agent | 产出物 |
|------|---------|-------|--------|
| Sprint Retro | AI 分析 Sprint 数据，建议改进项 | Retro Agent | Retro 报告 |
| 知识沉淀 | AI 将教训写入 AGENTS.md + Skill | Knowledge Agent | 更新的规范和 Skill |
| 流程优化 | AI 建议流程调整 | Retro Agent | 改进 Action Items |
| 技术债管理 | AI 追踪技术债，建议偿还时机 | TechDebt Agent | 技术债看板 |

**AI-Human Loop in Act：**
```
Sprint 数据 → AI 生成 Retro 报告 → 团队讨论 → AI 记录 Action Items
→ AI 更新 AGENTS.md / Skills → 下次 Sprint 自动生效
```

---

## 三、Scrum 节奏与 AI Agent 编排

### Sprint 0：项目启动（1-2 周）

```
Week 1: 发现阶段
  ├── Day 1-2: Market Agent     → 市场分析报告
  ├── Day 3-4: Competitor Agent → 竞品功能矩阵
  └── Day 5:   User Insight Agent → 用户痛点报告

Week 2: 初始化
  ├── Day 1: 商业论证（整合发现阶段产出）
  ├── Day 2: 架构设计（Architecture Agent）
  ├── Day 3: 技术选型、CI/CD 搭建
  └── Day 4-5: Product Backlog 初始化（Plan Agent）
```

### Sprint 1-N：迭代交付（2 周一 Sprint）

```
┌─────────────────────────────────────────────────────────────┐
│                      Sprint N (2 周)                        │
├──────────┬──────────┬──────────┬──────────┬────────────────┤
│   Day 1  │ Day 2-8  │  Day 9   │  Day 10  │  持续活动       │
│ Planning │ 开发+审查 │  Review  │  Retro   │                │
├──────────┼──────────┼──────────┼──────────┼────────────────┤
│ Plan     │ Review   │ Review   │ Retro    │ Daily Standup  │
│ Agent    │ Agents   │ Agent    │ Agent    │ Agent (自动)    │
│ 拆分任务  │ ×2 独立   │ 对比报告  │ 改进建议  │ 进度摘要        │
│ 估算容量  │ 并行审查  │ 质量仪表  │ 知识沉淀  │ 阻塞标记        │
└──────────┴──────────┴──────────┴──────────┴────────────────┘
```

### Sprint 各仪式中的 AI 角色

| 仪式 | 频率 | AI 角色 | 人类角色 |
|------|------|---------|---------|
| **Sprint Planning** | Sprint 第 1 天 (4h) | AI 拆分 Backlog 项为任务，估算复杂度，建议 Sprint 容量 | PO 定义优先级，团队估算和承诺 |
| **Daily Standup** | 每天 (15min) | AI 从 Git/Slack 自动汇总进度，生成 Standup 摘要 | 团队同步，解除阻塞 |
| **Sprint Review** | Sprint 最后一天 (2h) | AI 生成 Demo 脚本，对比计划 vs 实际的差异 | 团队 Demo，干系人反馈 |
| **Sprint Retro** | Sprint 最后一天 (1.5h) | AI 分析 Sprint 数据，建议改进项 | 团队讨论，确定 Action Items |
| **Backlog Refinement** | Sprint 中期 (2h) | AI 为 Backlog 项补充验收条件、技术影响分析 | PO 和团队澄清需求 |

---

## 四、AI 驱动的 Sprint 度量

### 自动采集指标

| 指标 | 数据来源 | AI 分析 |
|------|---------|---------|
| Velocity | Sprint 完成的 Story Points | 趋势预测，容量建议 |
| Cycle Time | Git commit 到 merge 的时间 | 瓶颈识别 |
| Code Churn | 代码行数增删比 | 返工率分析 |
| Bug Rate | Bug/Story Point | 质量趋势 |
| AI 采纳率 | AI 生成代码被合并的比例 | Agent 效果评估 |
| 测试覆盖率 | pytest --cov / vitest --coverage | 覆盖缺口警报 |

### AI 每周自动产出（可通过 cronjob 定时生成）

```python
cronjob(
    action="create",
    schedule="0 9 * * 1",  # 每周一早上 9 点
    prompt="分析上周 Sprint 数据，生成 Sprint 健康度报告：Velocity趋势/Bug率/覆盖率/AI采纳率/阻塞项",
    deliver="telegram:..."
)
```

---

## 五、关键原则

### 1. PDCA 不是一次性的，是每 Sprint 一次的
每个 Sprint 都是一次完整的 P→D→C→A 循环。A 的产出（改进措施、知识沉淀）直接输入下一个 Sprint 的 P。

### 2. AI 是加速器，人类是决策者
- AI 负责：数据采集、分析建议、报告生成、任务拆分
- 人类负责：优先级决策、架构审批、安全审核、最终承诺

### 3. Scrum 仪式不能被 AI 取代
Daily Standup 的价值在于团队同步和消除阻塞，AI 可以做摘要但**不能替代**人与人之间的沟通。同样，Retro 的核心是团队心理安全，AI 只提供数据支撑。

### 4. 度量是为了改进，不是为了考核
所有 Sprint 数据（Velocity、Bug Rate等）用于 PDCA 改进，**不用于个人绩效考核**。否则团队会 game the metrics。

### 5. 知识沉淀是复利
每次 Retro 的改进措施 → 写入 AGENTS.md / Skill → 下一个 Sprint 的 Agent 自动遵循 → 效率递增。
