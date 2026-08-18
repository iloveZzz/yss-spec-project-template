# 跨仓原生运行时发布合同

状态：`ready-for-human`

## 参与仓库

| 仓库 | 角色 | 当前状态 |
|---|---|---|
| `yss-spec-project-template` | 模板运行时契约、launcher、固定模板来源与验证基线 | Harness / `main` |
| `create-yss-spec` | Node 2.x legacy 与 npm 3.0 migration shim | 外部既有仓 / `main` |
| `yss-template-runtime` | Rust 生产实现、平台构建、RC/稳定 release | 外部公开仓库，`main` 已建立；双平台预览编排提交 `7c947117302fc513cca74f7862592378824de326` |
| `yss-template-runtime-poc` | 私有 Phase A 行为实验基线 | 外部只读参考，不作为生产来源 |

## 不可变绑定

每个 RC / 稳定 release manifest 必须记录 runtime commit、模板 commit、模板 tree/hash、目标 triple、二进制 SHA-256、SBOM、attestation、Cosign/平台签名引用、安装器 SHA-256 与 N-1 rollback release。

## 安装器信任合同

- 不发布或文档化 `curl | sh`；POSIX 与 PowerShell 安装器都是可下载、可审阅的版本化资产。
- 安装器先下载 release manifest、对应平台资产及其签名/attestation 引用；先验证 manifest 身份、签名或证明和 SHA-256，再写入任何可执行文件。
- 只有完整验证成功后才原子切换当前版本，并保留 N-1；任何下载、验证、解包或切换失败不得改变已安装版本。
- RC/稳定验收必须覆盖 POSIX 与 PowerShell 的成功安装、签名/hash 拒绝、断点失败和 N-1 回滚；不得把脚本存在或下载成功当作安装通过。

## macOS 交付合同

- 核心 Mach-O 二进制使用 Developer ID Application、Hardened Runtime 与 secure timestamp 签名；
- `.pkg` 作为发布容器，必须使用适用的安装包签名身份签名，并分别验证二进制签名和安装包签名；
- `.pkg` 必须 notarize 并 stapling，RC/稳定验收记录 `spctl`、签名验签和 stapling 结果；
- 仅签核心二进制、未对 `.pkg` 签名/验证/公证/stapling 的构建不得作为发布资产。

## 切换顺序

1. Harness 评审并冻结 runtime 契约与模板 launcher；
2. Rust 仓以该固定模板 commit 构建签名 RC；
3. 三平台真实 init/attach/sync/rollback 与双跑/性能验证；
4. `create-yss-spec` 发布 npm 3.0 migration shim，2.x 进入 legacy；
5. 平台发布团队批准 immutable RC；满足晋级条件后发布稳定版。

任一环失败时：不切换 npm `latest`，不发布稳定版；实例回滚到上一个完整 snapshot/runtime，安装器回滚到 N-1。

## 不适用

OpenAPI、前端、后端、数据库和权限业务行为：`not-applicable`，原因是本变更只影响模板工具链和发布运行时。
