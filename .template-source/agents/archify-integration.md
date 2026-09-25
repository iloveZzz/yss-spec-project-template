# Archify 集成合同

本仓消费 [`tt-a1i/archify`](https://github.com/tt-a1i/archify) `v2.16.0`，固定 revision `199360cc6687a7857b54dd188d4922b09e466a4b`，许可证为 MIT。`.agents/skills/archify` 是完整上游包加 YSS 最小适配；`skills-lock.json` 分别记录未经适配的 `upstreamHash` 与当前 `effectiveHash`。

## 路由

- `archify` 是 `specialist`，默认不主动发现。只有用户或当前技术分析、Tactical Design、架构审查合同明确要求架构、工作流、时序、数据流、生命周期、Mermaid 美化或 Before/After 图示时才调用。
- 图只从 Spec、ADR、OpenAPI、Tactical Design Contract、Slice Implementation Contract 和代码证据派生，不替代任何事实源、合同、评审或会签。
- 不加入 `yss-public-skills.json`。YSS 模板分发锁定的上游包，但不把它重新发布为 YSS 自有公共 Skill。

## 交付与网络边界

- YSS 仓库不得运行 Archify 的 `scripts/check-update.mjs`。升级只通过 `maintaining-skills`、固定 revision、来源哈希和 fresh verification 完成。
- 稳定交付必须使用 `.agents/skills/archify/scripts/yss-safe-deliver.mjs`。`project-instance` 只允许 `docs/architecture/diagrams/<diagram-id>/`；`template-source` 只允许 `.template-source/evidence/maintenance/diagrams/<diagram-id>/`；临时探索只允许系统临时目录。
- 稳定资产固定为 `<diagram-id>.archify.json`、`<diagram-id>.html`、`<diagram-id>.receipt.json`。安全启动器拒绝非 HTML 输出、目录逃逸、符号链接逃逸、无关文件覆盖和 `--open`。

## 更新检查

升级时在临时目录读取上游固定 commit，验证 License、版本、完整目录 `upstreamHash`、YSS 适配差异、安全启动器测试、投影、锁文件、注册表和受影响调用方；不得从浮动 `main` 直接覆盖 canonical 内容。
