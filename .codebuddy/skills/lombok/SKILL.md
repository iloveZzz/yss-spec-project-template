---
name: lombok
description: "配置或排查 Lombok 注解、构造器、Builder 和注解处理器；按对象身份与敏感字段选择生成范围。"
---
# Project Lombok

执行路线消费当前 Profile 主控合同的 `request_triage.delivery_path` 与固定 CLI 的 `route` / `verify-daily` 结果。仅已启用且合格的 Spec、Backend、Frontend `daily` 使用同一 Ticket 的范围、验收、工程基线、实际测试与独立审查；本端写范围不扩大。缺政策或能力时保持正式路径，已有正式任务不得降级；本技能不授予执行授权。

只读排障先核验实际对象、工程基线和处理器配置。`governed` 写入消费批准且当前的 Slice/work unit；合格 `daily` 写入消费同 Ticket 的对象、验收、已有工程处理器基线与实际 `scope.paths`，不因缺 Slice 补造正式资产。

## YSS 阶段 7 执行结果

- 消费工程 Java 与处理器基线；Java 语法、API、处理器与测试工具消费当前路线已核验的精确平台事实（`daily` 为同 Ticket 的已有工程基线，`governed` 为批准配置）。MapStruct binding 进入 annotationProcessorPaths，不作为业务依赖单独引入；示例不授权升级依赖。MVC PO 的身份/敏感字段风险与 DDD 相同，不能默认全量 @Data。
- `governed` 消费批准后的 Slice Contract/work unit；合格 `daily` 消费同 Ticket 已确认的对象与 seam，只在实际允许路径内调整 POJO 样板和注解处理器配置。
- 受控生成必须记录对象类型、选用/排除注解、实体关系和敏感字段风险、编译/测试实际结果。
- `daily` 在同 Ticket 返回实际文件、注解/处理器约束、真实编译/测试命令与退出码，接受当前候选的独立审查；`governed` 按 `yss-implementation-contract-compiler` 的正式 Execution Result 返回。`@Data` 实体风险、处理器配置缺失或越界路径返回 `violation`。

## 按需读取

先确认当前任务涉及的对象与有效输入（`daily` 同 Ticket/已有工程基线，`governed` 批准合同），只读取对应参考段落：

| 任务 | 参考 |
|---|---|
| 构造器、Builder、默认值或不可变对象 | [Common Annotations](references/annotation-examples.md#common-annotations) |
| 实体身份、关联与敏感字段 | [Entity Pattern](references/annotation-examples.md#entity-pattern) |
| 注解处理器与 MapStruct 集成 | [Maven Configuration](references/annotation-examples.md#maven-configuration)，映射逻辑交给 `mapstruct` |

选择注解前核查生成的 equals/hashCode/toString 是否符合对象身份与数据边界。敏感字段不能进入生成的 toString 或日志；实体不默认使用全量 `@Data`。依赖和处理器版本复用工程基线，修改生成行为后编译受影响模块，并验证实际生成的访问器、构造器或身份行为。

查第三方行为时使用 `yss-research`，来源为 [Lombok 官方文档](https://projectlombok.org/features/)；不假定某个 MCP 工具已安装。
