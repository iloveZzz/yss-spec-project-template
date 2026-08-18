# Harness 工作单元地图

<!-- lifecycle-registry:work-units:start -->
> 此表由 `docs/process/lifecycle-registry.yaml` 生成；它只描述 `template-source` 的 Harness 工作单元。

| 稳定 ID | 工作单元 | 输入 | 输出 | 完成条件 |
|---|---|---|---|---|
| `work-unit.entry-triage` | 入口分诊 | 用户请求、仓库身份。 | 影响面与最近可信阶段。 | 身份和影响面可解释。 |
| `work-unit.ssot-update` | 单一事实源更新 | 变更合同。 | 权威文档或脚本。 | 其他投影可由脚本生成。 |
| `work-unit.skill-projection-sync` | 技能投影同步 | .agents/skills。 | Agent root 投影、skills lock。 | --check 通过。 |
| `work-unit.template-snapshot-build` | 模板快照构建 | 固定模板 commit。 | CLI bundled snapshot。 | commit 与 tree hash 可追踪。 |
| `work-unit.attach-sync-integration` | attach / sync 集成 | 目标仓库、dry-run 计划。 | 受管资产和 metadata。 | 验证通过或完整回滚。 |
| `work-unit.intensity-aware-verification` | 分级 Fresh verification | 变更仓库、强度分级与对应最低证据。 | 命令输出与证据。 | L1 相关检查、L2 最小反例与 fresh verification、L3 完整 RED / GREEN / REFACTOR 与 fresh verification 按命中等级通过。 |
| `work-unit.intensity-aware-review` | 分级审查 | 变更 diff、强度分级与验证证据。 | L1 self-check / 人工 checkpoint、L2 聚焦独立审查或 L3 正式独立审查结论。 | 已按命中等级完成审查且无未处理阻断项；L1 不强制独立 reviewer。 |
| `work-unit.release-and-rollback` | 发布与回滚 | 已审查 commit。 | release note、观察信号、回滚点。 | 两仓库顺序和恢复动作明确。 |
<!-- lifecycle-registry:work-units:end -->
