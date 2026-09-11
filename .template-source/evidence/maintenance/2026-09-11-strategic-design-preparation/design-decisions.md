# 战略设计实施准备：澄清记录

## 第一轮已确认

来源：当前任务会话。助手展示 Q1—Q4 后，提问者原文回复“按推荐继续”。本记录仅整理设计选择，不替代正式 user-decision 校验记录或生命周期批准。

1. checkpoint 是唯一机器状态事实源；map.md 引用和展示状态，业务 Ticket 单独承载业务任务。
2. 当前资产、依据和范围一致时复用真实用户回复；专业边界分别核验；最终交接没有新增范围、授权或未接受风险时复用既有确认，变化时补充确认。
3. 新合同显式升版；新资产使用新版本，旧资产按受影响范围显式迁移并重新确认；先升级消费端，再启用新输出。
4. 关键决定和假设逐项绑定证据；新建战略资产的已确认业务规则在确认时建立稳定 ID 及场景关联。背景正文不强制全部结构化，未知指标不得编造。

## 兼容事实补充

- 战略 checkpoint schema v1 的 required 不包含 parent_ticket；ticket_sync 是开放对象。取消父 Ticket 的文档要求本身不需要升级 checkpoint schema。定位：submodules/yss-harness-design-agent/docs/process/schemas/lifecycle-checkpoint.schema.json:7,65。
- 领域战略与阶段决策当前 schema 均为 v2。阶段决策的 success_criteria、confirmed_decisions、assumptions、constraints 是字符串数组。定位：战略子仓 .agents/skills/yss-stage-decision/references/stage-decision-package.schema.json:8,16-20。
- 领域战略 schema v2 基础 required 不包含 traceability_version 和 rule_catalog；正式导出另要求逐条追溯。定位：战略子仓 .agents/skills/yss-stage-decision/references/domain-strategy.schema.json:6-10 及 domain-strategy-contract.md:30-32。
- 包内离线验证副本也固定到 v2；升级不能只改 Skill 侧 schema。定位：docs/process/schemas/strategic-handoff-domain-strategy.schema.json、strategic-handoff-stage-decision-package.schema.json。

上述为只读文件核查；未执行迁移或下游兼容测试。

## 第二轮已确认

来源：当前任务会话。助手展示 Q5、Q6 后，提问者再次原文回复“按推荐继续”。本轮回复对应第二轮问题，不扩展为 Git 或发布授权。

5. 保持 checkpoint schema v1，沿用 ticket_sync.status/refs 指向 map.md 和业务 Ticket；新记录不写 parent_ticket，旧字段仅作历史兼容。新旧引用冲突时阻断恢复；本轮补战略 profile 语义检查，不新增严格索引 schema。
6. 领域战略、阶段决策均升级至 schema v3。旧 v2 已批准且证据当前的包，允许在原批准范围内验证消费；修改内容、扩大使用范围或重新交付时显式迁移并重新确认。Handoff v3、快照包 v1、traceability v1 不机械升版，但必须补齐新合同的读取及离线验证能力。

## 澄清出口

当前设计决策 frontier 已收敛；第 5 项反馈案例结果、真实历史实例迁移比例及下游工具兼容性仍是待验证事实，不是未回答的用户选择。

回交 yss-product-lifecycle 的实施准备见 [implementation-preparation.md](implementation-preparation.md)。以上确认不意味着合同已落地、测试已通过或资产已获生命周期批准。

## 边界

第 5 项仍由案例结果决定实施范围。未改变实现技能、合同、代码、根 CONTEXT.md 或批准状态。尚未授权 Git 提交、推送、快照重建或发布。

context_reconciliation: not-applicable（template-source 模板准备，无实例业务词汇或产品阶段流转）；模板词汇校验见相邻 validation-record.md。
