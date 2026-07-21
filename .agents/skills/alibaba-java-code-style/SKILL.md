---
name: alibaba-java-code-style
description: Apply Alibaba Java Development Manual conventions when implementing, refactoring, or reviewing Java/JVM code, Spring-style services, MyBatis/ORM mappings, SQL, Maven dependencies, unit tests, exception/logging behavior, security checks, and design documentation. Use when the user asks for Java code规范, 阿里规范, P3C-style review, Java code style, or compliance with Alibaba Java coding guidelines.
---

# Alibaba Java Code Style

This skill distills the provided `阿里巴巴 Java 开发手册` 1.4.0 PDF into execution rules for Codex. Treat rules marked mandatory as review blockers unless the repository's own `AGENTS.md`, security constraints, or existing framework conventions explicitly require a different pattern.

## Workflow

1. Identify the touched surface:
   - Java source, naming, constants, OOP, collections, concurrency, control flow, comments: read `references/java-programming.md`.
   - Exceptions, logging, unit tests, or security: read `references/reliability-test-security.md`.
   - MySQL, ORM/MyBatis, Maven dependencies, layering, server/JVM settings, or design artifacts: read `references/database-engineering-design.md`.
2. Apply mandatory rules first, then use recommended rules to improve maintainability, performance, and readability.
3. When reviewing, report mandatory violations as findings. Mention recommended violations when they create real risk or are already in the changed area.
4. When implementing, prefer the repository's existing framework helpers and code generation skills over inventing new local infrastructure.
5. If a rule touches a project safety boundary such as auth, payment, encryption, raw SQL, database migration scripts, or public base library API changes, produce a draft or `TODO-HUMAN-REVIEW` rather than silently finalizing risky code.

## Core Priorities

- Keep names readable, English, and consistent with Java layer conventions.
- Avoid null, equality, wrapper comparison, collection, and concurrency traps that compile cleanly but fail at runtime.
- Make logs useful without wasting CPU, disk, or alert budget.
- Keep unit tests automatic, independent, repeatable, and close to public behavior.
- Bind SQL parameters, define explicit ORM mappings, and never rely on string-concatenated SQL.
- Preserve layering: web/controller code validates and adapts; service/manager code owns business orchestration; DAO/repository code owns persistence.

## Review Checklist

- Naming and formatting are consistent: camel case, constants, package names, braces, spacing, line length, UTF-8/Unix line endings.
- POJO, DTO, DO, VO, Query, enum, interface, implementation, and test names follow the expected suffixes and boolean naming rules.
- `equals`, `hashCode`, wrapper comparisons, `toString`, `serialVersionUID`, constructors, access modifiers, and getters/setters avoid known pitfalls.
- Collection code avoids unsafe `subList`, `Arrays.asList`, raw `toArray`, foreach removal, null-unsafe maps, and invalid comparators.
- Thread code uses named thread pools, avoids `Executors` factories in production code, and handles locking order, date formatting, and scheduled tasks safely.
- Exceptions are handled at the right layer, logged once with context and stack, and never swallowed or used for normal control flow.
- Tests use assertions, avoid external dependence, live under `src/test/java`, and cover boundaries, correct cases, design cases, and error cases.
- Security-sensitive inputs are validated, authorized, escaped, CSRF-protected, rate-limited, and never concatenated into SQL.
- MySQL DDL/SQL/ORM code uses explicit fields, mappings, indexes, timestamps, `#{}`
  parameter binding, and avoids dangerous cascades, stored procedures, `select *`, and uncontrolled pagination.

## Source

Based on the user-provided PDF: `阿里巴巴 Java 开发手册` version 1.4.0, Alibaba Group technical team, update date 2018-05-20.

## 阶段 7 执行结果

- 消费当前合同版本、changed files 和 verification results，只审查合同允许范围。
- 必须把 mandatory violation 返回为 `violation`，并提供文件/位置/规则证据；高风险项保留 `TODO-HUMAN-REVIEW`。
- 按统一 `YSS Skill Execution Result` 返回审查证据、偏离和新增安全/SQL/公共 API 影响，不得仅输出“符合规范”。
