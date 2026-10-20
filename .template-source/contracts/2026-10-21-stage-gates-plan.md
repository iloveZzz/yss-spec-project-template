# Spec 四阶段门禁 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. 本计划推荐由当前会话逐项实施，完成后做一次独立复核；执行方式由用户在评审计划时选择。Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 Spec 正式流程收敛为四个阶段出口，消除内部检查和业务资产各自办理批准的链路，并保持真实授权、实施合同与验证有效。

**Architecture:** 模板定义四门禁及 `stage-result` 合同，CLI 统一核验与事务登记；Node 只做内容处理和原生调用。通过 Spec 专属 `stage-gates-v1` 显式激活，原政策与 Backend 原流程继续按来源读取。先实现读支持和消费者，最后激活新实例分发。

**Tech Stack:** Node.js 24、Go 1.27.1、现有 YAML／JSON Schema 工具、Cobra 和现有 transaction 包；不增加第三方依赖。

**Spec:** [Spec 四阶段门禁设计](2026-10-21-stage-gates-design.md)。设计和执行计划已获用户批准；后续“完成后并入主分支”授权覆盖本轮两仓提交、推送、PR 与验证后的 main 合并，不包含发布与部署。

**执行状态：** 任务 1–7 已实施并完成针对性复验与独立复核；任务 8 已完成固定来源、干净候选构建和本地复验；全新安装与 Worker 闭环及 main 集成以关联两仓必要 CI 的实际结果为准，最终状态由 PR 保存。实际来源、测试范围与结果见[实施与验证记录](2026-10-21-stage-gates-verification.md)。下列逐步清单保留批准时的实施目标，不将预期命令视为已执行。

## Global Constraints

- 新 Spec 正式流程只有四个阶段门禁；内部检查没有独立批准记录。
- 用户原始决定、授权范围、当前实施合同及实际验证继续核验，不生成或改写用户回复。
- 已有授权且业务范围、验收、契约承诺和授权边界未发生实质变化时复用有效决定；技术细化不产生新的人工暂停。
- 默认同一 Agent 自检；只有明确用户要求或项目已知外部要求才使用独立复核。
- 修复只使受影响的检查、成果绑定及下游依赖失效；未知影响先调查，不默认全量复审。
- 历史批准、原始政策和冻结资产保留原义，只读核验；迁移不补造批准，不静默套用新政策。
- CLI 是治理语义的执行来源；Node 保留内容处理及原生调用适配，不另写一套阶段裁决规则。
- 普通材料分析与轻量 handoff 按现有约定处理；正式打包只在用户明确选择时执行。
- 达到本次交付目标即停止；交付验收不自动授权提交、合并、发布或部署。
- 本轮不新增第三方依赖、不修改 CONTEXT.md 的业务语言表、不创建产品 Ticket 或阶段 checkpoint。

本计划的任务是实施顺序，不是新增产品审批点。按依赖连续工作，不逐任务请求确认。Git 操作按当前会话已获得的主分支集成授权执行；发布与部署不在本轮范围。

## Review Focus

1. 旧无版本注解与 approval3 混用：新流程不读取 `role_id`，旧记录仍按其原政策核验。归属任务 2、3、5。
2. Plan 前置检查反向要求 Plan 已批准，或修改阶段记录导致自身摘要失效：保持单向依赖，禁止自身／可变 checkpoint 成为冻结成果。归属任务 2、3。
3. 无 UI、既有工程、小改动和只做到 Spec 的任务：不生成未来资产、额外确认或交接要求。归属任务 3、4、8。
4. 已批准后更换合同、范围、写路径或 API：不得凭旧阶段记录继续实施；普通细化仅重验受影响依赖。归属任务 2、4。
5. 模板与 CLI 混装、旧包接收及迁移中断：缺能力明确失败，原件保留，恢复后只能是完整旧态或新态。归属任务 1、5、6、8。

## 仓库、基线与文件职责

| 仓库 | 计划基线 | 职责 |
|---|---|---|
| `/workspace/yss-spec-project-template` | `4da810253f1cf8cfc5e1168891814fa1423d2b43` | 政策、schema、内容工具、技能、分发和场景 |
| `/workspace/yss-cli` | `8f0248c8bbdc0565b85c0dbbc91a17f51e81ecb1` | 原生语义、准入、事务登记、历史消费、CLI 与 Bundle |

执行前读取两仓 AGENTS.md 和当前 diff，确认基线仍可用。模板现有七个受跟踪修改路径及一份未跟踪回归测试属于本会话的局部兼容修复，逐块吸收，不 reset、不清理用户工作。CLI 若出现新修改先识别归属。隔离工作区沿用执行环境约定；任务准备不安装无关依赖。

新增的主要文件及职责：

- 模板 `.template-spec/process/orchestration/domain/stage-gates.yaml`：四阶段归属、适用检查和目标映射的唯一政策部件。
- 模板 `.template-spec/process/schemas/stage-result.schema.json`、`lifecycle-checkpoint-v2.schema.json`：阶段记录和四门禁 checkpoint。
- 模板 `.agents/skills/yss-stage-decision/references/{domain-strategy,stage-decision-package}-v4.schema.json`：无独立批准的内容合同；相应阅读 schema 放在 `.template-spec/process/schemas/`。
- 模板 `scripts/lib/stage-result.mjs`：原生阶段核验的薄适配；不持有批准算法。
- CLI `internal/governance/approval/stage_result.go`：阶段结果、实际授权与资产成员核验。
- CLI `internal/governance/contracts/stage_admission.go`：实施合同、仓库、API 与准入核验。
- CLI `internal/governance/stage_result_write.go`：在现有事务引擎上规划／应用阶段记录与 checkpoint 更新。
- CLI `internal/governance/stage_gate_migration.go`：从固定原政策和旧成果规划显式迁移，与阶段登记共用 `WritePlan`。

其他修改文件在所属任务列明。现有原生入口维持外部函数名，内部按当前政策选择消费者。

## 依赖与交付

`任务1 → 任务2 → 任务3 → 任务4 → 任务5 → 任务6 → 任务7 → 任务8`。

优先顺序：合同与读支持 → 业务消费者 → 事务和迁移 → 分发激活。任务 8 前不得把新能力写入默认发布 Bundle 或将未完成四阶段能力描述为可用。实施期间可用测试 fixture 显式启用新协议；不产生正式通过回执。

首次原生消费者测试前，在 CLI 仓准备开发二进制；每次修改 Go 后重建，再运行受影响的 Node 集成用例：

```sh
stage_gate_build_dir="$(mktemp -d)"
CGO_ENABLED=0 go build -tags yss_nobundle -o "$stage_gate_build_dir/yss" ./cmd/yss
stage_gate_binary="$stage_gate_build_dir/yss"
```

使用已配置的 Go 1.27.1，不把系统旧版工具错误当成产品 RED。任务 2–6 的临时 fixture 可显式装载源码树中的新合同／政策，它们证明消费者行为，不证明安装来源；任务 8 必须换成带完整真实 Bundle 的候选。二进制摘要环境变量若已配置，按实际候选摘要更新，不继续绑定旧二进制。测试文件不存在时的失败只用于确认接口未实现，后续必须获得断言层面的真实失败。

### 任务 1：固定四门禁与新数据合同

**Files**
- Create：上面的政策部件、stage-result schema、checkpoint v2、两种内容 v4 及阅读 schema。
- Modify：`.template-spec/process/{orchestration-contract.yaml,schema-generations.json}`、`orchestration/domain/review.yaml`、`scripts/lib/{structured-assets,orchestration-contract,lifecycle-registry}.mjs`。根 `lifecycle-registry.yaml / lifecycle-registry-baseline.json` 的生效裁剪留任务 8；本任务只在新协议测试候选中构建四门禁注册表。
- Modify CLI：`internal/governance/kernel/policy_versions.go`、`internal/schema/orchestration.go`；只添加显式读支持，默认分发激活留到任务 8。
- Test：新 `tests/stage-gates-contract.test.mjs`、现有 `tests/{schema-generations,role-independent-contracts}.test.mjs`，CLI `internal/governance/kernel/policy_versions_test.go`。

**Interfaces**
- Consumes：设计 §3–4 的门禁和数据表。
- Produces：`stage_gates = {schema_version:1, capability:'stage-gates-v1', gates, targets}`，其中 `gates` 的条目为 `{id, work_stages, checks, decision_mode}`；新增 `(*SemanticSession).StageGatesEnabled() bool`，只在 Spec 的 Profile 与政策双声明一致时为 true。新部件候选先在 fixture 的 parts 列表使用，默认根 parts 与生效裁剪一起在任务 8 激活。
- 四门禁精确集合为 `gate.plan-approved / gate.spec-baseline-approved / gate.implementation-admitted / gate.delivery-accepted`。旧五出口进入历史 ID 清单；Backend 注册表不更改。
- checkpoint v2 `gates[gate_id] = {record_ref, record_digest}`；stage-result v1 字段与枚举按设计 §4；内部检查不再携带批准字段。旧 checkpoint schema 文件保持原内容，schema 选择器显式识别 v2。

- [ ] **Step 1：写失败测试。** 测试命名 `SpecStageGatesRequireMatchingCapability`、`StageResultRejectsChildApprovalFields`；断言四 ID 精确匹配，检查结果 `approved`、非空 `role_id / approval_ref`、未知 schema、只有一侧能力声明均拒绝；无能力的 Backend 仍选择原规则。

  ```js
  assert.deepEqual(currentGateIds, ['gate.delivery-accepted', 'gate.implementation-admitted', 'gate.plan-approved', 'gate.spec-baseline-approved']);
  assert.equal(checkResultWithApproval.valid, false);
  assert.equal(checkpointV2WithMalformedRecordDigest.valid, false);
  ```

- [ ] **Step 2：运行失败测试。** 模板 `node --test tests/stage-gates-contract.test.mjs`；CLI `go test -tags yss_nobundle -timeout 30s ./internal/governance/kernel -run 'StageGates'`。预期缺合同／能力选择，而非工具缺失。
- [ ] **Step 3：实现合同与读支持。** 同步 schema 代际、别名和候选注册表引用，修正完整性校验，让新政策把内部检查归类为结果。测试中 `currentGateIds` 来自显式启用的候选；现行默认流程仍用原注册表。保留旧协议分支；不把整个 GovernanceVersion2 改成新语义，不添加新的细检查。
- [ ] **Step 4：复验。** 上述命令及 `node --test tests/schema-generations.test.mjs` 通过。核对未知协议返回 CAPABILITY／迁移错误，历史含角色格式的结果未被重新解释。
- [ ] **Step 5：整理可提交差异。** 仅纳入本任务合同和测试；授权提交时消息为 `feat(governance): define four Spec stage gates`。

### 任务 2：实现单份阶段记录的原生核验

**Files**
- Create CLI：`internal/governance/approval/stage_result.go`、`stage_result_test.go`。
- Modify CLI：`internal/governance/approval/{gate_policy,decision_policy}.go`、`internal/governance/{approval_bindings,checkpoint_semantic}.go`、`internal/cli/{cli,command_flags}.go`。
- Create 模板：`scripts/lib/stage-result.mjs`；Modify `scripts/lib/native-evidence.mjs`。

**Interfaces**
- Consumes：任务 1 合同、现有原始用户决定／延续核验与 `SemanticSession` 文件观察能力。
- Produces：`approval.VerifyStageResult(s *kernel.SemanticSession, ref string, opts map[string]string) error`，注册原生 `contract verify --kind stage-result`，`opts` 只接受 `checkpoint / gate / asset-ref`。
- Produces Node：`verifyStageResult({root, checkpointRef, gateId, assetRef})`，使用 `nativeContractVerify`，返回原生 `coverage.stage_result`；能力 token 精确为 `stage-gates-v1`。
- 原生 coverage 为 `{gate_id, status, affected_checks, blocking_findings}`；`status` 为 `approved / blocked / stale / ready-for-human`。Node 不把原生拒绝转换为通过。
- 门禁通用核验不导入 contracts 包；实施必要条件通过语义注册表调用任务 4 的 `stage-admission-inputs`。对应消费者缺失时拒绝，不把未实现条件视为通过。

- [ ] **Step 1：写失败测试。** 创建小型 `stageResultFixture(t)`，提供真实临时字节及原始回复 fixture，标明合成来源。覆盖 `TestStageResultUsesOneDecision`、`TestStageResultRejectsStaleOrExpandedEvidence`、`TestStageResultRejectsSelfBinding`、`TestStageResultRechecksOnlyAffectedInputs`。断言批准记录存在但检查失败、依据摘要错误、越界范围、自身／可变 checkpoint 被列为成果均拒绝；正常输入只核验一个阶段决定，普通修改不要求新的角色或子批准。
- [ ] **Step 2：运行 RED。** `go test -tags yss_nobundle -timeout 30s ./internal/governance/approval -run '^TestStageResult'`，预期尚无阶段消费者。
- [ ] **Step 3：实现核验。** 核验当前政策、成果与证据字节、授权来源及适用复核；通过现有协议复用真实决定。检查证据由对应原生验证器消费，不能只相信 `passed` 自述。旧记录选择原消费者。当前性依据未明时阻断相关项，历史字节不回写。原生返回受控依赖回执；内部检查的 evidence 是验证结果，不再次消费 approval3。
- [ ] **Step 4：复验。** 上述测试及 `go test -tags yss_nobundle -timeout 30s ./internal/governance/approval` 通过；模板新增 `tests/stage-result-native.test.mjs` 用真实候选二进制覆盖成功、拒绝和能力缺失，断言 `coverage.stage_result.status === 'approved'` 且失败退出不被吞掉。
- [ ] **Step 5：整理可提交差异。** 授权提交时消息为 `feat(governance): verify stage results without child approvals`。

### 任务 3：打通 Plan 与 Spec／设计的单向准备和确认

**Files**
- Modify 模板：`.agents/skills/yss-stage-decision/scripts/{validate-domain-strategy,validate-stage-decision-package,migrate-contract-v3}.mjs`、`scripts/lib/{plan-spec-entry,plan-spec-entry-view,plan-review-control,review-package}.mjs`。
- Modify 政策：`orchestration/domain/planning.yaml`，`workflow/work-units/work-unit.{plan-requirements,domain-strategy-design,stage-decision,spec-synthesis,prototype-design-v2}.yaml`。
- Modify CLI：`internal/governance/plan_semantic.go`、`internal/governance/contracts/{task_v3,business_review_v2}.go` 中实际命中的新政策消费者。
- Test：新 `scripts/fixtures/role-independent-draft/stage-gates-plan.test.mjs`；原 `professional-plan.test.mjs / formal-plan.test.mjs` 作为旧政策用例保留；现有 `approval-records.test.mjs` 分为历史兼容与新内容路径用例。

**Interfaces**
- Consumes：任务 1 内容 v4、任务 2 阶段核验。
- 新验证器 CLI：`<asset> --root <root> [--mode content|stage] [--checkpoint <ref>]`；默认 `content`，`stage` 必须提供 checkpoint，以资产成员身份消费记录。保留旧 v2／v3 来源读取，不再默认生成旧批准注解。
- `assertPlanSpecEntry(state, options)` 等现有导出名保留；启用新能力时只检查 Plan 阶段记录，不读取专业子批准或 Plan 审查尝试预算。旧政策使用旧消费者。
- 新内容迁移产生 v4 `draft`、保留业务内容和原件；不需要先填写指向未来批准的 approval_context。对前轮未提交迁移扩展逐块替换，保留历史回归价值。

- [ ] **Step 1：补 RED 场景。** 名称为 `Plan enters Spec with one stage result and no child approvals`、`content validation does not require a future decision`、`Spec and applicable design share one confirmation`。真实调用两个脚本和原生入口；fixture 不含子 approval_ref、不含 role 文件；阶段包引用实际领域策略摘要。无 UI 路径不得要求原型文件。
- [ ] **Step 2：运行。** `YSS_NATIVE_BINARY="$stage_gate_binary" node --test scripts/fixtures/role-independent-draft/stage-gates-plan.test.mjs`；预期失败在旧批准／内容 schema／消费规则，不接受 mock 原生通过作为闭环证据。
- [ ] **Step 3：实现准备与确认分离。** 内容检查不读取阶段批准，批准后只冻结阶段成果成员；阶段包不再要求领域策略自身 `status=approved`。Spec 与适用设计准备完再办理一次基线决定。新流程不建立 Plan 专业审查子任务／会签记录，运行时防循环不能成为新的准入合同。
- [ ] **Step 4：复验。** 同一命令通过；再运行 `.agents/skills/yss-stage-decision/tests/approval-records.test.mjs` 与相关历史场景，确认旧 role1／approval3 的来源规则按模式核验，未来阶段未批准不妨碍内容准备，未获批准的 Plan 不能宣称已过阶段出口。
- [ ] **Step 5：整理可提交差异。** 授权提交时消息为 `refactor(plan): confirm Plan and Spec at stage boundaries`。

### 任务 4：把工程、切片与交付收敛到阶段准入

**Files**
- Create CLI：`internal/governance/contracts/stage_admission.go`、`stage_admission_test.go`。
- Modify CLI：`internal/governance/contracts/{slice_v4,slice_execution_v4,contract_semantic,backend_local_semantic,backend_terminal_semantic}.go`、`internal/governance/{scaffold_inputs,progression_entry,progression_status}.go`、`internal/governance/lifecycle/target.go`。
- Modify 模板：`scripts/lib/{implementation-contract-compiler,slice-contract-preparation,lifecycle-progression,backend-delivery-terminal,backend-delivery,lifecycle-readiness,approved-execution-context,backend-scaffold-prerequisites,business-ticket-lifecycle,delivery-preflight,lifecycle-execution-scope}.mjs`、`orchestration/domain/{implementation,progression}.yaml`、`orchestration/entry/profile-policy.yaml` 和对应 technical-analysis／ticket-decomposition／implementation-repository-preparation 工作单元政策。只修改新 Spec 模式实际命中的分支。
- Test：新 `scripts/fixtures/role-independent-draft/stage-gates-delivery.test.mjs`；按影响更新 `tests/{progression-target-evidence,implementation-candidate-current}.test.mjs`。

**Interfaces**
- Consumes：任务 2 的资产成员与授权核验；现有 Slice v4、API Freeze、仓库准备和交付实际证据。
- Produces：`contracts.VerifyStageAdmission(s *kernel.SemanticSession, checkpointRef, sliceRef string) error`。只在新 Spec 模式消费 `gate.implementation-admitted`，实际合同字节必须是当前记录成员；原 Backend 保持原 Slice 批准路径。
- Produces：`contracts.VerifyStageAdmissionInputs(s *kernel.SemanticSession, recordRef string, opts map[string]string) error`，注册 `stage-admission-inputs`。它只核验已形成的实施输入，不递归核验自身阶段；公开实施入口先消费阶段记录，通用阶段核验再单向调用该纯条件验证器，避免包依赖和批准循环。
- 新目标映射：`spec-approved / product-design-completed` 消费第二阶段；`backend-deliverable` 消费当前准入与实际后端完成；`business-accepted` 消费交付验收及约定验收依据。

- [ ] **Step 1：补 RED。** `TestStageAdmissionAcceptsAuthorizedCurrentSlice`、`TestStageAdmissionRejectsChangedContractOrWriteScope`、`TestStageAdmissionRequiresApplicableAPIFreeze`、`TestPreparationDoesNotRequireFutureAdmission`；集成场景覆盖同范围新增切片自动准入、只有 Spec 的任务停止、无 UI 不补原型、仅后端完成不声称业务验收、直接脚手架请求不增加 Plan、空工程准备不反向等待实施准入且业务实现仍被阻断。
- [ ] **Step 2：运行。** `go test -tags yss_nobundle -timeout 30s ./internal/governance/contracts -run '^TestStageAdmission'`；`YSS_NATIVE_BINARY="$stage_gate_binary" node --test scripts/fixtures/role-independent-draft/stage-gates-delivery.test.mjs`。
- [ ] **Step 3：实现准入和目标消费。** 旧技术／合同出口不再各自申请用户批准；实际技术取舍记录归入阶段材料。机械骨架、技术设计与合同编译在准备授权内先产生候选，再复算实施准入；API 冻结也不得反向依赖准入记录。合同编译仍不产生业务实施资格，未来合同不得靠先前方向批准放行。部署／发布／合并不属于准入结果的副作用。
- [ ] **Step 4：复验。** 上述用例通过；对未改小改动路由运行 CLI `go test -tags yss_nobundle -timeout 30s ./internal/governance/lifecycle -run 'Daily|Standard|Target'`，确认新规则不扩散到 daily／standard。
- [ ] **Step 5：整理可提交差异。** 授权提交时消息为 `feat(lifecycle): admit implementation and stop at the requested target`。

### 任务 5：阶段登记与旧实例的显式迁移

**Files**
- Create CLI：`internal/governance/stage_result_write.go`、`stage_result_write_test.go`、`stage_gate_migration.go`、`stage_gate_migration_test.go`。
- Modify CLI：`internal/cli/{command_root,command_flags,help_topics,cli}.go`、`internal/project/{upgrade,governance_migration}.go` 中普通同步不迁移产品状态的边界；相应用例放在现有 `internal/project/governance_migration_test.go`。
- Modify 模板：`scripts/plan-spec-entry`、`scripts/lib/native-approval.mjs`、`.template-spec/process/plan-migration.md`；薄壳只转发已支持命令。

**Interfaces**
- 新普通阶段登记命令：`yss lifecycle decision plan --checkpoint <ref> --input <stage-result-ref> --out <plan.json> --root <root> --json`，`yss lifecycle decision apply --plan <plan.json> --root <root> --json`。
- 新显式产品迁移命令：`yss lifecycle decision migrate-plan --checkpoint <old-ref> --input <mapping.json> --out <plan.json> --root <root> --json`，复用同一 apply。`mapping.json` 精确包含 `{schema_version:1, target_checkpoint_ref, source_policy_ref, source_policy_digest, stage_sources:[{gate_id, asset_refs, decision_refs, evidence_refs}]}`；不提供批准结果自述字段。
- Go：`PlanStageResult(ctx context.Context, root, checkpointRef, inputRef string) (WritePlan, error)`、`PlanStageGateMigration(ctx context.Context, root, checkpointRef, mappingRef string) (WritePlan, error)`、`ApplyStageResult(ctx context.Context, root, planRef string) error`；均复用现有 observed inputs／事务恢复。
- 迁移只采用来源政策验证通过且覆盖当前资产与授权的决定；无法复用时输出阶段缺项，保持非 approved。普通模板 `sync --plan` 不迁移产品 checkpoint。

- [ ] **Step 1：补 RED。** `TestStageResultPlanIsReadOnly`、`TestStageResultApplyRejectsInputDrift`、`TestStageGateMigrationPreservesOriginals`、`TestStageGateMigrationDoesNotInventApproval`、`TestStageResultRecoveryIsAtomic`。断言 plan 前后产品文件字节相同；重复 apply 幂等；中断恢复为完整旧态／新态；旧证据不可读时不批准。
- [ ] **Step 2：运行。** `go test -tags yss_nobundle -timeout 30s ./internal/governance -run '^TestStage(Result|GateMigration)'`；`go test -tags yss_nobundle -timeout 30s ./internal/project -run 'StageGateSyncDoesNotMigrate'`。
- [ ] **Step 3：实现读写边界。** 阶段记录放在当前功能工作目录的 `stages/<gate-id>/<revision>/result.json`，每次新记录写新路径；checkpoint v2 只切换已完整验证记录的引用。应用前复算计划、原始回复和所有输入；未授权路径或冲突保留原件。历史原政策可复用现有 governance-history 格式。
- [ ] **Step 4：复验。** 上述测试及 `go test -tags yss_nobundle -timeout 30s ./internal/cli -run 'StageResult|StageGateMigration'` 通过。帮助与能力输出明确命令用途；不添加新的顶层 migrate 入口或未经验证的批准快捷通道。
- [ ] **Step 5：整理可提交差异。** 授权提交时消息为 `feat(lifecycle): record and migrate stage decisions transactionally`。

### 任务 6：显式交接复用来源阶段记录

**Files**
- Modify CLI：`internal/governance/handoff/handoff_semantic.go`、`approval_context_version_test.go`、新增 `stage_result_source_test.go`；必要接线在 `internal/governance/contracts_bindings.go`。
- Modify 模板：`scripts/lib/{strategic-handoff,strategic-handoff-routing}.mjs`、`.template-spec/process/strategic-handoff-package.md`，更新相关 Handoff schema 的来源声明和分发阅读引用。
- Test：新 `scripts/fixtures/role-independent-draft/stage-gates-handoff.test.mjs`；现有 Handoff v5 场景和旧来源 fixture 保留。

**Interfaces**
- Consumes：冻结来源政策中的 `stage-gates-v1`、任务 2 的阶段资产成员核验、现有 Handoff v5 文件闭包和 Receipt3。
- Produces：`contractSourceApproval` 按冻结来源政策选择 stage-result 或历史批准消费者。既有 `record_ref` 可指向新阶段记录，资产 ID／版本／摘要仍逐项匹配；接收端缺能力明确拒绝，不能伪造 approval3 适配旧接收端。
- Backend 自身未声明新能力时仍使用原门禁；只新增读取显式新 Spec 来源的能力，不强制导入或改变其本端工作流。

- [ ] **Step 1：补 RED。** `TestStageResultSourceApprovalUsesApprovedMembership`、`TestStageResultSourceRejectsUnreviewedOrStaleMember`、`TestLegacySourceRetainsOriginalPolicy`；集成断言包内只含适用阶段记录，无交接第五次批准，无收据时不能声称已导入。
- [ ] **Step 2：运行。** `go test -tags yss_nobundle -timeout 30s ./internal/governance/handoff -run 'StageResult|LegacySource'`；候选二进制运行新增 Handoff 集成测试。
- [ ] **Step 3：实现新来源读取。** 使用来源固定政策，核验阶段作用域与实际成果成员，再进行现有整包验证；运输格式、整包不可变性和本端 pending-context-reconciliation 语义保留。轻量 handoff 不进入该链路。
- [ ] **Step 4：复验。** 新场景和现有相关历史场景通过；冻结包可离线核验，新普通材料分析不要求 stage-result。
- [ ] **Step 5：整理可提交差异。** 授权提交时消息为 `feat(handoff): consume Spec stage results without extra approval`。

### 任务 7：同步技能、说明、阅读视图与维护检查

**Files**
- Modify canonical Skills：`.agents/skills/{yss-product-lifecycle,yss-stage-decision,yss-prototype-stage,yss-openapi-governance,yss-implementation-contract-compiler}/` 中受影响说明；只改 canonical。
- Modify 文档：`.template-spec/process/{process-glossary,harness-process-tailoring,lifecycle-progression,document-writing}.md`、当前用户手册及阶段模板、`scripts/lib/contract-views.mjs`。
- Modify 验证选择：`.template-source/process/{template-verification-profiles.yaml,verification-policy-baseline.json}` 中新增测试／消费者映射，不删除必要检查；`tests/{spec-role-free-guidance,verification-selection,profile-distribution}.test.mjs`。
- Generated：`scripts/generate-lifecycle-artifacts`、`scripts/sync-skills`、`scripts/update-skill-lock` 的实际变更结果。

**Interfaces**
- Consumes：任务 1–6 的新行为及原生 coverage。
- Produces：用户流程只展示四阶段；报告展示内部失败原因，检查不显示为待批准；文档和实际命令一致。历史说明明确标为历史，不删除仍有原政策消费者的内容。

- [ ] **Step 1：补 RED。** 文档测试要求当前流程没有逐检查批准、固定岗位会签、默认独立复核、默认正式交接要求；新场景文件能被 fast 选择器命中，未知文件仍拒绝。
- [ ] **Step 2：运行。** `node --test tests/spec-role-free-guidance.test.mjs tests/verification-selection.test.mjs`，预期发现残留说明或缺映射。
- [ ] **Step 3：同步事实源及派生。** 按已实现行为重写说明，运行现有生成器；不要手改摘要或投影。逐块吸收前轮文档补丁；已被新内容／迁移替代的临时说明合并删除。
- [ ] **Step 4：复验。** 上述测试、`scripts/sync-skills --check`、`scripts/update-skill-lock --check`、`scripts/verify-doc-facts` 与相关 profile 分发检查通过；记录实际检查范围。
- [ ] **Step 5：整理可提交差异。** 授权提交时消息为 `docs(governance): align Skills and views with four stage gates`。

### 任务 8：安装闭环、固定来源与最终交付

**Files**
- Create：`scripts/fixtures/role-independent-draft/stage-gates-installed.test.mjs` 及小型合成业务 fixture；CLI `internal/cli/stage_gates_integration_test.go`。
- Modify 模板：`.template-source/distribution/{bundle-profile.json,yss-cli-pin.json}`、根 `lifecycle-registry.yaml / lifecycle-registry-baseline.json`、编排根 parts、新 Spec `harness-profile.yaml` 的能力声明及已存在的来源锁消费者。裁剪后的注册表、parts 和能力声明在本任务配套激活。
- Modify CLI：`docs/source-lock.json`、`internal/bundle/assets/bundles.json.gz.sha256` 及现有生成器产物；不手写候选二进制摘要，不提交被忽略的 Bundle 归档。

**Interfaces**
- Consumes：任务 1–7，来源锁与候选构建工具。
- Produces：新安装 Spec 显式激活四阶段；旧实例只有同步和产品迁移均正确完成才进入新模式；Node、CLI、安装 Bundle 消费同一协议。测试 fixture 的业务与回复必须标明合成。

- [ ] **Step 1：补完整 RED 场景。** `installed Spec completes four stage gates without child approvals`：实际 init → Plan 内容检查 → 一个 Plan 决定 → Spec 与适用设计集中确认 → 当前切片自动准入 → 交付验证；另覆盖 spec-only、无 UI、显式包、旧实例采用和中断恢复。断言 `activeGateIds.length === 4`、内部检查没有批准引用、原用户回复未被改写。
- [ ] **Step 2：准备候选。** 按两仓既有来源锁／生成器固定已经提交且可追溯的来源；有提交授权后执行。先构建包含原生能力的 CLI，再配套模板和最终 Bundle；未完成闭包时不升级默认安装源。候选版本号按实施时真实版本选择，不提前编造发行版本或多平台运行证据。
- [ ] **Step 3：运行集成和必要回归。** 设置 `stage_gate_binary` 为实际候选二进制绝对路径。新安装用最终 Bundle 候选，不用拷贝源码替代分发验证。

  ```sh
  YSS_NATIVE_BINARY="$stage_gate_binary" node --test scripts/fixtures/role-independent-draft/stage-gates-installed.test.mjs
  scripts/verify-template-fast --base 4da810253f1cf8cfc5e1168891814fa1423d2b43 --plan
  scripts/verify-template-fast --base 4da810253f1cf8cfc5e1168891814fa1423d2b43
  ```

  在 CLI 仓完成 `gofmt -l cmd internal tools`、`CGO_ENABLED=0 go build ./...`、`go test -timeout 5m ./...`、`go vet -composites=false ./...` 及 `node tools/smoke/main.mjs --bin "$stage_gate_binary"`。Bundle 缺失时先按 AGENTS.md 的工具获取／生成；纯逻辑阶段可用 yss_nobundle，最终安装闭环不得使用它替代真实 Bundle。

- [ ] **Step 4：最终自检和独立复核。** 对照设计 §8 逐项列出实际证据；复核新协议无子批准、授权／范围未放宽、历史读取与失败恢复正常。只修复有依据的发现；不新增产品门禁。不把局部通过称为 release-ready；正式发行另按完整发布合同执行。
- [ ] **Step 5：交付与提交边界。** 获授权时按仓库提交已验证差异并记录两个实际 SHA；未获授权则保留可审阅差异。返回新旧入口、迁移命令、实际验证范围与剩余限制。真实 return-rate-engine 实例尚不可访问时，明确其未复验，不生成恢复成功记录。推送、PR、合并、发布或部署仅在相应授权范围内执行。

## 计划自检与执行交接

本计划已按设计检查覆盖：四出口与格式（任务 1）、授权与依赖（任务 2）、Plan／Spec 与无 UI（任务 3）、实施／目标停止及小改动（任务 4）、历史与恢复（任务 5）、外部包与 Backend 边界（任务 6）、说明与选择器（任务 7）、真实安装闭环（任务 8）。Review Focus 五项均已分配具体测试。

本文件中的 API、命令、schema 和测试清单记录批准时的实施目标。已完成能力与实际证据另记；预期名称不等于实际执行结果，尚未完成的安装、CI 或合并继续保持待验证状态。

执行建议：本会话逐项实施。任务之间共享阶段数据合同、CLI 分支与来源锁，顺序实施便于保持兼容边界；完成后使用一个独立上下文复核整体差异。若用户选择子代理方式，按任务依赖逐个派发并隔离写范围，不同时修改共同事实源。
