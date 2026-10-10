---
name: alibaba-java-code-style
description: 应用阿里巴巴 Java 手册审查或实现 Java 代码；按当前项目框架与数据库基线选择适用规范。
---

# 阿里巴巴 Java 规范

执行路线按 Spec 项目中的 `.agents/skills/yss-product-lifecycle/references/daily-delivery.md` 的项目本地政策与固定 CLI 核验。仅合格且范围已授权的 Spec `daily` 消费同 Ticket 的范围、验收与已核验工程基线；`governed` 保留当前批准合同。缺本地政策/能力、其他 Profile 或已绑定正式任务不能凭标签降级；路线不授予执行授权。

本 Skill 从用户提供的《阿里巴巴 Java 开发手册》1.4.0 提炼适用规范。`mandatory` 违规阻断审查，除非仓库 `AGENTS.md`、安全约束或现有框架约定明确要求不同模式；例外须有依据。`recommended` / `reference` 保留建议等级，不因进入下文检查提要变为强制规则。

## 工作流

1. 按影响面读取对应规范：Java 命名、常量、OOP、集合、并发、控制流和注释读 [Java 编程](references/java-programming.md)；异常、日志、测试或安全读 [可靠性与安全](references/reliability-test-security.md)；MySQL、ORM/MyBatis、Maven、分层、服务器/JVM 或设计资产读 [工程与数据库](references/database-engineering-design.md)。
2. 先执行适用 mandatory，再按实际风险采用 recommended；审查报告保留规则等级。建议仅在产生真实风险或处于本次范围时报告。
3. 实现优先复用工程框架与已有生成能力，不新增重复基础设施。
4. 认证、付款、加密、SQL、迁移或公共库变更先核验当前合同及实际授权。已授权修复继续完成适用验证；仅真实缺决定或批准时形成草案 / `TODO-HUMAN-REVIEW`，并说明缺口。

## 适用原则

- 先读取 `.template-spec/agents/backend-architecture-profiles.md` 的“对象命名与外部规范适配”。YSS Profile、当前工程基线和专项技能持有分层、对象职责及协议；本 Skill 不授予采用 COLA 架构、组件或示例命名的资格。手册中的 DO 按持久化职责适配为新 YSS 工程的 PO，领域 Entity 单独建模；既有命名按已确认基线处理。
- 先消费 architecture_identity 与工程 Java/数据库基线。MVC 分层按 `.template-spec/agents/backend-architecture-profiles.md`；MySQL 专属方言规则仅对批准的 MySQL 存储生效，不能要求 H2 骨架引入 MySQL 驱动。YSS 包装、命名及处理器差异逐项记录基线例外，安全、权限、敏感信息与 SQL 参数绑定不得豁免。
- 名称使用清晰英文标识并遵循当前 Java 分层约定。
- 核验 null、相等、包装类型比较、集合和并发的运行时边界，不能以编译通过代替行为正确。
- 日志有诊断用途，并控制 CPU、磁盘和告警成本。
- 单元测试自动、独立、可重复，围绕公开行为验证。
- SQL 使用参数绑定与显式 ORM 映射，不依赖字符串拼接。
- 按已登记架构保持职责；手册的 Service/Manager/DAO 称谓须映射到当前 YSS Profile，不据此新增分层、让持久化对象穿层或把领域行为移到用例层。

## 检查提要

- 命名与格式：camel case、常量、包名、括号、间距、行长、UTF-8/Unix 换行；类型后缀和 boolean 命名符合适用规范。
- 对象语义：`equals/hashCode`、包装类型比较、`toString`、`serialVersionUID`、构造器、可见性和访问器。
- 集合：`subList`、`Arrays.asList`、`toArray`、foreach 删除、null map 和 comparator 的边界。
- 并发：命名线程池、生产 `Executors` 工厂限制、锁顺序、日期格式和定时任务。
- 异常：正确分层、上下文与堆栈、避免重复日志、不吞异常、不用于普通控制流。
- 测试：断言、外部依赖隔离、`src/test/java` 与边界/正确/设计/错误场景。
- 安全：按真实输入与认证方式核验校验、授权、转义、CSRF、限流和 SQL 参数绑定，不能泛用某项检查豁免其他风险。
- MySQL：仅适用存储核验显式字段、映射、索引、时间戳与 `#{}` 绑定，以及危险级联、存储过程、`select *` 和分页边界。

## 来源

用户提供的《阿里巴巴 Java 开发手册》1.4.0，阿里巴巴集团技术团队，更新于 2018-05-20；具体条款等级保留在对应 references 中。

## 阶段 7 执行结果

- 消费当前合同版本、changed files 和 verification results，只审查合同允许范围。
- 适用 mandatory violation 返回 `violation`，附文件/位置/规则证据；高风险项仅在当前合同确有未满足人工决定或批准要求时保留 `TODO-HUMAN-REVIEW`。
- `daily` 将适用规则、审查证据、实际测试与偏离写入同 Ticket；`governed` 按正式 `YSS Skill Execution Result` 返回。新增安全/SQL/公共 API 风险按当前路线回生命周期调查，不得仅输出“符合规范”。
