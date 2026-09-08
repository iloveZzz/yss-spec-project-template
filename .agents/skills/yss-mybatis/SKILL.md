---
name: yss-mybatis
description: 用于 YSS MyBatis / MyBatis-Plus 组件能力核验、接入决策和排障；涉及 Mapper/Repository 基类、分页、批量 SQL、扫描配置或数据源能力时使用，不负责生成持久层结构。
---

# yss-mybatis

本 Skill 只维护 `yss-component-persistence` 的组件能力、选择条件和排障顺序。PO、Repository、Convertor、Gateway/Query Adapter 的结构与生成边界由 `yss-repository` 负责。

## 入口与前置

1. 读取批准且当前的 `architecture_identity`、`persistence_profile`、实现仓登记和 Slice Implementation Contract。没有合同的故障诊断可以继续，但不得据此生成或改变架构。
2. 精确类名、方法签名、配置 key、默认值或启用条件必须先读 [source-index.md](references/source-index.md)，并按 `yss-skill-source-index-refresh/references/source-location.md` 核验组件 tree 与组件子树 clean 状态。
3. 组件 tree 不匹配或 persistence 子树为 dirty 时，路径提示只能用于定位；精确实现或审查结论返回 `stale` / `missing_evidence`，刷新索引后再继续。
4. 新 DDD / MVC scaffold 只支持批准的 `mybatis-plus` Profile。普通 MyBatis 仅用于既有工程维护、兼容与排障；新增支持必须有独立 Profile 和 fixture，不自动猜测或混用。

## 稳定决策规则

- 基类、Mapper 注解、XML 位置和扫描范围以批准 Profile、当前工程基线及当前组件源码共同决定；不得在既有体系外再造 Mapper 抽象。
- 一条查询 seam 只能有一个分页责任模型。核对实际插件/切面开关、拦截范围、参数绑定条件和返回 total 的责任，不以“依赖已引入”代替行为验证。
- 批量写入必须证明是组件当前支持的 SQL 级批量能力，并验证分批大小、字段填充、主键和数据库方言；循环单条写入不能冒充批量 SQL。
- 多数据源实例创建不等于动态路由、线程上下文切换或事务传播。先做 capability check；组件未提供的路由能力必须由批准的上层适配承担。
- Mapper/XML、逻辑删除、审计字段、主键策略、动态排序/分组白名单和参数绑定必须与数据合同一致；任何 SQL/DDL/索引新影响返回 `new_impacts`。
- 事务边界归批准的 Application 用例或 MVC service/core；Repository 不临时声明新的业务事务。

## 任务分流

| 请求 | 本 Skill 动作 | 后续路由 |
|---|---|---|
| 组件接入、基类选择、配置核验 | 读取当前 Profile 和源码能力矩阵，给出来源可追踪的选择 | 需要结构实现时转 `yss-repository` |
| 分页、批量、扫描、XML、数据源故障 | 按下列顺序定位并保留实际证据 | 发现合同或数据影响时返回编译器 |
| 生成 PO / Repository / Convertor / GatewayImpl | 不生成 | `yss-repository` |
| 普通 MyBatis 新工程生成 | `unsupported` | 新 Profile / fixture 获批后再进入 |

## 排障顺序

1. 依赖与 Profile：starter、组件版本、MyBatis/MyBatis-Plus 模式是否与合同一致。
2. 装配与开关：自动配置、条件属性、Mapper 扫描和 XML location 是否真实生效。
3. 调用 seam：代理是否命中、分页参数位置/类型、分页插件链和 total 回填责任。
4. 映射：接口签名、XML namespace、resultMap、字段、逻辑删除和主键策略。
5. 批量：是否调用当前公开批量入口、分批与方言是否匹配、是否退化为循环单条。
6. 数据源：先确认组件只提供了什么，再检查上层路由与事务进入顺序；不得假设存在当前线程数据源上下文。
7. 最后检查 SQL、绑定参数、数据库方言与执行计划。

## Review 输入

仅审查本体项目和合同/实现仓登记的后端研发项目。命中 Mapper、Repository、SQL、分页、批量、扫描配置或数据源能力时，`code-review` Standards 轴必须读取本 Skill 和当前 source index；无持久化影响时显式记录带原因的 `not-applicable`。

## 结果与验证

- 行为变更使用 `behavior-tdd`；纯 Mapper/XML 骨架仅在批准合同明确为 `controlled-generation` 时允许。
- 使用项目根 `./mvnw ...` 记录实际命令、退出码和时间；H2 只证明本地/测试行为，不证明生产方言。
- 按 [YSS Skill Execution Result v2](../yss-implementation-contract-compiler/references/yss-skill-execution-result.md) 返回证据、`seam_deferred`、`deviations`、`new_impacts`、`drift` 和 `violation`。
