---
name: yss-mybatis
description: 核验、接入或排查 YSS MyBatis/MyBatis-Plus 的 Mapper/Repository 基类、分页、批量 SQL、扫描与数据源；不生成持久层结构。
---

# yss-mybatis

本 Skill 只维护 `yss-component-persistence` 的组件能力、选择条件和排障顺序。PO、Repository、Convertor、Gateway/Query Adapter 的结构与生成边界由 `yss-repository` 负责。

## 来源与适用范围

1. 精确类名、方法签名、配置 key、默认值或启用条件先用 [source-index.md](references/source-index.md) 定位，再按 [源码定位策略](../yss-skill-source-index-refresh/references/source-location.md) 读取当前源码。
2. 索引与当前源码不同或组件子树有未提交修改时，以可读源码说明事实和差异；源码不可读的精确结论保留未知。调查不要求先清理工作树或刷新索引，索引写入仍需对应授权。
3. 当前新 DDD / MVC 脚手架只支持 `mybatis-plus` Profile。普通 MyBatis 用于既有工程维护、兼容与排障；不能假定现有脚手架可生成不支持的 Profile。

## 稳定决策规则

<a id="mybatis.binding"></a>
- 基类、Mapper 注解、XML 位置和扫描范围以当前工程配置、当前工程基线及当前组件源码共同决定；不得在既有体系外再造 Mapper 抽象。
<a id="mybatis.pagination"></a>
- 一条查询 seam 只能有一个分页责任模型。核对实际插件/切面开关、拦截范围、参数绑定条件和返回 total 的责任，不以“依赖已引入”代替行为验证。
<a id="mybatis.batch"></a>
- 批量写入必须证明是组件当前支持的 SQL 级批量能力，并验证分批大小、字段填充、主键和数据库方言；循环单条写入不能冒充批量 SQL。
- 多数据源实例创建不等于动态路由、线程上下文切换或事务传播。先做 capability check；组件未提供的路由能力需在当前任务范围内明确上层适配方案。
<a id="mybatis.mapping"></a>
- Mapper/XML、逻辑删除、审计字段、主键策略、动态排序/分组白名单和参数绑定必须与实际数据模型和接口约定一致；说明本次 SQL/DDL/索引影响。
<a id="mybatis.transaction"></a>
- 事务边界归当前 Application 用例或 MVC service/core；Repository 不临时声明新的业务事务。

## 能力选择记录

| 既有工程调用 seam | 选择与核验 |
|---|---|
| `PageQuery` 经组件切面进入 Repository/Gateway | 核对代理切点、参数位置、PageHelper 开关、实际 SQL 与 `tempTotalCount`；不能因 Bean 注册就认定切面命中。 |
| Mapper 使用 MyBatis-Plus `IPage` | 核对 MP 分页开关、方言、实际 SQL 与 total；同一次查询不得叠加 PageHelper 上下文。两插件都注册不等于查询已双分页。 |
| 原生 Mapper/Example/ListMapper | 按当前源码和实体映射选择 `BaseRepository<T,D>`；与完整 MP `BasePlusRepository<T>` 不可直接互换，混用或复合键须验证主键方法、XML 与映射。 |
| SQL 级批量写入 | 核对公开入口、分片大小、目标方言生成的单批 SQL、审计填充和 ID；多个分片整体回滚由上层用例事务保证。若 batch size 存在进程级可变状态，多 Spring Context 不得据此宣称配置隔离。 |
| 命名数据源 | Holder 中有多个 DataSource 不证明动态路由；记录实际 Mapper 的 `SqlSessionFactory`/DataSource、主池与自建池所有权，以及事务绑定。 |

以上仅对命中的能力记录，不改变两套分页插件的当前默认注册行为；选择由当前工程配置、消费工程配置和运行测试共同证明。

## 任务分流

| 请求 | 本 Skill 动作 | 后续路由 |
|---|---|---|
| 组件接入、基类选择、配置核验 | 读取当前 Profile 和源码能力矩阵，给出来源可追踪的选择 | 需要结构实现时转 `yss-repository` |
| 生成 PO / Repository / Convertor / GatewayImpl | 不生成 | `yss-repository` |
| 普通 MyBatis 新工程生成 | `unsupported` | 按新能力需求另行设计和验证 |

## 排障顺序

1. 依赖与 Profile：starter、组件版本、MyBatis/MyBatis-Plus 模式是否与当前工程选择一致。
2. 装配与开关：自动配置、条件属性、Mapper 扫描和 XML location 是否真实生效。
3. 调用 seam：代理是否命中、分页参数位置/类型、分页插件链和 total 回填责任。
4. 映射：接口签名、XML namespace、resultMap、字段、逻辑删除和主键策略。
5. 批量：是否调用当前公开批量入口、分批与方言是否匹配、是否退化为循环单条；核对 batch size 在多个应用上下文中的作用域。
6. 数据源：先确认组件只提供了什么，再检查 Mapper 实际绑定的会话工厂、上层路由与事务进入顺序；不得假设存在当前线程数据源上下文。
7. 最后检查 SQL、绑定参数、数据库方言与执行计划。

## 结果与验证

- 使用项目根 `./mvnw ...` 记录实际命令、退出码和时间；H2 只证明本地/测试行为，不证明生产方言。
- 在当前任务中说明来源、实际命中的分页/批量/映射约束、执行结果与未知项；不要求固定结果协议或无条件独立审查。

## 持久化选择记录

在已有数据设计或当前任务中记录：实际 Mapper 基类、组件源码与平台绑定、分页唯一责任者、主键与审计填充，以及命中批量时的 SQL 入口、分批大小和方言证据。`BaseMapper` 与组件扩展基类按所需能力选择，不因命名不同判违规；依赖存在和循环 insert 均不证明批量能力。未命中的能力不强制生成。
