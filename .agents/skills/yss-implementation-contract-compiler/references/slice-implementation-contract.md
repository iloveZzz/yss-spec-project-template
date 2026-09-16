# Slice Implementation Contract v3

YAML 是唯一权威合同。Agent 从已确认上游整理草案；用户确认目标、范围、验收和关键取舍；独立专业审查核验工程约束，生命周期主控关闭 `gate.slice-contract-approved`。新合同使用 schema v3；[v2](slice-implementation-contract-v2.md) 保留原规则读取和校验，schema v1 继续拒绝。

结构权威为 `docs/process/schemas/slice-implementation-contract-v3.schema.json`。Registry、编译规则与 Execution Result 继续使用各自版本；Slice v3 不要求它们一同升级。

## 只保存一次

| 分组 | 填写内容 | 不再重复填写 |
|---|---|---|
| 身份 | schema_version、contract_id、contract_version、slice_id、status | 任务内不复制合同身份 |
| basis | 上游 ref、原字节 digest、已知 version 和适用 approval_ref | 同一文件用本组键名别名，不复制 Spec、技术设计正文 |
| scope | 影响面、工程根、写边界及本切片约束 | 子合同不再保存同一 Skill、路径、命令 |
| applicability | frontend/backend/api/cross_repo 的 required 或带理由的 not-applicable | 不适用的 extensions 整段省略；缺信息不能省略 |
| resolution | 冻结 capability、Skill、Recipe、条件、Registry/Compiler 摘要及适用架构身份 | 原因链、编译时间、实时 freshness 不进入权威合同 |
| acceptance | 本切片验收 ID 对应 basis 来源和 locator | 验收正文仍在 Ticket / Spec |
| verification | 命令、cwd、test_seams、expected_evidence、acceptance_refs | 工作单元通过 verification_refs 选择；required_for_all 自动继承 |
| work_units | 行为、角色、主辅 Skill、TDD 模式、验收和验证引用 | 写路径默认继承 scope，只能收窄；runtime、派发和进度留在任务包 |
| extensions | 适用 frontend/backend/api/cross_repo 的独有信息 | 后端设计用 design_refs 定位；仅切片新增约束进入 backend.constraints |

`basis` 别名必须可解析且无循环。所有引用先校验原字节摘要；已知版本必须绑定。locator 支持唯一文字/稳定 ID、`lines:起始-结束`、结构化资产的 `pointer:/design/...`；歧义或缺失阻断。行区间绑定文件摘要，源内容变化后必须重新核验。

scope.implementation_path_policy 保留 `external-repository-native`、`harness-apps-multi-project`、`git-submodule-harness-apps`；gitlink 登记、attached HEAD 和禁止覆盖的边界仍按原仓库接入规则校验。

每项验收必须映射到工作单元与验证。每条验证指定已登记工程内的 cwd；多工程工作单元明确 project_root。跨仓扩展保留交付、联合验证和回滚顺序，数组顺序不能排序消除。任务所选 Skill 必须属于冻结闭包；共享约束始终继承。

## 准备和查看

```sh
scripts/slice-contract prepare <ticket.md> --input <本切片补充.yaml> --output <新合同.yaml> --root <治理根>
scripts/slice-contract view <合同.yaml> --root <治理根>
scripts/slice-contract view <合同.yaml> --unit <work-unit-id> --root <治理根>
scripts/slice-contract diff <旧合同.yaml> <新合同.yaml> --root <治理根>
scripts/slice-contract migrate <旧v2.yaml> --input <迁移补充.yaml> --output <新v3.yaml> --root <治理根>
```

`--input` 只传 `sources` 来源选择、`refinements` 新增细化，以及需要时的 checkpoint_ref / approved_slice。可直接调用 `prepareSliceImplementationContract`，避免另存补充文件；临时补充不是批准或执行合同。Ticket 已有 `slice_implementation` frontmatter 或 checkpoint 中同名事实时自动读取，不要求补录全部合同。普通 Markdown Ticket 的验收列表自动按原行定位；其他非结构化语义由 Agent 带来源整理，仍需专业审查。

先复用登记中的工程根和基线中的架构身份。登记写范围仅为上限，不能当作切片授权。多来源冲突、未明影响和缺少必要资产输出具体 blocker。输入变化不能用最后覆盖处理；先修正来源或重新确定切片细化。

输出为 `{slice_contract, report}`；report 包含来源、缺口、原因链和检查结果，不是第二份合同。`persistSliceDraft` 只写新路径，保存前复核读取过的来源，不覆盖既有草案或已批准合同。CLI `verify` 只检查合同与来源，不证明批准有效。

审阅视图展示交付行为、范围、验收、取舍与风险，任务视图附完整全局和专项约束。Markdown 和结构化视图同源，携带合同 ID、版本与原字节摘要，不可反向作为执行授权。差异按原字节与结构比较，未知字段、缺少旧来源快照或来源漂移明确显示，不自动判定用户授权可以延续。

## 审查、批准与派发

- 默认一名有对应能力的独立专业审查者，核验范围、验收覆盖、工程约束和验证充分性。相邻检查可共用现有 review-bundle；不重复要求用户审阅工程字段。
- 当前合同的工程审查使用现有 `check.design-reviewed` 会签记录，绑定 `subject_ref`、无前缀 subject_digest、artifact_bindings，以及不同的 principal_ref / drafter_principal_ref；findings 为明确数组。未关闭缺陷、缺证据和重要风险阻断，建议须有 follow_up。
- 生命周期把审查记录引用放入 Slice gate 的 evidence_refs。合同最终字节（包含生命周期设置的状态）冻结后绑定审查和 checkpoint；单独的 `status: approved` 不授予执行权。
- 用户决定沿用现有 user-decisions 协议：已覆盖且无实质变化时复用，缺失确认或决定变化才集中询问。Spec 确认不自动升级为实施授权，不改写原回复。
- `compileSliceTaskPackage` 只从已批准原始 YAML 生成任务包，角色 Skill 来自 `taskPackageDefaults`；运行时身份在派发时选择。已有任务包 schema 不变，`contract.gate_refs` 为唯一当前批准 checkpoint 引用。
- 批准、范围、派发、freshness 和结果核验共用 `normalizeSliceContract`；展开只在内存发生。执行结果仍是 v2，并用 verification_results 的 cwd 证明命令执行位置；任务验收需要全部声明命令、实际结果及可读预期证据。

## 兼容与迁移

v2 不自动改写，也不忽略旧 Compiler/Registry 摘要漂移。显式迁移要求新 contract_version，输出草案并重新计算冻结结果；不继承旧批准。重复字段冲突、未映射约束、模糊验收映射和子合同独有边界均阻断并列明恢复动作。v2 runtime / workflow 状态不进入 v3 合同，保留在原文件和现有任务证据中。

本试点不改技术设计、脚手架、审批记录、交付合同结构，不新增管理页面或跨进程缓存。

## 第二轮增量规则

新草案的 `ticket_policy` 声明 `frozen-requirements` / `tracker-or-task-package`，Ticket 必须有 requirement_version 或显式绑定版本。冻结后进度、验收结果、会签与重路由记录进入现有 tracker / 任务包；需求改动生成新版本，不重新解释旧合同的绑定。审阅视图分别显示冻结时状态与当前状态的读取位置。

明确 `scope.risk_level` 后，准备器绑定生命周期注册表和裁剪依据，并从注册表已发布架构审查的 trigger 条件计算 `applicability.checks`。缺少该声明的旧 v3 保留原保守材料要求。已有 UI 承接须声明 `frontend.baseline_kind: existing-ui-baseline` 与 `ui_change: none`，绑定已有观测包和前端交付验收；UI 变化仍走产品设计证据。未知影响、必要证据缺失和外部强制审批不能裁掉。

准备报告按来源发现、独立检查、依赖检查和组装给出诊断；blocker 的稳定 code、field、source_ref、responsibility 与 recovery 可用于一次回交。责任类别为 agent、professional-review、user-decision。依赖缺失的下游标记 not-executed。报告随草案保存为 `.preparation.json`，绑定 YAML 原始字节；阻断草案只显示诊断，不能批准或执行。报告 metrics 只记录本次实测准备耗时，未观测的补材料轮次与人工确认次数为 null，不把夹具当成真实工时收益。

多工程新草案在 `basis.repository_preparation` 绑定现有 schema v2 多项目准备结果。`extensions.cross_repo.repository_bindings` 以工程根为键，仅引用 basis 中各工程的 implementation_repository、engineering_baseline、manifest、technical_design 或 frontend_delivery；不复制文件事实。可用 recipe_refs / capability_refs 选择全局编译输入中的适用项。逐仓登记、基线身份、写上限、设计与编译约束都必须满足；所有工作单元显式选择 project_root。delivery_order 与 rollback_order 完整列出工程根；integration_verification 引用 verification 的 ID，联合验证用 cwd 和 dependency_roots 明确位置及依赖。

跨仓 `createApprovedExecutionContext` / `createApprovedRecompilationContext` 使用 `work_unit_id`，歧义阻断。Execution Result 保持 schema v2，跨仓 changed_files / evidence_files 使用 `{path, project_root}`；证据文件从所属工程读取，verification_results 必须携带真实 cwd 和适用 dependency_roots。单仓旧调用继续兼容。接收端重读来源批准与编译摘要并检查角色范围，不能用本地默认编译结果替换不支持的来源版本。

来源别名在单次读取内合并，审阅复用本次规范化的来源快照；没有外部可传入的缓存对象。执行边界始终重新读取。差异的 scope / acceptance / authorization / engineering-detail 分类附原字节证据与待审查说明；presentation-only 也不授予批准或确认语义等价。
