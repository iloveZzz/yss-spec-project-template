---
name: yss-validation
description: "接入或排查 YSS Bean Validation、校验消息与校验错误映射；不存在的历史 EL 组件路由保持阻断。"
---

# yss-validation

Use this skill for YSS 校验组件. Keep implementation grounded in the local project and resolvable YSS backend component source.

中文说明：本技能用于 YSS 校验组件。执行时优先读取源码索引，避免凭记忆猜类名、配置项或接入方式。

## Source Index First

- Backend source location is environment-specific; resolve it with `yss-skill-source-index-refresh/references/source-location.md`.
- Generated index: `references/source-index.md`
- Component path hints: `yss-microservice-components/yss-component-validation-jsr303`

Read `references/source-index.md` as a path-hint index whenever the task depends on exact modules, annotations, auto configuration, properties, controllers, clients, repositories, DTOs, handlers, or troubleshooting.

## Workflow

1. Identify whether the task is JSR-303 annotation validation or an expression/EL parser request.
2. Read `references/source-index.md`; for JSR-303 behavior, read `yss-component-validation-jsr303/readme.md` first.
3. 当前组件仓不存在历史 `yss-component-validation-engine-parent`；表达式、LiteFlow EL 或 `ExpressParserFactory` 请求返回 `blocked`，先确认真实组件来源和生命周期影响，不以旧索引或通用知识生成实现。
4. Keep validation failures mapped to the service/API error contract used by the local project.
5. 消费工程基线选择 javax/jakarta，不自行升级 Java/Boot。MVC 输入校验放在 server/client，业务不变量由 service/core 验证；不生成 DDD Domain。HTTP 失败形态由 server 的合同测试验证。

## Capability Split

- `validation-jsr303`: currently a dependency/message-resource aggregation module; it has no local Validator, Advice, or auto-configuration Java implementation.
- 历史 `validation-el-parser` / `ExpressParserFactory`：当前源码根不存在，状态为 `blocked`，不得作为可用 capability。

## Troubleshooting Notes

- If an EL/parser capability is requested, stop and resolve its actual repository/module instead of assuming the removed path.
- If validation annotations do not fire, check controller/service validation annotations and Spring validation starter wiring before editing parser code.
- The component README is empty; use the POM, message resources, Controller annotations, and `GlobalExceptionAdvice` as current evidence.
- If behavior differs between expression validation and DTO validation, route the problem to the correct submodule first.

## Checklist

- Required dependency or starter module is present.
- JSR-303 and unavailable expression-validation requests are not mixed in the same fix.
- No class, parser or configuration is attributed to the absent historical module.
- Validation errors preserve readable messages for Chinese business users.
- Existing project conventions are reused before adding new wrappers.

## Do Not

- Do not invent class names or configuration keys without checking the source index.
- Do not replace component extension points with business-local framework code.
- Do not broaden the task into unrelated YSS components unless the user asks.

## 平台与源码门禁

接入、修改、代码生成或给出精确类名/配置前，读取 [后端组件平台与源码门禁](../yss-skill-source-index-refresh/references/backend-component-platform-compatibility.md)，从批准的 `platform_configuration.component_platform_line` 选择 `source-index.boot2-java8.md` 或 `source-index.boot3-java17.md`，并以 `--skill yss-validation --platform-line <line> --source-root <matching-root>` 运行统一 freshness 校验。平台线与源码根不匹配、组件 tree 不一致、组件子树 dirty、索引缺少平台信号，或 Manifest / 组件 GAV 缺少 verified 兼容证据时返回 `blocked`；不得回退另一代索引，也不在业务实现中升级、降级或替换 YSS 组件。既有工程只读分诊可继续，但不得据此宣称跨 Boot/JDK 兼容。
