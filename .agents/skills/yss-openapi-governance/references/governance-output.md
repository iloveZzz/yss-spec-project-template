## 输出契约

```markdown
### Governance Result
<Draft / Approved for Freeze / Blocked / JSON Exported>

### YAML Authority
- YAML: <docs/.scratch/<feature>/api/<feature>.yaml>
- OAS: 3.1.0
- YAML SHA-256: <sha256>
- Freeze record: <path / ref>

### Validation
- Lint command and result: <locked pnpm command / result>
- Validation record: <docs/.scratch/<feature>/api/<feature>-validation.yaml / verifier result / matching YAML SHA-256>
- YSS DTO wire profile: <`.agents/skills/yss-dto/references/openapi-wire-profile.yaml`, schema_version, verifier result>
- P0 field traceability: <source / operationId / schema / property path / shape / requiredness / constraints / error-test summary>
- Wrapper conformance: <`x-yss-response-wrapper`, `YssResultMeta`, `allOf`, concrete data schema, direction and forbidden-field result>
- `$ref` policy / approved exceptions: <details>
- Blocking findings: <file:line grounded finding>

### JSON Derivative
- JSON: <docs/.scratch/<feature>/api/<feature>.json>
- JSON SHA-256: <sha256>
- Redocly CLI / lockfile: <version and lock reference>
- Bundle command and metafile: <command / path>
- JSON validation result: <pass / blocked>

### Downstream Handoff
- Canonical JSON / frontend materialization SHA-256: <same sha / blocked>
- Frontend materialization path: <frontend/openapi/openapi.json / blocked>
- Existing frontend code generation: <manual command in target repository / blocked reason>
- Template boundary: <no frontend configuration, code-generation execution, or CI change>
```
