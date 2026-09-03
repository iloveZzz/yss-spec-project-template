---
name: yss-application
description: Use when implementing YSS application use cases, transaction boundaries, cross-aggregate orchestration, idempotency, or application-level DTO conversion.
---

# yss-application

Application 层用例编排 skill。负责协调 Domain 与 Gateway，定义事务边界和跨聚合流程，不承载核心领域规则。

## 何时使用

- 用户要实现 Application Service、用例编排或 `@Transactional` 边界。
- 用户要补 App 层 MapStruct Convertor 或跨聚合协调逻辑。
- 脚手架生成完成后进入业务实现，Router 按 `backend_impact` 加载本 skill。

## 不适用

- 只做领域建模时，优先 `yss-domain`。
- 只做持久层时，优先 `yss-repository`。
- 只做 Controller 时，优先 `yss-web-controller`。

## 工作方式

1. 确认工程来自 `target-domain-model`；`core/client/repository` 等旧架构对本脚手架链路为 `unsupported`。
2. 确认 Use Case、Application 边界、事务边界已在批准合同中写明。
3. 实现 AppService 时调用 Domain Service / Gateway，核心规则下沉 Domain。
4. Web DTO 转 Application Command/Result 属于 Web，PO 转 Domain 属于 Infrastructure；Application 内确有独立模型转换时才加载 `mapstruct`，并统一 Spring Bean 与构造器注入。
5. 详细包结构、注解、示例和旧架构阻断边界见 `references/application-layer-guide.md`。

## 产物范围

- `application/.../command/*Command.java`、`application/.../query/*Query.java`、`application/.../result/*Result.java`
- `application/.../port/*QueryPort.java`
- `application/.../service/*Service.java`
- `application/.../service/impl/*ServiceImpl.java`
- `application/.../service/convertor/*Convertor.java`（MapStruct）

## 协同顺序

- 领域建模：`yss-domain`
- 持久层：`yss-repository`
- Web 适配：`yss-web-controller`
- Web DTO / Result 契约：`yss-dto` + `yss-web-controller`

## 阶段 7 合同

- 只消费批准后的 `Slice Implementation Contract` 和当前 `work_unit`。
- AppService 骨架可 `controlled-generation`；用例编排、事务、幂等、权限和失败行为必须 `behavior-tdd`。
- 按 `yss-router/references/yss-skill-execution-result.md` 返回统一 `YSS Skill Execution Result`。
- 发现新 API、权限、状态机或跨上下文影响时填入 `new_impacts` 并暂停。

## 按需读取

- 分层开发规范：`references/application-layer-guide.md`
