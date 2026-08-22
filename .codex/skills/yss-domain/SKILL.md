---
name: yss-domain
description: 用于构建或重构 YSS 领域层代码。当用户要求设计聚合、Entity、Domain Gateway、领域规则、状态流转或先做领域建模再补持久层时调用。
---

# yss-domain

这是一个建模型 skill。核心目标是先把领域语义和边界建立清楚，再落代码。

默认输出是新 DDD target profile；现有 YSS 组件仓库常见 `core/client/repository`、贫血对象和 VO 型 Gateway 只是 legacy profile，不得静默复制成新模块架构。

## 何时使用

- 用户要求先做 Domain、先抽象实体或聚合。
- 用户要补 `Entity`、`Gateway`、领域规则或状态机。
- 用户给出页面流程、业务规则、DDL，希望先沉淀领域模型。

## 不适用

- 只生成持久层时，优先 `yss-repository`。
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
- DTO/VO 属于 client/web 契约，转交 `yss-dto` / `yss-web-controller`；Domain skill 不顺带生成。

## 建模约束

- Domain 层不依赖 Repository、Mapper、Controller。
- 领域行为放在模型方法，不要放在 Web 层。
- Gateway 只暴露领域能力，不暴露持久化细节。
- 对关键状态流转给出明确方法，如 `publish()`、`cancel()`、`terminate()`。
- 明确 Aggregate Root、Entity identity、Value Object、不变量、Domain Event 和一致性边界；没有业务行为时不要伪造富领域模型。
- 发现 legacy profile 时先记录迁移/兼容决策，不把 Repository Entity 当 Domain Entity。

## 质量要求

- 命名体现业务语义，不照抄表名缩写。
- 生成代码应可编译，且没有跨层依赖泄漏。
- 对不确定规则写出假设或 TODO，不要伪装成已确认事实。

## 协同顺序

- 需要用例编排时，再接 `yss-application`
- 需要持久层时，再接 `yss-repository`
- 需要 Web 层时，再接 `yss-web-controller`
- 需要完整工程时，先 `yss-ddd-scaffold-generator`

## 分层开发规范

脚手架生成或进入 Domain 实现前，必须加载 `references/domain-layer-guide.md`：其中定义 DTO/Gateway/Domain Service 包结构、命名、校验与示例，与本 skill 的建模约束一并生效。

## 阶段 7 合同

- 只消费生命周期已批准的 `Slice Implementation Contract` 和当前 `work_unit`；不得扩大 `allowed_write_paths`。
- 领域规则、状态机和不变量必须使用 `behavior-tdd`，先形成失败测试，再实现最小行为。
- 完成后按 `yss-router/references/yss-skill-execution-result.md` 返回统一 `YSS Skill Execution Result`：changed files、领域/测试证据、实际验证结果、偏离和新增影响。
- 发现新 API、权限、状态机、数据模型或架构影响时填入 `new_impacts` 并暂停，不得静默扩张切片。
