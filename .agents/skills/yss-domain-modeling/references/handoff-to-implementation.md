# Handoff To Implementation

Use this reference after the modeling brief is complete.

## To `yss-domain`

Use `yss-domain` when the next task is to create or refactor:

- `domain/{segment}/model/*Entity.java`
- `domain/{segment}/gateway/*Gateway.java`
- Domain behavior methods such as `publish()`, `cancel()`, `enable()`, `disable()`, `submit()`, or `approve()`
- Domain services that coordinate multiple aggregates

Pass the stable parts of the modeling brief: aggregate roots, entities, value objects, invariants, state transitions, gateway candidates, and unresolved assumptions.

## To `yss-repository` / `yss-db2mybatis` / `yss-mybatis`

Use persistence skills only after the domain boundary is stable.

- Use `yss-db2mybatis` when metadata or DDL should generate persistence scaffolding.
- Use `yss-repository` when implementing Repository, GatewayImpl, PO, and Convertor.
- Use `yss-mybatis` when the task depends on MyBatis/MyBatis-Plus conventions, BaseRepository, pagination, datasource, or mapper behavior.

Do not let persistence generation redefine aggregate boundaries.

## To `yss-web-controller` / `yss-dto`

Use web and DTO skills when API or adapter boundaries are clear.

- Use `yss-dto` for `CommandDTO`, `QueryDTO`, `PageQuery`, Result, validation, and DTO conventions.
- Use `yss-web-controller` for Controller, Web Convertor, AddCmd, UpdateCmd, PageQuery, and VO scaffolding.

Keep Web DTOs aligned with OpenAPI and acceptance criteria. Do not move domain rules into Controller.

## To `yss-ddd-scaffold-generator`

Use scaffold generation when the project/module does not exist yet or the user explicitly asks for a full DDD backend service skeleton.

After skeleton generation, return to `yss-domain-modeling` for business-specific modeling before writing detailed domain code.

## Handoff Format

Use this compact handoff:

```md
## 实现 Handoff

- 推荐下一步 skill: `yss-domain`
- 稳定模型: <aggregates/entities/value objects>
- 关键行为: <behaviors/state transitions>
- Gateway 候选: <gateway names and capabilities>
- 待确认: <questions>
- 后续持久层: `yss-repository` / `yss-db2mybatis`
- 后续 Web 层: `yss-web-controller` / `yss-dto`
- 人工门禁: <security/data/API decisions>
```
