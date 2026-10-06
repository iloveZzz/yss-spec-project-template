# OpenAPI Draft 审查输出

仅在入口所列条件命中时读取本文件。Markdown 链接相对本文件；行内 references/assets/schemas 路径相对 Skill 根目录。仓库脚本与 pnpm 命令从当前登记的项目根目录执行。

## Output Contract

已合格普通 API 审查直接回填同一 Ticket 的独立 API 审查段，保留 reviewer 身份、当前 OAS/引用闭包与独立 `api_digest`、锁定 lint/兼容/wire 证据、语义与测试 seam、未关闭项。只能在全部证据当前、审查者独立、阻断项关闭时记录 `passed`，否则 `blocked`；不写 `Approved`，不要求新审查文件或正式批准记录。Freeze 由后续动作锁定同一被审查 API 摘要；代码与契约测试另绑定整体 `candidate_digest`，不能由 reviewer 自行关闭生命周期门禁。以下完整正式报告用于 `governed`。

Wrapper 与分页检查按实际协议填写：采用 YSS 协议时记录 profile 符合性；下载、流式、回调或已批准分页例外记录协议依据、适用性和实际检查，不生成空 wrapper 或用不适用跳过审查证据。

```markdown
### Review Result
<Approved / Blocked>

### Structural Validation
<Passed / Blocked; validation record, Draft SHA-256, locked Redocly version, command and evidence>

### Semantic Review
<Passed / Blocked; P0 field traceability and remaining semantic findings>

### Blocking Findings
- <file:line grounded finding>

### Non-Blocking Suggestions
- <can wait until architecture/design>

### Contract Coverage
- <P0 requirement -> endpoint/schema/error/test mapping summary>
- <P0 field source -> operationId/schema/property path/shape/requiredness/constraints/error/test mapping summary>

### YSS Baseline
- <`x-yss-response-wrapper` map and `YssResultMeta` / `allOf` conformance>
- <profile version, concrete `data` schemas, nullability, request/response direction and computed-field evidence>
- <DDD boundary implications, implementation feasibility>

### Contract Test Checklist
- <wrapper meta fields: success/code/message/tips/dataType, including code string/integer/null cases>
- <single object, non-page list empty array, page empty array and page boundary cases>
- <PageQuery allowed fields, ASC/DESC and endpoint whitelist; negative assertions for offset/needTotalCount/tempTotalCount>
- <target HTTP mapper identity and computed-field fixture, if totalPages or another getter is included>
- <minimum contract tests before OpenAPI Freeze>

### Next Action
- <return to OpenAPI Draft / enter Engineering Baseline / architecture design / request YAML-to-JSON export after Freeze>
```

`Review Result` 只有在 `Structural Validation` 与 `Semantic Review` 均为 `Passed` 时才能是 `Approved`；不使用 `Conditionally Approved` 或 `Semantic Approved` 作为顶层结论。

Prefer `.template-spec/api/templates/openapi-draft-review-checklist.md` when a tabular checklist is useful.
