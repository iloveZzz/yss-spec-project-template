# YSS DDD 脚手架 Target Profile 跨仓分发验证

日期：2026-09-03
状态：`implementation-ready`；不是 `release-ready`

## 分发范围与方向

本轮按单向合同把根仓最终 Target Profile 严格边界分发到：

1. `submodules/yss-harness-dev-agent` canonical skills、`harness-orchestrator` / `yss-router` 合同、平台投影和 `skills-lock.json`；
2. `submodules/create-yss-harness-dev/template` 及 `template.snapshot.json`。

同步使用精确文件或受控目录范围，未执行 reset、checkout、clean 或强制覆盖整个子模块；两个子模块原有脏工作树均被保留。CLI 快照只从本地 `yss-harness-dev-agent` 工作树生成，没有从 CLI 反向覆盖 canonical。

## 边界核对

- 三处脚手架能力均使用 contract / Manifest schema v2、显式 Maven 坐标与 Target Profile。
- schema v1、`slice_id`、既有目标、`--force` 覆盖、旧项目迁移和模板升级均为 `unsupported`。
- 在根仓 canonical、Harness canonical 和 CLI canonical 快照中检索 `compatibility-defaults`，结果为 0。
- CLI 快照来源固定为 `https://github.com/iloveZzz/yss-harness-dev-agent.git` 的 commit `a74be5287a1d0082ea1b2fe09b8d225a54d48ba2`，不包含本机仓库路径。
- CLI `template.snapshot.json` SHA-256：`3e840f4d5d4aa175c9dfbf773bb6118a1579b790b0bc0656490e2cabf6387e95`；内容 `snapshotHash` 为 `8daeb26dae794e32dbe9e07ca91bb904afdd05fe21baccdbe8bad1132b1885b2`。

## Fresh 验证

### `yss-harness-dev-agent`

- 聚焦 Node 测试：26 个用例，23 通过、0 失败、3 因缺少受控 Maven 环境而按合同跳过。
- `scripts/verify-scaffold-generator-scenarios`：通过。
- `scripts/verify-yss-router-scenarios`：通过。
- `scripts/verify-lifecycle-scenarios`：通过。
- `scripts/verify-yss-dto-openapi-profile`：通过。
- `scripts/sync-skills --check`、`scripts/update-skill-lock --check`、`git diff --check`：通过。
- `scripts/verify-template-fast`：通过。

### `create-yss-harness-dev`

- `npm run sync-template`：从已推送的 Harness 固定 commit 同步成功。
- `node --test tests/*.test.js`：56/56 通过。
- `npm pack --dry-run --json`：通过；包名 `create-yss-harness-dev@0.1.2`，6685 个条目，packed size 14934247 bytes，unpacked size 79175872 bytes；`prepack` 同样绑定上述远端 commit。

## Git 交付

- `yss-harness-dev-agent`：commit `a74be5287a1d0082ea1b2fe09b8d225a54d48ba2`，已推送到 `origin/codex/yss-ddd-target-profile`。
- `create-yss-harness-dev`：commit `1ccb139aa8bd011a4db4d3f005d9c9235136d458`，已推送到 `origin/codex/yss-ddd-target-profile`。
- 根仓在本记录随同目标变更提交时更新上述两个 gitlink，并推送同名分支。

## 尚未关闭

- 当前进程未注入 `YSS_MAVEN_REPOSITORY_URL`、`MAVEN_REPO_USERNAME`、`MAVEN_REPO_PASSWORD`，因此没有执行可作为发布证据的受控 empty scaffold / golden first slice 根 `./mvnw validate`、`./mvnw test`、`./mvnw package`；不得声明 `empty-scaffold-verified` 或 `first-slice-verified`。
- 本机缓存实际 YSS exception starter 的 TDD 已通过，但还不是受控仓库的可复现证据。
- 未冻结正式候选、未安排独立审查、未运行 release profile 的 candidate/full gate。
- GitHub 分支交付不等同于正式模板或 npm release；尚未创建 tag、GitHub Release 或发布 npm package。

回滚锚点为三个仓库的 `origin/main`；分支交付顺序为“两个子模块提交并推送 → 根仓更新 gitlink 并推送”。正式 release 前仍必须补齐受控 Maven 和发布审查证据。
