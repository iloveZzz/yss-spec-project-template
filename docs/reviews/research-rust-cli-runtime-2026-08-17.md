# Rust CLI 运行时替换研究：启动/执行速度与单文件分发

## 记录信息

- 日期：2026-08-17（Asia/Shanghai）
- 仓库身份：`repository_mode: template-source`
- 问题：当前以 Node.js 运行的模板实例工具与外部 `create-yss-spec` CLI，若以 Rust 替换，是否能改善启动/执行速度并实现单文件分发。
- 证据性质：技术事实研究，不是 ADR、实施授权、迁移合同或最终采用/不采用结论。
- 性能边界：未执行基准；本文不宣称 Rust 相对 Node 的启动时间、总执行时间或二进制体积实测结果。

## 当前仓库约束

1. 已接受的 [ADR-0009](../../.template-source/adr/0009-zero-install-node-tooling-runtime.md) 明确模板实例的活动工具使用 Node `>=22 <27`，实例只分发 `scripts/lib/*.mjs` 和 `scripts/vendor/*.mjs`，不分发 `node_modules`，且门禁不得安装或构建依赖。
2. [跨仓库契约](../../.template-source/contracts/create-yss-spec-repository-mode-contract.md) 要求新模板快照可离线运行门禁；`init`、`attach`、`sync` 后均须重跑三个门禁，失败必须回滚文件与 metadata。现有 Runtime 迁移验收指定 Node 22/24，并规定已有实例的 `.rb` 只能经 `remove-report` 报告。
3. 当前维护 CI 在 [`.github/workflows/template-node-tooling.yml`](../../.github/workflows/template-node-tooling.yml) 的 Linux Node 22/24 阻断矩阵、macOS vendor 校验及 Node 26 观察任务中，安装维护依赖、重建 vendor、运行测试与 `scripts/verify-template`。实例侧没有这些安装步骤。

**事实：** 现有“零安装”是“不在实例安装 JavaScript 包”的契约，并不表示不需要运行时：实例目前仍需预装兼容的 Node。`scripts/vendor/yaml.mjs` 与 `scripts/vendor/xml.mjs` 当前分别约为 200 KiB、144 KiB（本仓 `du -h` 读取，非性能测试）。

## Rust 与目标平台分发

### 已确认事实

- `rustc` 将 crate 编译为 library 或 executable；Rust 可产出可执行二进制。[Rustc Book：What is rustc?](https://doc.rust-lang.org/stable/rustc/index.html)
- Rust 以 target triple 标识输出平台。官方平台支持页把 `aarch64-apple-darwin`、`x86_64-unknown-linux-gnu`、`x86_64-pc-windows-msvc` 列为 Tier 1；Tier 1 的承诺是官方构建发行物并在每次修改上自动构建、测试。[Rust Platform Support](https://doc.rust-lang.org/rustc/platform-support.html)
- Cargo 的 `--target` 支持 Rust target triple、`host-tuple` 和自定义 target specification；指定 `--target` 后，输出置于独立的 `target/<triple>/...` 目录。[cargo build](https://doc.rust-lang.org/cargo/commands/cargo-build.html)
- `rustup` 的初始工具链只安装宿主标准库。交叉编译需添加目标（`rustup target add <target>`）并用 `cargo build --target <target>`；官方同时说明交叉编译通常仍需要目标平台 linker（Android 示例需要 NDK）。因此“Cargo 支持目标 triple”不等于任何构建机都可无附加工具产出所有平台二进制。[rustup cross-compilation](https://rust-lang.github.io/rustup/cross-compilation.html)

### 推论

- 若交付面限定为 macOS、Linux、Windows，发布物至少应按 OS/架构拆分，而非一个可跨 OS 运行的文件。典型起点可为 macOS Apple Silicon、macOS Intel、Linux x86_64、Windows x86_64；这是候选发布矩阵，不是已批准范围。
- 仅为符合“单文件”目标，优先选择各目标的原生 runner 构建并在该平台 smoke test，风险小于只依赖跨编译；这会增加 CI job、release assets、校验和与回归面。

### 未知项

- 支持的最低 macOS/Windows 版本、CPU 架构，以及 Linux 的 libc 基线（GNU 或 musl）尚未冻结。
- 是否需要 Linux ARM64、Windows ARM64，或许可在 CI 中签名的 macOS 发布物，尚无需求结论。

## 体积、启动与执行速度

### 已确认事实

- `cargo build --release` 使用优化后的 release profile；官方说明 release 优化让程序运行更快，但编译时间更长。[The Rust Programming Language：Building for Release](https://doc.rust-lang.org/book/ch01-03-hello-cargo.html)
- Cargo profile 可配置 `opt-level = "s" | "z"`、`strip`、LTO 与 `codegen-units`。官方明确 LTO 会增加链接时间，`"s"`/`"z"` 不保证一定产生更小文件，应为项目实测选择。[Cargo Profiles](https://doc.rust-lang.org/cargo/reference/profiles.html)
- `strip` 控制 rustc 是否剥离二进制符号或 debug info；release 默认 `strip = "none"`、`lto = false`、`codegen-units = 16`。[Cargo Profiles](https://doc.rust-lang.org/cargo/reference/profiles.html)

### 推论

- Rust 的原生 executable 可移除目标机器上对 Node 运行时的依赖，因而有机会改善冷启动和简化用户侧运行环境；但它不自动证明端到端更快，也不自动更小。
- 要判断是否达到用户目标，必须对现有 Node 入口和同一 fixture 的 Rust candidate 做冷启动、热启动、总耗时、峰值内存、压缩包与解压后二进制大小比较。应同时记录机器型号、OS、Node/Rust 版本、输入、重复次数和命令。

### 未知项

- 现有慢点是 Node 启动、YAML/XML 解析、文件 I/O，还是 `create-yss-spec` 打包/快照处理，尚未定位；没有这项剖析就不能把任何收益归因于语言替换。
- Rust crate 选择、静态/动态链接、`strip`/LTO 设置都将显著影响发布大小与构建时长；尚无可复现基准。

## 签名、校验与安装更新

### 已确认事实

- `cargo install` 管理本机 binary crate；默认安装到 Cargo install root 的 `bin`。已安装 package 的版本/来源、features、profile 或 target 改变时会重新安装。此路径要求使用者已有 Cargo/Rust，并从源码构建，不等同于下载预构建单文件。[cargo install](https://doc.rust-lang.org/stable/cargo/commands/cargo-install.html)
- Cargo registry index 为 crate archive 记录 SHA-256 `cksum`，并支持把 `{sha256-checksum}` 用于下载 URL 模板。[Cargo Registry Index](https://doc.rust-lang.org/cargo/reference/registry-index.html)
- GitHub Actions 的 `upload-artifact` 输出 SHA-256 digest；下载 action 自动重新计算并校验该 digest。[GitHub Actions：验证 artifacts](https://docs.github.com/en/actions/tutorials/store-and-share-data#validating-artifacts)
- GitHub Actions 可通过 `actions/attest` 为 binary 创建 provenance attestation；GitHub CLI 可用 `gh attestation verify` 校验，且可附带 SBOM。[GitHub Actions：artifact attestations](https://docs.github.com/en/actions/how-tos/secure-your-work/use-artifact-attestations/use-artifact-attestations)
- GitHub release asset API 的上传响应含 SHA-256 `digest`。Immutable Release 会阻止发布后的 tag 与 release asset 被修改或删除，并产生可验证的 release attestation。[GitHub Release Assets API](https://docs.github.com/en/rest/releases/assets#upload-a-release-asset)、[Immutable releases](https://docs.github.com/en/code-security/concepts/supply-chain-security/immutable-releases)
- Apple 官方支持用命令行对外部分发代码签名，并建议提交经过 Developer ID 签名的软件做 notarization；这是一项额外的 macOS 发布流程，不是 Cargo 自动提供的能力。[Apple：Creating distribution-signed code for macOS](https://developer.apple.com/documentation/xcode/creating-distribution-signed-code-for-the-mac/)、[Apple：Notarizing macOS software](https://developer.apple.com/documentation/security/notarizing-macos-software-before-distribution)

### 推论

- 对“预构建单文件下载”而言，`cargo install` 不满足避免本地 Rust 工具链的目标；需要独立定义 release asset 命名、下载/解压、PATH 写入、SHA-256 文件、attestation 校验和更新/回退流程。
- GitHub artifact digest、release asset digest 与 attestation 能形成可验证的供应链证据，但必须在发布合同中规定使用者实际如何验证；仅上传资产不会自动完成用户端校验。
- 若 macOS 首发希望避免未知开发者警告，应把证书、签名、notarization、凭据管理与失败策略纳入发布范围；这增加维护成本。

### 未知项

- 是否允许下载脚本、是否需要自更新、更新是否要求显式版本确认、验证失败的回退策略，以及 Windows 代码签名政策，尚未定义。
- 当前 `create-yss-spec` 通过 npm 的具体安装/升级体验与发布权限边界，仍需在外部 CLI 仓库实际核对；本仓合同只明确 `npx create-yss-spec@latest` 入口。

## CI 构建与验证矩阵

### 已确认事实

- GitHub Actions matrix 可使用 OS 等变量生成多个 job；`include` 可添加非笛卡尔组合。[GitHub Actions：matrix strategy](https://docs.github.com/en/enterprise-cloud@latest/actions/how-tos/write-workflows/choose-what-workflows-do/run-job-variations#about-matrix-strategies)
- 每个 GitHub Actions job 在自己的 VM runner 或 container 中运行；无依赖的 job 默认并行。官方给出“按不同架构的多个 build job，再由 packaging job 汇总”的模式。[Understanding GitHub Actions](https://docs.github.com/en/actions/get-started/understand-github-actions)
- Cargo build script 运行在 host；交叉编译时，目标判断应读 `CARGO_CFG_*`，不能使用只反映 host 的 `cfg!`/`#[cfg]`。存在含 C/C++ 原生依赖时，这一点会影响 linker 和构建可移植性。[Cargo Build Scripts](https://doc.rust-lang.org/cargo/reference/build-scripts.html)

### 推论

- Rust 迁移的最低 CI 设计应将“原生构建并运行测试”与“产生、校验、汇总 release assets”分离：至少分别在目标 OS 上测试可执行文件，并把每个平台文件、SHA-256 和 provenance 交给发布 job。
- 当前 Node 22/24 行为兼容矩阵不会自然转换为 Rust CI；迁移仍须独立证明所有公开入口的参数、默认值、退出码、stdout/stderr、受管文件、文件 mode、symlink、Git 状态与 init/attach/sync 失败回滚保持契约。

### 未知项

- 目标平台的 runner 可用性、签名凭据保存方式、release job 权限，以及是否要在每种目标上执行外部 `create-yss-spec` 的完整 init/attach/sync 验收，均未定。

## 与现有 Node 零安装契约的差异

| 维度 | 当前 Node 方案 | Rust 预构建 binary 方案（候选） |
|---|---|---|
| 用户侧前置条件 | 兼容 Node；无 `npm`/`pnpm` 安装与 vendor 构建 | 匹配 OS/架构的 binary；无需 Node 或 Cargo，前提是发布方提供该 binary |
| 依赖供给 | 快照内 `.mjs` vendor bundle，维护侧 lockfile/integrity/SHA-256 | Cargo.lock 与 Rust crate 构建闭包；每个 target 单独 release asset、digest/attestation/签名策略 |
| 离线门禁 | 已被当前 ADR/合同明确要求 | 只有将 binary 随快照或安装完成后才可能离线；下载和更新阶段仍需网络，具体合同未定义 |
| 兼容性证据 | Node 22/24、实例无安装、Ruby oracle 对比与跨仓回滚 | 必须新增 target matrix 与 binary 验证；同样需要行为 oracle、回滚和跨仓集成证据 |
| 更新通道 | 当前外部 CLI 为 npm/npx，模板同步只使用包内快照 | 需另行确定 release 下载、版本选择、校验、更新和回退 |

## 下一步的可证伪验证（非实施授权）

1. 确定性能 SLO 和三个代表 fixture：仅启动/`--help`、最小模板门禁、最大真实快照 `attach` 或 `sync`。
2. 在同一干净机器上保留 Node baseline；为 Rust 最小 candidate 建立可复现 benchmark，记录命令、版本、输入、重复次数及原始结果。
3. 以真正支持范围为准锁定 OS/arch/libc，分别在原生 runner 构建、运行 smoke test，并记录压缩包和二进制大小。
4. 在不修改现有契约的前提下，对同一 fixture 比较入口的退出码、stdout/stderr、受管清单、字节、SHA-256、mode、symlink、Git 状态和失败回滚；候选 `verify-template` 不得自证。
5. 对预构建资产演练 SHA-256、attestation、macOS 签名（如在范围内）、下载失败与回退；再在固定模板 commit 的外部 `create-yss-spec` 仓运行完整集成验收。

## 结论边界

本研究确认 Rust 能构建目标平台 executable，并提供 release profile、target triple、构建矩阵和发布校验的官方能力；它也确认跨平台单文件分发会把 Node 的版本矩阵替换为多 target 构建、打包、签名与更新矩阵。是否值得承担该迁移成本，取决于尚未取得的性能/体积基准、目标平台范围和发布运维能力，本文不作采用决定。
