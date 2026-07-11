---
name: yss-repository
description: 用于生成或重构 YSS Repository 持久层与 Domain Gateway 实现。当用户要求按表结构、DDL、metadata 或现有领域模型补齐 PO、Repository、Convertor、GatewayImpl 时调用。
---

# yss-repository

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

1. 先确认输入来源：领域模型、metadata、数据库表、DDL。
2. 如果 metadata 不完整，优先转到 `yss-db2mybatis` 提取。
3. 涉及 POJO 字段、getter/setter、constructor、builder 或日志时，必须加载并遵守 `lombok`。
4. 涉及 `PO <-> Domain Model`、集合转换、更新映射或枚举转换时，必须加载并遵守 `mapstruct`。
5. 生成代码时严格保持 Domain 与 Infrastructure 分层边界。
6. 默认先生成基础 CRUD 骨架，把复杂查询留给手工实现。

## 产物范围

- `domain/{segment}/gateway/*Gateway.java`
- `repository/entity/*PO.java`
- `repository/*Repository.java`
- `repository/convertor/*Convertor.java`
- `repository/gateway/impl/*GatewayImpl.java`

## 约束

- Domain 不依赖 Infrastructure。
- Gateway 定义在 Domain，实现放在 Infrastructure。
- PO / Domain Model 等 POJO 样板代码优先使用 Lombok；不要成片手写 getter/setter、constructor、builder 或 logger。
- Convertor 必须优先使用 MapStruct；禁止 `BeanUtils.copyProperties`、反射式通用拷贝和重复手写字段赋值，除非实现合同记录受控例外、测试和 review 证据。
- MapStruct 与 Lombok 同时使用时，必须确认注解处理器顺序和 `lombok-mapstruct-binding` 配置；构建命令使用项目根目录 `./mvnw ...`。
- 逻辑删除、审计字段、主键策略要显式处理，不要隐式略过。

## 质量门禁

- 生成代码必须可编译。
- 命名、包路径、注解要与工程现有规范一致。
- Convertor 必须有 MapStruct 接口 / 抽象类、生成实现可编译，必要时补 mapper 单测或覆盖核心字段转换的行为测试。
- POJO 使用 Lombok 时不得引入 `@Data` 造成实体 equals / toString 风险；有关系字段、敏感字段或懒加载字段时按 `lombok` skill 排除。
- 遇到无法自动判断的字段或规则时，写 TODO 或向用户说明，不要假装已确认。

## 协同顺序

- metadata 提取：`yss-db2mybatis`
- 领域建模：`yss-domain`
- POJO 样板代码：`lombok`
- 对象转换：`mapstruct`
- Web 补齐：`yss-web-controller`
