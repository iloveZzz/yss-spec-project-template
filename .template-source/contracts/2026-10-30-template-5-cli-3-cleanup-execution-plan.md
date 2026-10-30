---
plan_id: template-5-cli-3-cleanup-execution
version: 0.1.0
status: in-progress
updated_at: 2026-10-30
design_ref: 2026-10-30-template-5-cli-3-cleanup-plan.md
template_inspected: 9b39343057b39bd4b4c182e7a59239da34473ef5
cli_minimum_base: d67bc777198174a92cc3f58e4f26ce9f0daef2d9
---

# Template 5 / CLI 3 清洗执行计划

> 供后续实施者使用：任务按依赖顺序执行。行为变更先写或调整能证明期望的测试，确认旧行为不满足目标，再实现并复验。执行方法按当时授权选择；本文不授权提交、推送、打标签、发布或修改用户实例。

**目标：** 停止对 Template 5.0、CLI 3.0 之前产品的兼容与迁移，移除相应实现、测试、分发资源和验证登记，保持受支持版本的真实业务功能与数据保护。

**结构：** 模板源是政策、检查及分发事实源；CLI 实现身份、业务校验与事务。先核验同代真实消费者和版本证据，再切断旧功能，最后更新检查注册及固定来源。当前验证计划和报告仍以真实输入、执行结果及摘要为依据。

**技术：** 模板仓 Node.js / YAML / JSON Schema；CLI 仓 Go 和 Node.js 打包工具；固定 Bundle、Git 提交及原生二进制。

**设计：** [整体清洗方案](2026-10-30-template-5-cli-3-cleanup-plan.md)。设计中记为 `proposed` 的候选应结合本计划的消费者盘点决定；没有执行证据不将结果写为已通过。

## 全局约束

- 模板仓以实施时真实 HEAD 和工作树为准，保留已有修改；CLI 实施来源必须包含 `d67bc777198174a92cc3f58e4f26ce9f0daef2d9`（已发布 `v3.0.0` 提交），在不覆盖用户工作的隔离检出中完成。当前 CLI 工作树 `d52c0be37b763ed9f6cf59176e1041de17b38392` 仅是先前调查来源。
- 版本门槛是产品来源，不是 Schema 号。Template 5.0 的真实实例即使由旧 CLI 创建，也应按可信模板来源判定；禁止因 `cliVersion` 单字段或 `schema_version` 数字拒绝。
- 身份缺失、冲突、来源无法证明或版本不受支持时，允许只读诊断；依赖身份的操作失败且不覆盖用户文件、Git 状态或未完成事务。普通无身份工程的合法接管继续存在，已识别旧实例不得伪装成普通工程。
- 保留当前用户授权、批准来源、当前字节、隔离写范围、同代安装转换、sync、冲突与事务恢复 / 回滚。`stage-gates-v1` 仅在实例确有声明时适用；Backend 消费自己的合同。
- 同代稳定 API / Schema、Handoff5、Receipt3 和固定提交报告，按实际生产消费关系决定，不凭名称删除。不能确定是否同代时先保留并列入未闭合项。
- 模板日常先查看 `scripts/verify-template-fast --plan`，按实际影响执行必要检查；CLI 遵守其本地 `AGENTS.md` 的 Go 构建、测试和时限。未运行的检查如实记录。
- 设计和执行计划属于模板源维护文档，不新建产品 Spec、Ticket 或 checkpoint。Skill 仅改 canonical `.agents/skills` 并用现有生成器更新投影和锁。

## 执行地图与接口

| 任务 | 写范围和责任 | 依赖 | 交付给后续任务的结果 |
|---|---|---|---|
| T0 | 双仓只读盘点、实际版本和现役合同 | 无 | 来源矩阵、保留 / 删除清单、命令及真实消费者 |
| T1 | 模板政策和 CLI 身份边界 | T0 | 可识别的支持条件和统一拒绝行为 |
| T2 | CLI 旧迁移、历史入口及同代事务 | T1 | 旧治理不再迁移，同代同步 / 恢复仍可用 |
| T3 | 模板与 CLI 角色、会签、审批 | T0、T1 | 当前真实授权和复核合同，去除旧角色资格 |
| T4 | 模板与 CLI 交接、资产协议 | T0、T1 | 当前交接接口及明确可移除的旧包链 |
| T5 | 模板真实安装夹具与历史夹具 | T1、T3、T4 | 夹具迁移代码及定向测试；真实候选安装验证在 T7 后闭合 |
| T6 | 模板检查命令、选择、Gate 和报告 | T3–T5 的代码迁移 | 当前检查清单、真实路径和受支持报告校验；需候选 Bundle 的测试在 T7 后闭合 |
| T7 | 双仓分发、技能投影及固定来源 | T1–T6 的代码迁移 | 可审阅候选组合；提供 T5 / T6 缺少的真实候选安装输入 |
| T8 | 定向回归与双仓集成验收 | T1–T7 | 实际测试结果、失败及未覆盖清单 |

T2、T3、T4 在 T1 完成后可并行调查和实施，但若修改同一文件或共享生成物须分配单一写入者。T5 / T6 先完成源码迁移和不依赖新 Bundle 的检查；真实安装和需要候选 Bundle 的检查必须在 T7 取得包含本次模板改动的实际候选后重跑。旧 3.0 发布二进制内嵌旧模板，不可作为新模板的安装通过证据。任务的输出是已有合同和源码，不引入新的编排框架或永久清单系统。

## T0：核验产品来源与真实消费者

**读取：** 模板 `.template-spec/process/schema-generations.json`、两个 `harness-profile.yaml`、`scripts/lib/instance-metadata.mjs`、现行分发清单；CLI 3.0 的 `docs/source-lock.json`、`docs/compatibility.md`、`internal/identitymeta/native.go`、`internal/project/identity.go`。

- [ ] 记录模板、CLI 的真实 HEAD、dirty / untracked 状态及相关 tag 的 peeled commit；确认 CLI 实施来源包含 3.0，不能 reset、clean 或覆盖任何现有工作。
- [ ] 对身份材料列出 `templateVersion`、`templateCommit`、`snapshotHash`、`manifestHash`、`bundleHash`、source state、创建 CLI 与当前执行器实际语义；逐入口追踪生产、读取和校验，标记哪项可证明产品来源、哪项只证明格式。`git:<commit>` 和 `worktree:<commit>` 不能从字符串猜发布版本。
- [ ] 逐项核验 5.0 实际使用的 Schema、Handoff5 / Receipt3、阶段、用户决定、安装转换及当前报告；列出真实生成者、消费者、入口和测试。保留当前有消费者的路径；旧产品独占路径标为可退役，无法证明的标为待核验。
- [ ] 记录 CLI 3.0 已固定 Template 5.0、模板 2.8.2 pin 是显式复现输入、默认批次 pin 可另行固定；不把两种锁混为一谈。交付这份矩阵给 T1–T7；不为此创建额外治理资产。

**完成条件：** 可判断每个待删路径属于旧产品专用还是当前能力；未能判定的对象不得删除。当前已知证据：`tests/helpers/fixtures/native-legacy.provenance.json` 的 fixture 来自 CLI 2.4.0，而当前 fixture 的有效性须由真实安装而非旧目录 overlay 证明。

## T1：统一身份与来源拒绝

**主要文件：** 模板两套入口和 `harness-profile.yaml`、`scripts/lib/instance-metadata.mjs`；CLI `internal/identitymeta/native.go`、`internal/project/identity.go`、`internal/cli/project_commands.go`、`internal/cli/recovery_commands.go`；对应 `identity_versions_test.go` 和 `internal/identitymeta/versions_test.go`。

- [ ] 在现有身份测试增加：可信 Template 5.0 来源、旧创建 CLI 但模板来源合法、明确旧模板、冲突 / 伪造摘要、无法证明来源、未来未知格式、普通无身份工程。对失败路径比较原文件内容、权限及 Git 状态。
- [ ] 按 T0 的真实证据在共享身份入口收口判断；追踪 init / attach / sync / migrate / skills / assets / doctor / diff、治理入口、计划 apply 与 recover 是否绕过它。旧实例只诊断，不隐式 attach、迁移或写入；保留允许的普通接管。
- [ ] 修订模板与 CLI 的兼容说明，使支持范围、实例来源、当前运行器和不支持诊断一致。未完成旧事务保留现场并提示使用匹配旧执行器，不让新执行器声称恢复成功。
- [ ] CLI 中运行 `go test -tags yss_nobundle -timeout 5m ./internal/identitymeta ./internal/project`；另用真实 Bundle 的现有安装 / 接管集成用例验证公开入口。前者仅证明纯逻辑。

**完成条件：** 每条受影响公共入口对同一实例得出一致判断；旧或未知来源不发生写入，真实当前实例及合法普通接管仍可用。缺少可信来源表达时停止删除依赖该判断的旧代码。

## T2：退役旧治理迁移，保留同代事务

**主要文件：** CLI `internal/project/governance_migration.go`、`internal/project/binding.go`、`internal/project/installation_migration.go`、`internal/governance/stage_gate_migration.go`、`internal/governance/stage_result_write.go`、`internal/governance/kernel/governance_history.go`；CLI 命令帮助和相关测试。模板 `.template-spec/process/harness-upgrade.md`、`stage-gates.md`、`subagent-collaboration.md` 及对应 Backend 资产。

- [ ] 测试旧治理实例、旧阶段迁移请求、旧事务在当前 CLI 上明确失败且不写；测试当前 `migrate --installation`、sync 保存计划、输入漂移、冲突和受支持事务恢复 / 回滚仍按现行合同工作。
- [ ] 仅移除专门处理不支持旧产品的治理迁移、旧策略快照读取和其 CLI 参数 / 帮助；核查各调用点后删除失去对象的代码、fixtures 和分发条目。不要整删 `migrate`、同代历史记录或 transaction 通用实现。
- [ ] 同步当前文档：旧版本不自动迁移，旧产品现场保留；同代安装方式转换和事务保护继续说明。历史原文件和已发布 tag 不改写。
- [ ] CLI 运行 `go test -tags yss_nobundle -timeout 5m ./internal/project ./internal/transaction ./internal/governance`；按受影响入口运行含真实 Bundle 的集成测试。

**完成条件：** 无旧迁移成功入口；同代安装转换和受支持事务在正向、冲突和失败反例下保持可用。

## T3：拆除旧角色会签，保留当前授权

**主要文件：** 模板 `.template-spec/agents/digital-human-roles.*`、`scripts/lib/digital-human-roles.mjs`、`scripts/lib/native-approval.mjs`、`tests/role-independent-contracts.test.mjs`、`tests/spec-role-free-guidance.test.mjs` 和 Backend 对应文件；CLI `internal/governance/approval/policy.go`、`internal/governance/contracts/approval_v3_test.go`。

- [ ] 先将角色测试拆成“旧角色数量 / 会签”和“当前真实决定 / 自检 / 独立证据”两类；增加旧批准不能获得当前资格、决定字节或范围变化失效、伪造独立复核拒绝及合法自检通过的断言。
- [ ] 删除已确认只服务旧产品的数字人角色、固定会签和旧审批消费；删 `assertLegacyCheckIDs` 的全量旧 ID 等价要求，逐项保留有现行风险的检查。角色职责表达不得制造固定人员或额外人工批准。
- [ ] 核验 Backend `role.architecture-agent` 的实际合同；在文档、CLI 和模板中统一其职责表达，保留当前技术设计、实际决定、正式实现合同及边界。
- [ ] 模板运行 `node --test tests/role-independent-contracts.test.mjs tests/spec-role-free-guidance.test.mjs tests/backend-governance-contract.test.mjs tests/backend-stage-routing.test.mjs`；按所选任务准备固定原生 CLI。CLI 运行 `go test -tags yss_nobundle -timeout 5m ./internal/governance/approval ./internal/governance/contracts`。

**完成条件：** 新任务不需要旧岗位会签；当前批准、范围、字节绑定和适用独立审查的保护仍通过真实消费者验证。

## T4：统一交接与旧包处理

**主要文件：** 模板 `.agents/skills/yss-product-lifecycle/`、`scripts/lib/strategic-handoff*.mjs`、`tests/helpers/legacy-strategic-handoff-fixture.mjs`、相关场景 / Schema；CLI `internal/governance/handoff/`、`internal/governance/contracts/backend_terminal_semantic.go`、`internal/governance/project_ci_semantic.go`。

- [ ] 根据 T0 确认当前 tracker 引用、手动 PR/MR、Backend 输入及 Handoff5 / Receipt3 的真实消费者。若仍是 5.0 有效接口，保留该接口的真实消费测试；如确系旧产品专用，记录其调用闭包后退役。
- [ ] 对当前手动交接测试固定来源、真实文件、缺失 / 漂移 / 截断拒绝及不授予实施资格；对旧交接写入口测试明确拒绝且不改原文件。
- [ ] 拆除使用测试专用旧 builder 的成功导出 / 导入断言。先逐一迁移 `tests/go-validator-replay.test.mjs`、`tests/business-ticket-native-report.test.mjs`、战略 / UI 场景中的当前验证，再删 helper；`scripts/fixtures/business-tickets/handoff.test.mjs` 不得继续断言生产已拒绝的导出成功。
- [ ] 仅当所有同代消费者已退出时删除 `openBundle` / `openDelivery`、`strategic-feedback.mjs` 及 CLI 对应旧消费；仍有当前归档输入时保留路径穿越、篡改和摘要反例。
- [ ] 模板运行 `node --test tests/strategic-handoff-retirement.test.mjs tests/business-ticket-native-report.test.mjs tests/go-validator-replay.test.mjs` 和实际保留的 UI / 交接场景；CLI 运行 `go test -tags yss_nobundle -timeout 5m ./internal/governance/handoff ./internal/governance/contracts`。如测试需要原生执行器，先按本批 pin 固定并记录。

**完成条件：** 当前交接通过真实生产入口验证；已删除对象不再有正向用例或对外承诺。不能证明 Handoff5 不再受支持时，不删除其现行消费者。

## T5：替换历史 fixture 与投影输入

**主要文件：** `tests/helpers/yss-instance.mjs`、`tests/helpers/fixtures/native-legacy.*`、`scripts/fixtures/role-independent-draft/installed-fixture.mjs`、`scripts/lib/testing/legacy-spec-policy.mjs`、使用它们的测试和分发输入。

- [ ] 列出 `makeRoot` 和 `legacySpec` 的全部调用，将仍有当前行为的测试改为实际固定 CLI 的 Spec / Backend 新安装或其他真实同代 fixture；断言 profile、来源、Bundle 和摘要，不以旧目录 overlay 宣称新安装。
- [ ] 删除仅覆盖旧批准、旧角色、旧产品迁移的测试；现行身份、权限、来源、证据和防覆盖反例迁到当前入口。旧 fixture 的少量数据可用于不支持输入拒绝，但不得保留旧运行器和兼容正向链。
- [ ] 移除所有现役调用后，再删旧 fixture 包、provenance、旧政策 helper 与 YAML 输入路径；清理前 `rg` 检查不再有有效导入或分发引用。
- [ ] 先运行不依赖新 Bundle 的受影响场景；其余测试暂记待验证。T7 产出包含本次模板改动的候选 Bundle 和 CLI 后，运行当前安装、身份、分发和 T3 / T4 场景，分别核验实际来源、CLI 和 binary digest。固定候选暂不可取得时，不能将旧版内嵌 Bundle 测试记为本次通过。

**完成条件：** 现行正向覆盖不依赖 CLI 2.4 fixture 或旧角色政策；保留的负向样本不能写用户目录或被误当当前实例。源码迁移完成可交给 T6 / T7，但须在 T7 候选上完成真实安装验证后才能宣布 T5 完成。

## T6：收口检查注册、旧报告和执行映射

**主要文件：** `.template-source/process/template-verification-profiles.yaml`、`verification-policy-baseline.json`、`scripts/lib/verification-selection.mjs`、`.template-source/scripts/lib/verification-execution-plan.mjs`、`legacy-verification.mjs`、`verification-report-validator.mjs`、`tests/verification-*.test.mjs`。

- [ ] 为真实变更路径补选择断言：当前场景只选择一次、未知路径 / 依赖拒绝、slow 如实延后、补充检查的 Gate 责任保留。测试 release 对空差异和必需来源仍选择适用检查。
- [ ] 先把现役 `scripts/verify-*-scenarios` 命令替换成真实 Node / Python 路径及正确参数；同步输入、routing、`required_files`、`syntax_files`、Gate 和 ID。现役选择不再依赖 `verificationSourceIdentities` 的反向旧路径映射后，移除其现役执行责任；同代已发布报告的只读重建仍可能需要受版本约束的映射。
- [ ] 合并用户决定场景重复 ID，以及 Skill 投影与锁的重复登记；核对 supplemental 在普通检查未选中时承担的责任，再合并。删除已不存在且无现役对象的前端场景登记，保留不支持前端的实际保护。
- [ ] 退役 `check.legacy-coverage`、旧 candidate / legacy-full 计划和旧产品报告兼容分支；保留同代固定提交读取、base 祖先、来源、报告摘要和实际退出校验。旧产品报告明确不作当前通过依据。对迁移前的同代固定报告保留按原固定策略重编译所需的只读路径映射，或实现等价的只读复验；不得把该映射重新用于当前任务执行。添加同代报告成功复验、来源 / 日志篡改拒绝及旧产品报告拒绝的测试，再删除无责任的旧映射和 `check.verification-script-retirement` 责任。
- [ ] 删除无消费者的 `core_escalation_patterns`。旧 runtime 扫描实际约束 Ruby / `.rb`，不是版本检测：只有在确认当前分发不再要求此限制后，才同时删除其检查、supplemental、自动 postcheck、测试和文档；否则保留并改为准确名称。
- [ ] 更新 `required_checks`、全部 Gate 引用、CI 绑定、策略基线与实际 fast 数量。运行 `node --test tests/verification-selection.test.mjs tests/verification-gates.test.mjs tests/verification-policy-baseline.test.mjs tests/flow-verification-routing.test.mjs`，再运行受影响的 `tests/verification-baseline.test.mjs`、`tests/verification-report-v2.test.mjs`、`tests/verification-execution.test.mjs`、`tests/verification-delivery-run.test.mjs`。
- [ ] 用 `scripts/verify-template-fast --plan --json --changed-file tests/scenarios/verify-user-decision-scenarios.mjs` 核查真实路径。release 用 `scripts/run-template-verification --profile release --base <同仓祖先完整SHA> --plan --json`，核对必需任务和 Gate；记录环境和选择结果。

**完成条件：** 旧检查无悬挂引用；受影响当前检查不漏选、不重复；当前固定提交报告和发布完整性不因旧协议清除而放宽。G15 / G17 的同代动态安装、同步和回滚责任保留。

## T7：分发与固定候选组合

**主要文件：** 模板 `.template-source/distribution/bundle-profile.json`、`profiles/backend/.template-source/distribution/`、canonical Skill 与生成投影；CLI 3.0 `docs/source-lock.json`、`tools/refresh-source-lock.mjs`、`tools/artifacts.mjs`、`tools/build-candidate.mjs`。

- [ ] 从两个 Bundle 配置移除已确认无当前消费者的旧角色、旧 Schema、旧 snapshot 和兼容规则；更新 canonical Skill，按现有生成器重建投影及锁。保留技能冲突、受管文件、固定来源与摘要保护。
- [ ] 按本批用途固定真实二进制和模板来源并记录 SHA；显式本地 override 只用于诊断，不作为 CI / release 通过证据。固定模板源与 CLI 二进制、Bundle 的关系以实际 receipt 核对。
- [ ] `node tools/refresh-source-lock.mjs --source-root <模板根绝对路径> --profile all --tag <新模板发布标签>` 默认只预演。现有锁已绑定 tag，工具要求干净来源、指定存在的新 tag 且目标为原来源后代；默认还要求远端包含提交。`--allow-unpushed` 仅本机试验。**在用户授权提交 / 标签 / 推送之前，不假定这些条件已经满足。**
- [ ] 具备授权及固定来源后，再应用来源锁并按实际工具生成 Bundle；`node tools/artifacts.mjs generate --scope all --source-root <模板根绝对路径> --out <仓外新目录>` 消费现有 source lock，不会自动把模板工作树改动纳入。`node tools/build-candidate.mjs --out <仓外新目录>` 的工作树来源只产生限定证据。
- [ ] 最终核对模板 commit、Spec 与 Backend 的 Bundle / manifest / snapshot、CLI commit、二进制和 pin 摘要；避免通过循环更新模板 pin 与 CLI source lock 冒充固定组合。不能满足固定来源条件时记录未完成项。

**完成条件：** 实际 Bundle 与执行器确实对应所声称的来源；本地诊断、固定候选和发行证据明确区分，历史 release / tag 不被改写。

## T8：最终验证和交付

- [ ] 模板执行本次差异的 `scripts/verify-template-fast --plan`，检查原因、依赖和延后项后执行适用检查；记录命令、退出码、CLI pin 和未覆盖项。正式 release 验证须使用上一发行完整 SHA 计算差异，不将旧版报告当当前通过证据。
- [ ] 在固定 Bundle 下执行 CLI `gofmt -l .`（输出应为空）、`CGO_ENABLED=0 go build ./...`、`go test -timeout 5m ./...`；按其 CI 要求执行 `go vet -composites=false ./...` 和 `node tools/smoke/main.mjs --bin <已构建二进制>`。纯逻辑 `yss_nobundle` 结果不能替代真实安装。
- [ ] 在隔离目录用 Spec / Backend 真实初始化和消费，验证同代 sync、安装转换、冲突保护、受支持恢复 / 回滚；验证旧来源拒绝且用户原字节、权限、Git 状态不变。
- [ ] 复核当前 Spec、Backend、决定 / 审查、手动交接和可用的正式合同；仅对声明 `stage-gates-v1` 的实例检查四阶段。普通材料分析不授予业务批准。
- [ ] 执行所需固定来源和适用平台验证后再区分 `implementation-ready` 与实际发布资格；交叉编译不是原生平台验收。提交、标签、推送、发布等外部动作只在另有授权时执行。

## 重点复核的失败条件

1. 只凭创建 CLI 版本或 Schema 号拒绝合法 Template 5.0 实例，或错误接受伪造来源。
2. 旧实例、未知身份或未完成旧事务被误当普通工程而覆盖。
3. 删除旧会签时一并删除真实用户决定、当前资产摘要或独立复核证据。
4. 删除旧交接 fixture 后，当前 Backend / UI 仍依赖的消费者或篡改检查失效。
5. 删除旧命令映射导致现役检查漏选，或旧报告、override、未执行测试被误记为当前发行通过。

计划编写时依据源码及已发布标签静态核对；后续实际实施和验证见下方记录。

## 实施记录（2026-10-30）

- 用户已批准执行，并明确无法与受信 Bundle 对照的实例必须拒绝且保留原文件。CLI 修改位于独立工作树 `/Users/zhudaoming/.codex/worktrees/yss-cli-3-cleanup/yss-cli`，基于 `d67bc777198174a92cc3f58e4f26ce9f0daef2d9`；模板工作树保留现有变更。
- 已移除旧覆盖率检查与无现役消费者的前端检查登记，保留当前授权、交接消费和来源防篡改检查；实例来源校验对照内嵌受信 Bundle，拒绝未知来源。
- 模板验证选择、Gate、报告及执行测试 149 项通过；分发、旧检查退役及相关测试 35 项通过；最终场景路由调整后的选择、Gate、基线与路由测试 81 项通过。CLI 项目、事务、Bundle、来源校验定向测试通过；无 Bundle 的身份、项目、事务和治理包测试通过。本地工作树候选构建与冒烟通过；全量测试并发运行时 CLI 包在 5 分钟超时，随后串行运行该包通过（179 秒），再次运行全量 Go 测试通过（复用缓存）。现有受信 Bundle 不声明 `stage-gates-v1`，5 项相关集成测试明确跳过。这些结果不等于完整发行验证。
- 待闭合：真实同代历史报告复验、声明 `stage-gates-v1` 的受信 Bundle 测试、包含本次模板改动的固定候选，以及真实后续 5.x Bundle 的同步中断、策略删除和改名端到端验证。历史报告须登记受审查的发行提交和报告摘要；当前仅登记 5.0.0 提交，没有登记任何正式报告摘要。
- 已删除 `legacy-coverage` 的两个路径曾暂留为本次删除的变更路由；删除进入主分支基线后，已移除这两条过渡路由。Plan 需求场景内部还会运行 Context 调和场景，同选时存在重复安装，尚未合并。
- 当前模板和 CLI 均未提交、打标签、推送或发布；缺少新模板发布标签及固定来源组合，不能将旧 Bundle 或工作树诊断结果视为发行证据。

## 后续清洗记录（2026-10-30）

- 同代 sync 恢复按所选事务核验前后受信来源与策略；删除或改名须与目标 Bundle 中的退役规则及目标内容对应。双 Bundle 的中断、篡改和删除回滚，以及改名正反例均以合成输入验证，未冒称正式发行来源。
- 新增受审查发行与报告摘要登记；已登记报告跨根复验核对固定 Git 文件、历史 Node 路径、执行台账与日志摘要。受控的真实子进程报告和篡改反例通过，真实正式报告及 all Profile 发布集成仍未核验。
- 现役检查命令、必需文件与语法清单已切换至实际路径，合并三个重复场景并保留 Gate；历史报告仍使用的只读反向映射保留。旧治理迁移建计划及全项目快照代码已退役，同代安装转换和历史记录保护保留。
- 后续回归：模板检查与报告相关定向测试 153 项、历史固定输入与执行器测试 85 项通过；CLI 在 Git 2.56 且 `YSS_TEST_REQUIRE_GIT=1` 下全量 Go 测试通过，构建、静态检查、固定来源产物检查和工作树候选冒烟通过。全量运行中 CLI 包耗时 197.616 秒、项目包 75.863 秒，超过各包 30 秒的维护目标；未执行模板完整 fast 或 release 验证。
