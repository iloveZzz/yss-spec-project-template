# 生命周期主控输出与查询衔接分析

对象：固定重建树 `/private/var/folders/8d/60y8vj2j0nn37t4h26zbvvhw0000gn/T/yss-lifecycle-followup-review-5z0ytly8/root`；候选摘要 `0af1552c48b9a40a62a6583adc49dbbe1b3e58fe77372b3f0df2696d75c75cf1`。仓库身份为 template-source；本任务仅只读取证，没有推进生命周期、审批、Ticket 或写源文件。

## 已确认的查询衔接缺口

### C1. 工作单元的主阶段归属没有可查询权威关系，查询中的前置阶段易被当成执行阶段

- 触发：按照推荐的工作单元查询形式，仅传入 `--work-unit`，用其返回数据编写“当前/下一阶段”提示。
- 实际复现：`node scripts/query-lifecycle-context --work-unit work-unit.spec-synthesis` 退出 0；query.stage 与 lifecycle.stage 均为 stage.plan，仅有 gate.plan-approved，未返回 gate.spec-baseline-approved。显式增加 `--stage stage.spec-architecture` 后返回 Spec / 功能架构及 Spec 基线门禁；仍保留 Plan 前置。`--work-unit work-unit.technical-analysis` 退出 0 但 stage 为 null、gates/artifacts 为空。
- 来源：`scripts/lib/lifecycle-context-query.mjs:239-243` 将 spec-synthesis 包含在 planUnit 后缺省 stage.plan；`:260-262` 以 stageId 筛选；`.template-spec/process/lifecycle-registry.yaml:347-503` 所有工作单元没有 stage；`.template-spec/process/schemas/lifecycle-registry.schema.json:225-260` 不允许额外属性且无 stage 字段。新输出合同 `.agents/skills/yss-product-lifecycle/references/orchestration-contract.yaml:25-32` 和 orchestration.md:30 要从注册归属与有效路由取得目标阶段。
- 影响：不显式传阶段时，后续提示不能可靠区分“当前阶段、目标单元所属阶段、前置 Plan 检查”；下一阶段可能长期停留在待核验。不能把空门禁数组理解为没有门禁。
- 定级限定：Plan 加载是既有的 Plan→Spec 前置要求，并非证据表明脚本越权推进；此处指出查询语义与主阶段归属缺口，不主张删除 Plan 检查，也不把 readonly 没有完整就绪验证当作缺陷。
- 改进：先在现有生命周期注册表与 schema 内建立工作单元归属（允许有明确多阶段策略，而非目录/序号猜测），再统一查询和状态阅读的阶段来源；显式分开执行阶段与前置阶段。未提供必要阶段时可以返回清晰的缺口和补查询方式；保留兼容结果、不赋予执行资格。适用时验证调用者传入 stage/work-unit 组合，避免矛盾组合默默通过。
- 验证：覆盖所有 project-instance 单元的缺省查询、显式组合及冲突组合，Plan 前置仍返回；profile/生成投影遵循各自权威关系。

### C2. 新提示合同可以查询，但常见命令默认不会返回，入口缺少明确的合并查询示例

- 触发：读取压缩入口后执行 SKILL.md:27 / orchestration.md:12 的 `--work-unit ... --check-skills`，复用一次查询结果进行状态返回。
- 实测：上述不带 `--include user_progress_report` 的查询 execution.selected 均没有 user_progress_report 或 document_writing；显式 include 后可以取得。`scripts/verify-lifecycle-context-query-scenarios:60-77` 验证显式 include，并在 :66 明确断言默认查询没有此合同。
- 影响：只执行推荐命令的 Agent 能取得技能预检及路由，但详细输出前检查清单未被加载；入口 SKILL.md:86-88 虽有简要规则，但复杂阻塞、终点、未检查范围容易回到概括性提示。
- 定级限定：这是获取路径的可用性缺口，不能据此断言模型已经违反提示合同；现有 `--include` 接口本身可正常工作。
- 改进：补充一次合并读取的最短可执行示例，明确每轮返回前应取得 user_progress_report（以及当前使用的 document_writing、execution_efficiency、execution_scopes 子树）；也可在生命周期 profile 缺省包含轻量输出合同，并保留专职 profile 的既有输出兼容。不要要求加载全部合同。
- 验证：针对文档中实际命令执行并断言必需输出规则可读取，生成投影及 CLI 快照中同样成立。

## 覆盖不足

### T1. 9 个新增场景证明脚本和静态合同，不证明主控 Agent 实际输出遵守规则

- 来源：`scripts/verify-lifecycle-context-query-scenarios:60-77` 是字段/字节预算断言；`.template-source/tooling/node/test/lifecycle-status-feedback.test.mjs:39-170` 调用状态库、renderer 与 CLI。没有消费真实主控自然语言返回的检查。
- 影响：不能由这些结果声称“Agent 已稳定输出所有阻塞、没有虚构责任人、没有多问确认”等模型效果；当前仓库也没有作这类效果数字声明。
- 改进：在现有评估/维护证据体系增加少量真实主控输出样本及人工事实核对，不新增产品门禁。至少包括同阶段剩余工作、缺阶段归属、多项阻塞、过期证据、等待用户且独立工作继续、template-source 维护及后端职责终点。比对事实覆盖、误称批准、责任方来源、恢复可执行性、中文说明与结构化结果一致；展示失败反例，避免只查关键词或模型自评分。

## 体验建议（需与状态分析结果合并）

### U1. 分别说明正在执行与下一待推进单元

- 来源：新输出合同 :22 要求 current-stage-and-work-unit；`scripts/lib/lifecycle-status.mjs:201,214` 的 work_unit 都来自 checkpoint.next_work_unit，renderer :74 只展示“下一项工作”。现有 checkpoint 可以用 stage_tracking.running 项、task identity 或 stage_trace.completed_work_unit 表达已有事实，不需新增状态文件。
- 改进：只在有可读取依据时展示“当前执行 / 本轮完成 / 下一待推进”，无法唯一识别时写待核验，不把 next_work_unit 当作当前执行事实，也不自行建立新 owner。

### U2. 后端职责终点应有明确提示入口，避免 next_work_unit 空只出现一般缺口

- 来源：输出合同 :30 与 orchestration.md:30 要说明经过验证的任务/执行范围终点；execution_scopes.plan-to-backend 在合同 :1324-1359 定义 terminal_work_unit、terminal_record、只后端交付和下游前端待办。status :76 对空 next_work_unit 仅给“未登记下一工作单元；需核验当前阶段验收与终点，不能据此判定完成”，不消费这些 scope 来源。
- 改进：查询/状态提示可读取既有 scope 和终点记录并说明观察与未检查范围，给当前适用的终点验证入口。正式终点成立仍由原验证器判断；提示后端可交付、下游前端待办及发布授权界限。不能由空路由或终点文件存在直接宣布完成。

### U3. 普通咨询与控制返回的提示强度需明确

- 来源：SKILL.md:86 与 user_progress_report.emit_on/required_information 为每轮 controller-return 列出全套字段；document-writing.md:76 又要求普通问题直接回答，request_triage.presentation :154-158 要求 simple direct-answer-or-action。
- 改进：明确仅概念性咨询、无当前持久任务时可直接回答；正在推进/恢复/阻塞/交接仍给完整但简洁的控制结果。否则“什么是 Spec”也可能生成一长串待核验字段。未知业务阶段不能为了补齐形式虚构。

## 实际验证与证据

仅运行三个 query-lifecycle-context 命令，均退出 0，单次约 99-110ms，未启用技能预检、未运行全套 fast、未执行任何 apply。`observations.json` 记录命令、退出码、执行时间、选中字段和阶段/门禁；`query-0.stdout.json`、`query-1.stdout.json`、`query-2.stdout.json` 保留完整原始返回，stderr 为空。没有独立正式代码审查/完成/发布结论。

建议顺序：先闭合 C1 的权威关系和查询语义，再补 C2 的实际读取示例；随后处理 U1/U2 的状态表达并用 T1 的小样本检查主控实际输出。U3 作为短文档澄清即可，不增加审批。
