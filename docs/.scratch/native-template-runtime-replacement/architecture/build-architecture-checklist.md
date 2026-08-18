# Build Architecture Checklist：原生模板运行时

状态：`ready-for-human`

| 项目 | 约束 / 验收 |
|---|---|
| 运行时边界 | 用户 CLI 与模板实例运行时无 Node 前置条件；维护侧 Node 不在本切片迁移。 |
| 二进制 | 每个目标平台一个自携 snapshot 的 `create-yss-spec`；实例写入同一二进制的 runtime 角色。 |
| snapshot | runtime、模板 commit/tree/hash、受管文件 hash 在 release manifest 中绑定；不允许浮动 main。 |
| metadata | 事务升级 `.yss-template.json`；迁移后 Node 2.x fail-closed；保留 N-1 完整 snapshot/runtime 回滚。 |
| 公共兼容 | 命令、参数、默认值、交互、退出码、stdout/stderr、文件字节/mode、symlink 与 Git 状态双跑。 |
| 平台 | macOS 11+ arm64、Windows 10/Server 2016+ x64、Linux x64 musl；Linux 支持声明待 RC 真实环境冻结。 |
| macOS | 核心二进制：Developer ID Application、Hardened Runtime、timestamp；交付 `.pkg`：独立安装包签名、notarytool、stapling，并分别验签。 |
| Windows | Windows 原生构建，受信任 Authenticode/Azure 签名、timestamp 与 verify。 |
| Linux | 静态 musl 检查、SHA-256、Cosign、SBOM、attestation。 |
| 发布 | draft → immutable GitHub Release；仅受保护 release environment 可用签名身份。 |
| 回滚 | 安装器验证完整新资产后原子切换，保留 N-1；实例随固定 snapshot/runtime 一起回滚。 |
| 安装器 | 禁止 `curl | sh`；POSIX/PowerShell 都先验证 manifest、签名/attestation 和 SHA-256，再原子安装。 |

## 验证命令（待实现仓登记后冻结）

- Rust：`cargo test --locked`、`cargo clippy --locked -- -D warnings`、release target build；
- 行为 oracle：Node 2.x 与 Rust 3.0 在同一 fixture 的差异报告；
- 跨仓：固定模板 commit 的 init、attach、sync、冲突和失败回滚；
- 发布：各目标 native runner 签名/验签、SBOM、attestation、Cosign、安装/升级/回滚；
- macOS：核心 Mach-O 与 `.pkg` 分别签名/验签，notarization 与 stapling 都有可读取证据；
- 安装器：POSIX/PowerShell 的成功、篡改拒绝、失败不改已装版本和 N-1 回滚；
- 性能：每平台每场景 30 次，记录中位数、P95、峰值内存与压缩 snapshot 增量。
