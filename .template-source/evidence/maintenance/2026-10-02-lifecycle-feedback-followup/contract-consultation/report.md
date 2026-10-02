# 主控合同与查询衔接分析

固定候选：`0af1552c48b9a40a62a6583adc49dbbe1b3e58fe77372b3f0df2696d75c75cf1`，根目录 `/private/var/folders/8d/60y8vj2j0nn37t4h26zbvvhw0000gn/T/yss-lifecycle-followup-review-5z0ytly8/root`。身份 template-source。本任务只读，不改阶段、批准、Ticket、路由或源文件。

## P2：主控报告规则已存在，常见工作单元查询尚未闭合其读取与阶段来源

**确定事实：**新合同要求从注册的工作单元归属与有效路由取得下一阶段（`.agents/skills/yss-product-lifecycle/references/orchestration-contract.yaml:25-32`；`references/orchestration.md:30`）。但 registry 的 work_units 没有 stage 关系（`.template-spec/process/lifecycle-registry.yaml:347-503`），schema 还禁止额外属性且没有 stage 字段（`schemas/lifecycle-registry.schema.json:225-260`）。查询默认通过特殊 planUnit 列表选择 Plan，其他单元不推导阶段（`scripts/lib/lifecycle-context-query.mjs:239-245`），门禁和资产按 stageId 过滤（`:260-262`）。

**实际复现：**

- `node scripts/query-lifecycle-context --work-unit work-unit.spec-synthesis` 退出 0；stage.plan，仅 Plan 门禁；原始返回 `query-0.stdout.json`。
- 增加 `--stage stage.spec-architecture --include user_progress_report` 后为 Spec / 功能架构，且返回 Spec 基线门禁及报告合同；原始返回 `query-1.stdout.json`。
- `node scripts/query-lifecycle-context --work-unit work-unit.technical-analysis` 退出 0；stage:null、gates/artifacts 为空；原始返回 `query-2.stdout.json`。

Spec-synthesis 的 Plan 返回是既有 `loadPlan` 前置语义，不能直接称为错误或越权；问题是返回数据未清晰区分执行归属与前置阶段。没有显式 stage 或 stage_tracking 关联时，主控无法据此稳定回答下一阶段，空门禁列表也不代表没有门禁。

同时，入口及调用前示例只给工作单元预检（SKILL.md:27、orchestration.md:12）；常见查询默认不带 `user_progress_report`/`document_writing`，虽可显式 include 获取，但没有说明必需报告子树的合并读取示例。`scripts/verify-lifecycle-context-query-scenarios:60-77` 只验证显式 include，:66 明确断言默认不带政策。此事实说明获取路径缺口，不证明模型已经漏报。

**可执行改进：**在现有 registry/schema 建立并校验工作单元主阶段或明确的多阶段策略；查询区分执行归属、前置阶段与当前 checkpoint 阶段，保留 Plan 前置。补一条同时读取当前阶段、单元、输出规则与适用合同的实际命令；若采用缺省 include，只增加生命周期 profile 的轻量报告政策并验证专职 profile 兼容。不要按阶段序号猜归属，不新增状态文件或批准门禁。测试覆盖缺省/显式/冲突组合、当前及下一候选的名称与产出、生成投影实际命令。

## 覆盖不足：主控自然语言输出尚未实测

新验证在 query 场景脚本 :60-77 是合同字段断言；9 个场景在 `.template-source/tooling/node/test/lifecycle-status-feedback.test.mjs:39-170` 调用库、renderer 和 CLI。没有真实主控自然语言输出质量样本，不能由其声称模型稳定覆盖所有阻塞或减少无效询问。

建议在现有维护证据/评估中补少量真实输出与事实核对：同阶段剩余工作、多个阻塞、过期证据、等待用户且独立工作继续、模板维护、后端终点。逐项核对遗漏、虚构责任方、误称批准及恢复可执行性；不新加产品门禁，也不只查关键词或模型自评。

## 体验建议，交由主控与状态专项合并

- 当前执行与下一待推进应分开：合同 :22 要求 current-stage-and-work-unit；status.mjs:201,214 的 work_unit 来自 next_work_unit，renderer :74 只显示下一项。可从已有 running 工作项/task/stage_trace 取证，不创建新状态。
- 终点提示应指出已有 scope 与待核验项：合同 :1324-1359 定义后端 terminal_record 和只后端交付；status.mjs:76 对空 next_work_unit 仅一般性要求核验终点。读取既有来源可给具体复验和下游前端待办，但完成资格仍用原验证器。
- 普通咨询的提示强度需澄清：SKILL.md:86 / emit_on 要每轮全套报告；document-writing.md:76 与 request_triage.presentation:154-158 又要求普通问题直接回答。可明确无当前持久任务的概念咨询直接答，实际推进/恢复/暂停仍给完整控制结果。

## 范围与证据

仅三个直接相关只读查询，均退出 0，约 99-110ms；没有启用技能预检或跑 fast，没有正式独立审查及实现/完成/发布判断。完整命令、耗时、退出码与摘录在 `observations.json`；完整原始 stdout 为三个 query JSON，stderr 为空。更详细来源说明在 `notes.md`。
