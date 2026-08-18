---
id: TEMPLATE-RUNTIME-04
Status: ready-for-human
---

# 04：RC 供应链、签名、三平台集成与性能

在受保护 release environment 上构建、签名、公证、证明并发布 draft RC；三平台执行真实集成和 30 次基准。POSIX/PowerShell 安装器必须先验证 manifest、签名/attestation 和 SHA-256，失败不改已装版本；macOS 必须分别验核心 Mach-O 与 `.pkg` 的签名，记录 notarization/stapling。缺少 Apple/Windows 签名身份、真实环境或独立审查即阻断。依赖 03。

## 2026-08-18 预览例外

用户确认先发布双平台非稳定预览：Windows、签名、公证、Cosign、SBOM、attestation、安装器和三平台正式门禁均延后。本轮只验证 macOS arm64 与 Linux x64 musl 的构建、测试、归档、SHA-256 和 GitHub draft/prerelease Release；该预览不改变正式 RC / stable 门禁。

## 2026-08-18 执行证据

- [Actions run 32052996408](https://github.com/iloveZzz/yss-template-runtime/actions/runs/32052996408) 由 `workflow_dispatch` 使用 `main@7c947117302fc513cca74f7862592378824de326` 的 `Release preview` workflow 启动，并在 job 内 checkout 固定 `v3.0.0-rc.1` Tag；该 run 已通过 macOS `aarch64-apple-darwin` 与 Linux `x86_64-unknown-linux-musl` 的构建、测试、目标运行时 smoke test、静态 ELF 检查、打包及资产上传。
- [Draft Release](https://github.com/iloveZzz/yss-template-runtime/releases/tag/untagged-812dc7a86cb773d3fc9b) 使用 `v3.0.0-rc.1`，保持 `draft` / `prerelease`，发布两份归档、两份 SHA-256 文件和两份构建元数据；远端下载后的两个校验均通过。
- `build-info` 记录 `preview=true`、`signed=false`，因此本证据不放行 Apple notarization、Linux Cosign、SBOM、attestation、Windows、安装器或 immutable stable release。
