# Archify 集成 REFACTOR 证据

日期：2026-09-01

在 GREEN 后完成以下收敛：

- 将 Archify 定位为 `specialist` 条件技能，不加入 YSS 公共技能集，也不把图形产物提升为生命周期单一事实来源或门禁。
- `yss-product-lifecycle`、`codebase-design`、`yss-tactical-design` 与战术模板的 `architecture-agent` 只在复杂结构确实需要图示时调用 Archify。
- 禁止运行上游 `scripts/check-update.mjs`；升级只通过维护流程、固定 commit、哈希和 `adaptationRef` 完成。
- 稳定交付统一为 `<diagram-id>.archify.json`、`<diagram-id>.html`、`<diagram-id>.receipt.json` 三件套。
- project-instance 输出固定在 `docs/architecture/diagrams/<diagram-id>/`；template-source 输出固定在 `.template-source/evidence/maintenance/diagrams/<diagram-id>/`。
- 供应链逻辑保留外部适配技能已有的 `adaptationRef`，再由 lock 更新和 projection 同步生成派生资产。
- 主模板、战术设计模板以及 `create-yss-spec`、`create-yss-harness-dev` 快照同步更新。

实现完成后已按用户授权形成四仓本地提交；截至本证据修订时尚未推送。提交与后续推送顺序、回滚点记录在 `archify-integration-cross-repo-contract-2026-09-01.md`，最终 GitHub 可取回性以发布前 fresh verification 和推送结果为准。
