# Harness 多后端适配器规范 (HARNESS-ADAPTER-SPEC)

> **本文档定义 harness 执行层的多后端适配契约。** 任何 Agent 后端（codex / claude / hermes / opencode / …）接入研发流水线，必须实现本规范的 `AgentBackend` 接口。
>
> 配套文件：[`COMET-STATE-SPEC.md`](./COMET-STATE-SPEC.md)（状态机层） · [`AGENTS.md`](../../AGENTS.md)（Agent 协作规范）

---

## 1. 范围与目标

本规范定义"如何用统一的任务契约，驱动多种异构 Agent 后端（CLI / SDK / HTTP 混合调用）产出研发产物"。

**设计原则**：
- **语义层统一，传输层各异** —— 所有后端接受同一个 `Task`，返回同一个 `Result`；调用方式（CLI/SDK/HTTP）封装在 adapter 内部。
- **默认 codex，可扩展** —— codex 为默认后端；claude / hermes / opencode 等通过实现 adapter 接入，互不侵入。
- **与状态机解耦** —— harness 只管"跑任务、出产物"，不感知 Comet 五阶段状态；状态推进由 `comet-driver` 独占。

**不在范围内**：Comet 状态机本身（见 COMET-STATE-SPEC）、度量采集与分析（另见度量层规范，待补）。

---

## 2. 与 COMET-STATE-SPEC 的关系

```
comet-driver (状态机) ──advance──► [stage=active]
                                        │
                                        │ 阶段执行器调用 harness
                                        ▼
                              harness.run_task(Task)
                                        │
                          ┌─────────────┼─────────────┐
                          ▼             ▼             ▼
                     CodexBackend  ClaudeBackend  ... (按路由)
                          │             │             │
                          ▼             ▼             ▼
                    产出文件到 COMET §7 约定的 artifacts 路径
                                        │
                                        ▼
                              comet-guard 检查产物 → driver 推进
```

**职责边界**：
| 层 | 职责 | 不做 |
|----|------|------|
| `comet-driver` | 状态机推进、门禁调度、历史记录 | 调用 Agent |
| **harness（本规范）** | 接收 Task、选后端、跑任务、校验产物、返回 Result | 推进 stage |
| `comet-guard` | 产物存在性/质量门禁 | 跑 Agent |

**固定顺序**：harness 产出 → guard 检查 → driver 推进。三者不可越序。

---

## 3. 分层架构

```
┌──────────────────────────────────────────────────────────┐
│  语义层（统一）                                            │
│  AgentBackend.run_task(Task) → Result                     │
│  AgentBackend.probe() → Health                            │
│  AgentBackend.capabilities() → Capabilities               │
└────────────────────────┬─────────────────────────────────┘
                         │ 适配器实现
┌────────────────────────┼─────────────────────────────────┐
│  传输层（各异）          │                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │ CLITransport │  │ SDKTransport │  │HTTPTransport │    │
│  │ 子进程+stdout│  │ SDK 调用     │  │ REST/gRPC    │    │
│  └──────────────┘  └──────────────┘  └──────────────┘    │
│      ↓ codex          ↓ claude         ↓ hermes           │
│      ↓ opencode       (SDK/CLI二选一)  (远程服务)          │
└──────────────────────────────────────────────────────────┘
```

---

## 4. 统一任务契约

### 4.1 Task

```yaml
task:
  id: "user-login-design-plan-001"        # 任务级唯一
  pipeline: "user-login"                   # 对应 COMET pipeline id
  stage: "design"                          # open|design|build|verify|archive
  agent_role: "plan"                       # spec|plan|tdd|review|retro（对齐 COMET §7 写入者）

  goal: "为 user-login 生成实现计划"
  context:                                 # 上下文，可为文本或文件引用
    text: |
      基于 spec 与 PRD，拆解前后端任务…
    file_refs:
      - docs/api/specs/user-login.yaml
      - docs/requirements/user-login.md
  toolsets: ["terminal", "file", "web"]    # 请求的工具集
  output_path: ".hermes/plans/user-login.md"   # 产物落盘路径（== COMET §7 artifacts.<role>）
  timeout_s: 600
  backend_hint: null                       # 可选：显式指定后端，优先级最高
```

### 4.2 Result

```yaml
result:
  status: success | failure | partial
  backend: "codex"                         # 实际执行的后端
  output_path: ".hermes/plans/user-login.md"
  artifacts:                               # 附带产物（如多文件）
    - ".hermes/plans/user-login.md"
  log: "<后端原始 stdout/trace，截断>"      # 供调试与分析
  duration_s: 42
  error: null                              # failure 时填错误码+描述
```

### 4.3 产物校验（harness 必做）

`run_task` 返回前，harness 必须校验：
1. `output_path` 文件存在且非空；
2. 文件头部含 `pipeline: <pipeline>` 标识（对齐 COMET §7 约束，供 guard 的 `*-bound` 检查）。

校验失败 → `status: failure`，不返回半成品路径。

---

## 5. AgentBackend 接口

| 方法 | 签名 | 说明 |
|------|------|------|
| `run_task` | `(Task) → Result` | 执行任务，产出文件，返回结果 |
| `probe` | `() → { ok: bool, version: str, latency_ms: int }` | 健康检查，不跑真实任务 |
| `capabilities` | `() → Capabilities` | 声明该后端支持的能力 |

### Capabilities

```yaml
capabilities:
  toolsets: ["terminal", "file"]           # 支持的工具集子集
  max_context_tokens: 64000
  supports_file_output: true               # 能否直接写文件（CLI=是，HTTP 可能需回传）
  supports_parallel: true
  output_modes: ["file", "stdout"]         # 产物交付方式
```

---

## 6. 传输层实现约定

每类 transport 封装"调用 + 输出解析 + 错误归一"，对上只暴露 `run_task`。

### 6.1 CLITransport
- 拼装命令行：`<cli> --goal <goal> --context <file> --tools <list> --output <path>`
- 子进程执行，捕获 stdout/stderr/exit code；
- 产物 = `output_path` 文件（后端写盘）；
- exit≠0 或文件缺失 → `failure`。
- **适用**：codex、opencode；claude（若以 Claude Code CLI 接入）。

### 6.2 SDKTransport
- `import <backend_sdk>`，构造 client，调用对应方法；
- response 体 → 写入 `output_path`；
- 捕获 SDK 异常 → 归一为 `error`。
- **适用**：claude（若以 Claude Agent SDK 接入）。

### 6.3 HTTPTransport
- `POST <endpoint>/run`，body = Task JSON；
- 响应体或响应中的 `artifact_url` → 下载写入 `output_path`；
- HTTP 4xx/5xx/超时 → `failure`。
- **适用**：hermes（若为远程服务）。

> **后端→传输映射待确认项**：claude（CLI vs SDK）、hermes（HTTP vs CLI）的最终传输方式，由实现时探测确认；本规范允许一个后端实现多传输并按可用性自动选择。

---

## 7. 各后端适配规格

| 后端 | 默认传输 | 输入映射 | 输出解析 | 已知限制 / 备注 |
|------|---------|---------|---------|----------------|
| **codex**（默认） | CLI 或平台工具 | goal/context/toolsets → codex task | 写 `output_path`，解析结果 | 使用最多；优先探测 `codex` CLI |
| **hermes / hermess** | CLI 或平台工具 | Task JSON / goal 参数 | 写 `output_path` 或下载 artifact | 同时兼容 `hermes` 与常见拼写 `hermess` |
| **trae** | CLI 或平台工具 | 同上 | 同上 | 先做能力探测与降级 |
| **qoder** | CLI 或平台工具 | 同上 | 同上 | 先做能力探测与降级 |
| **claude-code** | CLI 或平台工具 | 同上 | 同上 | 优先探测 `claude`，其次 `claude-code` |

**新增后端流程**：实现 `AgentBackend` 三方法 + 在 `harness.backends` 注册 + 补本表一行。无需改动 comet-driver 或 guard。

---

## 8. 能力协商与降级

### 8.1 协商规则
任务执行前，harness 取 `backend.capabilities()`，与 `Task.toolsets` 比对：
- `Task.toolsets ⊆ capabilities.toolsets` → 正常执行；
- 否则进入降级。

### 8.2 降级策略（按优先级）
1. **回退默认后端**：若 `backend_hint` 指定的后端能力不足，回退到 `harness.default_backend`（codex）；
2. **裁剪 toolsets**：若默认后端也不全支持，裁剪不支持的项，并在 `context.text` 注明"已移除 X 工具能力，请据此调整产出"；
3. **拒绝**：若裁剪后任务无法完成（如必须 `terminal` 但无后端支持），返回 `status: failure, error: NO_CAPABLE_BACKEND`。

### 8.3 能力声明必须诚实
`capabilities()` 返回的能力必须经 `probe` 实测可得；虚报能力导致 run_task 失败，记为后端故障（连续 3 次 → 标记后端不可用）。

---

## 9. 后端选择与路由

### 9.1 配置（`harness.yaml`，与 `.comet.yaml` 同级）

```yaml
default_backend: codex
backends:
  codex:       { transport: auto, enabled: true }
  hermes:      { transport: auto, enabled: true }
  trae:        { transport: auto, enabled: true }
  qoder:       { transport: auto, enabled: true }
  claude-code: { transport: auto, enabled: true }

# 可选：按 stage 路由
stage_backend:
  build: claude        # 编码阶段偏好 claude
  verify: codex        # 审查阶段偏好 codex
```

### 9.2 路由优先级
`Task.backend_hint` > `stage_backend[stage]` > `default_backend`。

被选后端 `enabled: false` 或 `probe` 失败 → 降级到下一优先级，并在 Result.log 记录"路由降级"。

---

## 10. 与 comet-driver 的衔接

### 10.1 阶段 → Agent 任务映射（对齐 COMET-STATE-SPEC §7）

| Comet stage | agent_role | output_path（= COMET artifacts） | 触发时机 |
|-------------|-----------|----------------------------------|---------|
| open | spec | `docs/api/specs/<pipeline>.yaml` | stage=active 期间，guard open→design 前 |
| design | plan | `.hermes/plans/<pipeline>.md` | guard design→build 前 |
| build | tdd | `backend/tests/test_<pipeline>.py` 等 | guard build→verify 前 |
| verify | review | `docs/process/sprint-reviews/<pipeline>.md` | guard verify→archive 前 |
| archive | retro | `docs/process/sprint-retros/<pipeline>.md` | archive 阶段内 |

### 10.2 调用顺序（不可越序）
1. `comet-driver <p> advance` 进入 `stage=active`；
2. **阶段执行器**（独立组件，非 driver）组装 Task → `harness.run_task`；
3. harness 产出文件到 `output_path`；
4. `comet-driver <p> advance` 再次调用 → guard 检查产物 → 通过则推进。

> **注意**：`comet-driver advance` 在 stage=active 且产物未就绪时，应跑 guard 返回 `blocked`（产物缺失），而不是自行调 Agent。调 Agent 是阶段执行器的职责。此约定保持状态机纯净。

### 10.3 阶段执行器（Stage Executor）
介于 `comet-driver` 与 harness 之间的薄组件，闭合"谁调 Agent"的职责链。

| 职责 | 说明 |
|------|------|
| 监听状态 | 订阅 pipeline 的 `stage=active`（由 driver `advance` 写入） |
| 组装 Task | 按 §10.1 映射填 goal / context / toolsets / output_path |
| 调用 harness | `harness.run_task(Task)`，校验 Result.status |
| 产物就绪 | 成功则产物已在 output_path，等待 driver 下一次 `advance` 触发 guard |

**不做**：状态推进（driver 独占）、门禁判定（guard 独占）、后端选择（harness 内部）。

完整职责链：`driver`（状态）→ `stage-executor`（编排）→ `harness`（执行）→ `guard`（检查）→ `driver`（推进）。四组件职责互斥，无空隙、无重叠。

---

## 11. 错误模型与重试

| 场景 | harness 行为 | Result.status |
|------|-------------|---------------|
| 后端 `probe` 失败 | 路由降级到次优后端 | success（若降级成功）/ failure |
| 任务超时 | 终止后端调用，不写半成品 | failure, error=TIMEOUT |
| 产出校验失败（文件空/缺 pipeline 标识） | 不返回 output_path | failure, error=OUTPUT_INVALID |
| 后端抛异常 | 捕获归一 | failure, error=BACKEND_ERROR |

**重试策略**：
- harness 层：同一 Task 同后端最多重试 2 次（指数退避）；仍失败则换后端 1 次。
- comet-driver 层：`retry` 命令只重跑 guard，**不重跑 Agent**。Agent 任务重跑由阶段执行器显式重新发起。
- 两层重试不叠加，避免风暴。

---

## 12. 验收标准

- [ ] 四个后端（codex/claude/hermes/opencode）至少各实现 `run_task/probe/capabilities`，codex 可端到端跑通
- [ ] 同一个 Task 切换 `backend_hint` 能在 ≥2 个后端上产出符合 COMET §7 的产物
- [ ] 能力不足时按 §8.2 降级，降级路径写入 Result.log
- [ ] 产物路径与 COMET-STATE-SPEC §7 完全一致，guard 的 `*-bound` 检查可通过
- [ ] 后端不可用时路由降级不阻塞流水线（除非无任何可用后端）
- [ ] 新增后端无需改动 comet-driver / comet-guard
