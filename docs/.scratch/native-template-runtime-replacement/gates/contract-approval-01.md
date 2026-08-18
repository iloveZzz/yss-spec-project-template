# Slice Contract 批准：TEMPLATE-RUNTIME-01

状态：已批准

| 字段 | 值 |
|---|---|
| approval_ref | 用户“确认共同理解并授权实施”（2026-08-17） |
| approver | 用户 / 生命周期编排器 |
| router_draft | `contracts/slice-01-implementation-contract.yaml` |
| persisted_ref | 本文件 |
| current_version | 1（已被 v2 替代）|
| 范围 | 生产 Rust workspace bootstrap 与 `create-yss-spec --help` Node oracle |

批准不涵盖 init、attach、sync、模板 launcher、metadata 迁移、CI、签名或发布；这些属于后续切片。

## v2 toolchain reroute

独立审查发现 v1 借用 POC-local Rust toolchain，不能让生产仓独立重现 fresh verification。生命周期以 `new-write-path` 与 `verification-command-changed` 重新编译 v2；用户的原始实施授权范围不变，v2 只增加 `rust-toolchain.toml`、受控 bootstrap 和 `scripts/cargo` wrapper。

| 字段 | 值 |
|---|---|
| approval_ref | 用户“确认共同理解并授权实施”（2026-08-17）+ 独立审查 P1 修复 |
| approver | yss-product-lifecycle |
| router_draft | `contracts/slice-01-implementation-contract.yaml` v2 |
| persisted_ref | 同一合同 |
| current_version | 2 |

## 独立审查与 checkpoint 准入

独立审查复测确认 v2 关闭了“生产仓借用 POC-local toolchain”的 P1；P0/P1 均为零。其非阻断 P2 已增加 `-h` 和未实现命令 exit 2 / stderr 的回归覆盖。生产仓内 `docs/evidence/01-independent-review.md` 保存审查结论与命令记录。

准入结论：允许进入 Git checkpoint；该结论不等于完整 CLI 兼容、RC 或发布批准。
