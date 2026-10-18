# YSS 模板工程说明

## 1. 工程定位

YSS 模板工程是一套可版本化的研发治理系统。它用仓库身份、生命周期、条件门禁、工程契约、Agent skills 和可读证据，把产品研发从需求澄清连接到实现、审查、发布与复盘。

本仓默认是研发管理仓库，不是前端或后端运行时工程。它维护可复用的流程规则、文档模板、技能、验证脚本和分发契约；运行时代码默认位于已登记的独立实现仓库。

## 2. 首次进入时读取什么

按以下顺序建立上下文：

1. 读取根目录 `yss-project.yaml`，确认 `repository_mode`。
2. 读取 `AGENTS.md`，取得当前仓库的入口规则、硬门禁和禁止事项。
3. 读取 `CONTEXT.md` 取得业务语言；流程术语按需读取 `.template-spec/process/process-glossary.md`。
4. 按任务读取生命周期注册表、裁剪规则、技能注册表和当前编排政策。

完成标准：仓库身份合法，任务属于模板维护还是产品研发已经明确，影响面和下一工作单元可以由权威资产解释。

## 3. 两种仓库身份

| 身份 | 用途 | 允许的主要工作 | 边界 |
|---|---|---|---|
| `template-source` | 维护通用模板与治理规则 | 更新单一事实来源、同步技能投影、构建 CLI 快照、验证与审查 | 不生成具体产品的 Spec、原型、OpenAPI 或垂直切片 Ticket |
| `project-instance` | 承载具体产品或模块的研发管理资产 | 执行 Plan、Spec、设计、工程契约、Ticket、实现、验证和发布流程 | 不反向成为通用模板的权威来源 |

身份只由 `yss-project.yaml` 声明。目录结构、Git remote 和占位符都不能替代该清单。

## 4. Harness 产品线

模板工程提供 Spec 与 Backend 两个入口；Spec 包含必要产品设计，前端实现在独立规格与 CLI 中维护。旧 Design 实例保留原资料并显式迁移。选型、CLI 支持与默认写入行为集中维护在[用户手册的 CLI 能力与写入方式](../../.template-spec/user-guide/用户手册.md#cli-能力与写入方式)。具体生命周期边界由对应实例的 profile 和生命周期注册表决定。

每条产品线使用独立的 profile、metadata 和固定模板 commit。CLI 之间遇到其他产品线的 metadata 时必须 fail closed，不能自动接管。

## 5. 控制平面

### 5.1 生命周期

`.template-spec/process/lifecycle-registry.yaml` 是阶段、门禁、产物、工作单元、证据和稳定 ID 的结构事实源。`.template-spec/process/harness-process-tailoring.md` 决定任务从哪个可信阶段进入，以及哪些条件门禁可以记录为 `not-applicable`。

生命周期编排器只推进第一个未阻塞工作单元。文件存在不等于产物已批准；完成结论必须同时具备内容、审查结论、上游新鲜度和可读取证据。

### 5.2 技能供应链

`.agents/skills` 是跨 Agent 共享技能的权威内容。模板源只生成 `.claude/skills` 投影；`.codex/skills`、`.cursor/skills` 和 `.pi/skills` 不是模板源投影，这些运行时直接读取 canonical 内容。实例若启用平台投影，由实例 `skills-lock.json` 的 `projectionRoots` 声明。

`.template-spec/agents/yss-skill-registry.yaml` 管理技能分层、成熟度、别名和运行时发现；`skills-lock.json` 管理来源、版本、hash 与投影完整性。修改共享技能后必须同步投影并更新 lock，不能分别编辑平台副本。

### 5.3 任务执行与复核

当前编排政策不要求岗位、数字人或运行环境注册。默认由同一 Agent 完成专业工作与真实自检；明确用户要求或已知外部规则需要独立复核时，核验不同实际上下文、同一冻结候选和只读证据。技术通过不生成真人批准。

正式派发使用结构化任务包，声明合同、实际工具与任务来源、允许写路径、预期证据和汇合条件。身份不可得时如实说明；共享工作区不替代写入边界。旧版本记录继续按封存的原始政策解释。

## 6. 模板源与实例分发边界

模板实例分发面包含根规则、`CONTEXT.md`、按需选择的共享 skills、`.template-spec/` 中的治理资产和共享验证脚本；`docs/` 保存实例按需产生的产品资产。CLI 从固定模板 commit 构建 bundled snapshot，并在 metadata 中保存模板身份和版本。

`.template-source/` 是模板源治理区，保存当前维护规则、跨仓契约、工具源码、必要工程依据；`llm-wiki` 在本机按需生成的模板源 Wiki 不提交；运行报告、历史证据、缓存及恢复包存入仓外 maintenance 命名空间。该目录不进入 `project-instance`，避免把模板维护历史误当成产品研发资产。模板源的 `docs/superpowers/specs` 与 `docs/superpowers/plans` 只作为在办维护文档工作区：必须有 frontmatter 与状态，完成后计划迁入仓外 maintenance，长期依据迁入 `.template-source/contracts/`；项目实例的 `docs/` 仍只保存产品资产。

## 7. 模板维护工作流

1. **分级**：根据 `.template-source/process/maintenance-intensity.yaml` 计算 L1 或 L2；未知 trigger 先更新策略。
2. **更新权威资产**：修改对应的单一事实来源，避免在说明文档中复制规则。
3. **生成投影**：涉及 skills 时同步 Agent roots 和 `skills-lock.json`；涉及生命周期结构时同步派生视图；涉及实例分发时构建固定 commit 的 CLI 快照。
4. **Fresh verification**：实现内循环先看 `scripts/verify-template-fast --plan`，按变化行为与消费者执行必要检查，通过即停在 `implementation-ready`，报告为 `limited`；缺输入映射先补映射，不自动运行全量。PR 执行 `scripts/verify-template-fast --base <完整 SHA>`；正式发布前执行 `scripts/verify-template --base <上一正式发行完整 SHA>`，从完整发行差异与当前输入独立选择受影响检查及依赖；缺映射拒绝，手工路径只能扩大范围。固定来源、摘要、三 Profile 安装与恢复仍必需，终检按相同基线独立重编译检查集合，不依赖资格优化或旧覆盖回退；跨仓 CLI 正式交付另执行固定 commit 的集成测试和打包校验。
5. **审查与发布**：L1/L2 日常使用维护者自检，不强制冻结候选或独立审查；分级只决定验证强度。只发布模板时走 `github-workflows.md` 的「轻量模板发布」（合入检查 + fast 报告，平台验收由维护者人工记录）；与 CLI 同时发布或需绑定 CLI Bundle 时，才执行完整 `scripts/verify-template` 和固定版本生成器集成。本地验证及已移除的 GitHub workflow 边界见 `github-workflows.md`。
6. **发布与回滚**：先发布或提交子仓，再更新父仓 gitlink；跨仓版本、验证命令、发布顺序和回滚点必须可以重建。

完成标准：当前强度要求的自检 / 审查证据通过，跨仓固定引用闭合，正式发布前完整 `scripts/verify-template` 通过，并且不存在未处理的 `violation`、`drift` 或 `new_impacts`。

## 8. 常用入口

| 目标 | 入口 |
|---|---|
| 判断仓库身份和下一阶段 | `yss-product-lifecycle` |
| 修改或退役共享 skill | `maintaining-skills` |
| 模板实现内循环 | `scripts/verify-template-fast` |
| PR 验证 | `scripts/verify-template-fast --base <完整 SHA>`；独立审查另按显式选择执行 |
| 校验根模板发布候选 | `scripts/verify-template` |
| 同步共享 skill 投影 | `scripts/sync-skills` |
| 校验 skills lock | `scripts/update-skill-lock --check` |
| 校验生命周期注册表 | `scripts/verify-lifecycle-registry` |
| 固定的 yss 二进制（版本号、构建提交、Go 版本、各平台 SHA-256） | `.template-source/distribution/yss-cli-pin.json`；`tests/yss-cli-pin.test.mjs` 校验结构，预检与 `tests/cli-retirement.test.mjs` 核对实际二进制，发布验证只接受固定的二进制与源码提交；本地联调自己构建的二进制设 `YSS_NATIVE_BINARY_OVERRIDE=1`（CI 不接受）。yss-cli 不是 submodule，也没有「落后多少」的检查：模板的普通提交不需要刷新它，发布 CLI 时才用 `tools/refresh-source-lock.mjs --tag vX.Y.Z` 钉到模板 tag |
| 校验维护 checkpoint | `scripts/verify-maintenance-checkpoint <file>` |

### 工具链测试执行模式

`scripts/verify-template-fast --tooling-mode optimized --report-dir <仓库外新目录>` 可显式使用单次准备复用与受控并行；默认 tooling 行为保持，release 使用串行执行条件。旧资格配对与策略激活层已退役。所有 profile 的 `--concurrency 1` 同时限制内部测试为串行，报告绑定实际 file、argv、cwd、env 与真实退出。

当选中 tooling 完整测试入口时，两种模式均执行该入口的完整测试集合，每次重新准备固定 CLI；普通 fast 的必要选集不因此追加完整 tooling 或制品准备。优化模式仅在本次运行内复制后端插件构建产物，消费测试各自持有独立副本；构建器本身仍真实构建。Handoff 接收、入口迁移、项目接入、产品设计插件四个测试文件最多使用两个 worker；其他文件及新增文件默认串行。失败、取消、产物或输入漂移不能作为成功复用。

报告目录中的 `tooling/metrics.json` 保存 CLI 准备、插件构建与复制、测试身份及执行次数、未执行文件、退出码、日志路径和清理耗时。`pnpm --dir .template-source/tooling/node test` 保持全量入口，默认 legacy；直接诊断可设置 `YSS_TOOLING_MODE=optimized`、`YSS_TOOLING_CONCURRENCY=1|2` 和指向仓库外新目录的 `YSS_TOOLING_REPORT_DIR`。legacy 按完整选定集合逐文件串行监督，失败或单文件超时后继续后续文件，取消后停止后续文件；保留原插件准备路径。单个测试文件或准备进程默认 600000 毫秒超时，可用 `YSS_TOOLING_TIMEOUT_MS` 设置 1–600000 毫秒；整套测试的累计时长不作为单文件超时。超时与取消分别保留 124、130。

`.template-source/scripts/benchmark-tooling.py --root <仓库外独立副本> --output <仓库外新目录> --pairs 3|21` 显式使用 `--selection legacy` 重放原组范围的首次、重复、输入变化场景；日常交付不追加该性能测量。它会在独立副本中的后端插件 README 追加输入变化标记并在结束时恢复，使插件实际构建产物也随输入变化，不能指向当前开发仓库。不存在跨运行产物缓存；首次/重复场景的 OS 页缓存未受控。样本须包含完整进程墙钟时间、逐项相同的测试身份及实际执行次数，最终每档 21 对分别判断中位数至少减少 20% 且 p95 不回退。

## 9. 权威阅读地图

| 问题 | 权威资产 |
|---|---|
| 仓库是什么 | `yss-project.yaml`、`AGENTS.md` |
| 业务语言与流程术语是什么 | `CONTEXT.md`（业务）、`.template-spec/process/process-glossary.md`（流程） |
| 阶段、门禁和工作单元是什么 | `.template-spec/process/lifecycle-registry.yaml` |
| 如何裁剪流程和判定维护强度 | `.template-spec/process/harness-process-tailoring.md`、`.template-source/process/maintenance-intensity.yaml` |
| skills 如何发现与校验 | `.template-spec/agents/yss-skill-registry.yaml`、`skills-lock.json` |
| 如何执行与复核 | `.template-spec/process/orchestration-contract.yaml` |
| 实现仓库如何接入 | `.template-spec/process/implementation-repo-integration.md` |

说明文档负责导航和解释；当说明与权威资产冲突时，以表中权威资产为准，并修复说明文档的漂移。
