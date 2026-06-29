---
name: yss-liquibase
description: 用于 YSS Liquibase starter、数据库变更脚本、changelog、启动迁移和 Liquibase 配置排障。
---

# yss-liquibase

Use this skill for YSS Liquibase 组件. Keep implementation grounded in the local project and resolvable YSS backend component source.

中文说明：本技能用于 YSS Liquibase 组件。执行时优先读取源码索引，避免凭记忆猜类名、配置项或接入方式。

## Source Index First

- Backend source location is environment-specific; resolve it with `yss-source-index/references/source-location.md`.
- Generated index: `references/source-index.md`
- Component path hints: `yss-microservice-components/yss-component-liquibase-starter`

Read `references/source-index.md` as a path-hint index whenever the task depends on exact modules, annotations, auto configuration, properties, controllers, clients, repositories, DTOs, handlers, or troubleshooting.

## Workflow

1. Read `references/source-index.md`, then read `readme.md`; this component is mainly documentation/configuration oriented.
2. Identify whether the task is Spring Boot Liquibase setup, changelog structure, SQL file naming, rollback, environment contexts, or migration troubleshooting.
3. Prefer Spring Boot `spring.liquibase.*` configuration and `classpath:db/changelog/db.changelog-master.yml` style wiring.
4. For SQL migrations, follow the repository README conventions: versioned filename, semicolon-terminated statements, lower snake-case object names, and explicit constraint/index naming.
5. Require rollback thinking for schema changes, especially destructive DDL.

## Migration Rules

- Use Liquibase changesets or formatted SQL with author/id comments.
- Keep migrations small, ordered, and environment-aware via contexts/labels where needed.
- Store sensitive DB connection data in environment/config, not migration scripts.
- Avoid database-specific syntax unless the target database set is explicit.

## Checklist

- Required dependency or starter module is present.
- `spring.liquibase.enabled`, `contexts`, `default-schema`, `rollback-file`, and `change-log` are correct for the environment.
- Changelog file includes new migration files in the intended order.
- SQL files are idempotent where required and compatible with target databases.
- Rollback or recovery plan is documented for risky changes.

## Do Not

- Do not invent class names or configuration keys without checking the source index.
- Do not replace component extension points with business-local framework code.
- Do not broaden the task into unrelated YSS components unless the user asks.
