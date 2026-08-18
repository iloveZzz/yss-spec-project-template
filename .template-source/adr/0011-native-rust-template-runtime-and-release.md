# ADR-0011: 原生 Rust 模板运行时与 3.0 发布

## 状态

已接受

## 决策

以公开的 `iloveZzz/yss-template-runtime` 作为正式实现仓库，交付名为 `create-yss-spec` 的 Rust 原生运行时，替代实例侧和 CLI 侧当前公开的 Node 运行时行为。每个目标平台交付一个自携冻结模板 snapshot 的核心二进制；init/attach 时将其作为原生模板实例运行时写入实例。模板维护侧 Node 工具暂时保留。

3.0 覆盖 init、attach、sync、metadata 事务迁移、回滚、文件与 Git 行为及实例验证；旧 Node 2.x 保留为 `legacy` / `2.x`，npm `latest` 改为迁移 shim。实例 metadata 迁移后，2.x 必须 fail-closed。交付平台为 macOS arm64（macOS 11+）、Linux x64 musl 与 Windows x64（Windows 10 / Server 2016+）；Linux 的具体发行版支持在 RC 的 Ubuntu 22.04 与 RHEL 9 实测后声明。

Release 先发布 `3.0.0-rc.1`，完成三平台真实 init/attach/sync/rollback、每场景 30 次基准、独立审查和供应链验证后才发布 `3.0.0`。发布使用 GitHub draft → immutable release，资产绑定 runtime 和模板不可变 commit/hash、SHA-256、SBOM、attestation 与回滚版本；Linux 另有 Cosign 签名。macOS 核心仍是单一二进制，但正式交付为 Developer ID 签名、notarized、stapled `.pkg`；Windows 使用受信任 Authenticode 或 Azure Artifact Signing。签名凭据仅由平台发布团队在受保护 release environment 使用。

## 后果

这是对 ADR-0009 实例侧 Node 基线和 ADR-0010 POC-only 范围的取代。它不降低发布门槛：没有完整行为双跑、跨仓冻结 template 验证、真实平台证据、签名凭据、独立审查和发布团队批准时，不得发布 RC 或稳定版，也不得宣称已替代 Node。

## 2026-08-18 范围增量：双平台非稳定预览

用户确认将 Windows 延后，本轮只交付 macOS arm64 与 Linux x64 musl 的 `v3.0.0-rc.1` GitHub draft/prerelease 预览。该 Tag 与 draft Release 用于验证跨平台构建和下载资产，不是稳定版、正式 RC 放行或 Node 替代结论。

预览资产为未签名的 `.tar.gz` 二进制包及 SHA-256 校验文件；macOS Developer ID/notarization、Linux Cosign、SBOM/attestation、Windows 资产和 immutable stable release 仍保留在正式发布门禁中。预览不改变正式三平台交付基线，也不授权切换 npm `latest`。

## 2026-08-18 最终执行证据

外部实现仓库已按本增量完成预览发布：annotated Tag `v3.0.0-rc.1` 指向 `afca89a718e991c5fc2709186cbb9f3c9964367f`，`main` 的发布编排修订为 `7c947117302fc513cca74f7862592378824de326`。GitHub Actions [run 32052996408](https://github.com/iloveZzz/yss-template-runtime/actions/runs/32052996408) 由 `workflow_dispatch` 触发，使用 `main@7c947117302fc513cca74f7862592378824de326` 的 `Release preview` workflow，并在 job 内 checkout 固定 Tag；该 run 已通过 macOS arm64 与 Linux x64 musl 的构建、测试、运行时 smoke test、静态产物检查、打包和 Draft Release 汇总；[Draft Release](https://github.com/iloveZzz/yss-template-runtime/releases/tag/untagged-812dc7a86cb773d3fc9b) 保持 `draft` / `prerelease`，远端 6 个资产的归档校验均通过。该证据只关闭本轮双平台非稳定预览的执行项，不关闭正式发布的签名、SBOM、attestation、Windows、三平台集成或 immutable stable release 门禁。
