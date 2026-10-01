# SDD 模板 Node/Python 执行效率与工具选型深度研究

## Research Scope

- Profile：`technical-evidence`；Mode：`evidence-audited`；访问日期：2026-10-01（Asia/Shanghai）。
- 读者与决定：模板维护者评估下一轮性能优化范围；本研究不批准替换运行时、验证器、生命周期或发布机制。
- 时间范围：当前源码与当前可访问官方资料；历史报告仅辅助定位。
- 根身份：`template-source`，用于构建项目实例的 SDD 研发规格流程。源码基线 `32192e5463101b58a5456fdf9228a7048f5d4f23`。
- 纳入：当前源码、可复现隔离实验、官方文档、GitHub 第一方源码/维护者说明。排除：未经核验的搜索摘要、第三方性能宣传、HTTP 吞吐外推、stars 排名。
- 详细边界见 [scope.md](scope.md)，证据权威为相邻 [execution-efficiency-evidence.yaml](execution-efficiency-evidence.yaml)。

## Executive Read

建议优先保留 Node 主执行路径，优化重复工作与校验器边界，再评估 Nx/moon。现有源码已经有批处理、同次验证缓存、并发、去重和资源锁；“从零加入这些能力”的收益不能再次计算。

本轮最有价值的实测是：一个真实任务包 Schema 的 20 项校验，逐项 Python 为 **1373 ms**，现有批处理为 **116 ms**，Ajv standalone 为 **36.6 ms**。Ajv 相对已有批处理的耗时减少约 **68.4% / 3.16 倍速度**，仅限该样本。它比“全部换 Bun”更值得做下一轮语义等价试点。Bun 对真实查询和计划生成仅减少约 **15.0% 和 4.8%**，虽然空进程启动快约 5.1 倍。

本轮当前 fast 验证实际通过，耗时 **340 秒**，其中工具链测试命令约 **321 秒（94.4%）**。仅新增研究资产也触发该工具链组，说明影响面映射与测试准备值得优先排查。历史 268 秒/241 秒报告另作线索；不同输入和环境不能计算性能升降。优化这些分钟级工作，潜力高于优化一次约 100 ms 的查询。

如果必须引入一个任务框架，首选评估 **Nx**，并以 **moon** 作对照：前者便于包裹任意现有命令，后者的显式 mutex 与异构脚本匹配。两者都不自动继承 YSS 的依赖闭包、源漂移、审批、Fresh Verification 和固定 CLI 分发规则。

## Findings

### 1. 先区分三种效率

**claim-001、claim-002**。脚本 CPU/启动时间、验证任务总时间、完整 SDD 周期是三个不同指标。目录里脚本多不等于语言执行慢。本轮跟踪的 `scripts` 与 `.template-source/scripts` 共 322 个文件，其中带 shebang 的入口为 Node 125、Python 3、Shell 4；这不是调用频次统计，也不包含全部 Skill/子仓入口。Node 内仍会调用 Python。

当前源码已有以下机制：

| 位置 | 已有机制 | 仍需解决的边界 |
|---|---|---|
| `scripts/lib/json-schema.mjs` | `validateJsonSchemas` 一次 Python 处理多项；相同项去重；同验证阶段缓存 | 不同进程/不同阶段仍有启动和导入成本；外部 `$ref` 不缓存 |
| `scripts/lib/validation-phase.mjs` | 单次不可变快照、路径/文件观测、结束复核漂移、阶段 memo | 不能据此建立跨阶段“已批准”缓存；常驻进程也必须重新建 phase |
| `scripts/lib/template-verification-runner.mjs` | command/cwd/condition 去重、lane 并发、资源锁、落盘日志及失败控制 | 粗任务内部的重复扫描/子进程不自动消失；锁不是跨独立进程的全局锁 |
| `scripts/lib/verification-selection.mjs` | baseline/candidate、shadow、allowlist 资格与依赖闭包 | 先保证 inputs 完整及反例无遗漏，再扩展剪枝 |

定位见 `benchmarks/source-baseline.json` 与台账 `evidence-001` 至 `evidence-004`。本轮 CPU profile 的少量样本出现 YAML 解析、registry 处理和 GC，仅作定位线索，不据此分配整个 SDD 耗时比例。

### 2. 当前机器实测：换运行时的收益比宣传小

**claim-003、claim-004**。机器/版本详见 `benchmarks/benchmark.json`：macOS ARM、Node 24.21.0、Bun 1.3.14、Python 3.12.1。每种命令在单机串行执行，首轮单独记录，另做两次预热，再按固定随机次序跑 11 个样本。以下为墙钟中位数，包含启动、输出捕获，文件系统已热；没有清 OS 缓存，不是全新机器冷启动。

| 工作负载 | Node | Node 编译缓存（热） | Bun | Bun 相对 Node 耗时减少 |
|---|---:|---:|---:|---:|
| 空进程 | 27.7 ms | 未测 | 5.4 ms | 80.5% |
| 仓库身份查询 | 36.1 ms | 未测 | 25.7 ms | 28.9% |
| 生命周期 route 查询 | 100.1 ms | 94.9 ms | 85.1 ms | 15.0% |
| README 变更的验证计划生成 | 232.5 ms | 241.8 ms | 221.4 ms | 4.8% |

查询的 p95 为 Node 109.2 ms、Bun 89.9 ms；计划 p95 为 Node 266.5 ms、Bun 257.1 ms。11 样本的 p95 用 nearest-rank，等于该组最大值，不是稳定生产尾延迟。计划样本区间重叠，4.8% 的中位数差异不宜视为可靠长期收益。

三个命令的 stdout 字节一致；JSON 完整解析成功；非法 stage 在 Node/Bun 下均 exit=1 且 stderr 一致。这只支持所测命令，未验证全部 CLI、Node test runner、子进程终止、流背压或跨平台兼容。

Node 编译缓存使查询中位数减少 **5.2%**，计划中位数反而增加 **4.0%**。官方说明它缓存模块编译而非业务结果，首轮可能变慢，并有覆盖率精度注意事项。[Node module compile cache](https://nodejs.org/api/module.html#module-compile-cache)。本次 v24 定向网页打开失败，版本功能通过本机运行确认；通用文档不能证明最新选项都适用于 v24。

Bun 官方仍列出 `child_process`、`async_hooks`、`node:test` 等兼容差异；现有源码恰好消费这些接口。官方当前页面与本机 Bun 版本不同，只能作为必须建立兼容矩阵的依据。[Bun compatibility](https://bun.com/docs/runtime/nodejs-compat)。不建议全面切换。

### 3. Schema 是可量化的优化点，但批处理已经存在

**claim-005、claim-006**。本机 Python 空启动约 **17.4 ms**，导入 `jsonschema` 的完整进程约 **66.4 ms**。这解释了短校验反复跨进程时的固定成本。

隔离试验使用仓库真实 `digital-human-task-package.schema.json` 和一份历史 owner-task 作为数据，构造 20 个不同 task_id 的输入，循环覆盖六类条件。每模式预热一次、计时三次：

| 实验路径 | 中位数 | 相对现有 Python batch | 说明 |
|---|---:|---:|---|
| Node 逐项启动 Python 20 次 | 1372.5 ms | 更慢 | 用作反复跨进程的对照，不代表所有当前调用点 |
| 当前 `validateJsonSchemas` 批量 20 项 | 115.9 ms | 基线 | 当前已有能力 |
| Ajv2020 在每个 Node 进程现编译 | 85.4 ms | 少 26.3% | 仍支付 schema 编译成本 |
| Ajv2020 standalone 预编译 | 36.6 ms | 少 68.4%，速度 3.16 倍 | 未含预编译产物构建成本 |

逐项改 batch 减少 **91.6%**，只对仍然逐项跨进程的调用点有效，不能作为尚待开发的新全仓收益。Ajv 8.20.0、ajv-formats 3.0.1 仅安装在仓库外实验目录，没有改项目依赖。

20 项的结构通过/拒绝布尔结果一致，但**没有验证错误文本、错误顺序或全部语义**。六类条件里，“contract_version 改为非空字符串”被两种验证器同时接受；不能把它称为成功拒绝的反例。公开 schema 接受的形状与项目语义验证是不同层。

建议下一轮做 Ajv2020 standalone 影子验证：保留现有公共 seam，对有效数据、畸形数据、`format`、`oneOf`、`unevaluatedProperties`、外部 `$ref`、`$dynamicRef`、大整数、错误路径/排序逐项比较；严格关闭类型强转、补默认值和删除字段。生成物绑定源 schema、Ajv/format 版本和选项摘要，按现有 vendor/投影分发脚本再生成，禁止手改。动态或未知 schema 保留 Python fallback。[Ajv 编译与复用](https://ajv.js.org/guide/managing-schemas.html)、[2020-12 支持](https://ajv.js.org/json-schema.html)、[formats](https://ajv.js.org/guide/formats.html)。

### 4. 更大的瓶颈线索在集成测试与影响面选择

**claim-007、claim-008**。本轮执行 `scripts/verify-template-fast --concurrency 1`：passed，wall=339982 ms，input_drift=false；工具链命令 320927 ms（占 94.4%），Node 测试 185/185 通过，Python 测试 39/39 通过。原始报告与日志归档在 `verification-fast/`。Node 测试自身计时约 263.5 秒，与外层命令相差约 57.4 秒；这提示需要单独测准备阶段，但目前不能把全部差值归因于快照准备。

本次只有研究目录新增文件，却命中 `.template-source/** → tooling` 的宽路由，从而执行工具链整组。可研究把证据资产验证与工具代码验证的输入关系细化；不能直接删除检查，必须先证明必跑集和反例覆盖。

读取现存 `2026-10-01-large-skills-progressive-loading/fast-frozen-copy/report.json`：passed，input_drift=false，31 条唯一命令，wall=267822 ms；工具链测试 240900 ms，其中历史日志的慢项包括后端 Handoff 76.2 秒、M4 迁移 60.6 秒、独立治理项目初始化/恢复 33.3 秒、插件构建 21.0 秒。子测试嵌套时不能把全部行相加。

`test-with-plugin-clis.mjs` 当前会准备固定 CLI checkout、重建固定快照，再以 `--test-concurrency=1` 跑测试。研究建议：先拆分准备/执行计时，复用不可变依赖准备产物，再验证独立 fixture 的并行条件。不要直接改成全并行；Git 状态和生成目录共享时仍需隔离或串行。

本轮仅输出计划、不执行检查的探针：README → fast 1 命令；`yss-userinfo/SKILL.md` → fast 10；生命周期 registry → release 108 行/106 唯一命令（不含后置语法等检查）。另发现 `scripts/lib/json-schema.mjs` 单独变更 → fast 仅 1 条 hygiene 命令。这由 `scripts/**` 兜底匹配产生，应作为**优化前优先核验的依赖覆盖风险**：该计划没有选 Schema 行为测试，但不代表全量 release/其他 CI 永远漏检，也不是已复现的业务缺陷。

现阶段不宜只追求“少跑多少检查”。先补齐和证明输入/依赖图，保留失败反例，才能让 Nx/moon/allowlist 安全地省掉无关工作。

### 5. 工具选择：先优化已有执行层，框架分层引入

**claim-009（Nx）、claim-010（moon）、claim-011（环境/入口）、claim-012（Turbo/Bazel）、claim-013（持久工作流）、claim-014（测量工具）**。下表为基于官方机制和本仓结构的研究建议；除运行时/Ajv 微基准外，未实际集成这些框架。

| 工具或方案 | 解决的问题 | 建议与成本边界 |
|---|---|---|
| 现有 Node runner + 批量 API / 受控长驻 worker | 合并相邻只读请求、复用模块初始化；每请求新建 validation phase | 优先；较小改动。worker 不是跨阶段批准缓存；需处理取消、路径隔离、内存与输入漂移 |
| Hyperfine + Node `--cpu-prof` + Python importtime/cProfile | 建立冷/热、墙钟、CPU 与子进程成本基线 | 优先测量工具，本身不加速。Hyperfine 本机未安装，本轮用可复现 Python 计时器；Node profiler 已实际运行 |
| Ajv2020 standalone | 消除短 Schema 校验的重复 Python 导入和解释成本 | 优先影子试点；语义/错误兼容与固定版本生成分发成本中等 |
| **Nx** | 任意命令任务图、内容缓存、affected、输入/环境/运行时指纹 | 首选框架候选；不用改写 Node/Python。必须显式声明依赖与输出；`.gitignore` 文件不进入普通 source inputs |
| **moon** | 异构脚本图、缓存、命名 mutex、外部状态 fingerprint | 对照候选；先用 system command。Python toolchain 当前文档仍 unstable，affected 图关系需显式纳入 |
| Turborepo | 以 package workspace 为中心的任务缓存和编排 | 能包装 Python，不是“不支持 Python”；当前治理脚本要新增 package 包装，适配收益需证明 |
| uv | Python 依赖解析、安装、环境管理和脚本依赖声明 | 推荐用于环境可复现；“比 pip 快 10–100 倍”不是 Python 计算速度提升，不会自动消除每次 jsonschema 导入 |
| mise | Node/Python 等版本与命令入口统一，任务依赖与增量 | 可作辅助工具；artifact cache 官方仍标 experimental，暂不作为正式验证缓存默认基座 |
| Task / just | 命令入口、依赖及开发便利性；Task 可做 checksum/status 检查 | 整理入口可选。just 是 command runner；已有 runner 下不能承诺明显加速 |
| Bazel | 显式 action、隔离构建与远程缓存 | 迁移 BUILD/rules、工具链和文件依赖成本高，本轮不优先 |
| Temporal / LangGraph | 长时 Agent 工作的状态持久化、恢复和人工中断 | 仅在恢复返工是主要问题时评估；新增持久化、幂等和重放约束，不直接加速 Node/Python |
| Rust/Go 改写 | 已测出的纯 CPU 热点 | 当前无端到端收益证据。先剖析；不要全量翻译脚本或把二进制打包当成速度保证 |

官方机制来源：[Nx 多语言](https://nx.dev/docs/features/multi-language-support)、[Nx inputs](https://nx.dev/docs/reference/inputs)、[moon 配置](https://moonrepo.dev/docs/config/project)、[moon v2](https://moonrepo.dev/docs/migrate/2.0)、[Turbo 多语言](https://turborepo.dev/docs/guides/multi-language)、[uv](https://docs.astral.sh/uv/)、[mise](https://mise.jdx.dev/tasks/task-configuration.html)、[Task](https://taskfile.dev/docs/guide)、[just](https://just.systems/man/en/)、[Bazel](https://bazel.build/remote/caching)、[Temporal](https://docs.temporal.io/workflow-definition)、[LangGraph](https://docs.langchain.com/oss/python/langgraph/persistence)、[Hyperfine](https://github.com/sharkdp/hyperfine)。

### 6. 预计能提升多少：按范围和条件计算

**claim-015**。收益估算由本轮研究 owner 提供，以下均为规划情景，不是已经实现的全流程收益；各行有重叠，不能相加。

| 优化 | 可用数字 | 对完整系统的正确解释 |
|---|---|---|
| Bun 替换所测短命令 | 真实命令耗时少约 5%–29%，其中查询 15% | 若查询仅占 SDD 时间 10%，换 Bun 只使全流程约少 1.5%；不支持全系统快 5 倍 |
| 现有 batch 代替剩余逐项调用 | 本样本少 91.6% | 先查剩余调用比例；已有 batch 的地方没有这笔新增收益 |
| Ajv standalone 代替现有 batch | 本样本少 68.4% | 若同类校验占脚本总耗时 15%–45%，按本样本倍率估算脚本层少 **10%–31%**；该占比尚未测出 |
| Nx/moon 的热缓存/正确剪枝 | 允许复用任务占关键路径 50%–80%，命中 70%–80%，开销约为基线 2% 时，模型少 **33%–62%** | 只是可测 POC 的情景；全冷、全变化或强制实际执行时缓存收益为 0，可能净变慢 |
| 优化集成测试热点 | 历史 268 秒中慢组为 241 秒；如果把该组减少 20%–40%，全次运行约少 **18%–36%** | 组内能否减少 20%–40% 未证明；此项是敏感性分析，不能作为承诺 |
| uv / Temporal / LangGraph | 当前没有本仓收益数据 | 前者只在安装耗时显著时改善；后两者可能减少重跑而增加正常路径开销 |

统一模型：`T_new / T_old = (1 - f) + f / s`，其中 f 是被优化部分占原总耗时比例，s 是该部分速度倍率。任务缓存模型为 `节省比例 ≈ q × h - H/T`，q 必须是关键路径上允许复用的工作比例，不能简单用命令数或并行任务时长总和代替。

若脚本耗时只占完整 SDD 的 10%–30%，且脚本层最终减少 10%–30%，则完整周期只会减少约 **1%–9%**。本仓报告里 `agent_active_ms`、`human_wait_ms`、`runtime_tokens` 均为空；因此目前不能诚实地给出一个无条件的“整个 SDD 提升 50%”。减少 Agent 工具往返和重复读材料可能更重要，需要独立记录调用次数、等待和返工再比较。

## Counter-Signals

1. 空启动、HTTP benchmark、依赖安装、校验循环、整套验证、SDD 全周期分别计量；不得跨层套用倍数。
2. Node 编译缓存的计划生成没有稳定改善；Bun 的兼容矩阵不能由三个成功入口代表。
3. Ajv 的结构决策一致不等于错误诊断/全部 `$ref` 语义一致；官方要求正确管理编译，2020-12 需对应实例，formats 需配套支持。
4. 框架缓存会重放历史日志/恢复产物，不能改称本轮 Fresh Verification。只缓存被允许的纯派生/构建输入，边界验证重新实际执行。审批、Git 状态、外部仓库与远端状态默认不缓存。
5. Nx 忽略 gitignored 输入；moon mutex 没有在本轮证明跨两个独立 CLI 的互斥，不能作为跨 Agent 全局锁；moon v2 的 Python/affected 行为存在上述限制。
6. Google 命中的 moon 竞品比较页自己提示可能过时，正文还保留旧 Turbo 描述；只用作线索，不用于否定竞品能力。GitHub 历史 issue 只用来设计兼容场景，不能宣称当前版本仍有该 bug。
7. Schema 源码变更仅选 hygiene 的计划反例说明，更激进缓存/裁剪必须先证明完整性。速度改善若来自漏测，应判失败。

## Source Map

Google：实际在浏览器搜索 `Node Python CLI startup performance task runner cache Nx moon`，命中 moon 官方对比、Nx CLI、nrwl/nx issue 和第三方博客，并打开 moon 官方页核验过时提示。Google 排名及摘要不支撑技术结论。

GitHub：实际调用公共 repository search，查询 `topic:task-runner language:Rust`，结果与 URL 保存在 `benchmarks/github-search.json`；另用 web 搜索定位 Ajv、Bun、uv 官方仓库文档/源码与反例。Stars 不作为质量或速度证据。

第一方文档支持功能与限制；本地源码支持已有实现；`benchmark.json`、`schema-benchmark.json` 支持所列计时；历史报告支持排查方向。Explorer 独立读取 Nx/moon/其他框架，主控复核了主要决策来源。未把结构校验或 subagent 身份当成来源可信度。

可复现附件见 `benchmarks/`：原始样本、命令、版本、源码摘要、CPU profile、真实计划、隔离 Ajv lockfile 及执行脚本。只读 intake 审计位于 `/tmp/yss-execution-research-20261001/frameworks-intake`，没有执行验证命令，状态明确为 `not-executed`。外部临时目录可能被系统清理；核心实验与源码基线已归档本目录。

## Decision Handoff

下游 owner：`yss-product-lifecycle` 的模板维护负责人。本研究以 `work-unit.maintenance-research` 结束，`next_route: null`；不把研究请求视作运行架构迁移批准。

建议下一轮按以下顺序开展，并先模板、存量按需迁移：

1. **建立真实完整基线**：固定同一 SHA 与工具链，输出仓库外报告；覆盖短查询、任务包/切片校验、局部文档变更、Schema 变更、完整验证。把子进程、读/解析、Git、准备 fixture、测试分开；同时记录 Agent 调用与等待。高风险 Git 状态场景串行。
2. **修正依赖覆盖并做 Ajv shadow**：验证 Schema 源的必跑集；比较现有 Python batch 与 Ajv standalone，包含失败诊断、timeout、取消、输入漂移，保持同一权威 schema 和生成管线。若不等价继续 Python。
3. **现 runner / Nx / moon 三方小范围对照**：选纯派生、固定依赖准备和隔离测试三类任务，不把整体 verify-template 单包成一个可缓存绿灯。分别测全冷、无变更热缓存、单源变更、schema/lock/runtime/ignored 文件变化、输出删除、两进程争用、跨分支和失败恢复。所有实际必跑集、输出、退出码与拒绝行为必须一致。
4. **通过试点再决定框架**：可提议以代表性日常工作负载中位数减少至少 20%、p95 不回退、漏检数为 0 作为维护者的验收目标；这是建议目标，不是既有硬门禁。若维护成本大于净收益，继续现有 runner。恢复返工占比经测量显著后，再单独研究 Temporal/LangGraph。

## Evidence Limitations

- 本轮不是完整发布验证；没有修改生产脚本、权威规范、Skill、投影、锁或分发快照，没有提交/推送/发布。
- Runtime 样本为一台机器 11 次，Schema 为三次且一个真实 schema、20 项有限变异；未测全套多 schema、跨平台、网络、真实并发和长时泄漏。
- Ajv standalone 构建、依赖安装和迁移成本未计入热执行数字；首次构建失败/动态 schema fallback 需另测。
- 没有实装 Nx/moon/Turbo/Bazel，也没有真实 Agent A/B；框架量化收益与完整 SDD 百分比均为条件模型。`needs-deeper-research` 的范围是全量兼容性、完整基线和真实 SDD 时间分布。
- 本轮 fast 运行输入无漂移；结果归档和报告补写发生在运行后，再执行研究包专项校验。该 fast 结果不冒充补写后的又一次完整运行，也不是发布验证。历史通过/失败日志另列，不作当前性能对比；CPU profile 样本很少，不作精确耗时归因。
- 研究期间其他工作将 HEAD 从 `32192e5463101b58a5456fdf9228a7048f5d4f23` 推进到 `a696e8c19d47fe84f05a6ea9384e622f322e1eca`，涉及生命周期 Skill 入口、投影、锁与 Spec CLI gitlink；本研究未执行 Git 写操作。列明的16份消费源码 SHA-256 均未变化，但不声明整个仓库输入不漂移。计时保留原运行基线，后续全量试点重新冻结来源。
- 官方网页是访问时的动态版本；Node v24 特定 URL、部分 Turbo 页面访问失败均登记，未据此补造版本能力。
