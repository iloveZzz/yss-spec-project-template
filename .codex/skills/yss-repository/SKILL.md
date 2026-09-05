---
name: yss-repository
description: Use when generating or refactoring YSS Infrastructure persistence models, repositories, MapStruct convertors, Domain Gateway implementations, or metadata/DDL-backed queries.
---

# yss-repository

## 架构分流（先执行）

读取当前合同的 architecture_identity 并与工程基线、仓库登记及 Manifest 核对；再且只读取 `references/profiles/<architecture_profile>.md`。支持的分支为 target-domain-model、layered-mvc-service、mvc-data-analysis-v1；成熟度以注册表为准，不能把 draft 称为受支持。MVC 不执行下文 DDD 专属规则，也不加载其旧分层 guide；组件、安全、批准合同、允许路径及执行证据规则仍共用。

以下 Application / Domain Gateway / Infrastructure / Web module 叙述仅适用于 target-domain-model；MVC 的 service/core/repository/server/client 所有权由所选 Profile 引用定义。

这是一个偏代码生成和结构补全的 skill，适合在已有工程里补 Repository 层，不适合替代完整脚手架。

## 何时使用

- 用户要生成 `PO / Repository / Convertor / GatewayImpl`。
- 用户已有 Domain 模型，缺基础设施持久层落地。
- 用户要基于表结构、DDL、metadata 补齐持久层代码。

## 不适用

- 只做 Controller 时，优先 `yss-web-controller`。
- 只做领域建模时，优先 `yss-domain`。
- 从零建多模块工程时，优先 `yss-ddd-scaffold-generator`。

## 工作方式

1. 先确认批准且版本当前的 Slice Implementation Contract、数据架构、领域模型和既有 Domain Gateway/Application Query Port；缺任一前置项即返回 `blocked` / `new_impacts`，不得从 DDL 反向猜测领域端口。
2. 确认持久化 Profile 为 `mybatis-plus` 与 `PO <-> Domain Model`；`Entity + BaseRepository + DTO/VO GatewayImpl` 等旧架构对新脚手架为 `unsupported`。
3. 如果 metadata 不完整，先补齐 metadata、数据库表结构或 DDL 输入。
4. 加载并遵守固定 Profile 的 `yss-mybatis`，不得在本 skill 内维护第二套 Mapper、分页或 SQL 安全规则。
5. 涉及 POJO 字段、getter/setter、constructor、builder 或日志时，必须加载并遵守 `lombok`。
6. 涉及持久化模型与 Domain/Application Result 转换时，必须加载并遵守 `mapstruct`；Infrastructure 不生成 Web VO/CMD 转换。
7. 生成代码时严格保持 Domain 与 Infrastructure 分层边界。
8. 默认先生成基础 CRUD 骨架，把复杂查询留给手工实现。

## 产物范围

- `infrastructure/persistence/po/*PO.java`
- `infrastructure/persistence/repository/*Repository.java`
- `infrastructure/persistence/convertor/*Convertor.java`
- `infrastructure/persistence/gateway/*GatewayImpl.java`
- `infrastructure/query/adapter/*QueryAdapter.java`（实现 Application Query Port）
- `infrastructure/query/convertor/*QueryConvertor.java`

## 约束

- Domain 不依赖 Infrastructure。
- Gateway 定义在 Domain，实现放在 Infrastructure。
- `yss-repository` 不创建或改写 Domain Gateway interface；缺少或需要改变 Gateway 时返回 `new_impacts`，由 实现合同编译器 回到 `yss-domain` / `yss-tactical-design`。
- Domain Gateway 只交换 Domain Model、领域值和标识；分页、列表和读模型走 Application Query Port，禁止返回 Web VO 或把 `PageQuery` 带入 Domain。
- PO / Domain Model 等 POJO 样板代码优先使用 Lombok；不要成片手写 getter/setter、constructor、builder 或 logger。
- Convertor 必须优先使用 `@Mapper(componentModel = "spring")` 和构造器注入；禁止静态 `INSTANCE`、`BeanUtils.copyProperties`、反射式通用拷贝和重复手写字段赋值，除非实现合同记录受控例外、测试和 review 证据。
- MapStruct 与 Lombok 同时使用时，必须确认注解处理器顺序和 `lombok-mapstruct-binding` 配置；构建命令使用项目根目录 `./mvnw ...`。
- 逻辑删除、审计字段、主键策略要显式处理，不要隐式略过。
- 事务放在批准的 Application 用例边界；检测到旧 GatewayImpl 事务布局时返回 `unsupported`，不在 scaffold 链路内迁移。

## 质量门禁

- 生成代码必须可编译。
- 命名、包路径、注解要与工程现有规范一致。
- Convertor 必须有 MapStruct 接口 / 抽象类、生成实现可编译，必要时补 mapper 单测或覆盖核心字段转换的行为测试。
- POJO 使用 Lombok 时不得引入 `@Data` 造成实体 equals / toString 风险；有关系字段、敏感字段或懒加载字段时按 `lombok` skill 排除。
- 遇到无法自动判断的字段、映射或查询规则时返回 `new_impacts` / `drift` 并暂停，不要把 TODO 当作已完成实现。

## 协同顺序

- metadata / DDL 输入准备：确认输入完整
- 领域建模：`yss-domain`
- 用例编排：`yss-application`
- POJO 样板代码：`lombok`
- 对象转换：`mapstruct`
- Web 补齐：`yss-web-controller`

## 分层开发规范

实现 PO / Repository / GatewayImpl 前，必须加载 `references/infrastructure-layer-guide.md`：其中定义持久化对象、Repository、Convertor 与 Gateway 实现的结构与示例。

## 阶段 7 合同

- 前置条件：数据架构、领域元数据、实现仓库和批准后的 `Slice Implementation Contract` 均可用；否则不执行本 skill，由 实现合同编译器 返回 `blocked`。
- PO/Repository/Convertor 骨架可使用 `controlled-generation`；复杂过滤、分页语义、并发、事务和迁移行为必须拆为 `behavior-tdd`。
- 写入仅限合同 `allowed_write_paths`，证据必须包含实际 PO、Repository、Convertor、GatewayImpl、测试和 `./mvnw ...` 结果。
- 按统一 `YSS Skill Execution Result` 返回 `seam_deferred/deviations/new_impacts`；发现数据模型、DDL、SQL、索引或 API schema 变化时暂停并重路由。
