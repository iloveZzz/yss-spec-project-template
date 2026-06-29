---
name: yss-distributed-id
description: 用于 YSS 分布式 ID 组件的接入与排障。当用户提到 Leaf、CosId、号段模式、雪花算法、AutoIdInterceptor、MyBatis 自动注入 ID 或主键生成策略时调用。
---

# yss-distributed-id

用于处理 `yss-component-distributed-id` 的配置、接入和问题定位。

## 何时使用

- 用户要启用分布式 ID。
- 用户提到 Leaf Segment、Snowflake、CosId、UUID。
- 用户反馈批量插入未自动注入 ID、ID 冲突、ID 类型不匹配。

## 工作方式

1. 先识别项目用的是哪种 ID 策略。
2. 涉及真实类名、配置项、Leaf 服务或批量插入排障时，先读 `references/source-index.md`，再定位源码或文档。
3. 再看实体注解、拦截器配置和底层表或注册中心依赖是否齐全。
4. 修改时优先保持现有策略，不轻易切换算法。

## 源码索引

- 源码位置不要假设固定目录；先按 `yss-source-index/references/source-location.md` 定位。
- 当前技能索引：`references/source-index.md`
- 重点源码入口通常包括 `EnableDistributedId`、`AutoIdInterceptor`、Leaf 配置、Leaf REST/Feign/gRPC 模块、ID 策略相关类。

当组件源码变化后，用 `yss-source-index` 刷新索引；刷新或读取前先按源码定位策略确认真实位置。

## 检查清单

- 启动类是否启用了分布式 ID 能力。
- 当前策略是否与部署条件匹配。
- 批量插入链路是否会经过拦截器。
- 实体主键类型与生成策略是否兼容。
- Leaf Segment 场景下 `leaf_alloc` 是否已初始化。
- MyBatis/MyBatis-Plus 的插入方法是否绕过了自动 ID 拦截逻辑。
- 多服务共享号段时，业务 tag/key 是否唯一且稳定。

## 策略建议

- 追求稳定和趋势递增时，优先 Leaf Segment。
- 依赖 ZooKeeper 且要求高吞吐时，可考虑 Snowflake。
- 若项目已有 CosId 统一方案，沿用现有生态。
- 除非业务明确允许，否则不要把 Long 主键切到 String UUID。

## 修改约束

- 不要混用多种主键生成策略而不说明边界。
- 不要仅改实体注解而忽略底层配置和依赖。
- 如果用户只是在做普通 MyBatis-Plus 主键配置，不要过度引入新组件。
- 不要在已有 Long 主键生态里随意改成 String UUID，除非调用方和数据库约束都确认兼容。

## 排障顺序

1. 确认启用注解和 starter 依赖。
2. 确认实体主键类型、注解和插入方法。
3. 确认拦截器是否参与 MyBatis 调用链。
4. Leaf 场景确认服务、号段表和业务 key。
5. Snowflake/CosId 场景确认机器号、时钟、注册中心或 worker 分配。
6. 批量插入失败时确认是否调用了项目推荐批量方法。

## 按需读取

- 源码索引：`references/source-index.md`
- 拦截器与自动注入：`assets/AutoIdInterceptor.java`
- 启用注解：`assets/EnableDistributedId.java`
- Leaf 配置相关：`assets/LeafConf.java`
