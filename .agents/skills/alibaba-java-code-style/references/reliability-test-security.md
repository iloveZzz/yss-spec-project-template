# Reliability, Test, And Security Rules

Use this reference for exception handling, logging, unit testing, and security-sensitive Java work.

## Exception Handling

Mandatory:

- Do not catch avoidable runtime exceptions such as `NullPointerException` or `IndexOutOfBoundsException`; prevent them with prechecks.
- Do not use exceptions for normal process or branch control.
- Keep try blocks focused on unstable code. Catch specific exception types where behavior differs.
- Never swallow caught exceptions. Handle them, translate them to user-understandable content at the outer business boundary, or rethrow.
- In transactional code, if a caught exception requires rollback, explicitly trigger rollback according to the framework.
- Always close resources and streams in `finally` or use try-with-resources. Handle close exceptions appropriately.
- Do not `return` from a `finally` block.
- Caught exception types must match thrown exceptions exactly or be an appropriate parent type.

Recommended/reference:

- A method may return `null`, but must document when that can happen. Callers remain responsible for NPE prevention.
- Check common NPE sources: auto-unboxing wrapper return values, database nulls, null elements inside non-empty collections, remote calls, session reads, and chained calls such as `a.getB().getC()`.
- Distinguish unchecked and checked exceptions. Avoid `new RuntimeException()`, `Exception`, or `Throwable` without business meaning; prefer domain-specific exceptions such as `DAOException` or `ServiceException`.
- Public external HTTP/API interfaces should use error codes. Internal application code may throw exceptions. Cross-application RPC can prefer a result wrapper with success flag, code, and brief message.
- Avoid duplicate code; extract common validation or behavior into methods/classes/components.

## Logging

Mandatory:

- Use SLF4J facade APIs, not direct Log4j/Logback APIs:

```java
private static final Logger logger = LoggerFactory.getLogger(Abc.class);
```

- Keep application logs for at least 15 days when configuring retention.
- Name extension logs as `appName_logType_logName.log`, where `logType` can be `stats`, `monitor`, `access`, etc.
- For `trace`/`debug`/`info`, use placeholder logging or guard with `isXxxEnabled`; do not eagerly concatenate strings.
- Avoid duplicate log printing, such as missing `additivity=false` in Log4j configuration.
- Exception logs must include both scene/context information and stack trace. If not handled locally, throw upward.

Recommended:

- Production must not output debug logs. Emit info selectively.
- Use `warn` for user input errors when no system fault occurred; reserve `error` for system logic errors, exceptions, or important failures.
- Prefer English error messages where possible; use Chinese only when English would be unclear. Internationalized or overseas deployments require English logs/comments.
- Before adding logs, ask whether someone will read them and what action they enable.

## Unit Tests

Mandatory:

- Unit tests must follow AIR: Automatic, Independent, Repeatable.
- Tests must be fully automated and non-interactive. Use assertions, not `System.out`, for verification.
- Tests must not call each other or depend on execution order.
- Tests must be repeatable and isolated from external environments such as network, remote services, or middleware. Inject local or mock dependencies.
- Unit test granularity should be small: usually method-level, at most class-level.
- Incremental code for core businesses, core applications, and core modules must pass unit tests.
- Test code belongs under `src/test/java`, not production source directories.

Recommended/reference:

- Basic target: statement coverage at least 70%; core modules should reach 100% statement and branch coverage where feasible.
- Use BCDE coverage thinking:
  - Border: boundary values, loop boundaries, special values, special times, data ordering.
  - Correct: valid inputs and expected outputs.
  - Design: cases derived from design documents.
  - Error: invalid data, exception flows, and disallowed business inputs.
- Database tests should prepare data through programmatic insert/import, not manual pre-existing database edits.
- Database tests should rollback automatically or mark generated data with a clear prefix.
- Refactor untestable code instead of writing awkward tests to satisfy coverage.
- Avoid business code that makes tests hard: heavy constructors, excessive globals/statics, too many external dependencies, and deep conditionals.

## Security

Mandatory:

- User-owned pages or functions must perform authorization checks, including horizontal permission checks.
- Sensitive user data must be masked before display, such as mobile numbers with hidden middle digits.
- SQL parameters from users must use parameter binding or metadata-limited fields. Do not concatenate SQL strings.
- Every user request parameter must be validated. Consider memory overflow, malicious `order by`, open redirect, SQL injection, deserialization injection, and ReDoS risks.
- Do not output user data to HTML without proper filtering or escaping.
- Forms and AJAX submissions must enforce CSRF protection.
- Platform resources such as SMS, email, phone calls, orders, and payments must implement replay prevention, rate limits, fatigue control, or captcha as appropriate.

Recommended:

- User-generated content such as posts, comments, and instant messages should have anti-abuse, rate-limit, and prohibited-content controls.
- Treat auth, payment, encryption, raw SQL, and database migration work as high-risk. If repository instructions mark them human-review-only, add `TODO-HUMAN-REVIEW` and do not present drafts as production-ready.
