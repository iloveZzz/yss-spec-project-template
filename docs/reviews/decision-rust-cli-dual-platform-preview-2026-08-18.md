# Rust CLI 双平台非稳定预览决策

## 决策信息

- 日期：2026-08-18（Asia/Shanghai）
- 关联 ADR：`.template-source/adr/0011-native-rust-template-runtime-and-release.md`
- 实现仓库：`https://github.com/iloveZzz/yss-template-runtime`
- 发布 Tag：`v3.0.0-rc.1`
- 发布形态：GitHub draft/prerelease Release

## 已确认范围

- Windows 延后，不进入本轮资产或构建矩阵。
- 本轮只构建 `aarch64-apple-darwin`（macOS arm64）和 `x86_64-unknown-linux-musl`（Linux x64 musl）。
- 版本号与 Tag 对齐为 `3.0.0-rc.1` / `v3.0.0-rc.1`。
- 发布资产为 `.tar.gz` 二进制包和 SHA-256 校验文件；本轮明确标记为未签名技术预览。
- Tag 推送后具备 GitHub Actions 自动触发路径；本次在保持 Tag 不可移动的前提下，最终成功 run 使用 `workflow_dispatch` 从 `main@7c947117302fc513cca74f7862592378824de326` 启动，并在 job 内 checkout 固定 Tag，再构建、测试、打包和创建 draft/prerelease Release。
- 本轮不执行 force push，不修改或推送模板治理仓和 `create-yss-spec` 仓。

## 结论边界

该预览只证明双平台构建、测试和 GitHub 资产发布链路；不证明稳定发布、完整供应链签名、Windows 支持、Node 运行时替代或 npm `latest` 切换。

## 执行结果（2026-08-18）

- [GitHub Actions run 32052996408](https://github.com/iloveZzz/yss-template-runtime/actions/runs/32052996408) 已成功完成双平台构建、测试、运行时 smoke test、打包和资产汇总。
- 该 run 的 provenance 为 `workflow_dispatch`、`main@7c947117302fc513cca74f7862592378824de326`、workflow `Release preview`；它构建的是固定 `v3.0.0-rc.1` Tag 源码。
- [GitHub Draft Release](https://github.com/iloveZzz/yss-template-runtime/releases/tag/untagged-812dc7a86cb773d3fc9b) 已创建并保持 `draft` / `prerelease`；Tag 名为 `v3.0.0-rc.1`，资产共 6 个。
- 远端下载后的两个归档 SHA-256 校验均通过；构建元数据确认源 Tag 提交、目标 triple、`preview=true` 和 `signed=false`。
- 发布结果仅适用于本次 macOS/Linux 非稳定预览；Windows、签名、公证、Cosign、SBOM、attestation、immutable stable release 及 npm `latest` 仍未放行。
