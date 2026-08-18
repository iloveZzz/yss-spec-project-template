---
id: TEMPLATE-RUNTIME-02
Status: ready-for-human
---

# 02：原生 CLI / 实例运行时与 snapshot 绑定

实现单一 `create-yss-spec` 二进制的 CLI 和实例 runtime 角色，内嵌固定模板 snapshot，并保证 metadata 事务迁移与 N-1 回滚。依赖 01 的 oracle 与模板契约冻结。

## Oracle 盘点后的待确认决策

1. 3.0 锁定文档化公开行为与固定 fixture，不承诺 Node 2.x 未文档化的参数容错；成功退出 0，参数/业务错误退出 1，帮助保持既有字节输出。
2. 3.0 `init --force` 采用事务性替换和失败回滚，不复制 2.x “先清空整个目标、无事务回滚”的风险行为；迁移说明必须标注这是有意安全变更。
3. 模板维护发布 gate（Node/PNPM）与模板实例 runtime gate 分离；实例 `attach/sync` 写后只调用 Rust native verify，不启动 Node/PNPM。
4. metadata v2 保留既有字段并增加 runtime metadata；迁移成功后 Node 2.x 必须 fail-closed，Rust 负责读写新 schema。
5. Windows x64 的 `.cmd`/PowerShell launcher 与 native verify 作为 3.0 新行为定义，不声称旧 Bash 脚本逐字兼容。

上述决策与用户已确认的 Slice 02 合同 v1 一致；实现必须按合同的允许写路径、证据文件和 fresh verification 执行。

## Comments

- 2026-08-17：已在 production repository 建立 Slice 02 RED→GREEN：固定 snapshot archive、manifest/snapshot binding、init、attach、sync、native verify、metadata v1/v2 migration、冲突基线保留、`.git` 保留与事务性 force/rollback。
- 当前 fresh verification：`scripts/cargo fmt --check`、`scripts/cargo test --locked`（26 tests）、`scripts/cargo clippy --locked --all-targets --all-features -- -D warnings`、`scripts/cargo build --release`、`git diff --check`，并通过 harness `scripts/verify-template`；Node/Rust init 与 attach dry-run 同 fixture 对照证据已写入 production `docs/evidence/02-node-rust-fixture-compare.md`。
- 独立 Reviewer 已完成最终只读复核：P0=0、P1=0、P2=4；前述非法 `metadataSchemaVersion`、`variables` 与 `cliVersion` P1 已按回归关闭，剩余为完整 binding schema、PTY 自动化、Windows launcher 与发布级 verifier 等后续边界。生产仓工作区仍未提交，等待人工 checkpoint 审查及 `TEMPLATE-RUNTIME-02` 的 commit/push 授权。
