# Harness 流程裁剪与影响面判定

本文件规定如何根据变更规模和风险选择最近可信阶段。裁剪只减少未触发的门禁，不得跳过已经命中的条件强制门禁。

安全 / 权限不单独分诊。需求或冻结资产没有明确改变相关行为时不登记、不解释 `not-applicable`、不增加门禁；明确改变时只按实际 UI、API、Backend、Data、High-risk 影响复用普通流程。SQL / DDL / 迁移、上传 / 下载等技术载体继续由其数据或 API 影响决定路线，不自动升级为安全专项。

## 1. 判定顺序

1. 先读取 `yss-project.yaml`，非法、缺失或不支持的身份直接进入迁移检查。
2. 判断是否为模板源维护、项目实例小改动、中等变更或全新产品 / 模块。
3. 判断 UI、API、数据、后端、前端、跨仓库和高风险影响。
4. 从最近可信阶段恢复；不要因为当前目录存在某类文件就猜测阶段已通过。

## 2. 裁剪矩阵

| 类型 | 默认入口 | 必需工作 | 可记录为 `not-applicable` |
|---|---|---|---|
| 模板源维护 | 影响面分析 | 修改单一事实来源、按验证与审查强度分级执行证据、必要的技能投影同步、fresh verification / review | 产品 Spec、产品设计、OpenAPI、运行时代码 |
| 小改动 | 入口分诊 | 影响面、主 tracker 同步、fresh verification | Spec、架构、原型、切片（没有触发条件时） |
| 中等变更 | 最近可信的 Spec / 架构阶段 | Spec、功能架构、必要工程审查、父 Ticket 和切片 | 未命中的 UI、数据或 API 门禁 |
| 全新产品 / 模块 | Discovery | Discovery、Spec、产品总体设计、功能架构、必要设计 / 契约审查、父 Ticket 和切片 | 未命中的 UI、数据或 API 门禁 |
| 高风险变更 | 既有冻结基线 | Spec Delta、架构 / 数据 / 工程审查、契约复核、切片和回滚设计 | 与风险证据无关的门禁 |

任何裁剪都必须写明原因和证据，不生成空文档。对跨仓库变更，Harness 记录必须绑定实现仓库、分支、CI、验证命令、发布顺序和回滚点；没有前端、后端或 OpenAPI 影响时显式记录 `not-applicable`。

## 3. 执行与证据

同一独立执行者可以在一个连续工作单元内完成相邻的实现动作，但不能替代独立审查者。阶段证据在集中 checkpoint 回写，至少包含：范围、变更文件、受影响仓库、验证命令及结果、阻塞项、人工审查点、Ticket 状态和下一步。

## 4. 模板维护验证与审查强度分级

本节只适用于 `template-source` 的模板、流程规则和共享 skill 维护，不降低 `project-instance` 的 Spec、OpenAPI Freeze、垂直切片或高风险工程门禁。强度由错误逃逸损失和是否改变 Agent 行为决定，不由文件所在目录单独决定。

| 强度 | 权威触发项 | 最低验证证据 | Review |
|---|---|---|---|
| L1 | `maintenance-intensity.yaml` 的 `levels.L1.triggers` | 至少一项与变更直接相关的实际检查 | `self-check` 或显式 `human-checkpoint` |
| L2 | `maintenance-intensity.yaml` 的 `levels.L2.triggers`，或该策略的 `default_level` | 修改前可失败的最小反例，以及本轮 fresh verification | 一名非实施者执行 `focused-independent` 聚焦审查；结论可内联 checkpoint |
| L3 | `maintenance-intensity.yaml` 的 `levels.L3.triggers` | 完整 RED、GREEN、REFACTOR、压力场景与本轮 fresh verification | 冻结候选后执行 `formal-independent` 正式独立审查；需要时使用完整 `code-review` |

判定规则：

1. 等级只由 `maintenance-intensity.yaml` 计算；未给出 trigger 时使用该策略的 `default_level`，未知 trigger 必须更新策略后才可验证。
2. 实施者可先分级，不要求 L1/L2 预批准；发现新影响时立即更新 `escalation`、重新分级并补齐证据。
3. 发布、合并或阶段完成时按整体候选重新判定；不得把共同改变整体语义的修改拆成多个 L1/L2 规避 L3。
4. RED 用于证明行为差异。L1 不人为构造失败；L2 可使用已有失败、最小 fixture 或现有测试修改前失败；只有行为无法确定性表达时才运行聚焦压力场景。L3 使用 `maintaining-skills` 并执行本节定义的完整 RED、GREEN、REFACTOR 和压力场景要求。
5. 模板发布候选固定按 L3 聚合验证，但不追溯补造每个既有 L1/L2 修改的独立 RED。

每个模板维护 checkpoint 使用以下轻量合同；L1/L2 可直接写入主 Ticket 或集中 checkpoint，不要求新增独立文档：

```yaml
schema_version: 1
intensity: L1 | L2 | L3
classification_reason: <分级理由>
triggers: [<可观察触发项>]
changed_assets: [<路径或资产引用>]
verification_evidence:
  - kind: relevant-check | counterexample | red | green | refactor | pressure-scenario | fresh-verification | focused-independent-review | formal-independent-review
    command: <本轮实际命令或可读取证据引用>
    result: pass
review_mode: self-check | human-checkpoint | focused-independent | formal-independent # L2/L3 还必须在 verification_evidence 中给出对应 review 证据引用
escalation: none | <升级原因和原等级>
```

使用 `scripts/verify-maintenance-checkpoint <file>` 或通过 stdin 传入 YAML / JSON 做只读校验。触发项 ID 与最低等级只由 `docs/process/maintenance-intensity.yaml` 维护；校验器消费该策略。未知触发项必须先更新该权威策略和场景，不能静默接受。
