# 度量层规范 (METRICS-LAYER-SPEC)

> **本文档定义 loop engineering 的数据层。** 把 Comet 状态机历史与 harness 执行结果转化为可分析的指标流，并定义 Check→Act 的反馈闭环，让 PDCA 的 C/A 两环从"开环"变"闭环"。
>
> 配套文件：[`COMET-STATE-SPEC.md`](./COMET-STATE-SPEC.md)（状态机，数据源之一） · [`HARNESS-ADAPTER-SPEC.md`](./HARNESS-ADAPTER-SPEC.md)（执行层，数据源之二） · [`PDCA-SCRUM.md`](./PDCA-SCRUM.md)（指标定义来源）

---

## 1. 范围与目标

本规范定义"研发全流程的度量采集、存储、分析、反馈"闭环，使研发管理与改进建立在数据之上，而非主观印象。

**设计原则**：
- **消费已有产物，不重复采集** — 数据源是 comet history、harness Result、git、测试报告，不另起炉灶。
- **轻量存储优先** — 模板阶段用 JSONL 事件流 + 可选 SQLite 聚合，不上重数据库。
- **度量用于改进，不用于考核** — 呼应 PDCA-SCRUM §5，所有指标团队级聚合，禁止个人绩效归因。
- **闭环必须自动** — Check 的产出必须能自动喂回 Act 与下一个 Plan，否则 loop 不闭合。

**不在范围内**：Comet 状态机本身、harness 后端适配（见各自规范）。

---

## 2. 与已有规范的关系

```
comet-driver ──写──► .comet.yaml history[]     ┐
harness ──写──►    Result（落 logs/metrics）    ├─ 采集器 ──► metrics/events.jsonl ──► 聚合 ──► 仪表板
git log / CI / 测试报告                          ┘                              └─► 反馈引擎 ──► AGENTS.md / Skill / Planning
```

| 数据源 | 产出的原始数据 | 本规范消费方式 |
|--------|--------------|--------------|
| COMET-STATE-SPEC §4.2 `history[]` | 阶段转换、duration_s、guard result | 流程指标 |
| HARNESS-ADAPTER-SPEC §4.2 `Result` | backend、duration_s、status、降级记录 | 执行指标 |
| git log / PR | commit、merge、churn | 交付指标 |
| 测试/CI 报告 | 覆盖率、lint、bug | 质量指标 |

---

## 3. 度量数据模型

### 3.1 统一事件 schema

所有度量落为时间序列事件，单条 schema：

```yaml
event:
  id: "<uuid>"
  ts: 2026-06-29T11:02:00+08:00       # 事件发生时间（ISO8601）
  metric: "stage.duration"             # 指标名（见 §4 命名表）
  value: 3720                          # 数值（秒/百分比/计数，按 metric 单位）
  unit: "s"                            # 单位
  dims:                                # 维度，供聚合切片
    pipeline: "user-login"
    sprint: "Sprint 1"
    stage: "open"                      # 任意维度键值
    backend: "codex"
  source: "comet-history"              # 数据源标识
```

### 3.2 存储约定

| 路径 | 内容 | 格式 |
|------|------|------|
| `metrics/events.jsonl` | 原始事件流，append-only | 每行一个 event JSON |
| `metrics/snapshots/<sprint>.json` | 每 Sprint 末聚合快照 | JSON |
| `metrics/retro-actions.jsonl` | Retro Action Item 流（见 §7.1） | JSONL |

**轻量原则**：模板阶段仅用文件；事件量增大后可加 SQLite 索引（`metrics/metrics.db`），schema 与事件字段一致，迁移不破坏消费者。

---

## 4. 指标定义

指标命名 `<domain>.<name>`，四类域：

### 4.1 流程指标（domain: `stage` / `flow`）— 源自 comet history

| metric | 含义 | 单位 | dims | 采集触发 |
|--------|------|------|------|---------|
| `stage.duration` | 单阶段耗时 | s | pipeline, stage, sprint | comet history `advance` 记录后 |
| `flow.cycle_time` | pipeline open→archive 总时长 | s | pipeline, sprint | archive.passed 时 |
| `flow.guard_pass_rate` | 门禁一次通过率 | % | stage, sprint | 每次 guard 结果 |
| `flow.blocked_count` | blocked 次数 | 计数 | pipeline, stage | comet history `action=advance, result=fail` |
| `flow.retry_count` | retry 次数 | 计数 | pipeline, stage | comet history `action=retry` |

### 4.2 执行指标（domain: `agent`）— 源自 harness Result

| metric | 含义 | 单位 | dims | 采集触发 |
|--------|------|------|------|---------|
| `agent.task_duration` | 单任务耗时 | s | pipeline, stage, backend, agent_role | 每次 run_task 完成 |
| `agent.failure_rate` | 任务失败率 | % | backend, agent_role | 每次 Result |
| `agent.backend_usage` | 后端使用占比 | % | backend, sprint | 每 Sprint 聚合 |
| `agent.degradation_count` | 路由降级次数 | 计数 | pipeline, from_backend, to_backend | Result.log 含降级记录时 |
| `agent.ai_accept_rate` | AI 产出被合并比例 | % | agent_role, sprint | PR merge 时比对作者 |

### 4.3 质量指标（domain: `quality`）— 源自测试/CI

| metric | 含义 | 单位 | dims | 采集触发 |
|--------|------|------|------|---------|
| `quality.coverage` | 测试覆盖率 | % | layer(service/api/ui), sprint | 每次 build→verify guard |
| `quality.lint_errors` | lint error 数 | 计数 | sprint | 每次 PR |
| `quality.bug_rate` | Bug/Story Point | 比 | sprint, module | Sprint 末 |
| `quality.security_high` | high/critical 漏洞数 | 计数 | sprint | 每次 security scan |

### 4.4 交付指标（domain: `delivery`）— 源自 git/Sprint

| metric | 含义 | 单位 | dims | 采集触发 |
|--------|------|------|------|---------|
| `delivery.velocity` | Sprint 完成 SP | 计数 | sprint | Sprint Review |
| `delivery.cycle_time` | commit→merge 时长 | s | pr, sprint | PR merge |
| `delivery.code_churn` | 代码增删比 | 比 | sprint, module | Sprint 末 git stat |

---

## 5. 采集协议

### 5.1 采集器（`scripts/metrics-collector`）

实现为可独立运行的脚本/任务，四种 source 各一个 adapter：

| adapter | 输入 | 输出事件 |
|---------|------|---------|
| `collect-comet` | `.comet.yaml` history[] | `stage.*` / `flow.*` |
| `collect-harness` | harness Result 日志（`logs/harness/*.json`） | `agent.*` |
| `collect-quality` | pytest-cov / vitest coverage / lint / security 报告 | `quality.*` |
| `collect-delivery` | `git log` / PR 元数据 | `delivery.*` |

每个 adapter 幂等：同一数据源多次运行只追加新事件（按 source+原始记录 id 去重）。

### 5.2 采集时机

| 时机 | 触发方式 | 采集内容 |
|------|---------|---------|
| 事件驱动 | comet `advance` / harness `run_task` 完成后回调 | 单条事件，近实时 |
| Sprint 末 | scheduled task（Sprint 最后一天） | 全量聚合 + 快照 |
| 每周一 | scheduled task（cron `0 9 * * 1`） | 周 health report |

> 与 Cowork 环境的映射：scheduled task = `create_scheduled_task`；仪表板 = `create_artifact`；事件驱动回调 = Agent 工具调用。其他平台按等价能力实现。

---

## 6. 仪表板契约

### 6.1 Sprint 健康度视图（必须）

按 Sprint 聚合，含四类指标的最小视图：

| 区块 | 指标 | 展示 |
|------|------|------|
| 交付 | velocity / cycle_time | 趋势线（近 4 Sprint） |
| 流程 | guard_pass_rate / blocked_count / stage.duration | 堆叠柱 + 阶段耗时热力 |
| 执行 | backend_usage / ai_accept_rate / failure_rate | 占比环 + 趋势 |
| 质量 | coverage / bug_rate / security_high | 仪表盘 + 阈值标线 |

### 6.2 实现约定

- 数据来源：`metrics/snapshots/<sprint>.json`，仪表板只读快照，不直查事件流；
- 每次打开刷新快照（仪表板 header 自带 Reload，不另建刷新按钮）；
- 仅可加载 Chart.js / Grid.js / Mermaid（如用 Cowork artifact）；
- 禁止 `localStorage` 存敏感数据（维度切片可用内存 state）。

---

## 7. 反馈闭环（Check → Act）— loop engineering 的核心

### 7.1 Retro Action Item 结构化

Retro 产出不再是纯文本，必须落为结构化 action：

```yaml
retro_action:
  id: "ra-2026-06-29-001"
  sprint: "Sprint 1"
  ts: 2026-06-29T17:00:00+08:00
  category: "process | tooling | skill | doc"   # 决定沉淀去向
  finding: "build→verify 门禁 30% 概率因测试 flaky 被阻断"
  action: "给 pytest 加 --retry-on-failure=2"
  owner: "team"
  due: "Sprint 2"
  status: "open"
  sinks: ["AGENTS.md", "skill:pytest-flaky"]   # 自动沉淀目标
```

### 7.2 自动沉淀协议（Act → 知识复利）

`category` 决定写入去向，由反馈引擎自动执行：

| category | sink | 写入方式 |
|----------|------|---------|
| `process` | `AGENTS.md` 项目专属约定 | 追加到"业务规则/已知陷阱"节，标注来源 Sprint |
| `tooling` | `AGENTS.md` 或 comet-guard 检查项 | 改 guard 检查逻辑或加 check |
| `skill` | 新增/更新 Skill | 调 `save_skill`，内容为可复用操作指南 |
| `doc` | 对应 docs/ 文档 | 更新规范文档 |

**铁律**：每条 action 必须有 sink；无 sink 的 action 拒绝收尾。这保证 A 的产出一定进入下一个 Sprint 的 P。

### 7.3 度量喂回 Planning（C → P）

下一个 Sprint Planning 前，反馈引擎从快照生成"改进输入"：

```yaml
planning_input:
  sprint: "Sprint 2"
  velocity_trend: [18, 22, 21, 19]      # 近 4 Sprint，下降则预警
  top_blockers:                         # blocked_count 最高的 stage/原因
    - { stage: "build", count: 4, root: "test flaky" }
  capacity_suggestion: 20               # 基于 velocity 趋势的建议容量
  carryover: ["user-login (archive 未完成)"]
  retro_actions_open: 3                 # 未关闭的 action 数
```

Plan Agent 必须读取此输入后再拆解 Sprint Backlog（写入 sprint-planning-template 的"AI 辅助拆解"节）。

### 7.4 异常告警（C → 实时）

阈值触发即标记，不阻断流水线但写入仪表板告警区：

| 条件 | 告警 |
|------|------|
| `flow.guard_pass_rate` < 60% | 🔴 流程阻塞高发 |
| `agent.failure_rate` > 30% | 🔴 后端故障 |
| `quality.coverage` < 80% | 🟡 覆盖率缺口 |
| `quality.security_high` > 0 | 🔴 安全高危 |
| `flow.blocked_count` 同 stage 连续 3 Sprint 上升 | 🟡 系统性瓶颈 |

---

## 8. 与 comet / harness 的衔接点

| 衔接点 | 协议 |
|--------|------|
| comet `advance` 成功后 | comet-driver 调 `collect-comet`，追加 `stage.duration` / `flow.*` 事件 |
| harness `run_task` 返回后 | stage-executor 调 `collect-harness`，追加 `agent.*` 事件 |
| build→verify guard 运行时 | guard 输出 coverage/lint/security 数值，driver 转发 `collect-quality` |
| archive 阶段 | 反馈引擎读 Sprint 全量事件 → 生成 snapshot + planning_input + retro action 草案 |

**约束**：采集不得阻塞状态机推进。采集失败只记 warn，不让 pipeline blocked（采集是观察者，不是门禁）。

---

## 9. 隐私与反博弈

1. **禁止个人归因**：所有事件 `dims` 不得含 `author` / `person`；`delivery.cycle_time` 只到 PR 级，不到个人。
2. **聚合优先**：仪表板展示的最细粒度是 team × sprint，不下钻到个人。
3. **数据保留**：events.jsonl 保留 6 Sprint，之后归档到 `metrics/archive/`；快照永久保留。
4. **博主动作检测**：`delivery.code_churn` 异常突增（>2σ）标记为"疑似 game metric"，仅用于提醒 PO 复核度量口径，不追究个人。

---

## 10. 验收标准

- [ ] 四个采集 adapter 能从各自数据源产出符合 §3.1 schema 的事件，幂等去重
- [ ] `metrics/events.jsonl` 可被聚合为 `snapshots/<sprint>.json`，含 §4 全部指标
- [ ] Sprint 健康度仪表板展示四类区块，数据来自快照
- [ ] Retro action 经反馈引擎按 §7.2 自动写入 AGENTS.md / Skill，无 sink 拒绝收尾
- [ ] Sprint Planning 能消费 `planning_input`，Plan Agent 据此调整容量建议
- [ ] 异常告警阈值生效，告警出现在仪表板
- [ ] 全程无个人归因，`dims` 不含 author/person 字段
- [ ] 采集失败不阻塞 comet 推进（观察者不门禁）
