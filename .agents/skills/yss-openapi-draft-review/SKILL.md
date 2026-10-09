---
name: yss-openapi-draft-review
description: "审查 YSS OpenAPI Draft 的需求覆盖、页面动作、响应、错误与测试 seam；不执行 Freeze。"
---

功能包根只从 `.template-spec/agents/issue-tracker.md` 的 `tracker.root` 读取；本文 `.work/` 路径是新项目示例，已有项目沿用已配置的根。

# YSS OpenAPI Draft Review

先消费已判定的交付路径。只有当前 Profile 的 `request_triage.delivery_path` 已启用且固定 CLI 支持 `yss lifecycle route|verify-daily` 时使用普通 API 审查；缺政策或能力的 Profile / 旧 CLI 明确不支持，本任务正式绑定仍为 `governed`。正式资产按 `.template-spec/process/contract-reading.md` 阅读，普通任务直接消费其验收、API 段和当前 OAS YAML。

Use this skill after OpenAPI Draft creation and before Engineering Baseline / YSS DDD Review. It is a fail-closed contract review skill for design-time OpenAPI files under `.work/<feature>/api/`; it does not bundle JSON or generate Orval clients.

上述工程阶段用于 `governed`。普通 API 小改只审查工具证明兼容的新增独立 operation：旧 operation、可达引用、路径继承与全局契约规范化保持完全相同。Reviewer 与实现者独立且只读，在原 Ticket API 审查段记录当前候选、结构/语义/兼容结论和未关闭项，不强制新 review 文件、校准 Spec 或 validation YAML，不写 `approved`。unknown、breaking、crossrepo、失败或过期证据返回 `blocked` 并停止受影响后续动作。

先辨认当前批准协议。普通采用 YSS wrapper 的 HTTP/JSON 响应消费 DTO wire profile；下载、流式和第三方回调按批准协议审查媒体类型、状态、Header、错误及权限边界，不强套 wrapper。例外须有契约依据且仍通过本技能的结构和语义审查。

## Required Inputs

普通任务输入为已合格 Ticket 的目标/验收、当前工程基线、权威 OAS 3.1 YAML 与完整基线、锁定 lint/refs/适用 YSS wire 证据和真实兼容报告。其工具/规则/日志原字节摘要及独立 `api_digest` 必须与当前 API 候选一致，reviewer 身份与 `implementation.actor_id` 不同；证据可以在同一 Ticket 的独立段。仅代码 diff 变化不使未变 API 审查失效；代码与契约测试另绑定整体 `candidate_digest`。以下独立正式资产用于 `governed`，实际 wire 与字段语义要求对两条路径同样适用。

- OpenAPI Draft under `.work/<feature>/api/<feature>.yaml`，作为唯一权威的单一 OAS 3.1 YAML document；生命周期元数据和 Freeze 决策位于相邻 Markdown 记录。
- `.work/<feature>/api/<feature>-validation.yaml`，且已由 `scripts/verify-openapi-draft-validation-record` 针对当前 Draft SHA-256 验证通过。
- Calibrated Spec.
- Interaction spec / prototype review when UI exists.
- YSS engineering baseline rules and `.agents/skills/yss-dto/references/openapi-wire-profile.yaml`；先运行 `scripts/verify-yss-dto-openapi-profile`。
- 若 Draft 包含 computed getter（例如 `totalPages`），必须提供目标 HTTP mapper identity、代表性序列化 fixture 和 contract-test / 等价 HTTP evidence。

## Review Flow

开始语义审查时读取 [P0 追踪与审查步骤](references/semantic-review.md)，逐项覆盖当前需求 / UI 命中的字段、操作、错误和测试 seam。当前摘要、锁定 lint 和语义证据通过后，普通审查才能记录 `passed`；正式审查才能记录 `Approved`。

## Automation Boundary

- Automated checks own YAML single-document syntax, `$ref` resolution, path-parameter consistency, OpenAPI lint, and stable machine-checkable style rules.
- `scripts/verify-openapi-draft-validation-record` owns validation-record shape, current-byte SHA binding, locked toolchain evidence and deterministic structural rechecks. It does not decide whether a business property correctly implements the Spec.
- `scripts/verify-yss-dto-openapi-profile` owns the reusable DTO mapping invariants; the review checks every endpoint's approved protocol, concrete schema and evidence, including the wrapper extension when the endpoint uses the YSS wrapper.
- Human or independent semantic review owns P0 traceability, page-action coverage, error behavior, concurrency/idempotency, scope downgrades, contract-test seams, and any explicitly specified authentication or authorization behavior.
- Fresh passing automation evidence may be referenced by the semantic review; copying the same findings into a second checklist is unnecessary.
- Re-run structural automation only when the Draft, ruleset, or referenced schema changes.

## Blocking Rules

Block if any of these are true. Governed validation-record requirements below use the current Ticket API evidence for a qualified daily task; they do not require a second validation YAML. Missing lint/compatibility/wire evidence, self-review, stale candidates or unresolved blockers prevent daily `passed`:

- A P0 requirement has no endpoint, schema, error contract, or explicit non-goal.
- The validation record is missing, stale, blocked or unverifiable; locked Redocly lint is absent or non-zero. Semantic pre-review may continue, but the overall Review Result remains `Blocked`.
- A P0 write/configuration model or key-interaction read model lacks property-level source, nested shape, operation-specific requiredness, constraints, error or test traceability.
- Multiple lifecycle operations reuse one schema even though requiredness or omission semantics differ and no explicit conditional contract resolves the difference.
- A UI action has no endpoint/non-goal mapping.
- A configurable rule or gate lacks a source, owner, fixed/default decision, or API representation.
- Pagination does not align with the `PageResult` profile or documented exception, or an endpoint using the YSS pagination protocol exposes `offset` / `needTotalCount` / `tempTotalCount` as client input.
- An ordinary response using the YSS wrapper omits `x-yss-response-wrapper`, uses the compatibility `com.yss.cloud.dto.response` package for a new wrapper contract, writes Java generic notation as an OAS schema, or fails `YssResultMeta` + `allOf` + concrete `data` mapping.
- In a YSS wrapper, `code` is modeled as arbitrary object or `dataType` loses explicit nullability; or computed fields such as `totalPages` lack target wire evidence.
- An in-scope behavior lacks a contract-test seam. Select import, mapping coverage, validation, review, publish, export or optimistic-locking seams only when the Spec/API actually includes that behavior; record a reasoned not-applicable for absent operations. A read-only query does not acquire write/import/publish requirements.
- YAML contains lifecycle frontmatter / root metadata, or the proposed JSON client input is not explicitly deferred until Freeze and governance export.

## Output Contract

形成持久化结论时读取 [审查输出契约](references/review-output.md)。普通结果只有结构、语义及兼容结论和独立身份均当前且通过时可为 `passed`，否则 `blocked`，不写 `Approved`。正式 `Review Result` 仅在 `Structural Validation` 和 `Semantic Review` 均为 `Passed` 时可为 `Approved`；否则 `Blocked`，不使用条件批准。
