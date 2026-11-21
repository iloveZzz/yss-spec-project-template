---
name: yss-repository
description: 按既定架构和数据模型实现或重构持久化对象、仓储及转换器，适配领域网关与查询接口。
---

# YSS 持久化实现

依据当前工程的 DDD/MVC 架构、数据结构和实际调用方，实现或调整 PO、Repository、Convertor 与 Adapter。不要求登记、Manifest、批准合同或验证报告。按架构读取 [DDD](references/profiles/target-domain-model.md) 或 [MVC Service](references/profiles/layered-mvc-service.md)；既有工程参考 [DDD Maven](references/profiles/existing-domain-driven-maven.md) / [MVC Maven](references/profiles/existing-layered-mvc-maven.md)，仅维护既有数据分析代码时参考 [数据分析持久层](references/profiles/mvc-data-analysis-v1.md)。

生成 PO / Mapper 时先检查并复用工程已有生成器；缺少生成器或明确要求接入通用工具时，按 [模型生成说明](references/persistence-generation.md) 使用技能内的标准库 Python 工具。输入为已审阅的 `database-model.json` v1 与工程配置，先预览差异；不从表结构推导领域行为或接口。已有产物内容不同即报冲突，不自动覆盖或删除。

- DDD 保持 Domain Gateway / Application Query Port 与实现分离；MVC 沿用 Service/Repository 职责。
- PO/Domain 形态、中文 Javadoc、事实与规则分工、持久化组织及生成协同采用项目根 `.template-spec/agents/backend-architecture-profiles.md`；按业务责任组织 PO、Mapper/Repository、XML 与 Convertor，不默认汇入一个通用实现。
- 持久化对象覆盖主键、空值、逻辑删除、审计字段、枚举/值对象及敏感字段映射。
- 明确每个用例实际加载和允许更新的字段；部分加载的模型按操作字段白名单保存，不把未加载资料当作 NULL 或默认值回写。多租户且采用版本并发控制时，更新携带单位、ID 和原版本并核对影响行数，当前状态与历史保持同一用例事务。
- SQL 使用参数绑定；动态排序、分组、过滤使用明确白名单，不把原始输入拼进 SQL。
- 新增或变更引用时，按已确认的来源、目标及适用范围核验，沿用所选事务与并发保护协议；同单位存在不等于引用有效或操作者有权，单侧先查后写不能证明并发完整性。
- 事务位于实际用例边界；不要让数据库异常或凭据泄漏给接口调用方。
- 使用 yss-mybatis 选择单表 Java DSL、多表 Mapper XML、数据库方言、参数绑定、分页、批量、扫描与数据源；使用 mapstruct、lombok 和 alibaba-java-code-style 处理相应细节。
- Infrastructure 实现 Application Port 时只获取/组装事实，不调用具体 Application Service；MapStruct Convertor 与 MyBatis Mapper 的职责、扫描及生成输出分别核对。调整模板或批量生成时同步模型、归属、输出、XML、格式和受影响验证，不能只移动目录。
- 主键策略按已有工程与需求选择，YSS 分布式 ID 使用 yss-distributed-id；不擅自改变算法。

同步受影响的接口、映射和配置。需要运行工程时优先 ./mvnw；只报告实际结果，不为交付创建测试证据包。
