# ADR-0010: 条件性验证 Rust 模板实例运行时

## 状态

已被 ADR-0011 取代

## 背景

ADR-0009 已接受模板实例使用 Node `>=22 <27` 的零安装运行时。为改善启动/执行速度并让实例不再要求预装 Node，现评估用 Rust 交付目标平台单文件二进制；这会以多平台构建、体积、签名、供应链和跨仓兼容成本，交换潜在的用户侧运行时收益。技术事实与未知项见 [Rust 运行时替换研究](../../docs/reviews/research-rust-cli-runtime-2026-08-17.md)。

## 决策

仅授权在 `/Users/zhudaoming/Projects/yss-template-runtime-poc` 建立独立的 Rust 验证 POC；它不进入模板实例分发面，也不修改 `create-yss-spec`。POC 必须在每个首发目标平台的相同 fixture 上证明公开入口行为完全兼容，且中位数冷启动至少快 3 倍或减少 500ms；基准覆盖 `--help`、最小实例门禁和最大真实 `attach`/`sync` 场景，每层至少 30 次，并记录 P95、峰值内存与压缩后快照增量。

POC 的首个行为 seam 仅为 `scripts/verify-template`；其他公开门禁继续保留 Node baseline，未获 POC 通过后的另一轮批准前不得迁移。POC fixture 必须从固定 `templateCommit` 复制，记录源 commit 与 SHA-256，并与当前模板源工作树完全隔离。POC 通过只形成 `ready-for-human` 评审包，不授权正式替换 Node、修改模板快照或变更 `create-yss-spec`。

若 POC 通过，后续实施候选仅替换模板实例公开门禁，维护侧 Node 暂保留。候选交付物是分别面向 macOS arm64、Linux x64（静态 `musl`）和 Windows x64 的目标平台单文件二进制，随模板快照离线分发；不保留新快照的 Node fallback，回滚使用上一完整模板快照。正式候选必须保留命令名、参数、默认值、退出码、stdout/stderr、受管文件、哈希、文件 mode、symlink 与 Git 状态，并完成 `create-yss-spec` 的 init、attach、sync 和失败回滚跨仓验证。

POC 可以在未配置签名凭据时运行，但不能作为发布候选。发布候选需在真实目标平台执行阻断 CI、具备可追溯构建、SHA-256 与 provenance attestation，并由平台发布团队作为 release maintainer，负责 macOS Developer ID 签名/notarization 和 Windows Authenticode 签名。压缩后模板快照总增量不得超过 25 MiB。

## 取舍

预构建二进制能消除实例侧 Node 前置条件，却使一个 Node 版本矩阵变为三个目标平台的构建、运行、签名和更新矩阵。把该选择保持为 `提议` 可防止在性能和行为证据缺失时错误地废止 ADR-0009；已有 Node 快照保持原状，任何发布问题通过新快照和 CLI 明确升级提示修复，不静默替换已分发文件。
