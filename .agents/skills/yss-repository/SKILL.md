---
name: yss-repository
description: 用于按当前路线已确认的 YSS 架构与持久化输入实现或重构 PO、Repository、Convertor、Domain Gateway/Query Adapter；负责结构路由、分层边界和验证，不内置可照抄的业务代码模板。
---

# yss-repository

执行路线按 Spec 项目中的 `.agents/skills/yss-product-lifecycle/references/daily-delivery.md` 的项目本地政策与固定 CLI 核验。仅合格且范围已授权的 Spec `daily` 消费同 Ticket 的范围、验收与已核验工程基线；`governed` 保留当前批准合同。缺本地政策/能力、其他 Profile 或已绑定正式任务不能凭标签降级；路线不授予执行授权。

本 Skill 消费当前路线输入，将持久化责任落到已有确认的架构 Profile；`governed` 使用批准合同，合格 `daily` 使用同 Ticket 与已核验工程基线。它不是完整脚手架，也不从 DDL、表名或示例反向创造领域/API 合同。

只读审计可先盘点实际结构并记录缺失合同，不受实施前置阻止；`governed` 整改仍需批准且当前的 Slice，合格 `daily` 整改只在同 Ticket 的已确认验收和范围内推进。既有工程使用有效登记与独立观测，不要求补造生成 Manifest。

## 架构分流

1. `governed` 读取当前 Slice Implementation Contract 的 `architecture_identity`、`persistence_profile`、实现仓登记、数据合同、`allowed_write_paths` 和预期证据；合格 `daily` 从同 Ticket 及已有工程基线取得实际架构、持久化/数据映射、既有 seam、真实单仓根、`scope.paths` 和验收，不创建正式 Slice。
2. 将架构身份与当前工程基线、既有工程观测（生成 Manifest 只证明历史来源）和 `.template-spec/agents/yss-skill-registry.yaml` 核对；成熟度以注册表为准，不能把 `draft` 称为已支持。
3. 根据 `architecture_profile` **且只**加载一个文件：
   - [target-domain-model](references/profiles/target-domain-model.md)
   - [layered-mvc-service](references/profiles/layered-mvc-service.md)
   - [mvc-data-analysis-v1](references/profiles/mvc-data-analysis-v1.md)
   - [existing-domain-driven-maven](references/profiles/existing-domain-driven-maven.md)
   - [existing-layered-mvc-maven](references/profiles/existing-layered-mvc-maven.md)
4. Profile 缺失、身份冲突、Manifest 漂移或数据输入不完整时返回 `blocked` / `drift` / `new_impacts`，不得选择“最像”的分支继续。

## 共用规则

<a id="repository.ownership"></a>
<!-- yss-rule {"id":"repository.ownership","when":"persistence","level":"mandatory","evidence":"code-and-verification"} -->
- 只实现当前路线已确认的结构与 seam（`governed` 来自批准合同，`daily` 来自同 Ticket 和已有工程基线），不创建或改写 Domain Gateway、Application Query Port、service/core 接口或 Web/API DTO。
- 持久化 Profile 命中 MyBatis 时加载 `yss-mybatis`，以当前组件能力索引核验基类、分页、批量、扫描、XML 和数据源行为；本 Skill 不复制这些规则。
- POJO、转换和 Java 规范分别消费 `lombok`、`mapstruct`、`alibaba-java-code-style`；`governed` 使用 Registry 编译集，`daily` 由同 Ticket 绑定实际适用技能；不在此重复其注解和处理器规则。
<a id="repository.mapping"></a>
<!-- yss-rule {"id":"repository.mapping","when":"persistence","level":"mandatory","evidence":"code-and-verification"} -->
- 数据合同必须显式覆盖主键、逻辑删除、审计字段、空值、枚举/值对象映射和敏感字段；动态排序、分组与过滤必须使用批准白名单和参数绑定。
- 数据合同选择 YSS 分布式主键时，记录已选 `component.distributed-id` 绑定、Segment/Snowflake 策略、实体主键类型与批量插入路径，并消费 `yss-distributed-id` 的当前平台证据；不由 Repository 自行切换算法或创建发号合同。
<a id="repository.transaction"></a>
<!-- yss-rule {"id":"repository.transaction","when":"persistence","level":"mandatory","evidence":"code-and-verification"} -->
- 事务归所选 Profile 的用例边界。Repository/Gateway Adapter 不临时新增业务事务，也不把数据库异常原文或凭据暴露给上层。
- 基础机械结构只有在合同标记 `controlled-generation`、metadata 完整且目标文件不存在时才可受控生成；查询语义、分页、并发、事务和迁移行为使用 `behavior-tdd`。
<a id="repository.sql"></a>
<!-- yss-rule {"id":"repository.sql","when":"persistence","level":"mandatory","evidence":"code-and-verification"} -->
- 发现超出当前验收/基线的 SQL、DDL、索引、数据模型或 API schema 新影响时停止受影响实现并回生命周期调查；`daily` 未知或排除风险升级，`governed` 返回 `new_impacts` 并按原合同重编译，不能以 TODO 代替。

## 产物与证据

实际产物由所选 Profile 和合同共同决定，不以固定示例类名或固定包路径推断。完成前至少证明：

- 每个实现类对应当前已确认的端口或用例调用方；`governed` 核对批准合同，`daily` 核对同 Ticket 与既有工程职责；
- Mapper/Repository、XML、扫描和转换实现可编译且被运行时发现；
- 保存/重载、查询、分页、空结果、排序白名单和回滚等命中行为有测试；
- `governed` 写入位于 `allowed_write_paths`；`daily` 写入位于同 Ticket 的实际 `scope.paths`；
- 使用各后端项目根的 `./mvnw ...` 记录实际命令、退出码和时间。

`daily` 在同 Ticket 返回实际文件、适用持久化约束、真实测试/命令/退出码、偏离及新增影响，由独立 Reviewer 绑定当前候选；`governed` 按 [YSS Skill Execution Result v2](../yss-implementation-contract-compiler/references/yss-skill-execution-result.md) 返回实际文件、测试、约束结果、`seam_deferred`、`deviations`、`new_impacts`、`drift` 和 `violation`。

## Review 输入

`code-review` 仅对本体项目、`governed` 合同/实现仓登记项目或 `daily` 同 Ticket 已核验的单一后端实现根执行本 Skill。候选命中持久化结构或数据访问时，Standards 轴必须读取所选 Profile 并引用规则与代码证据；未命中时记录带原因的 `not-applicable`。Reviewer 只报告 finding，不写实现。

## 新脚手架平台约束

`governed` 消费批准切片架构身份中的 `platform_configuration`，并与工程 Manifest、effective POM 和依赖树核对；合格 `daily` 消费同 Ticket 已绑定的既有工程精确平台基线、effective POM 与依赖树，不补造生成 Manifest 或 Slice。命中 MyBatis 时，`framework.mybatis` 必须从该配置指向的 compatibility 条目解析出对当前架构有效的 `component_binding`；构件、摘要、源码 tree、证据或绑定状态不一致时停止受影响动作并回生命周期调查；`governed` 回合同编译器阻断。Validation namespace、Jackson、starter 和处理器版本只消费解析后的精确平台事实，不在本 Skill 中按 Boot 大版本推导。不得在业务实现中升级、降级或替换 YSS 组件；平台迁移使用独立迁移工作单元。详见仓库共享合同 `.template-spec/engineering/backend-platforms.md`。
