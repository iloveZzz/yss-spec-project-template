# Harness 试点复盘指标

本文用于 Harness 试点结束后的复盘。它覆盖 HOB-010，并把 HOB-012 的 AGENTS / CONTEXT / ADR 回流动作作为复盘检查项处理。

## 指标定义

| 指标 | 定义 | 数据来源 | 目标方向 |
|---|---|---|---|
| Spec Ready 一次通过率 | Spec 首次评审即可进入下一阶段的比例 | Spec Review 记录、Ticket 评论 | 提升 |
| 阶段产物一次通过率 | 阶段产物首次 checkpoint 无阻断项的比例 | 阶段 checkpoint、门禁记录 | 提升 |
| 规范偏离次数 | 违反流程、模板、YSS、Ticket 或风险 / 回滚约束的次数 | Review、Architecture Re-check、Ticket | 降低 |
| ready-for-agent 到可验证 PR 周期 | 从进入 Agent 可执行状态到出现可验证 PR / MR 的耗时 | Ticket 状态、Git 记录、验证记录 | 缩短 |
| 回归缺陷数 | 试点上线或合并后发现的回归问题 | 缺陷 Ticket、Release Review | 降低 |
| 模板 / Skill 更新次数 | 复盘后新增、修改、合并或废弃的模板 / Skill 数量 | 复盘记录、Git diff | 稳定沉淀 |
| 人审阻断命中次数 | 不可逆变更或责任确认触发人工审查的次数 | 人工确认项、Review 记录 | 可解释，不追求为零 |
| 自动化候选新增数 | 复盘中新识别的可自动 / 半自动检查项 | `harness-automation-candidates.md` | 持续收敛 |

## 复盘记录模板

### 基本信息

| 字段 | 内容 |
|---|---|
| 试点模块 |  |
| 时间范围 |  |
| 参与角色 |  |
| 关联 Ticket / MR / PR |  |
| 使用的 Ticket |  |

### 指标结果

| 指标 | 目标 | 实际 | 结论 |
|---|---|---|---|
| Spec Ready 一次通过率 |  |  |  |
| 阶段产物一次通过率 |  |  |  |
| 规范偏离次数 |  |  |  |
| ready-for-agent 到可验证 PR 周期 |  |  |  |
| 回归缺陷数 |  |  |  |
| 模板 / Skill 更新次数 |  |  |  |

### 复盘问题

| 问题 | 证据 | 原因 | 处理动作 | 负责人 |
|---|---|---|---|---|
|  |  |  |  |  |

### 治理回流检查

| 回流项 | 是否需要 | 动作 |
|---|---|---|
| 更新 `AGENTS.md` | 是 / 否 | 仅当硬性入口规则稳定变化时执行 |
| 更新 `CONTEXT.md` | 是 / 否 | 只写稳定领域语言，不写实现细节 |
| 新增 / 更新 ADR | 是 / 否 | 仅当决策难回滚、非显而易见且存在真实取舍 |
| 更新模板 | 是 / 否 | 记录模板路径和变化原因 |
| 更新 Skill | 是 / 否 | 按 `docs/process/skill-governance.md` 评估 |
| 更新自动化候选 | 是 / 否 | 写入 `docs/process/harness-automation-candidates.md` |

### 结论

- 是否继续扩大试点：
- 必须先修正的问题：
- 可进入自动化 backlog 的动作：
- 需要人工决策的事项：

