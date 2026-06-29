# Database, Engineering, And Design Rules

Use this reference for MySQL DDL/SQL, ORM mappings, Maven/library dependency rules, application layering, server/JVM settings, and design artifacts.

## MySQL Table Design

Mandatory:

- Boolean database fields must be named `is_xxx` and use `unsigned tinyint`, where `1` means yes and `0` means no. POJO boolean fields must not use `is` prefix, so define explicit ORM mappings.
- Table and field names must be lowercase letters or digits. Do not start with digits, use uppercase, or use patterns such as `level_3_name`.
- Table names must be singular.
- Do not use MySQL reserved words such as `desc`, `range`, `match`, or `delayed`.
- Index names: primary key `pk_字段名`, unique index `uk_字段名`, normal index `idx_字段名`.
- Use `decimal` for decimals. Do not use `float` or `double` for precise stored values.
- Use `char` for nearly fixed-length strings.
- `varchar` length must not exceed 5000. For longer content, use `text` in a separate table keyed by the primary key to avoid hurting other index efficiency.
- Every table must include `id`, `gmt_create`, and `gmt_modified`. `id` is `bigint unsigned` primary key with auto-increment step 1 for single tables; timestamps are `datetime`.

Recommended/reference:

- Prefer table names like `业务名称_表作用`.
- Keep database name aligned with application name where possible.
- Update field comments when field meaning or status values change.
- Redundant fields are allowed for performance only when consistency is considered, the value is not frequently changed, and the field is not long `varchar` or `text`.
- Consider sharding only when a single table exceeds about 5 million rows or 2 GB, or when projections clearly require it.
- Choose compact unsigned integer types where domain ranges allow.

## Indexes

Mandatory:

- Business-unique fields must have unique indexes, even when uniqueness is also checked in application code.
- Do not join more than 3 tables. Join column types must be exactly consistent and associated columns must have indexes.
- When indexing `varchar`, specify an index length based on real selectivity instead of indexing the whole field.
- Page search must not use left fuzzy or full fuzzy queries such as `%keyword` or `%keyword%`; use a search engine when needed.

Recommended/reference:

- For `order by`, align the ordered field with the last part of the composite index where possible, such as `where a=? and b=? order by c` with index `a_b_c`.
- Use covering indexes to avoid table lookups where suitable.
- For deep pagination, use delayed join/subquery techniques to locate IDs first, or cap total pages.
- SQL optimization target: at least `range`, preferably `ref`, best `const`.
- Put the most selective equality column on the left side of composite indexes. When mixed with range conditions, place equality conditions first.
- Avoid implicit type conversion, which can invalidate indexes.
- Avoid both extremes: indexing every query and resisting necessary indexes such as unique indexes.

## SQL And ORM

Mandatory:

- Use `count(*)` for row counts, not `count(column)` or `count(constant)`.
- Know `count(distinct col)` ignores nulls; `sum(col)` over all-null rows returns null, so guard against NPE.
- Use `ISNULL()` or the project-standard equivalent to test nulls; direct equality comparisons with null do not behave as true/false.
- In pagination code, return immediately when count is 0 instead of running the page query.
- Do not use foreign keys or cascades; model those relationships in application logic for distributed/high-concurrency systems.
- Do not use stored procedures in application code.
- For data correction, especially delete/update, select first and confirm before mutating.
- In queries, never use `*`; explicitly list required fields.
- POJO boolean fields must not use `is` prefix, while database fields must use `is_`; define explicit result mappings.
- Do not rely on `resultClass` for ORM returns. Define `resultMap` or equivalent explicit mappings.
- MyBatis/iBATIS XML parameters must use `#{}`. Do not use `${}` for user-controlled values because it risks SQL injection.
- Do not return raw `HashMap`/`Hashtable` as query results; use typed objects.
- Every update to a table record must update `gmt_modified` to the current time.

Recommended/reference:

- Avoid large `IN` lists; keep them under about 1000 items if unavoidable.
- For internationalized storage, use UTF-8; use `utf8mb4` when storing emoji.
- Avoid `TRUNCATE TABLE` in application code; it has no transaction and does not trigger delete behavior.
- Do not create a large all-fields update API. Update only changed target fields to reduce mistakes, binlog size, and work.
- Do not overuse `@Transactional`; consider database QPS and rollback/compensation for cache, search, messages, and statistics.

## Application Layering

Recommended/reference:

- Follow downward dependencies:
  - Open API layer: exposes service methods as RPC/HTTP, handles gateway security and traffic controls.
  - Terminal display layer: templates, JavaScript rendering, JSP, or mobile display.
  - Web layer: forwarding, access control, basic parameter validation, and simple non-reused business handling.
  - Service layer: concrete business logic.
  - Manager layer: common business handling, third-party platform adaptation, service common capability extraction, cache/middleware handling, and DAO composition.
  - DAO layer: persistence interaction with MySQL, Oracle, HBase, etc.
  - External interfaces: other departments' RPC APIs, base platforms, or third-party HTTP APIs.
- Exception handling by layer:
  - DAO catches broad persistence exceptions and wraps them as `DAOException`; do not log again if the upper layer will log.
  - Service logs exceptions with parameters and context.
  - Manager follows DAO behavior when deployed with Service, or Service behavior when independently deployed.
  - Web should not keep throwing to users; render friendly errors when the page cannot proceed.
  - Open API converts exceptions to error code and message.
- Domain model meanings:
  - `DO`: database table object, passed upward by DAO.
  - `DTO`: transfer object from Service/Manager outward.
  - `BO`: business object output by Service.
  - `AO`: application object between Web and Service, close to display and not highly reusable.
  - `VO`: view object for Web/template rendering.
  - `Query`: query request object. If a query has more than 2 parameters, wrap them; do not pass `Map`.

## Maven And Library Dependencies

Mandatory:

- Use GAV conventions where applicable: `GroupId` as `com.{company/BU}.business[.subBusiness]`, `ArtifactId` as `product-module`, version as `major.minor.patch`.
- Version meaning: major for direction/large incompatibility/architecture changes, minor for mostly compatible major features, patch for compatible bugfixes/minor features. Initial formal release should be `1.0.0`.
- Online applications must not depend on `SNAPSHOT` versions except explicitly allowed security packages.
- Adding/upgrading a library must preserve dependency mediation outside the intended functional change. Compare `dependency:resolve`/`dependency:tree` and exclude accidental differences.
- Library APIs may define enum types and accept enum parameters, but should not return enum values or POJOs containing enum values across external library boundaries.
- Define one version variable for a group of related libraries to avoid version drift.
- Do not declare the same `GroupId` and `ArtifactId` with different versions across subprojects.

Recommended/reference:

- Put dependency declarations under `<dependencies>` and version mediation under `<dependencyManagement>`.
- Avoid adding configuration items to reusable libraries unless truly necessary.
- Library publishers should keep APIs/dependencies minimal and behavior stable/traceable.

## Server And JVM

Recommended/reference:

- For high-concurrency servers, reduce TCP `time_wait` timeout where operations policy allows.
- Increase maximum file descriptors for high concurrent connection counts.
- Set `-XX:+HeapDumpOnOutOfMemoryError` so OOM events produce diagnostic dumps.
- In production, set JVM `Xms` and `Xmx` to the same size to avoid heap resizing pressure after GC.
- Use `forward` for internal redirects. Generate external redirect URLs through URL builder utilities to avoid inconsistent maintenance and potential security risk.

## Design Rules

Mandatory:

- Storage schemes and base data structures must pass review and be documented before production execution. Data structure changes such as adding fields also need review.
- If more than one user type interacts with the system and related use cases exceed 5, use a use-case diagram.
- If a business object's states exceed 3, use a state diagram and define trigger conditions for state transitions.
- If a feature call chain involves more than 3 objects, use a sequence diagram and define inputs/outputs at each call.
- If model classes exceed 5 and dependencies are complex, use a class diagram.
- If more than 2 objects collaborate and the process is complex, use an activity diagram with swimlanes where useful.

Recommended/reference:

- Consider exception flows and business boundaries during requirements analysis and system design.
- Classes should follow single responsibility.
- Prefer composition/aggregation over inheritance. If inheritance is necessary, obey Liskov substitution.
- Depend on abstractions and interfaces where it improves extension and maintenance.
- Design for extension and closed modification in stable business domains.
- Extract common business behavior or public behavior into shared modules, config, classes, or methods to avoid duplicated code/config.
- Do not treat agile as only stories plus coding plus release; keep necessary design and documentation for key decisions.
- Design identifies hard parts, variation points, boundaries, module relations, evolution principles, and nonfunctional requirements such as security, availability, and extensibility.
