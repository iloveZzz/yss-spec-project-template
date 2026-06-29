---
name: yss-domain
description: 用于构建或重构 YSS 领域层代码。当用户要求设计聚合、Entity、Domain Gateway、领域规则、状态流转或先做领域建模再补持久层时调用。
---

# yss-domain

这是一个建模型 skill。核心目标是先把领域语义和边界建立清楚，再落代码。

## 何时使用

- 用户要求先做 Domain、先抽象实体或聚合。
- 用户要补 `Entity`、`Gateway`、领域规则或状态机。
- 用户给出页面流程、业务规则、DDL，希望先沉淀领域模型。

## 不适用

- 只生成持久层时，优先 `yss-repository` 或 `yss-db2mybatis`。
- 只生成 Controller 时，优先 `yss-web-controller`。
- 只初始化项目骨架时，优先 `yss-ddd-scaffold-generator`。

## 工作方式

1. 先抽业务术语、聚合边界和状态变化。
2. 数据库字段只做补充，不直接决定领域对象结构。
3. 先定义领域行为，再决定 Gateway 边界。
4. 规则不清晰时，保留显式假设，不要静默猜测。

## 产物范围

- `domain/{segment}/model/*Entity.java`
- `domain/{segment}/gateway/*Gateway.java`
- 任务明确要求时，可顺带补 `client/dto/cmd`、`client/dto/query`、`client/vo`

## 建模约束

- Domain 层不依赖 Repository、Mapper、Controller。
- 领域行为放在模型方法，不要放在 Web 层。
- Gateway 只暴露领域能力，不暴露持久化细节。
- 对关键状态流转给出明确方法，如 `publish()`、`cancel()`、`terminate()`。

## 质量要求

- 命名体现业务语义，不照抄表名缩写。
- 生成代码应可编译，且没有跨层依赖泄漏。
- 对不确定规则写出假设或 TODO，不要伪装成已确认事实。

## 协同顺序

- 需要持久层时，再接 `yss-repository` 或 `yss-db2mybatis`
- 需要 Web 层时，再接 `yss-web-controller`
- 需要完整工程时，先 `yss-ddd-scaffold-generator`
