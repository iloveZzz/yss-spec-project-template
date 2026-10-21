# 特定布局说明

仅在入口所列条件命中时读取本文件。Markdown 链接相对本文件；行内 references/assets/schemas 路径相对 Skill 根目录。Skill 自带的 bin/scripts 命令从 Skill 根目录执行；明确注明 repository root 的包装命令仍从项目根目录执行。

Do not read `renderers/shared/geometry.mjs`, renderer source, validator source, tests, or benchmarks before the first candidate. Inspect implementation only for an unsupported internal diagnostic or after two focused repairs fail.

Workflow note: use schema v2 for new workflows; preserve schema v1 when an
existing source needs fixed legacy geometry. Keep semantic edge labels and act
on the compiler diagnostic. The canonical layout, pin, migration, and receipt
contract is in [`renderers/workflow/README.md`](../renderers/workflow/README.md#layout-contracts).

Lifecycle note: phase columns `0..4` occupy the main rail; event/terminal column `N` in `0..2` aligns exactly beneath main column `N + 2`. A recoverable state uses `type: "failure"` plus a real transition back to the active state.
