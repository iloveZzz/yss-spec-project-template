---
name: yss-repository
description: 用于按批准的 YSS 架构与持久化合同实现或重构 PO、Repository、Convertor、Domain Gateway/Query Adapter；负责结构路由、分层边界和验证，不内置可照抄的业务代码模板。
---

# yss-repository

本 Skill 消费批准合同，将持久化责任落到选定架构 Profile。它不是完整脚手架，也不从 DDL、表名或示例反向创造领域/API 合同。

## 架构分流

1. 读取当前 Slice Implementation Contract 的 `architecture_identity`、`persistence_profile`、实现仓登记、数据合同、`allowed_write_paths` 和预期证据。
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
- 只实现批准合同已有的结构与 seam，不创建或改写 Domain Gateway、Application Query Port、service/core 接口或 Web/API DTO。
- 持久化 Profile 命中 MyBatis 时加载 `yss-mybatis`，以当前组件能力索引核验基类、分页、批量、扫描、XML 和数据源行为；本 Skill 不复制这些规则。
- POJO、转换和 Java 规范分别消费 Registry 编译出的 `lombok`、`mapstruct`、`alibaba-java-code-style`；不在此重复其注解和处理器规则。
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
- 发现 SQL、DDL、索引、数据模型或 API schema 新影响时立即暂停并返回 `new_impacts`，不能以 TODO 代替合同重编译。

## 产物与证据

实际产物由所选 Profile 和合同共同决定，不以固定示例类名或固定包路径推断。完成前至少证明：

- 每个实现类对应已批准的端口或用例调用方；
- Mapper/Repository、XML、扫描和转换实现可编译且被运行时发现；
- 保存/重载、查询、分页、空结果、排序白名单和回滚等命中行为有测试；
- 所有写入位于 `allowed_write_paths`；
- 使用各后端项目根的 `./mvnw ...` 记录实际命令、退出码和时间。

按 [YSS Skill Execution Result v2](../yss-implementation-contract-compiler/references/yss-skill-execution-result.md) 返回实际文件、测试、约束结果、`seam_deferred`、`deviations`、`new_impacts`、`drift` 和 `violation`。

## Review 输入

`code-review` 仅对本体项目及合同/实现仓登记的后端研发项目执行本 Skill。候选命中持久化结构或数据访问时，Standards 轴必须读取所选 Profile 并引用规则与代码证据；未命中时记录带原因的 `not-applicable`。Reviewer 只报告 finding，不写实现。

## 新脚手架平台约束

消费批准切片架构身份中的 `platform_configuration`，并与工程 Manifest、effective POM 和依赖树核对。命中 MyBatis 时，`framework.mybatis` 必须从该配置指向的 compatibility 条目解析出对当前架构有效的 `component_binding`；构件、摘要、源码 tree、证据或绑定状态不一致时回合同编译器阻断。Validation namespace、Jackson、starter 和处理器版本只消费解析后的精确平台事实，不在本 Skill 中按 Boot 大版本推导。不得在业务实现中升级、降级或替换 YSS 组件；平台迁移使用独立迁移工作单元。详见仓库共享合同 `.template-spec/engineering/backend-platforms.md`。

只读审计可先盘点、记录缺失合同；不得用实施前置要求阻止发现既有违规。整改仍需批准合同，不因缺少生成 Manifest 阻断已有效登记的既有工程。
