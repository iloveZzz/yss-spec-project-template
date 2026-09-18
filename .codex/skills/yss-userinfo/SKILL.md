---
name: yss-userinfo
description: "接入或排查 YSS CurrentUserProvider、已认证 SecurityContext、受信网关头适配与后台用户上下文。"
---

# yss-userinfo

Use this skill for YSS 用户信息组件. Keep implementation grounded in the local project and resolvable YSS backend component source.

中文说明：本技能用于 YSS 用户信息组件。执行时优先读取源码索引，避免凭记忆猜类名、配置项或接入方式。

## Source Index First

- Backend source location is environment-specific; resolve it with `yss-skill-source-index-refresh/references/source-location.md`.
- Generated index: `references/source-index.md`
- Component path hints: `yss-microservice-components/yss-component-userinfo-starter`

Read `references/source-index.md` as a path-hint index whenever the task depends on exact modules, annotations, auto configuration, properties, controllers, clients, repositories, DTOs, handlers, or troubleshooting.

## Workflow

1. 先按已批准平台线读取对应索引；以下当前行为针对 `boot3-java17`，Boot 2 旧工程只按其独立索引做只读分诊和迁移。
2. Identify whether the task is authenticated current-user lookup, an explicitly trusted gateway adapter, a custom `CurrentUserProvider`, or non-REST/background fallback behavior.
3. Read `references/source-index.md`, then inspect `CurrentUserProvider`, `SecurityContextCurrentUserProvider`, `TrustedGatewayHeaderCurrentUserProvider`, `AuthUserInfoUtil`, `DmUser`, and `DmUserDetails`.
4. 默认使用 `SecurityContextCurrentUserProvider`，只消费 Spring Security 已认证且非 anonymous 的 `Authentication`。JWT 的 signature、issuer、audience、expiry 与算法校验必须在资源服务器认证链完成。
5. `AuthUserInfoUtil` 是由 `CurrentUserProvider` 驱动的兼容 facade；业务代码可继续调用 `userInfo()`、`userName()`、`userCode()` 或 `currentUserJson()`，但不得自行解析 Header、JWT payload 或 Redis 身份缓存。
6. 只有显式启用 `yss.userinfo.trusted-gateway.enabled` 且配置非空 `trusted-proxies` 时，才启用 `TrustedGatewayHeaderCurrentUserProvider`；它只接受 remote address 在 allow-list 中的请求，并且 SecurityContext 结果优先。
7. For scheduled/background tasks, an empty provider result causes the compatibility facade to return the distinct `system` fallback; do not represent it as an authenticated system principal.

## Source-Backed Notes

- `SecurityContextCurrentUserProvider` supports a `UserInfo` principal and an authenticated `OAuth2AuthenticatedPrincipal`; claim mapping happens only after authentication.
- Trusted gateway header names are `X-Username`, `X-Usercode`, and `X-LoginDisplayName`; the adapter requires a trusted proxy allow-list and a nonblank username.
- `UserInfoAutoConfiguration` installs SecurityContext as the default and composes the optional gateway provider behind it. A project-supplied `CurrentUserProvider` remains the explicit extension seam.
- The Boot 3 component does not parse an unverified Bearer payload and does not use Redis as an authentication fallback. Cache behavior is outside this identity provider contract.

## Checklist

- Required dependency or starter module is present.
- Request context exists before relying on servlet headers.
- Spring Security has authenticated the request before the provider reads the principal.
- When trusted gateway mode is enabled, at least one proxy address is allow-listed and untrusted remote addresses are rejected.
- Business code does not duplicate JWT or header parsing logic.
- SecurityContext/gateway/background precedence and empty-result behavior are covered by tests; `system` fallback is distinguished from an authenticated system user.
- User info propagation is tested for REST calls and async/background execution separately.

## Do Not

- Do not invent class names or configuration keys without checking the source index.
- Do not replace component extension points with business-local framework code.
- Do not treat raw `Authorization` payloads or gateway headers as authenticated identity.
- Do not broaden the task into unrelated YSS components unless the user asks.

## 平台与源码门禁

接入、修改、代码生成或给出精确类名/配置前，读取 [后端组件平台与源码门禁](../yss-skill-source-index-refresh/references/backend-component-platform-compatibility.md)，从批准的 `platform_configuration.component_platform_line` 选择 `source-index.boot2-java8.md` 或 `source-index.boot3-java17.md`，并以 `--skill yss-userinfo --platform-line <line> --source-root <matching-root>` 运行统一 freshness 校验。平台线与源码根不匹配、组件 tree 不一致、组件子树 dirty、索引缺少平台信号，或 Manifest / 组件 GAV 缺少 verified 兼容证据时返回 `blocked`；不得回退另一代索引，也不在业务实现中升级、降级或替换 YSS 组件。既有工程只读分诊可继续，但不得据此宣称跨 Boot/JDK 兼容。
