# OpenAI 官方研发规格与执行机制研究（2026-09-28）

## Research Scope

`technical-evidence / evidence-audited`。读者为 YSS 模板维护者；问题是哪些官方机制值得兼容引入，而非选择模型或替换生命周期。已先检查本仓身份、CONTEXT、入口规则与既有 OpenAI 研究线索，再核对公开第一方正文。历史案例、官方运行时指南、模型行为规范分别处理。原始搜索、日期、定位与逐项审计见 [证据台账](openai-evidence.yaml)。

仅写本次研究目录。没有调用额外模型、执行交付实验、安装工具或修改批准资产。动态网页访问日为 2026-09-28；官方文章日期单列，未知发布日期不以访问日冒充。

## Executive Read

**可以选择性引入执行与验证机制，现有证据不支持整套移植所谓“OpenAI 研发规格标准”。** 最适合 YSS 的候选是：可恢复的任务执行视图、按条件加载资料、里程碑验证、以真实轨迹评测流程。优先映射既有 Slice Implementation Contract、checkpoint、工作单元结果及维护评测，不增加一套手工维护的 Plan 权威。

ExecPlan Cookbook 已标记归档；2026 年 2 月长任务案例明确是实验；2026 年 9 月指导强调按任务裁剪上下文。这三者共同支持“借鉴机制、限制适用范围、实际验证收益”的路线。Model Spec 与 GitHub Spec Kit 的归属和对象不同，均不能算作 OpenAI 官方产品研发模板。

## Findings

| 声明 | 直接事实与来源 | 对 YSS 的推断或建议 |
|---|---|---|
| `claim-openai-agents` | [AGENTS.md 指南](https://learn.chatgpt.com/docs/agent-configuration/agents-md)规定分层发现、目录覆盖和内容预算。 | 继续作为入口和索引；不能以“加载了指令”替代门禁、状态或资产完整性验证。 |
| `claim-openai-execplan` | [ExecPlan Cookbook](https://developers.openai.com/cookbook/articles/codex_exec_plans)提供可定制执行范本，覆盖进度、决定、可观察验收和恢复；现已归档。 | 将恢复点、已完成/未完成、可重跑命令及证据放入现有执行结果或派生视图。YSS 战略 Plan 不改名为 ExecPlan。 |
| `claim-openai-harness` | [Harness engineering](https://openai.com/index/harness-engineering/)描述短索引、仓库知识、机械检查和文档维护。 | 入口精简与校验脚本可继续强化；不能照搬该团队的低阻塞合并策略。 |
| `claim-openai-long-running` | [长任务案例](https://developers.openai.com/blog/run-long-horizon-tasks-with-codex)用 Prompt.md、Plan.md、Implement.md、Documentation.md 分别承载目标、里程碑、执行约束、进度与决定，并在里程碑验证失败后修复。 | 按现有资产职责映射这四类信息；避免复制四份新文件后产生相互矛盾的状态。 |
| `claim-openai-current-guidance` | [2026-09-11 指导](https://developers.openai.com/blog/rethinking-skills-and-prompts-for-gpt-6-astra)建议精确触发、薄入口、按需资料与减少过度步骤，同时提醒跨模型消费。 | 以影响面触发资料加载；保留领域规则、权限和批准，不能把针对模型的提示建议解释为取消强制门禁。 |
| `claim-openai-evals` | [技能评估指南](https://developers.openai.com/blog/eval-skills)将实际轨迹、产物、成功条件及负对照组合评测。 | 用未授权提交、错误触发、遗漏验收、恢复后重复副作用等场景验证引入效果；结构通过仍不足。 |
| `claim-openai-model-spec` | [Model Spec 说明](https://openai.com/index/our-approach-to-the-model-spec/)定义模型期望行为，明确不覆盖整个产品，且实际模型可能落后于规范。 | 可借鉴规则与场景评估的对应思路，不能用作产品 Spec、工程契约或发布保证。 |
| `claim-openai-spec-kit-attribution` | [Spec Kit 仓库](https://github.com/github/spec-kit)位于 github 组织，其 README 允许更换 Agent 集成。 | 它是另一个可研究的工具，不能因支持 Codex 就归属于 OpenAI。 |

### 可审阅的引入候选

下表是研究建议，尚未形成或批准实施合同；字段名称用于解释信息含义，不另建 schema。

| 候选 | 在现有 YSS 中的落点 | 验收条件 | 主要成本或不引入项 |
|---|---|---|---|
| 可恢复执行视图 | 从批准的 Slice 合同、工作单元结果、checkpoint 派生当前任务上下文 | 新 Agent 仅持当前仓库和引用包，能识别当前合同版本、剩余行为、失败证据及下一条允许动作；摘要漂移时阻止续跑 | 不复制或独立批准 Spec/合同；生成成本与上下文大小需测量 |
| 条件资料索引 | 现有 AGENTS、Skill router、implementation compiler | 文案修正不加载无关架构全卷；API 变更能命中必须阅读的合同；负对照不误进脚手架流程 | 保留强制业务不变量与运行时可用性检查 |
| 里程碑验证与恢复 | 既有验证命令映射、Fresh Verification、工作单元结果 | 实际退出码与输出绑定；失败禁止声明完成；中断恢复不重复危险副作用；新影响返回主控 | 不增加固定全仓测试次数，不把案例命令/npm默认照搬到YSS |
| 机制引入评测 | 现有 Agent eval 设施（具体实现由主控核对） | 同任务对比完成正确率、越权数、恢复遗漏、工具调用与token量，包含负样例；保留真实trace及产物 | 本轮未运行A/B，不承诺效率百分比 |

### 兼容关系

依据本仓 `AGENTS.md` 第 2、7、10 节和 `CONTEXT.md` 的权威定义，目标与行为继续由 Spec 持有，实现范围继续由批准的 Slice 合同持有，批准和阶段状态继续由生命周期拥有。执行视图只承接当次工作与证据；其内容变化不能使上游审批悄然失效或绕过重编译。此映射是本研究的兼容性推断，最终字段复用和验证强度由主控结合当前源码裁决。

## Counter-Signals

1. ExecPlan 已归档；其原范本要求内嵌充分上下文并允许自主解歧、频繁提交。照搬会与 YSS 单一事实来源、用户决定和 Git 授权边界冲突。建议只提取可恢复性及可观察验收机制。
2. Harness 文章中的少阻塞合并、自动推进建立在特定成本结构和工具投入上；作者明确提醒不可简单泛化。YSS 的强制批准和发布裁决不因该案例失效。
3. 25 小时长任务的完成不等于生产就绪，原文也这样限定；不能从运行时长、代码行数推出质量或经济收益。
4. 最新提示精简指导本身指出多模型差异。应删除无条件重复步骤，不能删除不变量后仅依赖模型自觉。
5. 评测指南说明确定性基础检查不能覆盖所有质量判断。真实 trace、行为测试与独立审查各有职责，不能互相冒充。

## Source Map

| 资料 | 类型与日期 | 本轮用途 |
|---|---|---|
| AGENTS.md 指南 | 官方运行时文档，未显示独立发布日期 | 加载语义和预算边界 |
| ExecPlan Cookbook | 官方范本，2025-10-07；访问时已归档 | 执行计划结构与迁移风险 |
| Harness engineering | 官方团队实践，2026-02-11 | 知识、工具反馈及泛化限制 |
| 长任务文章 | 官方作者实验，2026-02-23 | 任务信息分工、验证和恢复 |
| Skills 精简指导 | 官方建议，2026-09-11 | 当前上下文与步骤裁剪 |
| Skills evals | 官方评测示例，2026-01-22 | 可执行成功条件、负对照和证据 |
| Model Spec 说明 | 官方范围说明，2026-03-25 | 排除模型行为规范与产品规格混淆 |
| github/spec-kit | GitHub 官方仓库，动态 main | 只核对归属，不进入 OpenAI 模板候选 |
| 本仓 AGENTS/CONTEXT | 当前工作树，已记录 SHA-256 | 接收边界及术语 |

既有 2026-09-20 Skills 审计只作为线索，未把历史结论当当前事实。CodeGraph 已先用，命中泛化符号，随后以定向文本检索定位文档。两处 `.md` 网页读取返回 Internal Error；HTML 正文读取成功，不影响已采信声明。没有用搜索摘要或社区转述单独支持结论。

## Decision Handoff

回交主控 `yss-research`，供整体生命周期对照与维护提案使用。若后续采纳，先由模板维护路径明确字段复用、最小试点、权限与验收，再调用 `maintaining-skills` 处理受影响技能和投影；本轮没有该实施授权，也没有修改这些资产。`context_reconciliation=not-applicable`：本轮是模板维护研究，没有业务术语变更。

优先评估“当前合同派生执行视图＋恢复负样例”试点，因为它可以检验上下文节省是否伴随遗漏与越权。是否新增字段、是否改变默认流程均留给后续有界维护决定，不能由本报告代批。

## Evidence Limitations

公开资料不能穷尽 OpenAI 内部研发规范；本报告只确认已读来源包含哪些机制。官网实践是第一方描述而非独立对照实验。网页可能更新，定位以章节为主、访问时行号为辅。没有执行本仓真实任务A/B、额外模型调用或长期恢复实验，因此不声称提升已实现。所有八项事实声明均已做来源自审；结构校验和主控复核记录分别保留，均不代表流程采纳或发布批准。
