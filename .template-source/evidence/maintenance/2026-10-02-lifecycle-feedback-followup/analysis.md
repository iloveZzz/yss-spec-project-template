# 主控提示与状态诊断后续分析

当前为模板源维护分析；源码、技能、锁文件、CLI 快照、真实产品资产和批准均未修改。新增的是审查捕获、反例及本文等维护证据。审查基点为 `96fc6c6e5362e0df17ab203768d9eb14f1102e49`；模式 `worktree`；开始和结束的规范候选摘要相同：`0af1552c48b9a40a62a6583adc49dbbe1b3e58fe77372b3f0df2696d75c75cf1`。子 Profile 是独立摘要快照，1246 个文件已复核未漂移，不混称根仓捕获流。

当前已得到七项具体 finding：独立 Reviewer 的 Standards 两项、Spec 三项，以及只读 Profile 咨询两项。完整结论分轴保留在 [独立审查](status-review/review.md)；额外咨询见 [合同与查询](contract-consultation/report.md) 和 [专职 Profile](profile-consultation/analysis.md)。咨询不作为独立代码审查或批准。

## Standards

| ID | 程度 | 问题与影响 | 处理方向 |
|---|---|---|---|
| S1 | IMPORTANT；既有 | 文档要求暂停记录 `pause`，checkpoint schema 却禁止此字段。中文查询可读，正式校验会拒绝，暂停责任方和恢复条件无法按同一规范落盘。 | 由现有状态所有者统一暂停载体、schema、文档和读取；旧实例按显式兼容处理，保留原字节。 |
| S2 | IMPORTANT；本轮新增覆盖不足 | 新增 9 个提示场景的共用 fixture 缺必填结构，且部分 gate 状态/扩展字段不被正式 schema 接受。通过结果仅证明这些阅读输入，不能证明规范实例的正向恢复。 | 正向输入从真实模板构建并先过权威 schema；负向和兼容输入明确记录结构失败。 |

## Spec

| ID | 程度 | 问题与影响 | 处理方向 |
|---|---|---|---|
| F1 | IMPORTANT；既有 | schema-valid 的 failed/paused 任务和 resolved+result.failed，CLI 仍 exit 0、无阻塞；失败原因、验证 exit 1 和阻断信号漏显，还建议核验后恢复或核验完成证据。 | 分开运行态与结果态，消费现有任务结果、失败验证与 blocking_signals，先检查原任务和证据。 |
| F2 | IMPORTANT；既有 | 合法 `checks.failed` 和 `artifacts.stale` 没有诊断，已登记问题显示为未登记阻塞。 | 显示真实问题、来源、过期依据与恢复；按依赖判影响，关联不足写待核验，不把所有历史项自动变成当前门禁。 |
| F3 | NORMAL；本轮新增 | 路由已缺失或阶段工作项来源已漂移，下一阶段关联仍标 `passed` 并展示确定目标。原阻塞已正常显示，但内部状态不一致。 | 保留登记候选用于追踪，路由/依据未核验时将关联与用户提示同步降级。 |

## 专职 Profile 咨询

| ID | 程度 | 问题与影响 | 处理方向 |
|---|---|---|---|
| C1 | NORMAL；确定缺陷 | 战略 Profile 将禁止的 `technical-analysis` 下游路由描述为本地主控恢复；scope checker 对同一目标会拒绝。 | 消费 allowed/forbidden、downstream 和终点，提示正确下游接收方与范围。 |
| C2 | NORMAL；本轮错误提示缺口 | 实际错误是未知 `harness-profile.yaml`，中文问题来源却指向 checkpoint，用户被引向错误文件。 | 在 Profile 读取/选择错误上绑定真实来源，保留默认 JSON failure 兼容。 |

这些反例没有证明执行权限绕过：正式范围/批准检查仍阻断，状态查询仍未授予执行。问题在于遗漏已登记事实或给出不准确的恢复指导。

## 系统衔接与体验建议

1. 注册表工作单元缺阶段关联，schema 也未允许该字段。没有 tracking 时四类主控只能正确降级为待核验。应在原 registry/schema 增加受控的单阶段或多阶段归属策略，并区分执行归属、当前阶段和前置阶段。Spec 查询返回 Plan 是既有前置加载，不直接判为错误。
2. 普通工作单元查询默认不含新 `user_progress_report`；补合并读取示例或经过兼容验证的轻量默认返回。现有事实不证明真实 Agent 已漏报，还需要输出样本。
3. 区分当前执行单元和下一待推进单元，显示已登记职责终点及接收方；无任务的普通概念咨询直接回答，实际推进和暂停保留控制结果。
4. 中文默认提示减少阻塞与通用待核验条件的重复，按需展示具体复验 argv、解除证据与详情，所有实质阻塞仍可见。不能以简短为由删掉来源、责任缺口或风险。
5. 在现有 Agent 评估补真实输出与事实对照：同阶段剩余工作、多阻塞、过期输入、等待用户且独立工作继续、模板维护和专职终点。代码测试、关键词扫描和模型自评不能代替实际提示效果。

## 修复依赖与验收

建议按依赖推进：统一暂停状态/schema → 完整问题诊断和 Profile 真实范围/来源 → 阶段关联及查询读取 → 规范正向场景和真实输出评估。修改仍沿用单一事实源和既有授权，不新建状态文件或门禁。

验收应覆盖规范输入 schema exit 0；兼容/损坏输入的明示；failed/paused/失败结果与合法检查失败/资产过期；禁止本地目标及真正下游交接；Profile 错误真实来源；缺路由/来源漂移时的关联降级；新旧实例的只读行为与 JSON/退出码兼容。修改后按影响同步专职投影、锁文件与四 CLI WORKTREE 快照，运行适用定向检查和 fast。当前没有执行这些修复，不宣称 findings 已关闭或可发布。

## 验证范围

独立 Reviewer 实际执行七组 schema-valid checkpoint 反例和三组 schema-valid task；另有 pause-shape 专门确认 schema 拒绝。原 9 个场景、operator 和 core-view 仍全部通过，日志见 status-review，说明原检查覆盖不足而不是此前命令结果被改写。Profile 咨询实际运行七个状态 fixture、scope 反证和错误来源反例；最小终点示例没有证明交付验收。合同咨询运行三个实际 query，记录在 observations.json。

反例数据均为虚构测试输入，不是产品状态或批准。case 的 `inputs.json` 保留实际输入原文，status JSON/text 与 schema 日志原样归档；完整临时运行树路径仍在原始记录中。

Standards：2 项，最严重 IMPORTANT（暂停合同和规范正向覆盖）；Spec：3 项，最严重 IMPORTANT（失败任务、失败检查与过期资产漏显）；Profile 咨询另有 2 项 NORMAL 提示缺陷。没有实现、批准或发布结论。
