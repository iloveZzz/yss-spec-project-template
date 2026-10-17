# 普通任务交付

适用条件、排除项及能力要求只由 `.template-spec/process/orchestration-contract.yaml.request_triage.delivery_path` 定义。本文说明执行，不定义第二套路由。Spec、Backend 的项目本地已启用政策及支持 `route` / `verify-daily` 的固定 `yss` CLI 可用；缺政策的 Profile、旧 CLI 或无法核验能力时返回 `daily unsupported`，保留原正式路径，不以文字豁免其前置条件。

固定入口是 `yss lifecycle route|verify-daily --root <治理项目> --task <项目内Markdown> --implementation-root <真实Git根> --base <完整SHA> [--profile spec] [--json]`。`route` 不执行测试、不宣布完成；只有返回 `delivery_path: daily` 才取得普通路径资格，`needs-info` 先补事实，`governed` 保留正式路径。不支持的工具返回明确 `UNPORTED`，不能当作普通路径通过。

普通任务正文末尾只保留一个 `<!-- yss-task-evidence -->` 和紧随其后的 fenced JSON。字段消费当前 CLI；这是一张 Ticket 的证据段，不是另建配置文件。实现仓绝对 Git 根、完整 baseline SHA、仓内允许路径和真实差异必须一致；基线、风险、技能、输入、日志及审查引用按工具要求绑定可读字节。`candidate_digest` 由工具绑定正文、输入、范围和当前 Git 差异，不把自填摘要当作实际候选。

`ref: "#标题"` 可引用本 Ticket footer 之前的真实唯一标题正文，直到下一个同级或更高标题；摘要是这段正文原始字节的 SHA-256，不含标题行、footer 或自身 metadata。重复标题和空正文不能作为证据。目标、验收、工程基线、回滚、风险参与候选摘要；测试/日志/审查段独立核验原始摘要，不把它们写进候选形成循环。复核和日志可以使用这些章节，不强制另建文件。实际日志为 JSON 对象，可用 fenced JSON：`argv` 是实际参数数组，`cwd` 是显式实现仓绝对根，`exit_code` 是观察到的退出码，`executed_at` 是 RFC3339 时间，可同时保留 stdout/stderr；代码测试日志正文必须带当次 `candidate_digest`，API lint 日志正文必须带当次 `api_digest`，与 footer 登记及当前候选逐项一致，不能只重新填 footer 续期。CLI 核验命令、根、退出码、时间和原始摘要的一致性，不执行测试。普通审查和 API 审查都必须明确写 `blocking_findings: []`；开放阻断项不能用 `result: passed` 覆盖。审查章节为可解析 JSON，可附 `summary`：包含 `assessment`（mode、实际 provenance）、`result`、`blocking_findings` 及当次 `candidate_digest`（普通审查）或 `api_digest`（API 审查），同 footer 和当前字节互相核验。

## 一张任务记录

1. 复用或建立一张普通 Ticket / PR，记录目标、验收例子、单一实现仓库与允许写范围、可逆依据、适用工程基线、YSS 技能和验证命令。直接消费当前需求、代码及相关 ADR，不先生成正式 Spec、checkpoint 或 Slice。
2. 由支持的 `route` 按当前任务及其真实绑定判定。已绑定本任务正式阶段、checkpoint、Slice 或生效中的正式决定时恢复 `governed`；旧记录未声明路径时不自动降级。仓库内其他功能的正式资产不构成本任务绑定；普通任务可引用既有冻结 API 作为兼容比较基线。
3. 在已授权范围内按 YSS 技术规则执行小步实现和行为测试。公开测试 seam 来自任务验收和当前工程基线；缺少影响判断的事实先调查，不用填写空正式资产代替调查。
4. 使用 `code-review` 对同一当前差异、验收、适用 YSS 技能和实际测试完成内容复核。默认同一 Agent 诚实自检；明确用户或已知外部要求才使用可核验的独立上下文/指定真人，冻结复核期间只读。证据缺失、测试失败、未执行、阻断项或过期时不能完成；修复只复验受影响结论与依赖。
5. 把结果、实际命令及退出码、可读日志、实际来源、复核方式与结论记回原 Ticket / PR，按固定 CLI 的 `verify-daily` 要求核验。普通任务不生成 `approved`、`ready-for-agent`、正式 `Workflow Execution Result` 或正式 v1 任务包；校验通过不授权 commit、push、部署或发布。

按需协作仍复用这张记录，明确实际 tool/task/execution 引用、输入、目标、互不重叠的写范围、禁止事项和汇合；不要求岗位、runtime 或数字人注册。身份可得时如实记录，不可得时写 identity.status: unavailable 及原因。不得把普通记录当正式合同或把同一上下文改名为独立复核。

发现破坏性 API、跨仓、迁移、架构/平台变化、关键权限行为或其他政策排除项时，停止受影响后续动作并保留已有修改、日志和审查；调查实际影响后从最近可信阶段进入 `governed`。不得删除绑定、改路径标签或给正式准入器加豁免旗标来继续。无依赖且仍符合授权的工作可以继续。

## 最小起步记录

下面是普通任务的 Markdown 模板。替换所有 `__...__`，补写具体目标/验收/风险依据；`baseline_sha` 使用真实完整 Git SHA，技能摘要使用该治理项目已安装 Skill 的原始字节 SHA-256，`commands` 使用工程已有命令，`scope.paths` 限本轮实现范围。追加实际消费的技能和输入，不把示例当作全部技术约束。现行/历史正式绑定须真实列入 `formal_bindings`，不能清空后降级。此初稿仅供 `route`；尚无 implementation/tests/review 时 `verify-daily` 必须阻断。

````markdown
# 普通 Ticket

## 目标
__本轮要修复或增加的具体行为__

## 验收
__可观察的成功结果与至少一个边界例子__

## 工程基线
__已有工程、相关技术基线及真实验证命令__

## 回滚
__恢复指定范围基线或其他已核实的可逆办法__

## 范围评估
__单仓、允许路径、可逆性及实际风险判断的证据__

<!-- yss-task-evidence -->
```json
{
  "schema_version": 2,
  "policy_version": 2,
  "delivery_path": "daily",
  "task_id": "task.__NAME__",
  "goal_ref": "#目标",
  "acceptance_ref": "#验收",
  "repository": {
    "root": "__ABSOLUTE_IMPLEMENTATION_GIT_ROOT__",
    "baseline_sha": "__FULL_BASE_SHA__",
    "baseline_ref": "#工程基线",
    "rollback_ref": "#回滚"
  },
  "scope": {
    "paths": ["__IMPLEMENTATION_RELATIVE_PATH__"],
    "impacts": [],
    "risk_ref": "#范围评估"
  },
  "formal_bindings": [],
  "skills": [{"ref": ".agents/skills/tdd/SKILL.md", "digest": "sha256:__SKILL_SHA256__"}],
  "commands": [{"argv": ["pnpm", "test"], "cwd": "."}],
  "inputs": [],
  "api": {"mode": "none", "reason": "__没有API行为变化的具体依据__"}
}
```
````

以 `yss lifecycle route --root __GOVERNANCE_ROOT__ --task __TASK_RELATIVE_PATH__ --implementation-root __ABSOLUTE_IMPLEMENTATION_GIT_ROOT__ --base __FULL_BASE_SHA__ --profile spec --json` 取得当前候选。工具只读，不执行测试。实现后再次 route，使用其真实 `diff_digest`、`changed_files` 和 `candidate_digest` 回填 implementation、实际 tests 与适用 review；日志和审查正文可用同 Ticket 的唯一章节，填其原始字节摘要。最后将同一命令的 `route` 改为 `verify-daily` 核验，不写虚构 exit_code 或把待执行记录改成通过。CLI 缺失能力时保持不支持，先完成授权范围内的工具接入而非改用正式校验器豁免。

## standard 路线

条件只由 `request_triage.delivery_path.standard` 定义：需求要先确认一页，但不触及 daily 的排除影响。沿用同一张任务记录和 daily 的全部完成条件，另加两项：

1. 按 `.template-spec/templates/spec-lite-template.md` 写一页 Spec-lite，证据段登记 `spec_lite: {ref, digest}`。
2. 由原提问者或实际指定真人对当前 Spec-lite 作一次 `standard-change-approved` 决定，登记 `standard_decision: {id, decision: approved, actor_kind: human, decided_by, spec_lite_digest, response_ref, response_digest}`；`response_ref` 指向保留真实请求、完整展示和原始回复的 user-decision1 记录，boundary 为 standard-change-approved，当前 subject/scope 必须一致；不是只保存一段文本或只有回复摘要。允许原提问者确认；Agent、超时和默认项不能代答。Spec-lite 改动后原决定失效。

证据段写 `delivery_path: standard`。`route` 对 daily 记录命中 standard 影响时返回 `delivery_path: standard` 与 `standard_required: true`，补齐上述两项并改标签后重新路由；`verify-daily` 在升级前拒绝（`STANDARD_REQUIRED`）。standard 命中排除影响时升级为 `governed`；任何方向都不降级。不创建阶段 checkpoint、正式 Slice、`ready-for-agent` 或多级批准；CLI 不支持时按 `governed` 推进。

## 兼容 API 小改

兼容资格按政策和固定 CLI 的保守检查取得：基线与候选为 OAS 3.1 YAML，旧 operation 及其可达 `$ref` 闭包规范化后完全相同，新增独立 operation 不改变旧行为。无法证明、破坏性变更或跨仓时进入 `governed`。

执行仍是 YAML Draft → 锁定 lint、引用解析和适用 YSS wire 检查 → 兼容检查及API 内容复核 → 摘要 Freeze → 实现、契约测试和适用代码复核。所有证据写在同一普通 Ticket 的 API 段；不另建 validation YAML、API Contract Decision 或工程批准包。适用字段、摘要及命令格式消费当前 `route` / `verify-daily` 工具要求，不手写另一套 schema。

API 段保留基线及候选 YAML/引用闭包摘要、锁定工具链与规则、真实命令/退出码/日志、兼容结论、独立审查身份及其审查摘要、未关闭项、Freeze 摘要和实现消费摘要。有 JSON 派生时仍从冻结 YAML 可复现生成，并记录 JSON 摘要和 bundle/校验结果；JSON 不反向成为权威。

`api.mode: none` 带具体原因；`compatible-additive` 的 `baseline.ref` / `candidate.ref` 指向实现仓同一 OAS 文件，baseline 字节来自 `--base`，candidate 来自当前工作树。`new_operations` 列出真实新增的 path、method、operation_id。非空 `api.rules: [{ref, digest}]` 绑定治理项目中适用 API 规则，与普通代码 `inputs` 分开；`api.tools` 绑定实际工具/版本/lock 摘要。工具锁、lint 日志、独立 API review 和 contract tests 保存在治理项目可读引用或本 Ticket 唯一章节中。`api.tools` 只接受精确锁定的 `@redocly/cli`，`lock_ref` 指向能证明该版本的真实 pnpm/npm 锁文件，`digest` 为其原始摘要；包声明不是锁文件。`api.rules` 必须包含 `.agents/skills/yss-dto/references/openapi-wire-profile.yaml` 的当前摘要。`api.lint` 包含 `tool: @redocly/cli`、精确 `version`、`argv: [pnpm, exec, redocly, lint, <候选OAS>]`、实际退出码、日志和 `api_digest`。`api.compatibility: {tool: yss-native-conservative, api_digest: <当前摘要>}` 消费 CLI 内置 operation/ref 闭包比较，不要求第二套兼容工具锁或日志。`api.wire` 写 `applicability`：不适用时给具体原因，含 YSS wrapper 的候选不能声称不适用；旧 `verify-yss-dto-openapi-profile` 只验证 profile，并不验证候选响应。支持 native target-wire 的 CLI 在 `verify-daily` 内校验候选 OAS 和实际样本，覆盖 SingleResult、MultiResult、PageResult、PageQuery；未知结构或旧 CLI 仍明确阻断。`route` 只判资格和列必要检查，不能替代 Freeze 前的实际 wire 校验及API 内容复核。无 wrapper 的独立 API 仍按上述保守资格执行。API lint、compatibility、review 使用工具返回的独立 `api_digest`；代码测试、代码审查和 contract tests 使用整体 `candidate_digest`，各日志/正文仍核验原始字节摘要。审查主体不得等于 `implementation.actor_id`。`api.freeze` 只需 `digest` 等于当前 `api_digest`，不另要求 `ref` 或 `candidate_digest`。这个 `APIContractDigest` 包含 OAS、引用、适用 API 规则、工具锁和适用 mapper 基线，不等于仅 YAML 文件摘要。只有工具能够解析并证明旧 operation、可达引用、路径继承与全局契约不变时可留在普通路径；外部引用或未覆盖解析不自称兼容。

API 内容复核通过后才能锁定 Freeze 摘要。`daily` 审查使用通过/阻断，Freeze 只锁定被审查的契约字节，不写生命周期 `approved`。YAML、可达引用、lockfile、适用规则或目标 mapper 配置/构件变化时，相应结构证据、兼容结论、审查与 Freeze 失效；完成及恢复前重新核验同一当前闭包。不得在审查后重新写摘要却沿用旧结论。

仅代码变化会改变整体 `candidate_digest`，须重验受影响代码测试、代码审查和契约测试；API `api_digest` 未变时复用当前 lint/兼容/API 内容复核/Freeze，不默认重复完整 API 语义审查或手动重绑定。OAS、引用、工具锁或适用规则变化则使 `api_digest` 改变，重新执行受影响 API 校验、审查和冻结。原始字节摘要、API 摘要与整体候选摘要不得相互冒充。


政策2 / record2 在同一 API 块保存真实 `draft`、`freeze` 事件：每行 argv、exit_code、api_digest、log_ref、log_digest，freeze 另带 digest。原始事件日志含相同参数、退出码、实际实现仓 cwd、executed_at、phase: draft|freeze、api_digest；implementation.provenance 的实际日志同样绑定被消费 API。必须能证明 Draft ≤ 锁定 lint ≤ 当前内容复核 ≤ Freeze ≤ 实现 ≤ 契约测试；已有旧摘要测试、nonzero、not-run 或仅 freeze.digest 都不够。缺事件只停止依赖实现/完成，不补写未来时间或伪造成功日志，也不新增人工确认。内容复核使用实际 assessment/provenance，默认自检；保持实现、契约测试绑定整体当前候选，API 事件绑定当前 API 摘要。

## 目标 wire 证据

同一 Ticket 的 `api.wire` 扩展为 `applicability: applicable`、`mapper`、`samples`、`argv`、`exit_code`、`api_digest`、`log_ref` 与 `log_digest`。`mapper.id` 是实际 HTTP converter/mapper 身份；`inputs: [{ref, digest}]` 绑定实现仓配置依据；`runtime: {ref, digest}` 引用治理项目或同 Ticket 中真实运行配置 JSON，包含 `id`、`registered_modules`、`serialization_features`、`artifact_digests`（构件名到原字节 SHA-256）。配置和构件变化使 API 审查及 Freeze 失效；仅普通业务代码变化更新代码测试/审查，不重复冻结。

`samples` 中每项包含候选主 OAS 的 `oas_pointer`、`wrapper`、治理项目中 `sample_ref` 和原字节 `sample_digest`。样本验证消费观察到的本地引用闭包与锁定 JSON Schema 引擎；wrapper 注解必须一致并证明 object 根类型，canonical profile 的必填、null、数组、分页约束及 PageQuery 客户端字段/白名单均须可证明。外部本地 refs、PageQuery 和嵌套 wrapper 不能借只覆盖主文件或 nullable data 漏样本；复杂且无法证明的组合返回阻断。`totalPages` 只有目标 mapper 真实样本支持时可声明。

实际测试必须是登记的根 `./mvnw test|verify|integration-test` 或 `pnpm test` / `pnpm exec vitest run` / `pnpm exec playwright test`，不允许跳过测试、版本查询、echo 或 profile-only。执行日志除了已有命令、根、实际退出码、时间和当次摘要，还包含 `mapper_id`、与登记相同的 `samples` 及原始 `stdout`。测试在真实序列化后发射 `YSS_WIRE_SAMPLE <JSON>` 行，JSON 包含 `mapper_id`、`wrapper`、实际样本字节的 `sample_digest`；另发射 `YSS_WIRE_MAPPER <JSON>`，与当前 runtime 配置事实一致。主控保存观察到的输出，不重新编造这些行。只读 CLI 能核验字节、输入、命令和输出一致性，执行者或满足实际独立要求的上下文仍须确认测试真的消费目标 HTTP mapper、样本来自实际执行及声明的环境范围；日志不是执行沙箱或外部真实性证明。

先校验 Draft、实际 wire 与API 内容复核，再在本记录填写 Freeze 摘要并实现、执行契约测试。全量配置和线上部署 mapper 未核验时，明确限定证据范围，不能扩大环境声明。缺 mapper、样本、真实测试、适用复核缺失或出现漂移时不能宣布完成。

## 版本与条件要求

新项目使用 record2/policy2。旧 record1 在原政策下保留原 actor/reviewer/独立批准语义，不把删掉字段当迁移。旧治理实例的新任务/阶段写入须先显式迁移；旧 CLI 不支持新身份或证据时保持拒绝。没有已知额外外部规则时无需创建空制度、审批表或额外问卷。已知必需复核缺证据时只停止依赖动作；独立且仍授权的草稿/调查继续。独立要求的真实来源格式与边界见 [用户决定](user-decisions.md#已批准范围内连续推进)。
