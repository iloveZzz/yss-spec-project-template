# B-03 跨仓 Git 闭合与递归复现证据

- executed_at: `2026-08-31`
- commit_authorization_ref: `B03-2026-08-31`
- push_authorization_ref: `B03-2026-08-31`
- parent_commit: `7c5ed26e019d5bb50cb6f304ef10c9bf6db11013`
- template_source_commit: `f381adeb0147472fd5829c097153c1a15450c30e`
- cli_commit: `32c6720ebb081faffc29710c53cce31fbd532e56`

## 执行顺序

1. 模板源子仓提交并推送 `f381adeb0147472fd5829c097153c1a15450c30e`。
2. CLI 从该远端固定 commit 重建 snapshot，执行 `npm test` 56/56 通过、`npm pack --dry-run` 通过，随后提交并推送 `32c6720ebb081faffc29710c53cce31fbd532e56`。
3. 父仓同时更新两个 gitlink，提交 `7c5ed26e019d5bb50cb6f304ef10c9bf6db11013`。
4. 从该父仓 commit 执行 `git clone --recurse-submodules`，全部五个 submodule 成功检出；两个目标 gitlink 与上述 SHA 完全一致。
5. 在全新克隆中执行 `.template-source/tooling/node` 的 `pnpm install --frozen-lockfile`，随后执行根 `scripts/verify-template`，exit code 为 `0`。
6. 全新克隆 `git status --short` 为空；父仓使用 `git push --recurse-submodules=check origin main` 推送成功。

## 结论

B-03 已关闭。远端父仓 `main` 可以递归解析模板源与 CLI 的同一已验证组合。本记录不构成 npm 发布批准。
