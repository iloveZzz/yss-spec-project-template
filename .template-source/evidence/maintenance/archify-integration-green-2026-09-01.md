# Archify 集成 GREEN 证据

日期：2026-09-01

实现结果：

- 主模板与 `submodules/yss-harness-dev-agent` 均引入 Archify v2.16.0 完整 skill 目录，并锁定上游 commit `199360cc6687a7857b54dd188d4922b09e466a4b`。
- 两边均通过 `node --test .agents/skills/archify/test/yss-safe-deliver.test.mjs`：8/8。
- 两边均通过 `scripts/sync-skills --check`、`scripts/update-skill-lock --check`、`scripts/verify-skill-registry` 和 `scripts/verify-skill-governance`。
- `create-yss-spec` 与 `create-yss-harness-dev` 均通过完整 CLI 测试：56/56。
- `scripts/verify-template-fast` 在主模板因既有核心资产改动自动升级为 release profile 后通过；战术设计模板 fast profile 通过。
- 上游 Archify 套件在 Node 22 下执行 `npx -y node@22 ../scripts/run-tests.mjs`：1021 项，994 通过、0 失败、27 个需 Chrome 或外部仓库的场景按设计跳过。

打包复核：

- `create-yss-spec@2.2.6`：15,126,127 bytes，解包 80,224,763 bytes，6,753 项。
- `create-yss-harness-dev@0.1.0`：14,919,718 bytes，解包 78,777,233 bytes，6,652 项。

两套 CLI 快照均包含 canonical skill、七个平台投影、注册表、锁文件和 YSS 集成说明。
