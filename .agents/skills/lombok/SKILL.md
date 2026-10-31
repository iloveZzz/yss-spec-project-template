---
name: lombok
description: "配置或排查 Lombok 注解、构造器、Builder 和注解处理器；按对象身份与敏感字段选择生成范围。"
---
# Project Lombok

## 按需读取

| 任务 | 参考 |
|---|---|
| 构造器、Builder、默认值或不可变对象 | [Common Annotations](references/annotation-examples.md#common-annotations) |
| 实体身份、关联与敏感字段 | [Entity Pattern](references/annotation-examples.md#entity-pattern) |
| 注解处理器与 MapStruct 集成 | [Maven Configuration](references/annotation-examples.md#maven-configuration)，映射逻辑交给 `mapstruct` |

选择注解前核查生成的 equals/hashCode/toString 是否符合对象身份与数据边界。敏感字段不能进入生成的 toString 或日志；实体不默认使用全量 `@Data`。依赖和处理器版本复用工程基线，修改生成行为后编译受影响模块，并验证实际生成的访问器、构造器或身份行为。

查第三方行为时使用 `yss-research`，来源为 [Lombok 官方文档](https://projectlombok.org/features/)；不假定某个 MCP 工具已安装。
