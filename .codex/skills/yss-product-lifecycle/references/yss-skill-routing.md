# YSS Skill Routing Reference

Use this reference after lifecycle stage and slice scope are clear. Pick the minimal set of YSS skills that match the impacted engineering area.

## Common Routing

| Intent / impact | Primary skill | Secondary skills / notes |
|---|---|---|
| Decide YSS implementation skills for a slice | `yss-router` | Use before frontend/backend implementation when multiple YSS areas are touched |
| UI design, tokens, style consistency, Ant Design / YSS UI decisions | `yss-design-system` | Use before product design prototype or UI implementation |
| Product page / module development | `yss-page-module-development` | Add `yss-ui`, `yss-components`, `api-integration` as needed |
| YSS UI component usage | `yss-ui` | Use local examples first; then skill references |
| YSS component selection / patterns | `yss-components` | Useful for tables, forms, buttons, modals, layout |
| API client integration | `api-integration` | Requires stable API contract or clearly marked mock/prototype exception |
| OpenAPI generation or review | `yss-openapi`, `yss-openapi-draft-review`, `yss-openapi-governance` | Draft is review-only until Freeze |
| Backend service from scratch | `yss-ddd-scaffold-generator` | After implementation location decision; then baseline check |
| Backend scaffold baseline | `yss-backend-scaffold-parent` | Required after generated backend skeleton and before business implementation |
| Domain modeling / aggregate / state behavior | `yss-domain-modeling`, `yss-domain`, `yss-backend-scaffold-domain` | Use before repository/controller code when domain concepts are unstable |
| Application use case orchestration / transaction boundary | `yss-backend-scaffold-application` | Use when implementing AppService, command/query handling, cross-aggregate coordination, or transaction boundaries |
| Repository / PO / Convertor / GatewayImpl | `yss-repository` | Add `yss-mybatis` / `yss-backend-scaffold-infrastructure` for mapper/persistence details |
| Web controller / DTO / VO / Web Convertor | `yss-web-controller`, `yss-dto`, `yss-backend-scaffold-web` | Requires OpenAPI Freeze or no-API-impact record |
| Java coding style and review | `alibaba-java-code-style` | Treat blockers as review blockers |
| SQL condition/template/query utilities | `yss-sql-condition`, `yss-sql-tpl` | SQL red line still requires human review for native SQL |
| Audit log | `yss-audit-log` | Security and traceability impacts must be recorded |
| Cache | `yss-cache` | Include invalidation and consistency strategy |
| File upload/download | `yss-file` | Include temporary URL, permission, and cleanup considerations |
| Distributed ID | `yss-distributed-id` | Use for identifier strategy, not ad hoc ID generation |
| Dictionary / variable / validation | `yss-dictionary`, `yss-variable`, `yss-validation` | Use for shared business metadata and validation |

## Routing Rules

- Do not route directly to frontend/backend implementation skills before `yss-router` when the task crosses multiple YSS areas.
- Do not use backend implementation skills before required PRD, OpenAPI Freeze/no-impact record, architecture/data design, and Build Architecture Checklist are ready for the slice.
- Do not use Repository / MyBatis skills before data architecture and domain metadata are stable enough to review.
- Do not use Controller / DTO skills before OpenAPI contract is frozen or explicitly marked as no API impact.
- Do not use UI implementation skills before `yss-design-system` and product design/prototype review when user-facing workflow is affected.
- For bugs, start with `diagnosing-bugs`; route to YSS skills only after the failing feedback command points to the impacted area.

## Handoff Prompt Template

```text
请使用 yss-router 为 <slice> 选择最小 YSS skill 集合。

已知资产：
- PRD / Issue: <path-or-link>
- OpenAPI Freeze / no API impact: <path-or-link>
- Architecture / data design: <path-or-link>
- Build Architecture Checklist: <path-or-link>
- Implementation repo/location: <repo-or-path>

请输出：
1. 必须加载的 YSS skills
2. 可选 skills 与触发条件
3. TDD / 验证命令
4. 人审点和 TODO-HUMAN-REVIEW
5. 不应触碰的范围
```
