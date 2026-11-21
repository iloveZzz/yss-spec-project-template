---
name: mapstruct
description: "用 MapStruct 映射 DTO、持久化对象和领域模型，核对字段和更新行为，排查 Lombok 集成问题。"
---
# MapStruct Object Mapping

## 按需读取

| 任务 | 参考 |
|---|---|
| 字段、嵌套对象或集合转换 | [Basic Mapper / Field Mapping / Collection Mapping](references/annotation-examples.md) |
| 局部或全量更新、null 语义 | [Update Mapping](references/annotation-examples.md#update-mapping) |
| 编译不生成实现或 Lombok 集成 | [Maven Configuration](references/annotation-examples.md#maven-configuration) |

优先复用工程已有 MapperConfig。新增目标字段须显式映射或按合同忽略，不能用全局 `ReportingPolicy.IGNORE` 消除遗漏。局部更新与全量替换的 null 语义来自合同，不能从示例推断。

按项目根 `.template-spec/agents/backend-architecture-profiles.md` 确定层与转换方向；Web/Server 只做 Request → 用例输入、用例结果 → Response，嵌套和泛型同样分离。持久化转换归 Infrastructure/repository；转换器不查库、不决定资格/状态、不生成身份/时间或补造业务默认值。MapStruct 接口不属于 MyBatis 扫描范围。

按变更验证字段覆盖、null、更新和边界值；处理器调整需实际编译。不要把所有参考示例当作必跑清单。

查第三方行为时使用 `yss-research`，来源为 [MapStruct 官方文档](https://mapstruct.org/documentation/stable/reference/html/)；不假定某个 MCP 工具已安装。

聚合重建使用领域工厂或有测试的显式映射方法；MapStruct 只承担机械映射，不得为处理器增加破坏不变量的 setter。该方式不豁免字段覆盖、null 语义和往返一致性验证。
