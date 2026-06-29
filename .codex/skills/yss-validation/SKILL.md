---
name: yss-validation
description: 用于 YSS validation engine、validation-jsr303、LiteFlow EL parser、JSR303 校验接入、表达式校验和校验规则排障。
---

# yss-validation

Use this skill for YSS 校验组件. Keep implementation grounded in the local project and resolvable YSS backend component source.

中文说明：本技能用于 YSS 校验组件。执行时优先读取源码索引，避免凭记忆猜类名、配置项或接入方式。

## Source Index First

- Backend source location is environment-specific; resolve it with `yss-source-index/references/source-location.md`.
- Generated index: `references/source-index.md`
- Component path hints: `yss-microservice-components/yss-component-validation-engine-parent`, `yss-microservice-components/yss-component-validation-jsr303`

Read `references/source-index.md` as a path-hint index whenever the task depends on exact modules, annotations, auto configuration, properties, controllers, clients, repositories, DTOs, handlers, or troubleshooting.

## Workflow

1. Identify whether the task is JSR-303 annotation validation, validation engine expression parsing, LiteFlow EL parsing, or parser extension.
2. Read `references/source-index.md`; for JSR-303 behavior, read `yss-component-validation-jsr303/readme.md` first.
3. For expression parsing, inspect `ExpressParserFactory` and concrete `ExpressParser` implementations before adding syntax.
4. Register new parsers as Spring beans; `ExpressParserFactory` auto-registers available parser beans by `parserType().getType()`.
5. Keep validation failures mapped to the service/API error contract used by the local project.

## Capability Split

- `validation-jsr303`: Spring/JSR-303 integration and annotation-driven validation behavior.
- `validation-el-parser`: LiteFlow/EL expression parser infrastructure.
- `ExpressParserFactory`: central parser registry backed by a concurrent map.
- Parser extension point: implement/provide `ExpressParser` with a non-null parser type and register it as a bean.

## Troubleshooting Notes

- If a parser is not found, confirm it is a Spring bean and `parserType()` is non-null.
- If validation annotations do not fire, check controller/service validation annotations and Spring validation starter wiring before editing parser code.
- If behavior differs between expression validation and DTO validation, route the problem to the correct submodule first.

## Checklist

- Required dependency or starter module is present.
- JSR-303 and expression validation concerns are not mixed in the same fix.
- New parser implementations have deterministic parser type keys.
- Parser registration is verified through `ExpressParserFactory.PARSER_MAP`.
- Validation errors preserve readable messages for Chinese business users.
- Existing project conventions are reused before adding new wrappers.

## Do Not

- Do not invent class names or configuration keys without checking the source index.
- Do not replace component extension points with business-local framework code.
- Do not broaden the task into unrelated YSS components unless the user asks.
