# yss-exception Source Index Router

Index schema: `backend-component-source-index-router-v1`

For the Spec daily path, confirm the existing platform line from the current engineering baseline, actual POM / effective POM and dependency tree referenced by the same Ticket / PR. For the governed path, use the approved `platform_configuration.component_platform_line`. If the line cannot be proved or a platform / component upgrade is requested, stop the affected implementation and return to governance. Do not infer a line from imports, a branch name or a requested upgrade.

- `boot2-java8` — [Spring Boot 2.7 / Java 8 maintenance line](source-index.boot2-java8.md)
- `boot3-java17` — [Spring Boot 3.5 / Java 17 mainline](source-index.boot3-java17.md)

Run the freshness checker with the same explicit `--platform-line` and its matching clean source root before exact integration guidance.
