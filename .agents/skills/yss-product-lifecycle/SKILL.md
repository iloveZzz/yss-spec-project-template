---
name: yss-product-lifecycle
description: 路由 Spec 需求澄清、事实研究、业务词汇、非技术规格与适用产品设计，并在所选 Issue tracker 发布结果。
---

# Spec 工作路由

先读工程入口与最小身份。模板源 `repository_mode: template-source` 只维护模板、技能和分发，使用 maintaining-skills；不创建产品规格、原型或批准。共享 Backend 使用其 harness-orchestrator，不套用 Spec 方法。

新受管 Spec 必须由可信执行器核验 `.yss.json` 的 `distribution.specWorkflow=matt-spec-v1`、来源与受管 `.template-spec/process/spec-workflow.json`。旧实例或未知声明不自动迁移、sync 或降级伪装为新流程；仅返回诊断，旧实例由人工迁移。未接管普通工程可先做已授权的分析与草稿，但不声称初始化已完成。

用户指定工程开展 Spec 工作时，复用 setup-yss-harness 检查并在已有授权内补齐必要初始化、tracker 与当前技能。项目技能尚未存在时由宿主已可发现的外部 setup 引导；缺能力明确报告。只读请求不下载、初始化或写入。文件、投影与宿主发现分别核验，user-only 入口不隐式调用。

按当前缺口使用可调用技能：事实用 yss-research，业务决定用 grilling，术语歧义用 domain-modeling。已有材料足够直接读 [共享规格方法](references/spec-workflow.md)，不要自动调用 to-spec。用户显式 to-spec 也复用该方法。

产品设计由 AI 按未解决问题选择文字、流程、状态、低保真或可操作原型；确有需要才调用 yss-prototype-stage、yss-design-system 或 prototype-review。不要求全套产物，不将原型当生产实现。文档表达按当前范围使用 i-have-adhd。

[tracker 操作](references/spec-tracker.md)持有平台配置、定位、发布和恢复约定；[用户决定](references/user-decisions.md)持有真实审批边界。复用有效决定，不为内部步骤增加批准。发布成功不等于业务批准或可实施，状态标签不授予资格。

Spec 只负责业务目标、规则、边界、异常、非目标、验收及必要设计。技术/API、工程准备、实现切片与代码交给下游；下游通过当前规格及材料引用消费，不固定 Backend，不生成独立 Handoff 或 Git PR。

自检失败返回受影响澄清/综合，关键未决项不报完成，非关键延期项明确范围与条件。返回规格引用、实际工作与检查、适用决定、未决项及下一动作。中断时读取实际结果后恢复，不重复未知外部副作用。

保护用户工作，提交、推送、合并、部署和发行均消费对应动作授权。只验证本次影响及必要反例，未执行如实报告。
