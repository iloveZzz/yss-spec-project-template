# mvc-data-analysis-v1

仅用于维护既有数据分析 MVC 代码，不恢复已退役的初始化器。类型职责参考 `.template-spec/agents/backend-architecture-profiles.md`，实际包、模块和接口以当前工程为准。

## 前置与所有权

- 依据当前数据约定、查询语义和 core 用例接口；不得从 DDL 或报表字段反推对外 API。
- repository module 拥有 PO、Repository/Mapper、XML 和持久化 Convertor；不生成 DDD Gateway，也不依赖 core、client、server。
- 事务、业务规则和查询编排归 core；repository 只实现用例需要的数据访问接口。

## 数据分析约束

- 动态排序、分组、过滤、聚合字段和表来源必须来自明确白名单并使用参数绑定；客户端输入不得直接拼接 SQL 标识符或表达式。
- MyBatis-Plus 基类、分页、批量和数据源能力由 `yss-mybatis` 当前能力矩阵决定，不假设组件提供动态数据源路由。
- repository 不返回 HTTP DTO，不暴露原始 SQL、数据库错误原文或连接凭据。

## 按本次影响核对

- 查询覆盖白名单边界、空值、空结果、分页 total、稳定排序和大数据量限制。
- 数据库 fixture 验证实际 Mapper/XML 与方言；H2 不能证明生产数据库的函数、排序或执行计划。
- core 是唯一业务事务边界，server 不直连 Repository。
