---
name: yss-mybatis
description: 用于 YSS MyBatis 与 MyBatis-Plus 持久层规范、配置和排障。当用户提到 BaseRepository、BasePlusRepository、PageQuery 自动分页、多数据源、批量插入或 MyBatis 配置异常时调用。
---

# yss-mybatis

用于处理 `yss-component-persistence` 相关的持久层规范、接入和问题定位。

## 何时使用

- 用户要定义新的 Repository。
- 用户在 MyBatis 与 MyBatis-Plus 两种模式间排查问题。
- 用户提到自动分页、`PageQuery`、批量插入、多数据源。
- 用户反馈 Mapper 扫描、分页不生效、批量性能差。

## 工作方式

1. 先确认项目使用的是通用 MyBatis 还是 MyBatis-Plus。
2. 涉及真实类名、配置项、模块依赖或排障时，先读 `references/source-index.md`，再定位源码或文档。
3. 先复用现有基类与配置，不手搓新的基础设施。
4. 涉及分页时，先验证 `PageQuery` 传递链路和拦截器是否生效。

## 源码索引

- 源码位置不要假设固定目录；先按 `yss-source-index/references/source-location.md` 定位。
- 当前技能索引：`references/source-index.md`
- 重点源码入口通常包括 `BaseRepository`、`BasePlusRepository`、`EntityQueryAspect`、`PageQueryEntityConfigration`、`MybatisBaseConfiguration`、`MybatisPlusConfiguration`、`MultiDataSourceConfiguration`、`MultiDataSourceHolder`。

当组件源码变化后，用 `yss-source-index` 刷新索引；刷新或读取前先按源码定位策略确认真实位置。

## 实施建议

- 通用模式优先继承 `BaseRepository`
- MP 模式优先继承项目既有的 `BasePlusRepository`
- 批量导入优先使用真正的 SQL 级批量方法，不要默认循环单条插入
- 多数据源问题优先先看配置和扫描范围，再怀疑业务代码
- 分页查询优先沿用 `PageQuery` 传递链路，不要在 Repository 内临时发明分页参数。
- 生成或重构持久层时，先看当前模块已有 Repository/Mapper 命名、包路径、XML 位置。

## 检查清单

- Mapper 扫描路径是否正确。
- XML 路径和接口是否对齐。
- `PageQuery` 是否真的出现在被拦截的方法参数里。
- 批量方法是否用了项目推荐实现。
- 多数据源名称和主从配置是否一致。
- MyBatis 与 MyBatis-Plus 的基类、分页插件和扫描配置是否混用。
- 数据源切换是否在事务边界之前完成。

## 排障顺序

1. 确认依赖模块：starter、mapper、plus starter、persistence common。
2. 确认 Mapper/Repository 扫描范围。
3. 确认分页参数、分页切面或插件是否参与调用。
4. 确认 XML、方法签名、resultMap/字段映射是否一致。
5. 确认多数据源配置和当前线程数据源上下文。
6. 最后再排查 SQL 本身和数据库执行计划。

## 修改约束

- 不要同时引入两套分页机制而不说明谁生效。
- 不要在已有 Repository 基类体系之外再造一套 Mapper 抽象。
- 若用户只是要生成持久层骨架，优先衔接 `yss-db2mybatis`。

## 按需读取

- 源码索引：`references/source-index.md`
- 基础 Repository：`assets/BaseRepository.java`
- 分页切面：`assets/EntityQueryAspect.java`
- MyBatis 基础配置：`assets/MybatisBaseConfiguration.java`
