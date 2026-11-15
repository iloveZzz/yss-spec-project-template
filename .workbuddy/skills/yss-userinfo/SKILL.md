---
name: yss-userinfo
description: "接入或排查 YSS CurrentUserProvider、已认证 SecurityContext、受信网关头适配与后台用户上下文。"
---

# yss-userinfo

处理已认证当前用户、受信网关适配、自定义 `CurrentUserProvider` 和后台空上下文；身份来源须符合当前平台契约。

## 源码定位

按 [源码定位策略](../yss-skill-source-index-refresh/references/source-location.md) 确认真实位置，再从 [平台索引](references/source-index.md) 定位当前任务需要的源码。`yss-microservice-components/yss-component-userinfo-starter` 仅是模块路径提示。

## 工作流

1. 先按当前路线已核验的精确平台线读取对应索引；以下当前行为以 `boot4-java17` 候选源码为准，Boot 3 使用其独立索引核验，Boot 2 旧工程只按其独立索引做只读分诊和迁移。
2. 区分已认证当前用户、显式受信网关、自定义 `CurrentUserProvider` 与非 REST/后台 fallback。
3. 按所选任务核验 `CurrentUserProvider`、对应 provider、兼容 facade `AuthUserInfoUtil` 及 `DmUser` / `DmUserDetails`，不无条件读取所有实现。
4. 默认使用 `SecurityContextCurrentUserProvider`，只消费 Spring Security 已认证且非 anonymous 的 `Authentication`。JWT 的 signature、issuer、audience、expiry 与算法校验必须在资源服务器认证链完成。
5. `AuthUserInfoUtil` 是由 `CurrentUserProvider` 驱动的兼容 facade；业务代码可继续调用 `userInfo()`、`userName()`、`userCode()` 或 `currentUserJson()`，但不得自行解析 Header、JWT payload 或 Redis 身份缓存。
6. 只有显式启用 `yss.userinfo.trusted-gateway.enabled` 且配置非空 `trusted-proxies` 时，才启用 `TrustedGatewayHeaderCurrentUserProvider`；它只接受 remote address 在 allow-list 中的请求，并且 SecurityContext 结果优先。
7. 定时/后台任务的 provider 为空时，兼容 facade 返回独立的 `system` fallback；它不是已认证 system principal。

## Principal 支持与版本边界

`SecurityContextCurrentUserProvider.currentUser()` 返回 `Optional<UserInfo>`。以下比较来自 Boot 4 源码基线 `ad2642dd05527c073eb1da1213843b1130b44703` 与 2026-11-16 B1 未提交候选，模块为 `yss-microservice-components/yss-component-userinfo-starter`，候选 GAV 为 `com.yss.cloud:yss-component-userinfo-starter:4.0.0-SNAPSHOT`。当前内容 SHA-256 见 [Boot 4 索引](references/source-index.boot4-java17.md)。已发布 Maven 构件支持情况按消费工程实际解析字节核验。

| principal / 状态 | B1 前源码基线 | B1 候选源码 |
| --- | --- | --- |
| 空上下文、未认证、anonymous | `Optional.empty()` | 相同 |
| 已认证 `UserInfo` | 原对象直接返回 | 相同，保留原对象字段与 authorities |
| 已认证普通 principal | `userName = Authentication.getName()`，权限取 Authentication authorities | 相同，其他业务字段为空 |
| 已认证 `OAuth2AuthenticatedPrincipal` | 从 attributes 映射业务字段 | 保持原映射，优先于 ClaimAccessor |
| 已认证 JWT / `ClaimAccessor` | 未实现 claims 业务字段映射，按普通 principal 处理 | 从 claims 映射业务字段。标准 `JwtAuthenticationToken` 已在 B1 测试覆盖 |

B1 候选复用既有字段顺序，`userName` 依次取 `preferred_username`、`sub`、`Authentication.getName()`。`userCode` 取 `userCode`、`user_code`。`loginDisplayName` 取 `loginDisplayName`、`name`。另读取 `email`、`iss`。空值和空白值继续回退，非空值转为字符串。字段代表的业务身份、编码、显示名和租户关联须遵循项目约定。

对新建的 `UserInfo`，权限始终来自 `Authentication.getAuthorities()`，不得将 claims 直接提升为权限。原 `UserInfo` principal 沿用原对象。JWT 验证由认证链完成，provider 只消费其已认证结果。

## 请求接线与授权

- Cookie / Session 登录由工程的登录与会话过滤链建立 SecurityContext，并按浏览器请求方式处理会话与 CSRF。provider 只读取认证结果。
- Bearer 请求由资源服务器过滤链校验 token 并建立 Authentication。JWT 的签名、issuer、audience、expiry 与允许算法按项目契约配置。provider 不解析原始 token，也不提供认证过滤链。
- API 未认证请求按接口契约返回 401，已认证但权限不足返回 403。在工程的认证入口与拒绝处理器中接线，不用 facade 的 `system` fallback 掩盖缺失认证。
- 接口权限、对象归属与租户范围由项目授权逻辑核验。读取到 userCode 或其他业务字段不会自动授予对象及跨租户访问权。

## 平台行为核验

- 受信网关 Header 为 `X-Username`、`X-Usercode` 和 `X-LoginDisplayName`；适配器要求可信代理 allow-list 与非空 username。
- `UserInfoAutoConfiguration` 默认使用 SecurityContext，再组合可选网关 provider；工程自定义 `CurrentUserProvider` 是显式扩展 seam。
- Boot 4 当前源码不解析未验证 Bearer payload，不以 Redis 作为认证 fallback；缓存行为不属于此身份 provider 合同。

## 验收

- 核验所需依赖或 starter 已进入实际工程。
- 使用 Servlet Header 前核验 request context 存在。
- Provider 读取 principal 前，Spring Security 已完成请求认证。
- 受信网关启用时，至少一个代理地址进入 allow-list，且拒绝不可信 remote address。
- 业务代码不重复 JWT 或 Header 解析。
- 测试覆盖 SecurityContext/网关/后台的优先级与空结果，区分 `system` fallback 和已认证 system 用户。
- REST 与异步/后台执行分别验证用户信息传播。
- 分别覆盖 Cookie / Bearer 的认证入口、401 / 403，以及对象与租户授权。字段映射测试无法替代这些接线验证。

## 修改边界

- 类名和配置 key 先核验当前索引与源码，不凭记忆补造。
- 使用组件已有扩展 seam，不以业务本地框架代码替换。
- 原始 `Authorization` payload 与网关 Header 不能直接作为已认证身份。
- 保持当前组件任务范围；扩展到其他组件须有用户要求或重新路由依据。
