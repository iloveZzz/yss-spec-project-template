---
name: mapstruct
description: "实现或排查 MapStruct DTO、PO、Domain 映射及 Lombok 集成；核验字段完整性与更新语义。"
---
# MapStruct Object Mapping

## YSS 阶段 7 执行结果

- Java、依赖与处理器版本来自工程基线，不从下面通用示例推断。三个新后端 Profile 为 Java 8；MVC 的 wire/internal 转换在 server，core/service 不依赖 client，Repository 不依赖上层 DTO。采用 Spring Bean 和构造器注入，显式映射或忽略字段；禁止通过全局 IGNORE 掩盖合同字段遗漏。
- 消费批准后的 Slice Contract/work unit，只为合同中的 DTO/VO/PO/Domain 转换生成 Mapper/Convertor。
- 受控生成必须记录 source/target、忽略字段、更新语义、Lombok processor 配置和 mapper 行为测试。
- 按 `yss-implementation-contract-compiler` 的统一 Execution Result 返回生成/源文件、测试和实际验证；未映射字段、反射/BeanUtils 退化或越界路径返回 `violation`。

## 按需读取

先确认当前任务涉及的对象与批准合同，只读取对应参考段落：

| 任务 | 参考 |
|---|---|
| 字段、嵌套对象或集合转换 | [Basic Mapper / Field Mapping / Collection Mapping](references/annotation-examples.md) |
| 局部或全量更新、null 语义 | [Update Mapping](references/annotation-examples.md#update-mapping) |
| 编译不生成实现或 Lombok 集成 | [Maven Configuration](references/annotation-examples.md#maven-configuration) |

优先复用工程已有 MapperConfig。新增目标字段须显式映射或按合同忽略，不能用全局 `ReportingPolicy.IGNORE` 消除遗漏。局部更新与全量替换的 null 语义来自合同，不能从示例推断。

按变更验证字段覆盖、null、更新和边界值；处理器调整需实际编译。不要把所有参考示例当作必跑清单。

查第三方行为时使用 `yss-research`，来源为 [MapStruct 官方文档](https://mapstruct.org/documentation/stable/reference/html/)；不假定某个 MCP 工具已安装。
