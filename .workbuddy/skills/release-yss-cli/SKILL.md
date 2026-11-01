---
name: release-yss-cli
description: 按用户指定范围用 Rust 构建 YSS CLI、打包发行产物，并在获得对应授权时发布。
---

# YSS CLI 构建与发布

依据用户指定的 CLI 仓库、模板源、版本、target 和发布范围执行。先读实际 `Cargo.toml`、`rust-toolchain.toml`、构建文档与内部 `yss-bundle --help`；未发布的接口称开发构建，不宣称旧程序支持。不要补建发布脚本、测试套件或资格流程。

固定真实 CLI 与模板来源。工作树存在改动时保留实际 HEAD、工作树状态和内容摘要，不能把 HEAD 冒称全部产物来源。保留无关工作，不覆盖已有发行资产；`docs/template-release.json` 的既有标签不自动指向当前模板。

在 Rust CLI 源码仓按实际支持的入口执行：

```text
cargo run --locked --bin yss-bundle -- --source-root <模板绝对路径> --out assets/bundle.tar.gz
cargo build --locked --release --bin yss --target <target>
cargo run --locked --bin yss-bundle -- package --binary <实际程序> --version <Cargo中的版本> --target <target> --out <发行归档>
```

Bundle 必须先生成。只分发 `yss`/`yss.exe`；内部 `yss-bundle` 不分发。打包器从实际程序的构建记录读取来源，并核对版本和目标架构；不手写来源、不执行外平台程序取版本。用实际归档生成 `SHA256SUMS`，再用同平台新程序执行离线 `upgrade --dry-run` 验证。

归档名为 `yss_<版本>_<完整Rust target>.tar.gz`，Windows 为 `.zip`；包内只有程序和 `release-manifest.json`。发行清单使用 `format: yss.release`、`formatVersion: 1`，工具收据 `.yss/tool.json` 由安装器生成。发行目标仅为 macOS ARM64（`aarch64-apple-darwin`）和 Windows x86_64（`x86_64-pc-windows-msvc`）。分别报告构建与原生运行证据，不能将交叉编译或模拟器结果称为原生验证。

Rust 在线默认 GitHub 固定仓库 `iloveZzz/yss-cli`；公开读取不携带鉴权。`--source gitlab` 显式选择固定次级来源 `https://gitlab.yss.test:9443/yss/yss-cli`，使用显式 `YSS_GITLAB_CA_FILE` 与受限 PAT `YSS_GITLAB_TOKEN`；动态核验项目 ID、完整路径、Web URL、Release 和同项目资产，资产 HEAD 必须返回真实 Content-Length。保留 TLS 主机校验，不关闭验证或发送凭据到其他来源。离线 `--artifact` 不与 `--source` 混用；不自动跨来源回退。CI Job Token 只用于受支持的 CI 身份通道；模板源码从 GitHub 固定仓库读取真实提交，不向 CI 注入 PAT。

仅构建不产生远端发行。获得对应发布授权后，默认在 GitHub 固定仓库核对实际标签与资产，用可用连接器/API 上传真实产物；仅用户选择 GitLab 时向其固定项目发布；标签创建、提交和推送仍需其真实授权。不要自动双发或在来源失败后改投其他平台。报告实际源码状态、产物及摘要、发布结果和仍未执行的平台检查。
