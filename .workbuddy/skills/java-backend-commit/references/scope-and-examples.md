# Java 后端 Type、Scope 与示例

## 目录

- [规则优先级](#规则优先级)
- [Type 选择](#type-选择)
- [Scope 选择](#scope-选择)
- [原子提交边界](#原子提交边界)
- [消息示例](#消息示例)
- [Java 验证](#java-验证)
- [规范依据](#规范依据)

## 规则优先级

1. 仓库 commitlint 的 resolved config 和 hooks。
2. 仓库 `AGENTS.md`、`CONTRIBUTING.md`、提交模板及明确文档。
3. Maven/Gradle 模块定义、稳定业务术语及目标路径近期的有效提交。
4. 本参考的通用回退规则。

仓库允许空 scope 时仍优先使用能说明服务或业务域的 scope；跨全仓且没有清晰主域时可以省略。只有仓库明确要求时才添加工单 footer、DCO 或签名。

## Type 选择

| Type | 使用条件 | 不要用于 |
|---|---|---|
| `feat` | 新增 API、业务能力、运维能力或可用配置 | 纯重构或依赖升级 |
| `fix` | 修复错误结果、异常、回归、事务或并发缺陷 | 仅格式化代码 |
| `docs` | 只修改文档或 Javadoc | 代码行为变化 |
| `style` | 仅格式、空格、导入排序等，不改变语义 | 接口或 UI 风格变化 |
| `refactor` | 不增功能、不修 bug 的结构调整 | 性能优化或行为修复 |
| `perf` | 有明确性能收益的代码或查询变化 | 无证据的“优化”措辞 |
| `test` | 只增加或修正测试 | 功能代码及其配套测试 |
| `build` | Maven/Gradle、依赖、插件、打包或编译配置 | 一般业务配置 |
| `ci` | CI/CD 配置和流水线脚本 | 本地构建配置 |
| `chore` | 其他不改变产品行为的维护工作 | 无法理解改动时的兜底 |
| `revert` | 明确回滚一个或多个既有提交 | 普通修复 |

## Scope 选择

按以下顺序选择首个清晰候选：

1. **仓库限定值**：若 `scope-enum` 生效，只能使用允许值或按规则省略。
2. **构建模块**：Maven 使用稳定的 `artifactId`，Gradle 使用子项目名，例如 `order-service`、`risk-engine`。
3. **服务或限界上下文**：单模块项目按稳定业务域使用 `order`、`customer`、`settlement`、`valuation` 等名称。
4. **跨模块能力**：确实横跨业务域时使用仓库已有的 `api`、`db`、`security`、`messaging`、`observability`、`deps`、`build` 或 `ci`。

命名使用小写 kebab-case。优先采用 `pom.xml`、Gradle settings、包名和产品文档中的既有术语。`controller`、`service`、`repository`、`entity`、`common` 和具体类名通常不能表达业务影响，不应作为默认 scope。

## 原子提交边界

- 同一业务能力的 controller、application/domain service、repository、DTO、迁移和测试可以同提交，确保提交可构建和回滚。
- 公共契约与所有必需调用方修改通常同提交；若仓库支持分阶段兼容迁移，则按兼容阶段拆分。
- `pom.xml`、version catalog 或 Gradle 文件与其 lock/verification metadata 一起提交；无关依赖升级单独使用 `build(deps)`。
- Flyway/Liquibase 新迁移与对应实体、查询和测试可同提交；不要顺手重写已发布版本化迁移。
- 两个独立业务域、不同发布风险或不同回滚策略的改动应拆分；同一文件内无法安全分离时先请求用户决定。

## 消息示例

```text
feat(order): 支持批量取消待支付订单

- 增加批量取消接口并复用单笔状态校验
- 保持已支付订单处理和审计记录不变
- 补充事务回滚与部分非法状态测试
```

```text
fix(settlement): 修复重复回调导致结算流水重复入账的问题

- 使用业务幂等键拦截已处理回调
- 保留失败回调的可重试能力
```

```text
build(deps): 升级 Spring Boot 与数据库驱动
```

```text
feat(customer-api)!: 统一客户查询响应结构

- 将分页数据统一为 items 和 total
- 更新 OpenAPI 契约与消费者测试

BREAKING CHANGE: 原 records 字段改为 items，调用方需更新反序列化模型
```

```text
perf(valuation): 批量加载估值参数以减少重复查询

- 将逐条查询合并为按产品批量加载
- 增加查询次数断言并验证计算结果保持一致
```

错误与修正：

| 错误 | 修正方向 |
|---|---|
| `fix：修改 OrderService` | 使用 ASCII 冒号并描述修复结果 |
| `feat(controller): 新增接口` | 使用服务、模块或业务域 scope |
| `chore: 修改数据库` | 判断是功能、修复、性能还是构建变化 |
| `fix(order): 修复 bug` | 说明错误场景和用户可感知结果 |

## Java 验证

- 优先使用 wrapper，避免依赖开发机全局 Maven 或 Gradle 版本。
- Maven 多模块可基于真实模块使用 `./mvnw -pl <module> -am test`；Gradle 可使用 `./gradlew :<module>:test`。不要编造模块路径或任务。
- API 变更运行契约或集成测试；数据库变更运行迁移和 repository 测试；并发、事务和性能变更运行能证明关键性质的测试。
- 使用仓库已有 Checkstyle、SpotBugs、PMD、Error Prone、JaCoCo 或格式检查任务；不要擅自引入新工具。
- 测试产生的 `target/`、`build/`、日志和报告不得进入提交。

## 规范依据

- [Conventional Commits 1.0.0](https://www.conventionalcommits.org/en/v1.0.0/)
- [commitlint：AI Agents](https://commitlint.js.org/guides/ai-agents.html)
- [commitlint 官方 committing-with-commitlint skill](https://github.com/conventional-changelog/commitlint/tree/master/skills/committing-with-commitlint)
- [Spring Framework CONTRIBUTING](https://github.com/spring-projects/spring-framework/blob/main/CONTRIBUTING.md)
- [Git SubmittingPatches](https://git-scm.com/docs/SubmittingPatches)

