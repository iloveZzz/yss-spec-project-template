# YSS 审查标准源与机器检查

本文件只服务唯一默认审查技能 `code-review`。Alibaba Java、YSS 前端 / 后端 skill 是 **Standards 轴的专项检查输入**，不是第二个通用审查 skill。

权威接线：`yss-product-lifecycle/references/orchestration-contract.yaml` 的 `work-unit.code-review.review_standards_route` 与 `review_input`。报告形状：`docs/templates/review-report-template.md`。

## 1. 编译标准源

按顺序收集，缺项写 `not-applicable` 及原因，不得省略适用项：

1. 仓库文档：`CODING_STANDARDS.md`、`CONTRIBUTING.md` 或实现仓等价文件（若存在）。
2. Slice Implementation Contract 的 `required_skills`：对每个技能读取 `.agents/skills/<id>/SKILL.md` 及该 skill 指明的 references。
3. 影响面专项检查输入（与合同并集，不得互相替代）：
   - 后端：`alibaba-java-code-style`、`yss-domain`、`yss-application`、`yss-repository`、`yss-mybatis`、`yss-web-controller`、`yss-dto`、`mapstruct`、`lombok`
   - UI：`yss-ui`、`yss-design-system`、`yss-ui-business-page-generation`
4. 报告模板中的后端 / 前端门禁表。空着的适用行视为 `missing_evidence`。

YSS 页面模块约定（YTable、YFormily、页面骨架等）走 Standards，不并入 UI fidelity。UI fidelity 只核原型与状态矩阵。

审查者只读这些 skill，不得用它们写实现路径。`role.test-engineer` 任务包禁止 `implement` 与脚手架生成器。

### 后端范围与持久化适用性

- Review roots 从候选本体项目、实现仓登记、Slice `project_roots` 和 `allowed_write_paths` 解析；只包含本体项目和已登记后端研发项目，不固定为 `apps/backend`，不扫描前端、无关 submodule/vendor 或未登记目录。
- 每个后端候选都必须分别评估 `yss-repository` 与 `yss-mybatis`。命中 PO、Repository、Mapper/XML、SQL、分页、批量、扫描/配置或数据源行为时，两者均为 applicable，并加载所选 Repository Profile 与当前 MyBatis source index。
- 精确组件 API/配置结论要求 source index 的组件 tree 与当前源码一致且组件子树 clean；不满足时为 `missing_evidence` / `stale`，不能判 pass。
- 无持久化影响时，两项 Skill 分别记录具体 `not-applicable` 原因；仅写“未命中”或留空不构成证据。

## 2. 机器检查

在派发 Standards / Spec 子审查之前，对实现仓**已登记且当前可执行**的命令实际跑一遍：

- 后端优先：对本体项目和每个已登记后端研发项目分别执行其切片合同里的 `./mvnw` 验证；若工程已配置 Checkstyle / P3C / Spotless / `validate`，一并执行。
- 前端优先：切片合同里的 `pnpm` 验证；若存在 `pnpm lint` / `pnpm type-check`，一并执行。

记录命令、退出码、时间和证据引用。退出码非 0 记为 Standards **hard violation**。

仓库没有对应工具时，该工具行写 `not-applicable` 加原因。可被工具检查的 Alibaba / ESLint 规则若工具没跑、LLM 也没按原文引用规则，不得记 `pass`。无法 lint 的分层、页面骨架、Formily 约定由 LLM 按 skill 原文引用。

## 3. 完成阻断

出现以下任一情况时，`work-unit.code-review` 不得 `completed`：

- 未消费合同 `required_skills` 或漏掉命中影响面的专项检查输入
- 报告模板适用行空白或只写“符合 YSS / 符合阿里规范”
- mandatory Alibaba 或 YSS 门禁 `violation` 未关闭
- 机器检查失败，或可检查规则既无工具结果也无原文引用
- 用第二个通用审查 skill 代替 `code-review`

## 4. Finding 分流与豁免

产品切片与模板维护使用**同一闭环**；只是强度不同：切片绑定当前 Slice Implementation Contract，模板维护绑定 L1 / L2 / L3。权威字段：`review_standards_route.finding_disposition`。

审查者只记录 finding，不得当场改实现代码。

| 类型 | 动作 |
|---|---|
| `violation`、机器检查失败、适用行空白、`missing_evidence` | 实现者在**原合同允许路径**内修复；任何修复使候选失效，必须重新捕获并重跑 Standards、Spec、UI fidelity（若命中）和 fresh verification |
| `drift`、`new_impacts`、`required_skills` 与真实影响不一致 | 合同标 `stale`，回 实现合同编译器 或更早生命周期阶段；禁止在旧合同上继续编码 |

`not-applicable` 仅当影响面未命中。命中后的 mandatory 不得豁免；只允许修复，或写完整 `seam-deferred`（风险、责任人、后续 Ticket、验证计划、目标版本或发布日期）。禁止为日常 Alibaba / YSS 新增生物人豁免门禁；安全 / 公共 API 仍走既有 `TODO-HUMAN-REVIEW` 与生物人门禁。


## 可执行后端审查结果

后端 `work-unit.code-review` 到交付的流转由 `scripts/lib/backend-review.mjs` 检查。
`decision_state.review_input` 绑定 `slice_contract_ref`、`approval_ref`、跨仓时的 `work_unit_id`、`project_root`、既有候选的 `review_mode`、
`candidate_snapshot_ref`、`implementation_candidate_ref`、`candidate_digest`、
`implementation_actor_id`、`implementation_instance_id` 和 `actual_skill_impacts`（无新增影响为 `[]`）。
`review_result_ref` 指向唯一 `code-review` 结果；记录 `result: completed`、合同原始字节的
`contract_digest`、候选摘要、`reviewer` / `implementer` 的 actor_id / runtime_id / instance_id，
并分别记录 `axes.Standards` 和 `axes.Spec`。自审不能用不同角色名替代不同执行实例。

复用 `constraint_results`，按派生覆盖清单逐条包含 `constraint_id`、`applicability_basis`、`axis: Standards`、`skill`、`constraint`、`status`、`rule_ref/rule_digest`、`code_ref`、`evidence_ref/evidence_digest`。每个适用技能还须完成 full-text 项并保留具体 `review_notes`。漏技能、漏规则、重复项、过期证据均不能完成。无分页等需求只豁免对应条件规则，不豁免整个适用技能。

后端输入必须增加 `scope_kind: change`、`standards_coverage_ref/digest`；`committed` 候选还绑定 `review_base_ref`。只读存量基线使用 `scope_kind: baseline`，允许无 Slice/无 diff，成功仅为 audited，不能关闭实现审查。详细输入、未知类型与全文核对规则见 `yss-backend-spec-review/references/standards-coverage.md`。未提供结构化覆盖的历史报告只能阅读，不作为新完成证据。

工作树候选复用现有 packed candidate 工具；审查证据可排除，业务文件不可排除。已提交候选绑定
不可变 tree ID，并核对当前清洁 checkout。读取结构化结果不会代替 Reviewer 的实际规则判断。

`verification_results` 必须包含实际 command、executed_at、exit_code=0、candidate_digest，以及日志 evidence_ref/evidence_digest。缺少本次机器检查或日志漂移不能完成审查。
