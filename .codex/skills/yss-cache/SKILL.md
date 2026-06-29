---
name: yss-cache
description: 用于 YSS 缓存框架的接入、配置和排障。当用户提到 QueryCache、UpdateCache、ClearCache、多级缓存、Redis/Caffeine 切换、JetCache 或缓存不生效时调用。
---

# yss-cache

用于处理 `yss-component-cache-parent` 相关的缓存接入、配置修复和使用规范问题。

## 何时使用

- 用户要新增或修改缓存注解。
- 用户提到 `@QueryCache`、`@UpdateCache`、`@ClearCache`。
- 用户在排查 Redis、Caffeine、JetCache、多级缓存切换问题。
- 用户反馈缓存命中异常、缓存未失效、Redis 不可用时降级异常。

## 工作方式

1. 先识别项目当前用的是 Spring Cache 扩展、Redis/Caffeine/Hazelcast 后端还是 JetCache 扩展。
2. 涉及真实类名、配置项、模块依赖或排障时，先读 `references/source-index.md`，再定位源码或文档。
3. 先查现有配置与注解用法，再决定是否改代码、改配置或两者都改。
4. 只围绕当前问题解释缓存策略、key、失效与降级，不输出整套框架宣传材料。

## 源码索引

- 源码位置不要假设固定目录；先按 `yss-source-index/references/source-location.md` 定位。
- 当前技能索引：`references/source-index.md`
- 重点源码入口通常包括 `EnableYssCloudCache`、`EnableYssCloudRedisCache`、`YssCacheInterceptor`、`YssCacheProperties`、`YssCacheAnnotationParser`、`QueryCache`、`UpdateCache`、`ClearCache`、各缓存后端 Provider/Resolver。

当组件源码变化后，用 `yss-source-index` 刷新索引；刷新或读取前先按源码定位策略确认真实位置。

## 检查清单

- 启动类是否开启了缓存能力。
- 当前启用的是 `redis` 还是 `caffeine`。
- 缓存 key 是否稳定且能表达业务唯一性。
- 更新和删除路径是否同时处理了缓存刷新或失效。
- 读方法是否被 Spring 代理调用，而不是类内自调用绕过 AOP。
- Redis 异常时是否有预期中的降级路径。
- 多级缓存场景下，本地缓存和远端缓存的一致性边界是否被业务接受。
- key 中涉及用户、租户、机构、账套等上下文时，是否显式纳入 key 设计。

## 实施建议

- 查询接口优先用 `@QueryCache`。
- 更新接口优先用 `@UpdateCache` 或显式失效。
- 删除或状态变更接口优先用 `@ClearCache`。
- 对跨节点一致性要求高的场景，优先确认是否需要 JetCache 或 Redis 广播。
- 读多写少、允许短暂不一致的场景才考虑本地缓存。
- 多服务共享缓存时，优先复用项目既有缓存 key 常量、枚举或命名约定。

## 排障顺序

1. 依赖和启动注解是否引入正确。
2. 配置项是否启用了预期缓存后端。
3. 目标方法是否能被 Spring AOP 代理。
4. 注解 key 表达式是否能解析到方法参数。
5. 更新/删除链路是否命中失效逻辑。
6. Redis/Caffeine/JetCache 后端是否实际创建了缓存管理器。
7. 降级行为是否与配置和业务预期一致。

## 修改约束

- 不要只加查询缓存而不处理更新失效。
- 不要把缓存 key 绑定到不稳定对象序列化结果。
- 不要在不明确一致性要求时默认启用本地缓存。
- 如果项目已经有统一缓存 key 常量或枚举，沿用现有约定。

## 按需读取

- 源码索引：`references/source-index.md`
- 注解定义：`assets/QueryCache.java`、`assets/UpdateCache.java`、`assets/ClearCache.java`
- 复杂实现细节：`references/README.md`
