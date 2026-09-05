# 生命周期关键决策真实回复规则：实施与验证记录

- 仓库身份：`template-source`；模式：模板维护。
- 维护强度：L3，触发 `lifecycle-gate`、`permission-boundary`、`core-validator`。
- 目标：`implementation-ready`。代码和定向验证已落实；本轮完整模板核验仍受现有上游工作树漂移阻断，**不晋级、不宣布全仓通过或可发布**。
- 会签策略、来源封装、回复语义与恢复规范：[统一协议](../../../../.agents/skills/yss-product-lifecycle/references/user-decisions.md)。

## 已落实的变化

1. 角色注册表声明关键决定的真实用户要求；保留数字人专业审查。原型确认改为生物人裁决，补齐默认生物人门禁在解析与验证中的执行。
2. 新增用户决定 schema、待填写模板、来源验证模块和 CLI。保存请求展示、原始作者/消息/时间、事项、版本/摘要、范围与负责人指定证据；来源须关联当前请求。
3. 无回复、歧义、相反原文、错误负责人、不同请求、资产漂移、撤回均阻断依赖工作。支持明确批量/部分批准、同事项分批批准，以及等价历史展示的有效确认复用。
4. 接入严格会签、checkpoint 恢复、Workflow 流转、Slice 就绪、Worker 派发、原型确认及 DDD/MVC 脚手架生成。实施清单绑定切片、当前合同、仓库、写路径和工程基线。
5. 会签 CLI 默认严格验证；显式 `--history` 仅校验历史结构。补充实例初始化的校验命令分发、技能投影、锁文件和文档。

## Fresh Verification

| 实际命令 | 退出码 | 结果 |
|---|---:|---|
| `scripts/verify-user-decision-scenarios` | 0 | 30 组场景通过；[完整记录](user-decision-scenarios.log) |
| `scripts/verify-template-fast` | 1 | 因核心规则变化自动升级为 release 全量检查；[完整记录](template-fast.log) |
| `scripts/sync-skills --check` | 0 | 投影一致 |
| `scripts/update-skill-lock --check` | 0 | 锁文件一致 |
| `git diff --check` | 0 | 无空白错误 |
| `node .agents/skills/yss-stage-decision/tests/run-scenarios.mjs` | 0 | 业务边界与规则设计 v2 场景通过 |

最后一次完整核验中，生命周期、角色与任务包、原型、脚手架及其他命中的检查通过；唯一失败为 `scripts/verify-skill-governance` 的“战略设计上游 hash 漂移: yss-stage-decision”。`submodules/yss-harness-design-agent` 内已有未提交的战略交接修改，其工作树内容与已锁定上游 hash 不同。本轮没有覆盖它们、伪造上游 hash 或更新外部仓库发布版本。

途中另一轮全仓核验曾遇到并行战略交接场景的版本递增失败；最后一次核验该场景已通过。最终结论只采用本文件链接的最后一次记录。

## 维护者自检与边界

- `behavior-tdd` 不适用于产品业务行为：本轮为流程和确定性校验器维护，使用可执行正反场景验证规则；没有生成产品 Spec、原型或 Ticket。
- 按 L3 日常维护采用维护者自检；没有伪造独立 Reviewer、冻结候选或发布会签。
- 保留现有战略交接修改及其在本轮期间的并行更新。共享技能投影/锁文件反映当前 canonical 内容，不代表这些外部修改由本任务批准。
- 来源封装和文件摘要只证明已捕获内容及引用一致，不构成身份密码学认证；可信原始消息须由运行时或用户提供。无法读取或建立关联时保持等待。
- 自检补上了不同请求回复挪用、同一事项分批批准覆盖旧批准、以及默认会签命令仅检查结构的遗漏，并纳入反例。
- Ticket 正式化、垂直切片和 `context_reconciliation`：`not-applicable`，原因为模板源维护，仅校验可复用合同。
- Git checkpoint：未提交、未推送；未发布外部仓库。下一步是在战略设计上游工作树与来源锁定恢复一致后，重新执行完整模板核验，再裁定 `implementation-ready`。
