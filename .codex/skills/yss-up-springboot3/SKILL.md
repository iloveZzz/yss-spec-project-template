---
name: yss-up-springboot3
description: YSS Spring Boot 3 / Spring Cloud 升级辅助技能。Use when auditing or migrating YSS backend services/components from Spring Boot 2.x or Spring Cloud 2021-era dependencies toward Spring Boot 3, Jakarta namespace, newer Spring Security, MyBatis, OpenFeign, gateway, validation, and related compatibility changes.
---

# yss-up-springboot3

Use this skill for YSS backend upgrade analysis and migration tasks around Spring Boot 3 / Spring Cloud compatibility.

中文说明：这个技能是升级核查入口，不替代具体组件技能。遇到缓存、审计、MyBatis、DTO、Excel、JDBC 等组件细节时，应同时读取对应专项技能和源码索引。

## When To Use

- The user asks to upgrade YSS backend code to Spring Boot 3 or newer Spring Cloud baselines.
- The task mentions `javax.*` to `jakarta.*`, Spring Security migration, validation changes, Servlet API changes, Gateway/OpenFeign compatibility, or dependency BOM changes.
- The task involves checking whether a YSS component can run on Spring Boot 3.

## Workflow

1. Identify affected modules and current dependency versions from the local repository.
2. Check for Jakarta namespace changes (`javax.servlet`, `javax.validation`, `javax.annotation`, JPA APIs, and related imports).
3. Check Spring Security configuration style, deprecated adapters, authorization server dependencies, and filter registration behavior.
4. Check component-specific integration by loading specialist skills such as `yss-mybatis`, `yss-dto`, `yss-cache`, `yss-audit-log`, `yss-excel-mvc`, or `yss-jdbc`.
5. Prefer source-backed evidence from the local workspace or a source root resolved via `yss-source-index/references/source-location.md` before recommending code changes.
6. Produce an upgrade checklist or patch with explicit compatibility risks and verification commands.

## Common Checks

- Maven BOM and plugin versions are aligned before changing code.
- `javax.*` imports are migrated only where the target framework expects Jakarta APIs.
- Spring Security configuration no longer depends on removed `WebSecurityConfigurerAdapter` patterns.
- Validation annotations and exception handlers still map to the expected DTO/Result contract.
- MyBatis interceptors, auto configurations, and starter metadata are compatible with Spring Boot 3 auto-configuration loading.
- Tests or sample modules are updated together with framework code.

## Do Not

- Do not blindly rewrite all `javax.*` imports without checking whether the dependency still uses the old namespace.
- Do not mix unrelated business refactors into migration patches.
- Do not assume component compatibility from memory; inspect source and specialist skill indexes.
