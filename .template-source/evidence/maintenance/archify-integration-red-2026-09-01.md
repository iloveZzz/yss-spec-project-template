# Archify 集成 RED 证据

日期：2026-09-01

维护强度：L3。触发项为 `generation-semantics`、`cross-repo-contract`、`permission-boundary` 和 `aggregate-behavior-change`。

实现前最小反例均按预期失败：

- 主模板与战术设计模板不存在 `.agents/skills/archify/SKILL.md`，文件存在性检查退出码均为 1。
- 两个模板均不存在 `scripts/yss-safe-deliver.mjs`，安全交付入口检查退出码均为 1。
- 两份 `docs/agents/yss-skill-registry.yaml` 均无 `id: archify`，注册表查询退出码均为 1。
- `create-yss-spec` 与 `create-yss-harness-dev` 的模板快照均不包含 Archify，快照存在性检查退出码均为 1。

这些反例证明变更前既没有技能供应链记录，也没有 YSS 输出边界和两套 CLI 分发能力。
