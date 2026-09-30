# OpenAPI Draft 审查输出

仅在入口所列条件命中时读取本文件。Markdown 链接相对本文件；行内 references/assets/schemas 路径相对 Skill 根目录。仓库脚本与 pnpm 命令从当前登记的项目根目录执行。

## Output Contract

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
