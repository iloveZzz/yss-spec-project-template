# 战略设计 Data Quality 默认主题衔接

本轮按用户“OK 请调整”补齐战略设计入口、评审和交接对现有默认主题的消费。根与战略模板均为 `template-source`；未生成产品资产、未修改 Data Quality 项目、未提交或发布。

## 调整范围

- 战略 `AGENTS.md` 补充根 `DESIGN.md` 的视觉事实源地位；战略技能恢复完整的“产品设计与页面验证”路由行。
- 设计系统技能及 QA 使用当前规范与所选 Token 的摘要；默认 Data Quality 浅色，暗色和紧凑模式显式选择。删除“本轮未重派生暗色”的过期陈述和已退役 Antdv Next fact pack 路线。
- 原型证据模板默认引用 `theme.json`、`tokens.default.json` 和 `variables.css`；视觉基线模板默认 `default-light`，不再以 compact 作为默认截图主题。两份模板通过 profile 同步。
- 战略评审清单采用 `yss-prototype-stage` 规范直出路线，引用现有 `design_baseline` / `visual_baseline` 和真实用户确认。API 信息只作为下游输入；未修改生命周期 ID、批准规则或 Handoff schema。
- 战略源技能同步到综合与前端模板的 canonical 技能，再生成运行时投影和锁；战略专属编排技能保留在战略 profile。
- 前端 CLI 实际初始化发现根 `DESIGN.md` 未被打包。已修正前端模板源 `.template-source/distribution/template.manifest.json` 并重新生成 CLI 快照；新增实际初始化与逐资产摘要回归。

## 修改前反例与维护者自检

`counterexamples.json` 对照本轮修改前备份核验四项冲突：破损的战略阶段表、默认 compact Token 引用、默认 compact 截图主题、过期暗色结论。`scope-diff.patch` 与 `changed-assets.json` 记录本轮字节变化，保留本轮之前的脏工作区改动。

前端分发反例见 `frontend-design-baseline-red.log`：CLI init 成功，但生成项目缺少 `DESIGN.md`，测试实际失败。最初只改 CLI 派生清单会被 `sync-template` 重新覆盖；随后按 `harness-profile.yaml` 的 `instantiation.distribution_manifest` 修正前端模板源并重建。`frontend-cli-before-source-fix.log` 保存修正源清单前的失败。

本轮起初按 L2 文档与局部规则清理；发现分发缺项后按 L3 `generation-semantics` 升级。共用 CLI 实现未修改，仅修正该 profile 的分发源与增加包级回归。

## 本轮验证

- `design-md lint DESIGN.md`：0 error / 0 warning；`design-md drift`：无漂移。规范数值和 Token 内容本轮未修改，不重复浏览器主题测试，也不把上轮截图视为本轮页面验收。
- `sync-profile-skills --check --profile=all`：无 changes / issues；综合、战略、前端技能锁、投影、治理及 `git diff --check` 通过。
- `scripts/verify-template-fast` 因工作区已有核心改动升级为完整检查：综合 81 项、战略 44 项、前端 45 项顶层命令通过。三仓均 exit 1，唯一顶层失败为 `verify-strategic-handoff-tools-lock --require-committed` 拒绝 `working-tree`。详见 `fast-results.json` 和三份原始日志；不能把整套验证标为通过。
- 战略 CLI `pnpm test`：通过真实初始化、接入、诊断、只读、同步与家族边界场景；`pnpm verify-bundle` 通过。
- 综合 CLI `node --test tests/init-cli.test.js tests/sync-template.test.js`：43 项通过。
- 战略 / 前端 CLI 共 16 个关键文件的 snapshot 摘要和实际 blob 字节与源文件一致，见 `cli-snapshot-integrity.json`。快照明确为 `working-tree`，不伪造提交来源。
- 前端 CLI 修正后 `pnpm test` 两项测试全部通过：新增实际初始化的七项设计资产摘要验证，以及原有完整 CLI 合同场景；最终 `pnpm verify-bundle` 通过。详见 `frontend-cli-tests-final.log` 和 `frontend-cli-bundle.log`。

## 边界

`context_reconciliation`、产品 Spec / 原型 / OpenAPI、产品会签及运行时实现均为 `not-applicable`：本轮是模板维护，没有业务词汇或具体产品行为变化。模板当前仅可作本地实施验证；固定提交来源与发布门禁尚未闭合。
