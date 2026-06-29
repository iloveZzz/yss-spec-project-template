---
name: yss-userinfo
description: 用于 YSS userinfo starter、AuthUserInfoUtil、当前用户信息获取、用户上下文和认证用户信息排障。
---

# yss-userinfo

Use this skill for YSS 用户信息组件. Keep implementation grounded in the local project and resolvable YSS backend component source.

中文说明：本技能用于 YSS 用户信息组件。执行时优先读取源码索引，避免凭记忆猜类名、配置项或接入方式。

## Source Index First

- Backend source location is environment-specific; resolve it with `yss-source-index/references/source-location.md`.
- Generated index: `references/source-index.md`
- Component path hints: `yss-microservice-components/yss-component-userinfo-starter`

Read `references/source-index.md` as a path-hint index whenever the task depends on exact modules, annotations, auto configuration, properties, controllers, clients, repositories, DTOs, handlers, or troubleshooting.

## Workflow

1. Identify whether the task is current-user lookup, request header propagation, JWT parsing, Redis user cache lookup, or non-REST/background fallback behavior.
2. Read `references/source-index.md`, then inspect `AuthUserInfoUtil`, `DmUser`, and `DmUserDetails`.
3. Prefer `AuthUserInfoUtil.userInfo()`, `userName()`, `userCode()`, or `currentUserJson()` over manually parsing request headers in business code.
4. Check lookup order before debugging: `X-Username`/`X-Usercode`/`X-LoginDisplayName` headers, Bearer JWT payload, then Redis cache via `CacheManagerCompose`.
5. For scheduled/background tasks, expect fallback behavior such as default `system` user unless the caller explicitly provides context.

## Source-Backed Notes

- Header names include `X-Username`, `X-Usercode`, and `X-LoginDisplayName`.
- Bearer token parsing reads payload fields such as `sub`, `loginDisplayName`, `email`, and `userCode`.
- Redis cache lookup uses the JWT user-info cache key path; load `yss-cache` if changing cache behavior.

## Checklist

- Required dependency or starter module is present.
- Request context exists before relying on servlet headers.
- Gateway/auth service forwards expected user headers or Authorization token.
- Cache fallback is checked when headers exist but detailed user info is incomplete.
- Business code does not duplicate JWT parsing logic.
- User info propagation is tested for REST calls and async/background execution separately.

## Do Not

- Do not invent class names or configuration keys without checking the source index.
- Do not replace component extension points with business-local framework code.
- Do not broaden the task into unrelated YSS components unless the user asks.
