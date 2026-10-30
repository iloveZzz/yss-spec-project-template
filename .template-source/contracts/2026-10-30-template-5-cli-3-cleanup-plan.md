---
plan_id: template-5-cli-3-cleanup
version: 0.1.0
status: proposed
updated_at: 2026-10-30
template_base: 9b39343057b39bd4b4c182e7a59239da34473ef5
cli_inspection_base: d52c0be37b763ed9f6cf59176e1041de17b38392
cli_minimum_base: d67bc777198174a92cc3f58e4f26ce9f0daef2d9
---

# Template 5 / CLI 3 整体清洗方案

## 目标与边界

用户已明确：Template 5.0、CLI 3.0 起不再兼容更早产品版本。本方案将只服务旧产品的读取、迁移、会签、交接和验证链从现行产品中退役，保留新产品实际使用的能力、安全边界和必要验证。本文是模板源维护方案，不是产品阶段资产；`proposed` 不代表实现、验证或发布已经完成。

支持边界按可信产品来源判断：目标是 Template 5.0 及以后、CLI 3.0 及以后；具体验证组合以最终固定来源和实际能力为准。实例的模板来源版本、创建它的 CLI 版本、当前运行 CLI 版本分别是不同事实。不能因为 Template 5.0 实例曾由旧 CLI 创建就自动把它判为旧模板；应依据模板来源、受管基线及可信身份判定。未知、冲突、伪造或无法证明来源时，拒绝依赖身份的操作，不猜测、不覆盖。

内部协议号不是产品版本：`schema_version: 1`、approval3、Handoff5 等不能单凭数字判断退役。对每个候选，先核对 Template 5.0 和 CLI 3.0 真实生产者、消费者及分发闭包；同代实际使用的格式保留。不受支持的旧实例或未完成事务保留原文件，明确报告不支持；其恢复不由新 CLI 冒充完成。

用户原始业务材料仍可作为普通材料分析，不能把“不兼容旧治理格式”扩大成拒绝读取普通需求文档。删除仓库中的兼容实现不授权删除用户项目、Git 历史、已发行资产或外部数据。

## 事实与选择

- 模板当前工作树是 `9b39343057b39bd4b4c182e7a59239da34473ef5`。CLI 的只读调查工作树 `d52c0be37b763ed9f6cf59176e1041de17b38392` 早于 3.0；后续 CLI 实施必须从包含已发布 `v3.0.0` 提交 `d67bc777198174a92cc3f58e4f26ce9f0daef2d9` 的来源开始，并在不覆盖用户工作的隔离检出中核对现状。不能以调查工作树替代该实施基线。
- 已发布 CLI `v3.0.0` 的 `docs/source-lock.json` 固定 Template `v5.0.0` 的提交 `1e49127842c358caf552af8ebec58f438a35c5a6`。已发布 3.0 的兼容说明仍支持部分旧治理、审批及 Handoff；新政策须由后续候选实现，不能改写既有标签。
- 模板仓 `.template-source/distribution/yss-cli-pin.json` 是 2.8.2 的显式复现输入；日常验证也可先固定本批原生 CLI。它与 CLI 的模板 source lock 用途不同，不能仅改版本字符串声称配套完成。
- 当前 Spec 默认 `matt-spec-v1`、由 tracker 引用交付；`stage-gates-v1` 只在相应能力声明时适用。Backend 的 daily / standard 与 governed 有各自范围；新任务默认自检，独立复核按真实要求触发。
- 推荐按行为切断旧依赖，再删验证和夹具；相比只清理 YAML，这能减少实际维护成本，也避免留下旧实现继续被调用。一次按文件名批量删除则无法区分现行协议和安全保护。

## 完成后的可观察行为

| 场景 | 结果 |
|---|---|
| 已证明受支持的 Spec / Backend 来源 | 在固定的 3.x 候选和 5.x 模板组合下，按其当前安装方式、入口和合同工作。 |
| 明确属于不支持的旧产品 | 不读取其旧审批作为当前资格，不执行旧治理或旧资产迁移；给出明确诊断，原文件、Git 状态与未完成事务保持原样。 |
| 身份、来源、版本或摘要缺失、冲突、不可证明 | 拒绝依赖该身份的操作，不从 Schema 号或目录名称猜测；允许的只读诊断不产生产品状态。 |
| 当前版本内部同步、安装方式转换或事务恢复 | 保留适用能力、冲突检测、保存计划、并发和漂移保护、恢复及回滚；不因名称包含 `migrate` 或 `history` 删除。 |
| 当前用户决定与复核 | 使用真实授权、当前资产字节与范围；默认诚实自检，要求独立复核时核验真实独立来源。编译与安装不授予业务批准。 |
| 明确调用当前 handoff | 消费实际 PR/MR 或已声明的当前输入，核验来源和范围；不自动生成退役战略快照包，也不凭生成测试夹具声称交付成功。 |
| 日常与发布验证 | 按实际行为和直接、传递消费者选检查；旧版本专项不再作为发布必跑，当前固定来源、安装、安全及报告完整性仍受验证。 |

## 实施批次

每批先盘点被改函数、调用方、Schema、分发、测试和入口，再按该批真实差异验证。各批可以分别落地，但跨仓最终版本组合未核验前不得宣称兼容或发布就绪。

### 1. 固定支持矩阵与识别行为

**范围：** `.template-spec/process/harness-profile.yaml`、`profiles/backend/.template-spec/process/harness-profile.yaml`、`orchestration/` 当前合同；CLI `internal/identitymeta/native.go`、`internal/project/identity.go`、`docs/compatibility.md`。

- 列出正式 5.0 模板、受支持 Profile、CLI 3.0 固定来源与实际实例 metadata 中可证明来源的字段；分别记录模板版本、模板提交 / Bundle / 快照摘要、创建 CLI、当前执行器，不将单个字段当全部事实。
- 梳理初始化、接管、同步、安装转换、doctor / diff、技能与资产、正式治理、计划应用和恢复入口，统一复用真实身份与来源判断；明确普通无身份工程可接管的条件，已识别旧实例不得被误当空目录接管。
- `git:<commit>`、`worktree:<commit>` 候选不可按字符串推断正式版本。实施时明确其可信候选来源及摘要证明方式；无法证明则停止依赖动作。该选择属于实现输入，不能由测试伪造。
- 测试已支持来源、5.0 模板与旧创建 CLI 的合法组合、旧产品、混代冲突、未知与未来身份、摘要伪造及用户已有文件。断言拒绝时字节、权限和 Git 状态不变。

### 2. 清理角色、会签和旧审批

**范围：** `.template-spec/agents/digital-human-roles.*`、`scripts/lib/digital-human-roles.mjs`、`scripts/lib/native-approval.mjs`，Backend 对应资产；CLI `internal/governance/approval/`、`internal/governance/kernel/governance_history.go`、`internal/governance/stage_gate_migration.go`。

- 从当前规则剥离固定岗位数量、固定数字人会签人、旧角色资格和旧 checkpoint / approval 迁移；确认没有 5.0 现行消费者后，移除只承载旧行为的角色表、解析器、旧快照、CLI 命令及帮助。
- 保留现行用户决定、来源与字节绑定、授权范围、撤回和失效；保留当前 task、review、批准和正式 Backend 合同的实际字段，独立复核只在适用时要求可核验来源。
- 拆分 `check.digital-human-native-consumers`、`check.user-decision-scenarios`、`check.role-independent-contracts` 的混合用例。删除仅为旧岗位和会签成功而存在的断言；移除“当前检查 ID 必须等于全部旧角色表 ID”的约束，逐项保留有当前风险的检查。
- 检查 `profiles/backend/.template-spec/process/agent-entry-policy.md` 中 `role.architecture-agent` 与默认不预注册岗位的表述及 CLI 实际消费，统一为实际职责和合同，不削弱技术设计、真实批准及 Backend 交付要求。
- 反例：旧批准不能变成当前批准；缺真实决定、当前来源变化、伪造独立复核均拒绝。当前自检与合法真实决定能够通过。

### 3. 收口交接和旧资产协议

**范围：** `.agents/skills/yss-product-lifecycle/`、`.template-spec/process/strategic-handoff-package.md`、`stage-gates.md`、`asset-schema-migration.md`、`schema-generations.json`，`scripts/lib/strategic-handoff*.mjs` 与相关测试；CLI `internal/governance/contracts/`、`internal/governance/project_ci_semantic.go`。

- 以当前 Spec tracker 引用和显式手动 PR/MR handoff 为主路径；核查 Backend 是否仍在 5.0 正式消费 Handoff5 / Receipt3。依据真实当前合同决定保留或退役，不能按名称认定旧版。
- 删除仅存在于 `tests/helpers/legacy-strategic-handoff-fixture.mjs` 的旧导出、导入成功用例及失去生产消费者的 fixture；生产旧写入口已拒绝。同步清理 `check.strategic-handoff-package-scenarios` 与相应组、Gate，先迁移通用边界反例。
- 拆分 `tests/scenarios/verify-existing-ui-baseline-scenarios.mjs` 和 `scripts/fixtures/business-tickets/handoff.test.mjs` 中旧生成路径；保留仍被当前产品消费的 UI 基线、票据来源及批准绑定。当前后者部分用例仍断言已拒绝的导出成功，必须修正其真实被测路径。
- 只有在确定该协议完全不属于受支持范围后，删除 `openBundle`、`openDelivery`、`strategic-feedback.mjs` 与 CLI 对旧包的消费者；如果当前 handoff 仍接受归档，保留路径穿越、篡改、来源和摘要校验。
- 删除旧产品迁移正向路径，不删除当前版本内部合理的更新、转换及保护；不覆盖源材料，不把历史数据转为当前批准。

### 4. 验证计划、报告与历史脚本映射

**范围：** `.template-source/process/template-verification-profiles.yaml`、`verification-policy-baseline.json`、`scripts/lib/template-verification.mjs`、`scripts/lib/verification-selection.mjs`、`.template-source/scripts/lib/verification-*`、相关 `tests/verification-*.test.mjs`。

- 先将仍需要的 `scripts/verify-*-scenarios` 登记替换为真实 `tests/scenarios/` 执行路径，保留 Node / Python 解释器及参数；同步 `input_patterns`、routing、`required_files`、`syntax_files`、检查 ID 和 Gate。替换后用真实变更路径检查选择结果，确认只选一次、未知路径继续拒绝，再移除不再需要的 `retiredSources` 及其反向路径映射。
- 删除 `core_escalation_patterns` 等已确认无现役消费者的字段；清理不再有对象的前端脚手架和 UI 场景登记，保留当前前端不支持的拒绝保护。
- 退役 `check.legacy-coverage`、旧 candidate / `legacy-full` 计划重建及对应固定历史夹具；旧报告不能成为当前通过证据。保留受支持代际的固定提交策略读取、base 祖先关系、摘要、实际退出和日志校验。不要整删仍为当前固定提交服务的 `readHistoricalProfiles` 入口，先迁移其现役责任。
- 仅在现役命令、影响选择和当前报告重建不再依赖旧映射后，退役 `check.verification-script-retirement` 的旧映射责任。同步 release `required_checks`、所有 Gate、基线 JSON 及依赖测试；有意更新数量基线，不以关闭校验代替迁移。
- 合并 `check.user-decision-scenarios` / `check.work-layout-user-decision` 和 Skill 投影、锁的重复登记。补充检查与普通检查同命令时，先保留原有无条件执行及 Gate 责任再合并；执行器现有等价合并不等于所有情况都会重复执行。
- 保留 G15 / G17 的当前动态交付任务及同代安装、同步和回滚责任；不因清除跨代迁移而删除保护用户文件的验证。

### 5. 分发、技能和双仓候选闭环

**范围：** `.template-source/distribution/`、`profiles/backend/`、canonical `.agents/skills/`、现有投影生成器与锁；CLI `docs/source-lock.json`、`internal/bundle/`、`tools/artifacts.mjs` 和发布相关工具。

- 清除只为旧产品保留的 Bundle、规则、Schema、旧 CLI 快照和测试资源；确认每个资源已无当前消费者。Skill 只修改 canonical 来源，使用项目现有生成器更新投影和锁，不手改投影。
- 当前产品的旧技能退役冲突、错误别名、用户定制、固定来源和 Bundle 摘要仍须保护；旧 JavaScript 退役表 fallback 仅在确认当前 Bundle 不使用后删除。
- 用已发布二进制或明确的临时固定候选引导模板验证；冻结候选模板提交后，CLI 固定该模板完整来源，生成 Spec / Backend Bundle 并构建候选。最后以实际候选 CLI 的 commit、二进制摘要、Bundle 和模板来源回验两端。模板验证 pin 与 CLI source lock 分别记录用途，避免互相改写造成循环绑定。
- 已发布标签和原文件不改写；候选使用的版本号、最终提交、发布和推送另按实际授权执行，不凭现有 3.0 标签宣称旧兼容已移除。

## 验证与验收

本项目按 L2 处理；身份、权限和发布语义须有失败反例。以实际差异先运行 `scripts/verify-template-fast --plan`，检查命中路径、行为、消费者、依赖与未覆盖项，再执行必要检查；不能为未知输入自动回退全量。至少覆盖：

1. **身份矩阵：** 当前 Spec / Backend 正向；旧产品、混代身份、未知及未来格式、缺来源、伪造摘要拒绝；旧 CLI 创建的合法 5.0 实例按可信模板来源判定。拒绝后比较文件内容、权限和 Git 状态。
2. **当前功能：** Spec 安装及 tracker 工作，Backend daily / standard 和适用 governed 合同，真实决定、当前性、必要独立复核；仅在声明时验证 `stage-gates-v1`。普通材料可读不授予正式资格。
3. **安全与事务：** 同代安装转换、sync、冲突、计划篡改、输入漂移、用户改动保护、受支持事务的恢复与回滚；旧代未完成事务保留并诊断。
4. **验证选择：** 分别对空变化、配置、真实场景、来源 pin 和技能变化编译计划；相关检查只执行一次，未知路径 / 依赖拒绝，slow 延后如实记录，Gate 和 supplemental 责任不丢失。历史报告不再被误认当前证据；同代固定提交报告继续按真实日志、摘要和退出码校验。
5. **双仓实际消费：** 固定来源构建 Spec / Backend Bundle，在隔离目录分别初始化和消费；核对投影、锁、受管文件、候选二进制及输入摘要。执行适用的安装、同步、冲突与回滚反例。
6. **CLI 检查：** 遵守 CLI 本地 `AGENTS.md`：gofmt、`CGO_ENABLED=0 go build ./...`、`go test -timeout 5m ./...`；无 Bundle 时仅将 `-tags yss_nobundle` 用作纯逻辑结果，并按实际条件运行 CI 指定 vet 与二进制冒烟。构建或单项通过不等于发行验收。

首个新边界 release 的 `--base` 仍可使用上一发行完整 SHA 计算差异；不得把旧版本报告作为当前通过证据。记录每项实际命令、退出码、二进制 / 来源摘要及未执行项；需要正式发行时另按现行发布合同执行固定来源和适用平台验证，不能用交叉编译代替原生验收。

## 待实施时核验的关键点

- Template 5.0 已发布资产内哪些 Schema、Handoff5 和元数据由当前生产者与消费者真正使用；逐项决定，不按名称推断。
- 现有实例是否带有足够可信的模板版本 / 提交 / Bundle 来源，尤其 `git:`、`worktree:` 和旧 CLI 创建的 5.0 实例；不能证明时如何诊断，不以猜测补充字段。
- 旧报告与固定提交读取的现役职责如何拆分；检查注册、策略摘要和发布基线更新后不能错误复用旧结果。
- 版本切换只影响未来候选和实际执行器，不追溯改写已发布 5.0 / 3.0；保留用户数据以及未完成事务现场。

本方案基于只读代码及配置核查；尚未执行测试、构建或 CLI 3.0 二进制验证。
