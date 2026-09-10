# 中文写作规范接入记录

日期：2026-09-10；仓库：`template-source`；本轮结果：`implementation-ready`。

## 范围与用户确认

当前 Codex 会话 `01a08b9d-a766-76b2-a927-559862885eae` 中，用户在收到 v0.1 规范草案、三组对照和研究依据后回复“确认”。本轮据此将已确认写法接入本仓规范、模板和按需加载入口。该回复不用于批准产品 Spec、Slice 合同、Git 提交、推送或发布。

先前 `checkpoint.yaml` 是非生效草案的 L1 历史记录。本轮改变默认生成指引，按 `generation-semantics`、`aggregate-behavior-change` 升级为 L3；新状态见 `integration-checkpoint.yaml`。无需用户再次批准同一写法。

## 已落地内容

- `docs/process/document-writing.md` 统一维护共用写法、各阶段指引、进度和会签表达、保真自检。
- `docs/templates/examples/lifecycle-writing-examples.md` 提供三组可分发的虚构对照；不引用维护目录，不充当产品事实。
- 8 个 canonical 技能增加条件式引用：生命周期、研究、阶段决策、产品设计、技术设计、OpenAPI 治理、实现合同编译器及审查。生命周期合同新增可查询的 `document_writing` 子树，将引用传给文档执行者。
- Plan 前置用户问题；Spec 细化规则、目标和验收填写指引，非目标正文保持一个位置；Ticket 只在 frontmatter 维护状态，正文记录核验依据，移除默认无阻塞和裸 `ready-for-agent`。
- `scripts/sync-skills` 和 `scripts/update-skill-lock` 已执行，仅手改 canonical。没有新增技能身份、常驻输出模式、审批阶段或门禁。

## 实际验证与自检

最终 `scripts/verify-template-fast` exit 0，完整输出、执行起止时刻及退出码见 `integration-fast.log`。同步、lock、技能治理、技术设计、OpenAPI、协同和命中实现场景通过。可选外部环境验证的跳过项以日志为准，不解释为真实运行时验收。

针对性命令、时间和实际输出见 `integration-checks.json`：

- `verify-integration.mjs` 核对查询投影、8 个技能入口、8KB 预算、Markdown 本地链接与锚点、Ticket 单一状态源，以及门禁 / 角色 / 词汇注册表未变。
- 按本地 `submodules/create-yss-spec/template.manifest.json` 检查正式文档可进入分发、维护草案被排除。这只验证本地清单可包含性，没有创建外部固定版本 CLI 发布快照。
- 业务语言场景、生命周期上下文查询场景与 `git diff --check` 通过。

自检对照已确认草案核查：正式规范保留完整性、证据和不确定性要求；三组样例保留原输入；改写不隐含决定关键未决项。实际实现文件 SHA-256 见 `integration-files.json`，不包含会变化的自述日志或递归摘要。

## 验证返工复盘

首轮 fast 在生命周期入口预算检查失败：新增详细说明使入口达到 8612 bytes。修复时将说明收敛为按需引用，并压缩投影说明的重复措辞；门禁与用户决定边界完整保留。最终入口 8187 bytes，fast 通过，未放宽预算检查。事实源修订落在 canonical 入口与 `document_writing` 合同，投影由脚本同步。

此次返工说明跨阶段文字规范不宜复制到每个入口。后续增加内容时继续引用共用规范，并先检查入口预算；本次没有把旧失败当作最终通过证据。

## 保留的边界与下一步

`context_reconciliation`、产品 Ticket 和产品运行时验证为 `not-applicable`：本轮是模板维护，没有业务词汇或产品切片。文档变化不适用行为 TDD，使用已有场景和针对性接入校验；没有独立审查或会签自报。

本轮证明接入与结构核验通过，没有进行三条件模型重复生成或中文读者盲评，不能报告改善比例、统计显著性或跨模型稳定效果。后续真实文档使用反馈可进入同一规范维护；若要量化效果，按已确认草案的评估方法单独记录实验条件与结果。

未执行 commit、push、合并或发布。外部 CLI 固定版本集成未验证，本记录不表示可发布。下一步是在项目实例实际起草时消费当前规范，按案例反馈修订。
