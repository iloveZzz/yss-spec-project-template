---
name: lombok
description: "配置或排查 Lombok 注解、构造器、Builder 和注解处理器；按对象身份与敏感字段选择生成范围。"
---
# Project Lombok

## YSS 阶段 7 执行结果

- 消费工程 Java 与处理器基线；三个新后端 Profile 为 Java 8。MapStruct binding 进入 annotationProcessorPaths，不作为业务依赖单独引入；示例不授权升级依赖。MVC PO 的身份/敏感字段风险与 DDD 相同，不能默认全量 @Data。
- 消费批准后的 Slice Contract/work unit，只在允许路径内调整 POJO 样板和注解处理器配置。
- 受控生成必须记录对象类型、选用/排除注解、实体关系和敏感字段风险、编译/测试实际结果。
- 按 `yss-implementation-contract-compiler` 的统一 Execution Result 返回 changed files、证据、偏离和新增影响；`@Data` 实体风险、处理器配置缺失或越界路径返回 `violation`。

## 按需读取

先确认当前任务涉及的对象与批准合同，只读取对应参考段落：

| 任务 | 参考 |
|---|---|
| 构造器、Builder、默认值或不可变对象 | [Common Annotations](references/annotation-examples.md#common-annotations) |
| 实体身份、关联与敏感字段 | [Entity Pattern](references/annotation-examples.md#entity-pattern) |
| 注解处理器与 MapStruct 集成 | [Maven Configuration](references/annotation-examples.md#maven-configuration)，映射逻辑交给 `mapstruct` |

选择注解前核查生成的 equals/hashCode/toString 是否符合对象身份与数据边界。敏感字段不能进入生成的 toString 或日志；实体不默认使用全量 `@Data`。依赖和处理器版本复用工程基线，修改生成行为后编译受影响模块，并验证实际生成的访问器、构造器或身份行为。

查第三方行为时使用 `yss-research`，来源为 [Lombok 官方文档](https://projectlombok.org/features/)；不假定某个 MCP 工具已安装。
