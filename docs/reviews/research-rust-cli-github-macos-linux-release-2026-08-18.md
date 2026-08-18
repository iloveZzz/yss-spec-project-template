# Rust CLI macOS / Linux GitHub 发布可行性研究

## 记录信息

- 日期：2026-08-18（Asia/Shanghai）
- 仓库身份：`repository_mode: template-source`
- 关联实现仓库：`/Users/zhudaoming/Projects/yss-template-runtime`
- 问题：当前 Rust CLI 是否可以交付 macOS 与 Linux 版本，并通过 GitHub Tag / Release 发布。
- 证据性质：技术事实与当前状态核验，不是发布批准、Tag 授权或 Release 就绪结论。

## 当前实现仓状态

- 远端：`https://github.com/iloveZzz/yss-template-runtime.git`，公开仓库，默认分支为 `main`。
- 当前提交：`5c2461d feat: implement native runtime slice 02`；本地 `main` 与 `origin/main` 一致，工作树干净。
- `Cargo.toml` 当前版本为 `3.0.0-alpha.0`；README 明确写明当前仍不是可安装、可替代 Node 或可发布版本。
- 远端当前没有版本 Tag、GitHub Release 或 Actions workflow；本轮没有执行 `git push`、Tag 创建或 Release 操作。
- 当前隔离 Rust toolchain 为 `1.97.1`，已安装 target 只有 `aarch64-apple-darwin`。
- fresh verification：`scripts/cargo fmt -- --check`、`scripts/cargo clippy --locked --all-targets --all-features -- -D warnings`、`scripts/cargo test --locked`、`scripts/cargo build --locked --release` 均通过；当前只形成宿主 macOS arm64 的证据，未形成 Linux 构建证据。

## 官方事实

- Cargo 的 `--target` 接受 target triple，并将目标产物放入独立的 target 目录；因此可以分别构建 macOS 与 Linux 产物。[Cargo Book：cargo build](https://doc.rust-lang.org/cargo/commands/cargo-build.html)
- `rustup` 默认只安装宿主平台标准库；构建其他 target 需要先执行 `rustup target add <target>`，而交叉编译通常还需要目标平台 linker。因此“Rust 支持 target triple”不等于当前机器已经具备 Linux 发布构建能力。[rustup Book：Cross-compilation](https://rust-lang.github.io/rustup/cross-compilation.html)
- GitHub Release 以 Git Tag 标记仓库中的具体历史点，并可附带二进制资产；创建 Tag 本身不等于已经发布可下载的 Release。[GitHub Docs：About releases](https://docs.github.com/en/repositories/releasing-projects-on-github/about-releases)
- 对启用 immutable releases 的仓库，GitHub 建议先创建 draft、挂齐资产再发布；发布后关联 Tag 与 Release asset 不可修改或删除，并生成可验证的 Release attestation。[GitHub Docs：Immutable releases](https://docs.github.com/en/code-security/concepts/supply-chain-security/immutable-releases)

## 结论边界

技术上可以发布 macOS 与 Linux 的目标平台二进制，但当前仓库只能证明宿主 macOS arm64 构建，不能据此声称 Linux 版本可用，也不能把当前 `main` 声称为 RC 或 stable release。

在允许打 Tag 之前，至少需要冻结：目标架构与 Linux libc（例如 `aarch64-apple-darwin`、`x86_64-unknown-linux-musl`）、版本语义（alpha / RC / stable）、二进制资产与校验文件、每目标平台的 smoke test、GitHub Actions 构建/汇总流程，以及是否执行签名、SBOM、attestation 和 immutable Release。现有 ADR-0011 与跨仓发布合同已经给出更严格的候选基线，当前未因本研究改变它们。

## 最终执行核验（2026-08-18）

- 外部实现仓库 `main` 已推送至 `7c947117302fc513cca74f7862592378824de326`；实现仓库工作树干净。
- annotated Tag `v3.0.0-rc.1` 已推送，仍指向源提交 `afca89a718e991c5fc2709186cbb9f3c9964367f`，未移动 Tag。
- GitHub Actions [run 32052996408](https://github.com/iloveZzz/yss-template-runtime/actions/runs/32052996408) 全部成功：`event=workflow_dispatch`、`headBranch=main`、`headSha=7c947117302fc513cca74f7862592378824de326`、workflow `Release preview`（workflow database id `336346909`）。macOS `aarch64-apple-darwin`、Linux `x86_64-unknown-linux-musl` 构建/测试/运行时 smoke test、打包、资产上传和 Draft Release 汇总均通过。Linux 构建固定在 `ubuntu-24.04`，并验证静态 musl ELF。
- GitHub [Draft Release](https://github.com/iloveZzz/yss-template-runtime/releases/tag/untagged-812dc7a86cb773d3fc9b) 的 `tagName` 为 `v3.0.0-rc.1`，状态为 `draft=true`、`prerelease=true`，包含两个目标各自的 `.tar.gz`、`.sha256`、`.build-info.txt` 共 6 个资产。
- 重新下载远端资产后，两个 `.sha256` 均通过；`build-info` 均确认 `preview=true`、`signed=false`，归档内容仅为 `create-yss-spec`。
- GitHub Release API 的瞬态 `503` 已通过 workflow 重试处理；这不改变本轮“非稳定预览”的结论，也不构成稳定发布或 Node 替代证据。
