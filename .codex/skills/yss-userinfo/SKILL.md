---
name: yss-userinfo
description: "接入或排查 YSS CurrentUserProvider、已认证 SecurityContext、受信网关头适配与后台用户上下文。"
---

# yss-userinfo

处理已认证当前用户、受信网关适配、自定义 `CurrentUserProvider` 和后台空上下文；身份来源须符合当前平台契约。

## 平台与源码门禁

接入、修改、代码生成或提供精确类名/配置前，必须读取并执行 [共享平台与源码门禁](../yss-skill-source-index-refresh/references/backend-component-platform-compatibility.md)，以 `--skill yss-userinfo` 校验批准的平台线及匹配源码根。缺失、错配或漂移返回 `blocked`；不跨代回退，不在业务实现中升级、降级或替换组件。只读分诊可继续，但须标注未完成源码核验，不能据此宣称跨 Boot/JDK 兼容。

## 源码定位

按 [源码定位策略](../yss-skill-source-index-refresh/references/source-location.md) 确认真实位置，再从 [平台索引](references/source-index.md) 定位当前任务需要的源码。`yss-microservice-components/yss-component-userinfo-starter` 仅是模块路径提示。

## 工作流

1. 先按已批准平台线读取对应索引；以下当前行为针对 `boot3-java17`，Boot 2 旧工程只按其独立索引做只读分诊和迁移。
2. 区分已认证当前用户、显式受信网关、自定义 `CurrentUserProvider` 与非 REST/后台 fallback。
3. 按所选任务核验 `CurrentUserProvider`、对应 provider、兼容 facade `AuthUserInfoUtil` 及 `DmUser` / `DmUserDetails`，不无条件读取所有实现。
4. 默认使用 `SecurityContextCurrentUserProvider`，只消费 Spring Security 已认证且非 anonymous 的 `Authentication`。JWT 的 signature、issuer、audience、expiry 与算法校验必须在资源服务器认证链完成。
5. `AuthUserInfoUtil` 是由 `CurrentUserProvider` 驱动的兼容 facade；业务代码可继续调用 `userInfo()`、`userName()`、`userCode()` 或 `currentUserJson()`，但不得自行解析 Header、JWT payload 或 Redis 身份缓存。
6. 只有显式启用 `yss.userinfo.trusted-gateway.enabled` 且配置非空 `trusted-proxies` 时，才启用 `TrustedGatewayHeaderCurrentUserProvider`；它只接受 remote address 在 allow-list 中的请求，并且 SecurityContext 结果优先。
7. 定时/后台任务的 provider 为空时，兼容 facade 返回独立的 `system` fallback；它不是已认证 system principal。

## 平台行为核验

- `SecurityContextCurrentUserProvider` 支持 `UserInfo` principal 与已认证的 `OAuth2AuthenticatedPrincipal`；claim 映射在认证后进行。
- 受信网关 Header 为 `X-Username`、`X-Usercode` 和 `X-LoginDisplayName`；适配器要求可信代理 allow-list 与非空 username。
- `UserInfoAutoConfiguration` 默认使用 SecurityContext，再组合可选网关 provider；工程自定义 `CurrentUserProvider` 是显式扩展 seam。
- Boot 3 不解析未验证 Bearer payload，不以 Redis 作为认证 fallback；缓存行为不属于此身份 provider 合同。

## 验收

- 核验所需依赖或 starter 已进入实际工程。
- 使用 Servlet Header 前核验 request context 存在。
- Provider 读取 principal 前，Spring Security 已完成请求认证。
- 受信网关启用时，至少一个代理地址进入 allow-list，且拒绝不可信 remote address。
- 业务代码不重复 JWT 或 Header 解析。
- 测试覆盖 SecurityContext/网关/后台的优先级与空结果，区分 `system` fallback 和已认证 system 用户。
- REST 与异步/后台执行分别验证用户信息传播。

## 修改边界

- 类名和配置 key 先核验当前索引与源码，不凭记忆补造。
- 使用组件已有扩展 seam，不以业务本地框架代码替换。
- 原始 `Authorization` payload 与网关 Header 不能直接作为已认证身份。
- 保持当前组件任务范围；扩展到其他组件须有用户要求或重新路由依据。
