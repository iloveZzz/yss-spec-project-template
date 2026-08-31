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
6. 模板维护与产品切片使用同一 finding 闭环：`violation` / 机器检查失败 / 适用行空白由实施者修复后重新验证并按本表强度复审；`drift` / `new_impacts` 升级影响面并重新分级，禁止在旧合同或旧 checkpoint 上继续编码。审查者不得写实现。未命中的条件项才 `not-applicable`；命中后不得豁免。

模板维护默认停在 `implementation-ready`，不自动冻结候选或派发审查。需要独立审查时显式提升到 `review-ready`；完成独立审查和最终完整门禁后才能成为 `release-ready`。三个核验入口由 `docs/process/template-verification-profiles.yaml` 统一定义：

- `scripts/verify-template-fast`：按 Git 影响面运行快速检查；未映射路径或核心核验资产变化时 fail-safe 升级为完整门禁。
- `scripts/verify-template-candidate`：运行命中影响面、候选完整性和审查合同检查；PR 默认使用该入口。
- `scripts/verify-template`：执行不可裁剪的完整发布门禁；首次正式冻结前和最终发布前各运行一次，修复内循环不重复运行。

新模板维护 checkpoint 使用 schema v2；历史 schema v1 继续只读兼容，不批量迁移。L1/L2 可直接写入主 Ticket 或集中 checkpoint，不要求新增独立文档：

```yaml
schema_version: 2
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
target_state: implementation-ready | review-ready | release-ready
current_state: implementation-ready | review-ready | release-ready | needs-human
verification_profile: fast | candidate | release
review_round: 0 | 1 | 2
candidate_digest: null | <sha256>
```

使用 `scripts/verify-maintenance-checkpoint <file>` 或通过 stdin 传入 YAML / JSON 做只读校验。`implementation-ready` 必须使用 fast、`review_round: 0` 且不带候选摘要；`review-ready` 必须绑定候选、candidate / 首次完整门禁和三轴任务包证据；`release-ready` 还必须绑定正式独立审查与最终完整门禁。第二轮仍有未关闭的 `violation`、`drift` 或 `new_impacts` 时，使用 `scripts/evaluate-maintenance-review-round` 形成新的 `needs-human` checkpoint，禁止自动开启第三轮。触发项 ID 与最低等级只由 `docs/process/maintenance-intensity.yaml` 维护；校验器消费该策略。未知触发项必须先更新该权威策略和场景，不能静默接受。

进入 `review-ready` 后使用 `scripts/prepare-maintenance-review` 一次生成 Standards、Spec、Lead 三个任务包。任务包必须明确 `candidate_kind`、`candidate_requirement`、`candidate_digest`、审查轴、允许读取路径、报告写入路径和适用规则。候选变化会使旧报告失效；`judgement-call` 进入后续 backlog，不得在审查中升级为未由既有单一事实来源支持的新硬要求。

Worktree 候选使用 `scripts/capture-maintenance-candidate --output <目录>` 捕获。新候选目录必须位于 `.template-source/evidence/maintenance/`、在捕获前不存在，并通过 staging 原子落盘；检查时该目录必须恰好包含 `candidate-manifest.yaml`、`candidate.bin` 和 `tracked.diff`。所有 untracked 路径、mode、类型和内容均已按 `yss-worktree-candidate-v1` 帧写入单一 `candidate.bin`，不得再生成逐文件 `untracked-content/000xxx` 副本。审查任务包、报告和旧候选目录可用重复的 `--exclude <仓库相对路径>` 与实现字节分离，但排除路径只允许位于 `.template-source/evidence/maintenance/`，并全部写入 manifest；`scripts/**`、`docs/**` 或其他实现 / 权威资产不能通过该接口排除。`scripts/inspect-maintenance-candidate` 只读复核摘要、清单、规范三文件和外部 `tracked.diff`；历史候选的逐文件引用继续兼容。

固定远程模板输入可使用 `scripts/cache-template-commit --repository <remote-url> --commit <40位commit>`。缓存键仅由 URL 与 commit 构成，每次命中仍复核 metadata 和 Git object hash；缓存目录不进入 Git 或正式证据。

`focused-independent-review` 与 `formal-independent-review` 的 `command` 必须引用可读取的审查结论。L3 新记录必须使用 `docs/process/schemas/maintenance-review-record.schema.json`，绑定 Reviewer、实施者、完整 `yss-worktree-candidate-v1` 冻结字节、候选 digest、通过正式 schema 的 Reviewer 任务包、任务包声明的审查报告和已关闭 findings。仅校验器内明确登记的 2026-08-24 / 27 历史 L3 Markdown 可兼容，并仍须带 `legacy_formal_review: true`、审查身份和明确通过结论；任意新 Markdown 不能自报 legacy。审查请求、实施者自述、否定裁决、伪造或非规范候选流、无效任务包、未关闭 findings 或 symlink 越界证据都会被拒绝。可用 `scripts/verify-maintenance-review-record` 单独校验。
