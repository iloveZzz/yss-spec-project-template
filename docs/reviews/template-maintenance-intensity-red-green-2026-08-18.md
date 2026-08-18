# 模板维护验证与审查强度分级 RED / GREEN / REFACTOR 记录

## RED：现有基线

变更前规则无法按风险区分以下三个场景：

| 场景 | 实际基线 | 失败原因 |
|---|---|---|
| 修正文档错字，不改变规则语义 | 仍命中模板维护的压力场景、fresh verification 和独立审查 | 固定成本与行为风险不对称 |
| 修改局部 skill 行为或模板结构 | 与错字修正、发布门禁修改使用近似相同的完整 RED / GREEN / REFACTOR | 缺少最小反例和聚焦审查路径 |
| 修改生命周期门禁或发布阻断逻辑 | 使用完整流程 | 强度合理，但没有与低风险变更形成边界 |

基线证据：

- `AGENTS.md` 要求修改 skill、`AGENTS.md`、流程规则或模板时必须保留基线失败、压力场景和修订后验证证据。
- `docs/process/harness-process-tailoring.md` 将全部模板源维护统一列为压力场景、fresh verification 和独立审查。
- `.agents/skills/writing-skills/SKILL.md` 对任何 skill 编辑声明无例外的 failing test 与完整压力场景。

本轮 RED 判定：三个风险不同的输入无法得到分级输出，基线失败。

## GREEN：目标行为

已实现并验证：

- L1 只要求相关验证和 self-check / human-checkpoint。
- L2 要求最小反例、fresh verification 和 focused-independent review。
- L3 要求完整 RED、GREEN、REFACTOR、压力场景、fresh verification 和 formal-independent review。
- 发布候选、硬门禁变化、聚合行为变化不得降级或拆分规避。

GREEN 证据：

- `scripts/verify-maintenance-intensity-scenarios` 的 L1、L2、L3 正向场景全部通过。
- `scripts/verify-maintenance-checkpoint -` 已通过 stdin 验证 L1 checkpoint。
- 生命周期注册表使用新 stable ID 表达分级 verification / review；旧工作单元 ID 已弃用，未复用已发布语义。

## REFACTOR：待关闭的规避路径

- “只是文档”不能覆盖实际行为变化。
- 多个 L1 合并后改变整体语义时必须按聚合候选升级。
- “已有测试曾通过”不能替代本轮 fresh verification。
- 实施中发现新影响时必须更新 `escalation` 并重新分类。

REFACTOR 结果：场景验证已确认缺最小反例、缺独立 review 证据引用、把发布语义或聚合行为变化声明为 L1、L3 缺 fresh verification、发现发布影响后仍维持 L2 均会被拒绝。完整模板门禁和正式独立审查结果在本文件后续 checkpoint 补充。
