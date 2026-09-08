# layered-mvc-service

仅适用于注册表中 `architecture_family=layered-mvc`、用例层为 `service` 的当前合同。先读仓库 `docs/agents/backend-architecture-profiles.md`；Profile 的成熟度沿用注册表。

## 前置与所有权

- 已有批准的 service 用例接口、数据合同和查询/写入语义；不得从表结构反推 service 或 HTTP API。
- repository module 拥有 PO、Repository/Mapper、XML 和持久化 Convertor；不生成 DDD Domain Gateway、Application Query Port 或 Web DTO。
- repository 不反向依赖 service、server、client；事务、业务规则和幂等归 service 用例。

## 结构决策

- 包、module、Mapper 扫描和 XML 路径来自 `architecture_identity`、当前工程基线及合同，不使用 DDD Infrastructure 固定布局。
- MyBatis-Plus 基类、分页、批量和数据源能力由 `yss-mybatis` 当前能力矩阵决定。
- repository 输出 service 已批准的内部模型或结果，不泄漏 PO、原始 SQL、数据库异常原文或凭据。

## 必须验证

- service 是唯一业务事务边界，Controller 不直连 Repository。
- Repository/Mapper 覆盖查询、写入、分页、回滚、字段转换和批准数据库 fixture。
- H2 仅作为验证数据库；生产驱动和数据源必须由单独批准的存储工作单元接入。
