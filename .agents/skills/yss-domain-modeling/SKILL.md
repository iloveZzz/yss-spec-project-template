---
name: yss-domain-modeling
description: 用于 YSS 项目在实现前进行 DDD 领域建模。当用户提供 Spec、RDD Spec、OpenAPI、页面流程、业务规则、DDL、元数据或现有代码，希望先识别统一语言、上下文边界、聚合、实体、值对象、领域行为、状态流转、Domain Gateway、领域事件、ADR 和实现 handoff 时调用。
---

# yss-domain-modeling

这是一个建模前置 skill。目标是在写代码前建立领域语义、边界和规则，并输出可交给 `yss-domain` 等实现型 skill 使用的建模 brief。

## 何时使用

- 用户要求先做 DDD、领域建模、聚合分析、上下文边界或统一语言。
- 用户提供 Spec、RDD Spec、OpenAPI、页面流程、业务规则、DDL、元数据或现有代码，希望先沉淀领域模型。
- 用户要求从业务规则推导实体、值对象、领域行为、状态流转、Domain Gateway 或领域事件。
- 用户要判断某个设计是否应该写 ADR、更新 `CONTEXT.md`，或如何交给后续实现。

## 不适用

- 直接生成 Java Domain 层代码时，使用 `yss-domain`。
- 从零生成完整多模块后端工程时，使用 `yss-ddd-scaffold-generator`。
- 只生成 Repository/MyBatis/PO/Mapper 时，使用 `yss-repository`、`yss-db2mybatis` 或 `yss-mybatis`。
- 只生成 Controller/DTO/VO/Web Convertor 时，使用 `yss-web-controller` 和 `yss-dto`。

## 工作流

1. 先读取输入资料：Spec、RDD Spec、OpenAPI、页面流程、DDL、`CONTEXT.md`、ADR 和现有代码。
2. 抽取业务术语，识别同义词、歧义词、禁用词和待确认含义。
3. 划分上下文边界，明确每个上下文负责什么、不负责什么、依赖什么。
4. 识别聚合、聚合根、实体、值对象、领域服务和领域事件。
5. 明确不变量、领域行为、状态流转、失败路径和边界条件。
6. 识别 Domain Gateway：只描述领域需要的能力，不泄漏 Repository、Mapper、SQL 或 Controller 细节。
7. 判断是否需要更新 `CONTEXT.md`、补充 ADR 或进入人工确认。
8. 输出实现 handoff，并说明后续应调用 `yss-domain`、`yss-repository`、`yss-web-controller` 等 skill。

## 按需读取

- 建模流程：`references/modeling-workflow.md`
- 输出模板：`references/modeling-output-template.md`
- YSS DDD 规则：`references/yss-ddd-rules.md`
- 实现交接：`references/handoff-to-implementation.md`

## 后续协同

- 需要落 Domain 层代码：把实现 Handoff 交给 `yss-domain`。
- 需要持久层：在领域模型稳定后接 `yss-repository`、`yss-db2mybatis` 或 `yss-mybatis`。
- 需要 Web 层：在 API/DTO/VO 边界稳定后接 `yss-web-controller` 和 `yss-dto`。
- 需要完整工程骨架：先由 `yss-ddd-scaffold-generator` 生成骨架，再回到本 skill 做业务化建模。

## 阶段 7 交接结果

- 消费 `Slice Implementation Contract` 中的 Spec、架构、验收行为和工作单元引用。
- 输出必须绑定合同版本，列出领域边界、不变量、状态流转、失败路径、测试 seam、待人审项和 `new_impacts`。
- 按 `yss-router/references/yss-skill-execution-result.md` 返回统一 `YSS Skill Execution Result`，建模文档和测试 seam 作为 evidence files。
- 发现合同未覆盖的状态机、权限、数据模型或跨上下文影响时返回 `drift`，不得直接进入代码实现。
