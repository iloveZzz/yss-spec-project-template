---
name: yss-repository
description: 按已确认的 YSS 架构与持久化输入实现或重构 PO、Repository、Convertor、Gateway/Query Adapter；不提供可照抄的业务代码。
---

# YSS 持久化实现

依据当前工程的 DDD/MVC 架构、数据结构和实际调用方，实现或调整 PO、Repository、Convertor 与 Adapter。按需要读取 references/profiles 中对应架构的说明，不要求登记、Manifest、批准合同或验证报告。

- DDD 保持 Domain Gateway / Application Query Port 与实现分离；MVC 沿用 Service/Repository 职责。
- 持久化对象覆盖主键、空值、逻辑删除、审计字段、枚举/值对象及敏感字段映射。
- SQL 使用参数绑定；动态排序、分组、过滤使用明确白名单，不把原始输入拼进 SQL。
- 事务位于实际用例边界；不要让数据库异常或凭据泄漏给接口调用方。
- 使用 yss-mybatis 处理分页、批量、扫描、XML 与数据源；使用 mapstruct、lombok 和 alibaba-java-code-style 处理相应细节。
- 主键策略按已有工程与需求选择，YSS 分布式 ID 使用 yss-distributed-id；不擅自改变算法。

同步受影响的接口、映射和配置。需要运行工程时优先 ./mvnw；只报告实际结果，不为交付创建测试证据包。
