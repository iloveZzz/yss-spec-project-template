# 生命周期优化实施记录

日期：2026-09-26—27。状态：模板与工具实施、适用定向核验、48 次真实 Agent 主对照和 4 次 UI 补充评测已完成并归档；试点正式接收和固定提交分发尚未闭合。本记录不是整体完成或可发布声明。

依据[用户已确认的方案](../2026-09-26-lifecycle-improvement-plan/optimization-design-plan.md)执行。起始工作树已有其他修改；[基线清单](baseline.json)冻结实际字节，不能仅用 HEAD 代表本轮来源。本轮增量见 [implementation-delta.json](implementation-delta.json) 与 [implementation.patch](implementation.patch)；比较后文案及派生增量见 [post-comparison-source-delta.json](post-comparison-source-delta.json)，profile / 消费者原文件另保存在 `before-extra/`。

| 工作包 | 当前结果 | 证据 |
|---|---|---|
| M0 | 已固定模板工作树来源、保留既有修改 | baseline.json |
| A1 / A2 | 已统一脚手架 / API 版本和 Reviewer 指引；补齐批准延续提示，并修复当前决定与延续同时提供时的静默接受 | [自检](maintainer-self-check.md)、A-* 日志、decision-final.log |
| B1 | 已优化五类模板；UI / 无 UI 两组受控试填覆盖必要规则、异常、恢复与阻断 | [试填复核](template-trials/review.md) |
| B2 / B3 | 状态输出显示检查范围、结构化诊断和下一步；运行中 / 已完成工作先核验结果，恢复不自动重派 | status-final.log、tracking-final.log、主控恢复协议 |
| C1 | 已保留被测 AGENTS、复制当前目录、支持多步磁盘恢复与逐步输入清单；配套运行时和离线依赖已验证 | [评测器说明](../../../scripts/skills-agent-eval.md)、[12 项自测](fresh-focused-verification.json) |
| C2 | 48 次正式对照与语义复核完成；双方各 22/24 通过，UI 各两次超时；候选总耗时增加 3.8%，未证明提效。600 秒窗口 UI 补测双方各 2/2 通过，原分数不变 | [评测报告](agent-comparison-report.md)、[补测报告](ui-supplement-report.md)、[覆盖边界](evaluation-coverage.md) |
| C3 | auth-backend 已做只读准入检查与 22 项定向回归；发现合同 / 依据过期和迁移冲突，未正式接收 | [试点报告](auth-backend-pilot-readiness.md) |
| D1 | 本地 canonical、投影、锁、profile 与受影响共享校验器已同步；固定提交来源交付未执行 | profile-sync-result.json、batch-verification.json |

## 主要变化

1. 新建脚手架使用 Project Scaffold Contract schema v4；API Decision 新建 v2、历史 v1 只读兼容。Reviewer 人数回到权威策略，不再在多处写固定两人。
2. Plan 入口同时说明当前真实决定与有效授权延续；两种证明冲突会实际阻断，准备器仍不能创建批准。
3. `lifecycle-status` 仍只读，新增 `verification_scope`、`diagnostics`、`next_step` 与 `execution_authorization`。空 blocker 不等于已获实施许可；未核验的摘要和批准明确标出。
4. 模板将上游目标引用与本阶段细化分开，验证记录引用实际运行证据，发布说明保留当前决定、顺序与回滚，复盘动作引用既有权威工作项。
5. 评测器保留来源规则和多步输入 / 结果，对缺 completed turn、超时、断言失败和环境失败分别留证；正式比较双方使用同一运行时、模型、依赖和评测器。

比较期间发现的 OpenAPI 职责段重复版本已改为引用原步骤；原型证据历史描述属于不可变语义快照，保留其字节并注释现行 `public_description` 入口。七项补充定向检查全通过，见 [post-doc-focused-verification.json](post-doc-focused-verification.json)。被测候选保持冻结，后续文字修正没有冒充已重跑 48 次。

## 验证与边界

[定向检查](fresh-focused-verification.json)全部 exit 0，包括评测器 12 项自测、批准冲突、状态与阶段追踪。[前一批适用验证](batch-verification.json)覆盖 registry、流转、Context 路由、Skill 投影 / 锁与 profile。[最终源码模板复验](fast-verification-post-docs.json)因影响面升级为完整检查，耗时 307.74 秒、exit 1；90 项顶层检查中 89 项通过。原文件清单问题已修复，唯一顶层失败是 `verify-strategic-handoff-tools-lock --require-committed` 要求已提交来源，当前 lock 为 working-tree。[完整结果](full-check-post-docs-summary.json)区分顶层检查与负向 fixture 的预期失败；其他检查通过不能据此称可发布。修正前的 332.08 秒检查仍单独保留。

初次真实模型运行先发现终端 CLI 缺 Code Mode host，改用本机配套 Desktop CLI；后续有效 Plan 场景发现隔离后 Python 缺 `jsonschema`，停止整个批次、保留结果并补离线依赖。相同隔离 shell 下的 Plan、延续、扩围、API 和跨仓反例预检通过后，使用新输出目录重启全部正式对照，没有挑选成功重跑覆盖失败。

正式对照与补测的模型执行窗口合计 9,972.33 秒（166.21 分钟），在登记的 3 小时限额内结束；不包含之前校准或整个维护任务用时。包含校准、环境失败和补测的[完整资源台账](all-evaluation-resource-ledger.json)记录 68 次 CLI turn 尝试、63 次 completed，5 次缺少 usage。已报告 input 21,766,013 tokens（其中缓存 18,623,488）、output 254,779；缺失用量保持未知，主控会话用量不在台账内。无可核验单价或账单，不估算金额。[预算记录](budget-observation.json)保留实际起止。

三组证据分别保留并完成归档读回：[校准与环境故障](calibration-archive.json)、[正式对照](formal-archive.json)、[UI 补测](ui-supplement-archive.json)。原始运行目录未删除。补测只证明隔离文档起草在 600 秒预算内达到场景要求；提示词明确引导引用复用，且共享主机有维护活动，不能据此声称模板自主采用率或效率提升。

真实项目当前前端定向测试 18/18、JDK 17 下 BFF 控制器 4/4 通过。历史阶段依据过期、Slice 合同结构缺项和 34 项迁移冲突仍阻断正式试点接收。只读迁移预览前后 6,081 个项目文件摘要不变，工作树仍为开始时的 129 条修改 / 未跟踪记录。未部署，也没有实际浏览器登录与身份提供方联调证据。

本轮未提交、推送或发布。固定 committed-source 验证与最终 CLI 分发按其授权边界继续；完整检查或真实试点未闭合时，不称整体优化已完成或 release-ready。

## 未闭合项与接续入口

1. C2 的运行和复核已完成，但完整 API Draft/Review/Freeze、真实完成结果接收、跨仓修复后接收与 mandatory skipped 等目标尚未由本批覆盖。按[覆盖矩阵](evaluation-coverage.md)另立场景版本；不追加到旧 48 次分母，也不将原型 / 前端实现验证写成已测。
2. C3 已提供[窄路径、逐文件迁移冲突及恢复顺序](auth-backend-pilot-readiness.md)。待明确窄路径、目标消费者和当前合同后，形成可审阅迁移 / Slice 候选；不以选择试点项目代替合同批准。生命周期 [SKILL.md](../../../../.agents/skills/yss-product-lifecycle/SKILL.md) 要求“实现只接收绑定垂直切片、已批准且持久化、版本当前并通过完整 `ready-for-agent` 计算的合同”，实际准入缺口使正式实现停在此边界。
3. D1 的本地同步已完成。Git 提交 / 推送需独立授权；之后从最终提交来源生成分发锁与快照，执行固定版本集成和完整验证，才判断是否可发布。本轮没有通过伪造 committed 状态消除最后一项失败。
