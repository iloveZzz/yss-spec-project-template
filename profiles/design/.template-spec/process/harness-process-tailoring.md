# Harness 流程裁剪与影响面判定

本文件规定如何根据变更规模和风险选择最近可信阶段。裁剪只减少未触发的门禁，不得跳过已经命中的条件强制门禁。

安全 / 权限不单独分诊。需求或冻结资产没有明确改变相关行为时不登记、不解释 `not-applicable`、不增加门禁；明确改变时只按实际 UI、API、Backend、Data、High-risk 影响复用普通流程。SQL / DDL / 迁移、上传 / 下载等技术载体继续由其数据或 API 影响决定路线，不自动升级为安全专项。

## 1. 判定顺序

1. 先读取 `yss-project.yaml`，非法、缺失或不支持的身份直接进入迁移检查。
2. 判断是否为模板源维护、项目实例小改动、中等变更或全新产品 / 模块。
3. 判断 UI、API、数据、后端、前端、跨仓库和高风险影响。
4. 从最近可信阶段恢复；不要因为当前目录存在某类文件就猜测阶段已通过。

只读问答、状态查询和定位只返回来源、结论及未决项；写正式资产、批准或流转才进入工作单元。行动请求先核验复用已有资产、登记与追踪，再补本轮缺项；只推进 profile 允许且本轮触发的工作单元及依赖。未要求的未来产物不是当前缺项，本仓不实施运行时代码；下游正式业务实现仍须批准且当前的 Slice 合同与允许写范围。

## 2. 裁剪矩阵

| 类型 | 默认入口 | 必需工作 | 可记录为 `not-applicable` |
|---|---|---|---|
| 模板源维护 | 影响面分析 | 修改单一事实来源、按验证与审查强度分级执行证据、必要的技能投影同步、fresh verification / review | 产品 Spec、产品设计、OpenAPI、运行时代码 |
| 小改动 | 入口分诊 | 影响面、主 tracker 同步、fresh verification | Spec、架构、原型、切片（没有触发条件时） |
| 中等变更 | 最近可信的 Spec / 架构阶段 | Spec、功能架构、必要业务审查、业务 Ticket 和交接 | 未命中的 UI、数据或 API 门禁 |
| 全新产品 / 模块 | Plan | Plan、Spec、产品总体设计、功能架构、必要设计审查、业务 Ticket 和交接 | 未命中的 UI、数据或 API 门禁 |
| 高风险变更 | 既有冻结基线 | Spec Delta、业务规则复核、受影响确认及交接范围复核 | 与风险证据无关的门禁 |

任何裁剪都必须写明原因和证据，不生成空文档。对跨仓库变更，Harness 记录必须绑定实现仓库、分支、CI、验证命令、发布顺序和回滚点；没有前端、后端或 OpenAPI 影响时显式记录 `not-applicable`。

## 3. 执行与证据

同一独立执行者可以在一个连续工作单元内完成相邻的实现动作，但不能替代独立审查者。阶段证据在集中 checkpoint 回写，至少包含：范围、变更文件、受影响仓库、验证命令及结果、阻塞项、人工审查点、Ticket 状态和下一步。

Fresh Verification 指当前范围的真实验证，不等于全仓检查。按当前合同、工程基线和已采纳 CI 条件选择检查；同一边界且资产 / 上游字节、校验器 / schema、命令参数及仓库根均未变时可复用，变化只使受影响依赖失效。恢复、handoff、进入实现、合并和发布时重验当前边界，当前性不明即重跑适用检查。产品实例不运行模板回归，除非另有明确模板维护或回归任务；局部完成不推导整体业务完成或发布。

专业审查由主控派发独立实例并等待，无依赖工作继续。按本仓角色表核验当前原始真实决定与批准，缺失、失效或实质变化时才展示资产并询问；非阻断建议进入待办，必要证据和真实缺陷继续阻断。

## 4. 模板维护验证与审查强度

本节只适用于 template-source。等级与触发项由 .template-source/process/maintenance-intensity.yaml 决定；分级改变证据强度，不替代产品实例的条件门禁。

| 等级 | 必需证据 | 日常审查 |
|---|---|---|
| L1 | 至少一项直接相关的实际检查 | self-check 或显式 human-checkpoint |
| L2 | 维护者自检与本轮 Fresh Verification；风险触发项补实际反例 | self-check；独立审查按需 |

命中 counterexample_triggers 的每项风险还须有对应真实拒绝运行记录。L1 不人为构造 RED；普通 L2 不强制通用反例；权限边界、生命周期门禁、发布语义仍须对应实际反例。未知 trigger 先更新策略；发现新影响重新分级并补受影响证据。重要缺陷与必要证据继续阻断。

日常交付默认 implementation-ready，执行本轮改动及直接 / 传递依赖的定向检查。先看 scripts/verify-template-fast --plan；计划扩大到全量时改做有明确范围的定向检查，记录选择依据、实际命令、退出码与未覆盖风险。未知影响先调查，不用全量兜底；定向通过不冒充整个 fast / candidate / release 通过。

日常不因交付措辞、维护等级、当前分支为 main 或缺发布 baseline 自动全量，也不依次运行三个入口。PR 候选使用 scripts/verify-template-candidate；main 集成验证及正式发布任务使用 scripts/verify-template。各入口的机器计划、拒绝与回退规则保持生效，正式任务选中集合不得手工删减；发布另须固定版本生成器与实例兼容证据及实际授权。

当前维护策略 schema v2 只定义 L1/L2，L1 有 3 项触发、L2 有 9 项具体影响触发，默认 L2。冻结 maintenance-intensity-v1.yaml 仅供 --history 按原规则只读核验历史 L1/L2/L3；当前拒绝 L3，不改写旧批准、状态或摘要。新维护 checkpoint 使用 schema v2；历史 v1 只读兼容。日常形状如下，逐条 evidence 填本轮实际范围，verification_profile 表示交付层级：

四项原判级标签已退役；当前记录使用下列替代归类，不新增别名或自动降级：

| 退役标签 | 当前归类与保留检查 |
|---|---|
| `ticket-state` | 普通工单规则用 `local-rule`；准入、放行、阶段流转或完成条件改变用 `lifecycle-gate`；涉及执行权限同时用 `permission-boundary` |
| `historical-important-escape` | 按实际缺陷选具体影响项；历史漏检写入问题说明和回归依据，原缺陷回归仍执行 |
| `aggregate-behavior-change` | 选择全部实际命中的具体影响项，整体按 L2；每项强制风险分别提供真实反例，覆盖直接及传递消费者 |
| `release-candidate` | 使用现有目标状态、验证 profile、候选摘要及正式合同；修改发布放行语义才选择 `release-semantics`，候选/main/发布覆盖不缩减 |

不得用空 triggers 或普通标签遮蔽已识别的权限、流转或发布风险。携带退役标签的旧 L2 当前记录会被拒绝；继续工作时先保存原字节，重新分析影响并更新本轮记录及证据，不复制旧批准、发布状态或候选摘要。政策输入改变时重验受影响证据。`--history` 使用冻结 v1 的原三级映射，不保证旧两级 L2 记录通过；旧两级记录仅审计时保留其原政策、源码和输出，不授予当前执行资格。


```yaml
schema_version: 2
intensity: L1 | L2
classification_reason: <分级依据>
triggers: [<当前策略 trigger>]
changed_assets: [<本轮路径>]
verification_evidence:
  - kind: relevant-check | counterexample | self-check | fresh-verification
    command: <实际命令或可读取运行记录>
    result: pass
review_mode: self-check
escalation: none | <新影响及升级依据>
target_state: implementation-ready
current_state: implementation-ready
verification_profile: fast
review_round: 0
candidate_digest: null
```

使用 scripts/verify-maintenance-checkpoint 校验。L2 必须有 fresh-verification、self-check；命中风险触发项补带 trigger、run_ref、实际命令和日志摘要的 counterexample。结构通过不替代实际执行证据。

自检路径的 release-ready 必须使用 release，并提供绑定当前来源与完整适用集合的 final-release-verification，其 command 为 scripts/verify-template；实际监督退出成功、input_drift=false、unexecuted=[]。该状态不代替 CLI 集成、平台兼容或发布授权。

focused-independent / formal-independent 仅在明确采用独立审查路径时消费对应严格合同，不能由强度自动触发。历史正式证据按现有兼容入口只读核验，不能自报 legacy 或用请求代替审查通过。修复按差异、受影响结论和依赖定向复审，全部结论绑定当前候选；drift / new_impacts 先调查再更新范围和合同。Reviewer 不写实现，实施者不自审。
