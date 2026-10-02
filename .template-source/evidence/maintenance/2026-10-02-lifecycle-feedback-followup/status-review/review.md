# 生命周期状态与友好提示后续审查

审查模式：`worktree`。固定基点：`96fc6c6e5362e0df17ab203768d9eb14f1102e49`。候选摘要：`0af1552c48b9a40a62a6583adc49dbbe1b3e58fe77372b3f0df2696d75c75cf1`。审查对象是重建的不可变树；未编辑产品、模板源码、批准或状态。候选流 framing、tracked diff、唯一未跟踪文件字节及重建 manifest 已核验，见 `candidate-verification.json`。

范围：`scripts/lib/lifecycle-status.mjs`、`lifecycle-presentation.mjs`、`scripts/lifecycle-status`，新增反馈测试、原 operator/core view 场景，以及关联 checkpoint/task schema、状态模型和实际恢复脚本。Spec 为用户要求当前阶段、下一阶段、问题/阻塞及处理，并以 `orchestration-contract.yaml.user_progress_report` 与 document-writing §4 约束具体语义。UI fidelity、Java 生产代码、`yss-repository` / `yss-mybatis` 均不适用：本候选只有 Node 状态阅读工具和流程合同，没有 UI 页面、Java 业务或持久化改动。

应用 `code-review`，连续完成 Standards / Spec。读取完整 candidate-capture、review-axis-checklists、smell-baseline 与 document-writing。完整 Fowler baseline 原字节保存在 `smell-baseline.md`，未改写或裁掉条目。没有仅因 smell 提出的硬门禁。

机器检查：新增反馈 9 个场景、`scripts/verify-lifecycle-operator-scenarios`、`scripts/fixtures/lifecycle-core/views.test.mjs` 均 exit 0（`new-tests.log`、`operator-tests.log`、`core-views.log`）。这些通过结果不覆盖下述反例；没有重新跑全套或宣称可发布。

反例由 `reproduce.mjs` 在本目录构造，真实调用候选 CLI 的 JSON/text 两种格式；同时用候选的权威 JSON Schema 校验输入。`results.json` 记录各输入 schema exit、CLI exit、诊断及动作。task-failed、task-paused、task-result-failed、check-failed、artifact-stale、route-missing、tracking-drift 的 checkpoint 全部 schema-valid；三种 task 全部 task-schema-valid。schema-valid 只证明输入形状，不代表批准或可执行。pause-shape 刻意用于合同冲突，schema exit 1。

## Standards

**S1 — IMPORTANT / inherited / 合同冲突：文档要求的暂停结构无法写入当前 checkpoint。**

`.agents/skills/yss-product-lifecycle/references/state-model.md:80` 说明状态示意字段位于 checkpoint，`:102-107` 展示 `pause`，`:121` 要求所有暂停/阻塞填写结构化 pause。`lifecycle-status.mjs:49` / `:205` 消费其中责任方与恢复条件。但 `.template-spec/process/schemas/lifecycle-checkpoint.schema.json:6` 为 `additionalProperties:false`，properties 不含 pause。`pause-shape/docs/checkpoint.json` 按该协议记录实际等待外部输入，权威 schema 报 `Additional properties are not allowed ('pause' was unexpected)`；只读 CLI 却能读取并显示等待/恢复，形成查询可读但正式持久化/预检拒绝的两套合同。暂停信息不能靠继续完善话术闭合。最小修复是由现有状态资产所有者统一暂停载体：明确受控兼容和迁移，补齐可持久化的 canonical 结构或把文档/读取统一到既有载体；保留旧原字节，不自动迁移或伪造批准。本问题在基点已存在，新增 continue_conditions 进一步依赖它。

**S2 — IMPORTANT / 本轮新增 missing_evidence：新增场景没有 schema-valid 的正向路径。**

`lifecycle-status-feedback.test.mjs:28-33` 共用 fixture 缺 `ticket_sync`、`verification`、`human_review`、`git_checkpoint`、`rollback`，tracking 缺 schema/entry 和工作项必填字段。`:112-134` 使用 schema 不支持的 gate `pending/failed` 和 `applicable`，`:148-159` 依赖 S1 中的非规范 pause。这些可以是宽松读取错误/兼容记录的测试，但不能证明规范实例的门禁提示或正式恢复成立。正向 fixture 应从真实 template 构建并先通过权威 schema；负向/兼容 fixture 另外明确预期结构失败，覆盖合法 `checks.failed`、`artifacts.stale`、task failed/paused/resolved+failed。`blockers` 的结构对象不属于此问题：schema 只要求 array，本轮结构化阻塞对象是允许的。

## Spec

**F1 — IMPORTANT / inherited：任务失败、暂停和失败结果没有进入问题列表。**

`lifecycle-status.mjs:135-153` 仅核对任务状态名称与结果引用可读，就把 task-recovery 标 passed；未消费 result.result、blocking_signals、violation/drift/new_impacts 或 verification_results.exit_code。`:175-185` 只有 active/resolved 分支，failed/paused 落入核验后恢复分支。三个 schema-valid task 的结果中有“预算模型输入格式错误，无法生成需求分析”和验证 exit_code 1；CLI 均 exit 0、blockers=[]、诊断为空，中文完全不展示该失败。failed/paused 建议“再由主控恢复”，resolved+result.failed 建议“核验已有完成证据”。这违反合同 `user_progress_report.issues.all_material_blockers_visible`、`recovery` 和文档 §4 的“状态及恢复说明来自当前登记”。修复：分别显示运行态与结果态，列出结果阻断/漂移/失败验证、实际证据和责任缺口，failed/paused 先检查原任务；resolved 不等于 result.completed。证据：`task-{failed,paused,result-failed}/docs/task.json`、各 `status.{json,txt}`、`schema-check.txt`。

**F2 — IMPORTANT / inherited：合法登记的检查失败和资产 stale 完全漏显。**

查询消费 gates 以及 approved 资产可读性（`:90-115`），没有消费 checkpoint.checks 或 artifacts.stale。`check-failed` 登记 `check.stage-decision-package-approved.status=failed`、原因“决策包缺少业务边界”；`artifact-stale` 登记 `artifact.plan.status=stale`、stale_by“业务边界已变化”。均权威 schema-valid，CLI exit 0、blockers=[]、无问题/过期输入/处理提示，中文仍说“未登记阻塞”。该措辞没有宣布批准，但把已登记失败或过期依据当未发现，对用户定位阻塞没有帮助。合同 issues 要求全部实质阻塞和 stale 输入可见，文档 §4 要求明确过期输入及恢复动作。修复：把已登记失败/stale 检查、资产以及原因/来源显式投影；根据已登记依赖判断受影响动作，不能缺关联就自动把所有历史项都当当前 blocker，关联不足明确待核验。证据：`check-failed/`、`artifact-stale/`。

**F3 — NORMAL / 本轮新增：下一阶段关联 passed 与路由缺失/来源漂移前后不一致。**

`:70-82` 在路由和 tracking 核查前就选定 next_stage 并把关联标 passed；`:86` / `:119-121` 后续发现 missing-route 或 tracking-drift 不使该展示降级。schema-valid `route-missing` 删除 Spec 路由后仍输出“下一阶段（路由目标）：Spec / 功能架构”、next-stage-association=passed，同时正确显示 missing-route 阻塞；`tracking-drift` 同样把已漂移工作项的关联写 passed。合同 `next_stage.source` 要求 current association and validated route，`unresolved_or_missing_route` 要求 not-verified；用户文本与结构结果应一致。这里未授予执行权限，阻塞已正确报出，风险限于把待复核的登记目标呈现为已核验的下一目标。修复：保留 recorded candidate/stage 供追踪，但路由缺失或关联依据漂移时让 next_stage/association 呈待核验并解释来源。证据：`route-missing/`、`tracking-drift/`。

Standards 共 2 项，最严重为 IMPORTANT 的暂停载体合同冲突及正向规范覆盖缺失；Spec 共 3 项，最严重为 IMPORTANT 的任务失败及检查/资产漏显。没有批准、实现或发布结论。
