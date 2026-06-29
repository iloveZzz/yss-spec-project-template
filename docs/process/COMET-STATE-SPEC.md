# Comet 状态机驱动器规范 (COMET-STATE-SPEC)

> **本文档是 Comet 状态机的可实现规范。** 任何 Agent 或工程师实现 `comet-driver` / 改造 `comet-guard.sh` 时，必须以本文档为唯一契约。
>
> 配套文件：[`COMET.md`](./COMET.md)（概念入门） · [`scripts/comet-guard.sh`](../../scripts/comet-guard.sh)（现有门禁，待改造） · [`.comet.yaml`](../../.comet.yaml)（状态存储）

---

## 1. 范围与目标

本规范定义 Comet 流水线的**状态机模型、状态存储 schema、门禁契约、驱动器接口**，使五阶段流水线（Open→Design→Build→Verify→Archive）从"文档约定"变为"可被程序驱动、可记录历史、可被分析"的闭环。

**不在本规范范围内**：Agent 编排引擎（delegate_task 的实现）、度量采集与分析（另见度量层规范，待补）。

---

## 2. 现状缺口

| # | 缺口 | 现状 | 影响 |
|---|------|------|------|
| G1 | status 枚举未定义 | `.comet.yaml` 仅 `{ status: pending }`，无 active/blocked/passed 区分 | 无法表达"进行中/阻塞/通过" |
| G2 | 状态机与门禁脱节 | `comet-guard.sh` 不读 `.comet.yaml`，检查全局任意文件 | 门禁通过 ≠ pipeline 推进 |
| G3 | 产物未绑定 pipeline | guard 查 `docs/api/specs/*` 任意 yaml、`.ysscomet/plans/*` 任意 md | A 的 spec 能让 B 过门禁 |
| G4 | 门禁不阻断 | `build→verify` 用 `\|\| true` 兜底 | 测试失败仍可推进 |
| G5 | 无历史与产物挂载 | 无 entered_at/passed_at、无 guard 结果、无产物路径字段 | 无法做耗时/失败率分析 |

---

## 3. 状态机模型

### 3.1 实体

- **Pipeline**：一个 feature 对应一个 pipeline，`id` 为 kebab-case，全局唯一。
- **Stage**：固定五阶段，顺序不可变：`open → design → build → verify → archive`。
- **Transition**：相邻 stage 之间的单向转换，共 4 个：`open→design`、`design→build`、`build→verify`、`verify→archive`。

### 3.2 Stage Status 枚举

| status | 含义 | 可执行动作 |
|--------|------|-----------|
| `pending` | 未进入 | — |
| `active` | 当前进行中 | 同一时刻**全 pipeline 仅一个** stage 为 active |
| `blocked` | 门禁失败 | `retry` 重跑本阶段门禁 |
| `passed` | 门禁通过 | 可推进到下一 stage |
| `skipped` | 显式跳过（需 `--force` + 审批记录） | 仅限非首尾 stage，必须在 `guard.note` 记原因 |

### 3.3 不变量（驱动器必须维护）

1. **I1 — 单点活跃**：任一 pipeline 同一时刻最多一个 stage 为 `active`。
2. **I2 — 单向推进**：`current_stage` 只能沿 open→design→build→verify→archive 前进，不允许回退（回退 = 新建 pipeline 或 `reopen` 显式标记并记审计）。
3. **I3 — 通过才能推进**：`current_stage` 推进到下一阶段前，当前 stage 必须为 `passed`（`skipped` 视同 passed 但留审计）。
4. **I4 — 门禁先行**：推进 = 跑门禁 → 通过 → 写下一 stage 的 `entered_at` + 当前 stage 的 `passed_at` + `current_stage` 前移。任一步失败回滚为 `blocked`。

### 3.4 状态转换图

```
   ┌────────┐  advance   ┌────────┐  advance   ┌────────┐  advance   ┌────────┐  advance   ┌────────┐
   │  open  │ ─────────► │ design │ ─────────► │ build  │ ─────────► │ verify │ ─────────► │ archive│
   └────────┘            └────────┘            └────────┘            └────────┘            └────────┘
       │  fail               │  fail               │  fail               │  fail
       ▼                     ▼                     ▼                     ▼
   blocked ──retry──► active  (任一 stage 门禁失败 → blocked；retry 重跑，通过则恢复推进)
```

---

## 4. 状态存储 Schema（`.comet.yaml` v1.1）

### 4.1 完整示例

```yaml
meta:
  version: "1.1"
  template: "yss-spec-project-template"

pipelines:
  user-login:
    title: "用户登录"
    sprint: "Sprint 1"
    created_at: 2026-06-29T10:00:00+08:00
    current_stage: design        # 指向当前 active/pending 的 stage
    workflow: full
    auto_transition: null
    handoff_context: null
    handoff_hash: null
    spec: docs/api/specs/user-login.yaml

    artifacts:                   # 产物挂载点：驱动器读写、guard 按此检查
      spec:    docs/api/specs/user-login.yaml
      plan:    .ysscomet/plans/user-login.md
      tests:   backend/tests/test_user_login.py   # 可为数组
      review:  docs/process/sprint-reviews/user-login.md
      retro:   docs/process/sprint-retros/user-login.md

    stages:
      open:
        status: passed
        entered_at: 2026-06-29T10:00:00+08:00
        passed_at: 2026-06-29T11:02:00+08:00
        guard:
          result: pass
          ran_at: 2026-06-29T11:02:00+08:00
          checks:
            - { id: spec-exists,     pass: true }
            - { id: spec-yaml-valid, pass: true }
            - { id: spec-lint,       pass: true }
      design:
        status: active
        entered_at: 2026-06-29T11:05:00+08:00
        guard: null
      build:    { status: pending }
      verify:   { status: pending }
      archive:  { status: pending }

    history:                     # 转换审计轨迹（分析数据源）
      - { at: 2026-06-29T10:00:00+08:00, action: create,  stage: open }
      - { at: 2026-06-29T11:02:00+08:00, action: advance, from: open, to: design, result: pass, duration_s: 3720 }
```

### 4.2 字段语义

| 字段 | 必填 | 说明 |
|------|------|------|
| `pipelines.<id>.title` | 是 | 人类可读名称 |
| `pipelines.<id>.sprint` | 否 | 所属 Sprint |
| `pipelines.<id>.current_stage` | 是 | 当前 stage 名，必须等于唯一 active/pending 的 stage |
| `pipelines.<id>.workflow` | 否 | 工作流类型，当前默认 `full` |
| `pipelines.<id>.auto_transition` | 否 | 覆盖 `.ysscomet/config.yaml` 的自动流转提示开关；第一版只提示下一步，不自动执行 |
| `pipelines.<id>.handoff_context` | 否 | 最近一次阶段交接上下文路径 |
| `pipelines.<id>.handoff_hash` | 否 | handoff context 文件 SHA256 |
| `pipelines.<id>.spec` | 是 | 主契约路径（向后兼容 v1.0） |
| `pipelines.<id>.artifacts.*` | 视阶段 | 五类产物路径，驱动器按 stage 取对应项 |
| `stages.<s>.status` | 是 | 见 §3.2 枚举 |
| `stages.<s>.entered_at` | 非 pending 时必填 | 进入该 stage 的 ISO8601 时间戳 |
| `stages.<s>.passed_at` | passed 时必填 | 门禁通过时间戳 |
| `stages.<s>.guard` | 跑过门禁时必填 | 门禁结果对象 |
| `stages.<s>.guard.result` | 是 | `pass` / `fail` |
| `stages.<s>.guard.checks[]` | 是 | 逐项检查结果，含 `id` / `pass` / 可选 `detail` |
| `history[]` | 是 | 全量审计，每次 create/advance/retry/skip 各一条 |

---

## 5. 五阶段门禁契约

每个 transition 的门禁由 `comet-guard.sh`（改造后）执行，驱动器调用并消费其结构化输出。

| 转换 | 输入产物 | 检查项（checks[]） | 通过动作 | 失败动作 |
|------|---------|-------------------|---------|---------|
| `open→design` | `artifacts.spec` | `spec-exists`：文件存在 · `spec-yaml-valid`：可被 yaml 解析 · `spec-lint`：通过 OpenAPI lint（如 spectral） | 写 `design.entered_at` + `open.passed_at` + `open.guard` | `open.status=blocked`，记 `guard.result=fail` |
| `design→build` | `artifacts.plan` | `plan-exists`：文件存在 · `plan-sections`：含必备章节（目标 / 任务拆解 / 风险 / DoD） · `plan-bound`：文件内 `pipeline:` 字段 == 当前 pipeline id | 写 `build.entered_at` + `design.passed_at` | 同上 → `design.status=blocked` |
| `build→verify` | `artifacts.tests` + 测试运行 | `unit-pass`：pytest/vitest 0 失败（**去掉 `\|\| true`**） · `coverage`：新增代码覆盖率 ≥ 阈值（默认 80%） · `lint`：0 error · `security`：0 high/critical | 写 `verify.entered_at` + `build.passed_at` | → `build.status=blocked` |
| `verify→archive` | `artifacts.review` | `review-exists`：文件存在 · `review-signed`：含审查结论与签字行 · `review-no-high`：无未解决的 high 级 issue | 写 `archive.entered_at` + `verify.passed_at` | → `verify.status=blocked` |

**门禁输出协议**（guard 脚本以 JSON 输出到 stdout 供驱动器解析）：

```json
{
  "transition": "build_verify",
  "pipeline": "user-login",
  "result": "fail",
  "checks": [
    { "id": "unit-pass", "pass": false, "detail": "2 failed in test_user_login.py" },
    { "id": "coverage", "pass": true, "detail": "86%" }
  ]
}
```

---

## 6. 驱动器接口规范

实现为 `scripts/comet-driver`（语言不限，建议 Python 以利 yaml/json 处理）。

```
comet-driver <pipeline> init   --spec <path> --sprint <name> [--title <t>]
comet-driver <pipeline> advance [--force]
comet-driver <pipeline> retry
comet-driver <pipeline> status
comet-driver <pipeline> history
comet-driver <pipeline> skip   <stage> --reason <text>      # 需 --force，记审计
```

| 命令 | 行为 |
|------|------|
| `init` | 创建 pipeline：写 v1.1 schema，`open.status=active`，append history `create` |
| `advance` | 校验 I3 → 调 guard → pass 则按 §5 写 yaml + 前移 `current_stage` + append history；fail 则置 blocked |
| `retry` | 仅当当前 stage 为 blocked 时允许；重跑 guard，通过则恢复 |
| `status` | 打印 pipeline 摘要：current_stage、各 stage status、最近 guard.result |
| `history` | 打印 `history[]`，含每次 advance 的 `duration_s` |
| `skip` | 显式跳过非首尾 stage，记 `guard.note` + 审计；违背 I3 时拒绝 |

**驱动器职责边界**：只负责状态机维护与 guard 调度；**不**负责生成 spec/plan/review（那由阶段执行器调 harness 完成，见 [HARNESS-ADAPTER-SPEC §10.3](./HARNESS-ADAPTER-SPEC.md)）。

---

## 7. 产物挂载与命名约定

| Stage | 产物类型 | 默认路径 | 写入者 |
|-------|---------|---------|--------|
| open | spec | `docs/api/specs/<pipeline>.yaml` | OpenSpec Agent |
| design | plan | `.ysscomet/plans/<pipeline>.md` | Plan Agent |
| build | tests | `backend/tests/test_<pipeline>.py` 等 | TDD Agent |
| verify | review | `docs/process/sprint-reviews/<pipeline>.md` | Review Agent |
| archive | retro | `docs/process/sprint-retros/<pipeline>.md` | Retro Agent |

**约束**：每个产物文件**必须**在头部含 `pipeline: <id>` frontmatter（或注释行），供 `plan-bound` 等检查项验证归属，杜绝 G3（A 的产物让 B 过门禁）。

### 7.1 运行配置与交接上下文

项目级配置文件为 `.ysscomet/config.yaml`，缺失时驱动器使用以下默认值且不自动写文件：

```yaml
auto_transition: false
context_compression: off
default_backend: stub
required_tools: openspec,superpowers
```

`design→build` 门禁通过后，驱动器生成 `.ysscomet/handoff/<pipeline>/design_build.json`，记录 pipeline、from/to stage、spec/plan 路径、文件存在性、SHA256 和 `generated_at`，并将路径与 hash 写回 `.comet.yaml` 的 `handoff_context`、`handoff_hash`。

---

## 8. 失败 / 阻塞 / 重试语义

1. 门禁失败 → `stage.status=blocked`，`current_stage` 不前移，history 追加 `action=advance, result=fail`。
2. `retry` 重跑同阶段门禁，不重置 `entered_at`；通过则 `passed` 并推进。
3. 连续失败 ≥ 3 次 → `status` 标记 `blocked` 且在 `guard.note` 写 `needs-human`，驱动器 `advance` 拒绝执行直至人工干预。
4. `--force` 仅用于 `skip` 与"明知风险仍推进"，每次必留审计，并在 `status` 输出中高亮。

---

## 9. 与现有文件的改造映射

| 文件 | 改造 |
|------|------|
| `.comet.yaml` | schema 升级到 v1.1（§4）；驱动器读取时若遇 v1.0 自动补默认值（向后兼容） |
| `scripts/comet-guard.sh` | 重构为"按 pipeline 读 yaml.artifacts → 检查 → 输出 §5 JSON"；去掉 `\|\| true`；新增 lint/coverage/security 检查项 |
| `scripts/comet-driver` | **新增**，实现 §6 |
| `docs/process/COMET.md` | 补一句"实现规范见 COMET-STATE-SPEC.md"，避免概念文档与规范文档漂移；现有 `bash comet-guard.sh <p> <from> <to>` 示例改为 `comet-driver <p> advance` |
| `README.md` | 四层体系表 Layer 3 的 Comet 列由 `.comet.yaml + comet-guard.sh` 补为 `.comet.yaml + comet-driver + comet-guard.sh` |
| `AGENTS.md` | 在"Comet 五阶段流水线"节注明 current_stage 推进必须经 `comet-driver advance`，禁止手改 yaml |
| 产物模板（spec/plan/review/retro） | 头部补 `pipeline: <id>` frontmatter 约定 |

---

## 10. 验收标准（本规范实现的 Definition of Done）

- [ ] `comet-driver init` 能创建符合 §4 的 v1.1 pipeline
- [ ] 四个 transition 的 guard 全部按 §5 输出 JSON，且 `build→verify` 在测试失败时阻断
- [ ] G1–G5 五个缺口均有对应机制消除
- [ ] `history` 能输出每次 advance 的 `duration_s`，可作为分析数据源
- [ ] v1.0 旧 yaml 可被驱动器读取并自动升级，不报错
- [ ] 用一个真实小 feature 走完 open→archive，state 与 history 一致
