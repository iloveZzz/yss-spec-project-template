# Plan 审查收敛合成场景

本目录只保存合成测试构造器。项目资产、审查、用户回复和事务记录均写入系统临时目录，运行结束后清理，不能作为真实项目的批准或会签证据。

`build-fixture.mjs` 从当前权威策略构造一个 `project-instance`：业务边界与决策包使用同一独立审查任务，范围来源单独固定。验收入口为 `node tests/scenarios/verify-plan-review-control-scenarios.mjs`，覆盖普通 Plan、真实缺陷返工、异常核验及旧实例接入反例。入口向 stdout / stderr 输出实际测试结果，由验证主控保存到仓库外日志。

机器检查、澄清、日志、CLI metadata 和专业审查分开计数；所有缺陷处置在当前 checkpoint 中验证。fixture 不新增真实 Ticket，也不产生产品 Plan、Spec 或发布授权。
