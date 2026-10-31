# layered-mvc-service

适用于实际采用 MVC、用例层为 service 的工程。类型职责参考仓库 `.template-spec/agents/backend-architecture-profiles.md`；具体包和模块以当前工程为准。

## 前置与所有权

- 依据已有 service 用例接口、数据结构和当前查询/写入语义；不得从表结构反推 service 或 HTTP API。
- repository module 拥有 PO、Repository/Mapper、XML 和持久化 Convertor；不生成 DDD Domain Gateway、Application Query Port 或 Web DTO。
- repository 不反向依赖 service、server、client；事务、业务规则和幂等归 service 用例。

## 结构决策

- 包、module、Mapper 扫描和 XML 路径来自当前源码、构建配置和接口，不使用 DDD Infrastructure 固定布局。
- MyBatis-Plus 基类、分页、批量和数据源能力由 `yss-mybatis` 当前能力矩阵决定。
- repository 输出 service 的内部模型或结果，不泄漏 PO、原始 SQL、数据库异常原文或凭据。

## 按本次影响核对

- service 是唯一业务事务边界，Controller 不直连 Repository。
- Repository/Mapper 覆盖查询、写入、分页、回滚、字段转换及实际数据库方言。
- H2 仅作为验证数据库；生产驱动和数据源按当前需求与已有工程配置接入，不从 H2 验证推断生产兼容。
