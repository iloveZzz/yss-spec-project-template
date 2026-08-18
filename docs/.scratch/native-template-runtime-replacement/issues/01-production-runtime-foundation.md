---
id: TEMPLATE-RUNTIME-01
Status: ready-for-human
---

# 01：正式 Rust 运行时仓与行为 oracle 基线

本切片已批准范围仅为公开生产仓的最小 Rust workspace 与 `create-yss-spec --help` Node 2.x 黑盒 oracle。不得从 POC 直接声称兼容；init/attach/sync、交互、metadata、文件、symlink、Git 与失败回滚属于后续切片。

已批准合同：`contracts/slice-01-implementation-contract.yaml`；批准记录：`gates/contract-approval-01.md`。

## 已完成的受控 bootstrap 证据

- 生产仓已建立隔离的 Rust 1.97.1 工具链；不再借用 Phase A POC 工具链。
- 独立审查确认 P0/P1 为零，允许 Git checkpoint；审查提出的 `-h` 与未实现命令 fail-closed P2 已在 checkpoint 前补测。
- 生产仓 fresh verification：`scripts/cargo fmt --check`、`scripts/cargo test --locked`（3 tests）、`scripts/cargo clippy --locked -- -D warnings`、`scripts/cargo build --release --locked`、`git diff --check` 均通过。

实现证据位于 `iloveZzz/yss-template-runtime` 的 `docs/evidence/01-*.md`。

## Comments

- 2026-08-17：在用户 `commit_authorized: true`、`push_authorized: true` 的 `2026-08-17-runtime-replacement` 授权下，production repository 的 `main` 已建立首个 checkpoint `1de00ea feat: bootstrap native runtime help oracle` 并推送至 `origin/main`。
- fresh verification：`scripts/cargo fmt --check`、`scripts/cargo test --locked`（3 tests）、`scripts/cargo clippy --locked -- -D warnings`、`scripts/cargo build --release --locked`、`git diff --check` 均通过；独立审查 P0/P1 为零。
- 下一步：先完成 Slice 02 的完整 Node 黑盒 oracle、template snapshot 与 init/attach/sync 行为；本 slice 的 checkpoint 不代表完整替代或发布批准。
