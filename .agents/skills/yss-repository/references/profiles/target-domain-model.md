# target-domain-model

仅适用于注册表中 `architecture_family=domain-driven` 的当前合同。Profile 的成熟度沿用注册表，不因加载本文件而升级。

## 前置与所有权

- 写模型必须已有批准的 Domain Gateway；读模型必须已有批准的 Application Query Port。缺失或需要改变签名时返回 `new_impacts`，由 `yss-domain` / `yss-application` 和实现合同编译器处理。
- Infrastructure 实现既有端口，拥有 PO、Repository/Mapper、XML、持久化 Convertor、GatewayImpl 和 QueryAdapter；不拥有领域规则、HTTP DTO 或业务事务。
- Domain Gateway 只交换 Aggregate、Domain Model、领域值和标识；分页、列表和读模型走 Application Query Port，`PageQuery` 不进入 Domain。

## 结构决策

- 包与 module 必须来自 `architecture_identity` 和现有工程基线；新脚手架的持久化责任位于 Infrastructure，既有工程不得因本 Skill 自动迁移目录。
- 写模型转换覆盖 `PO <-> Domain Model`；读模型转换只到 Application Result。Infrastructure 不生成或返回 Web VO/CMD。
- Repository 基类、Mapper/XML、分页与批量能力由 `yss-mybatis` 当前能力矩阵决定，不把组件版本方法名写成领域规则。
- 事务归 Application 用例。GatewayImpl/QueryAdapter 只执行端口语义，不新增业务编排。

## 必须验证

- Domain 不反向依赖 Infrastructure、Mapper、PO 或组件类型。
- 经 Domain Gateway 保存后可重新加载语义等价的 Aggregate。
- Query Port 覆盖分页 total、空结果、排序/过滤白名单和字段转换。
- Mapper/Repository 使用批准数据库 fixture；H2 不能证明生产方言。
