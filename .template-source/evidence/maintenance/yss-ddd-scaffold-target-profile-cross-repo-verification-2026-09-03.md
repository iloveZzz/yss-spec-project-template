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
- 模板快照的 `npm pack --dry-run --json`：通过；随后版本号升级为 `create-yss-harness-dev@0.1.3`，`npm pack --dry-run --ignore-scripts --json` 继续通过，共 6685 个条目，packed size 14934249 bytes，unpacked size 79175872 bytes。

### `create-yss-spec`

- CLI 从 npm `latest=2.2.9` 升级到 `2.2.10`，默认模板 ref 固定为根仓 `c2308bb36a1f835343af5de1ee9ec2666f9d18cb`。
- 分发 manifest 补齐 `.mcp.json`、`.gemini/settings.json`、`.kiro/settings/mcp.json`、`.vscode/mcp.json`；init 回归测试同时按 active registry 正向验证 `yss-ui-business-page-generation`。
- RED：首次对新根模板执行完整测试为 49/56，通过之外的 7 个失败分别暴露 MCP 配置未分发与旧退役技能断言。
- GREEN：紧凑 init / ASCII attach seam 2/2 通过；完整 `npm test` 56/56 通过。
- `npm pack --dry-run --json`：通过；包名 `create-yss-spec@2.2.10`，6851 个条目，packed size 15187561 bytes，unpacked size 80902050 bytes；内容 `snapshotHash` 为 `05389fbdab05c78f76ab92044a2643aa262bfb9caa457c687be190c0797722f3`。

## Git 交付

- `yss-harness-dev-agent`：commit `a74be5287a1d0082ea1b2fe09b8d225a54d48ba2`，已推送到 `origin/codex/yss-ddd-target-profile`。
- `create-yss-harness-dev`：模板快照 commit `1ccb139aa8bd011a4db4d3f005d9c9235136d458`；版本升级 commit `d27293d6fcdb1e43875169a1ea80ea619dab3af0`，均已进入并推送到 `origin/main`。
- `create-yss-spec`：版本、固定根模板 ref、分发 manifest 与回归测试 commit `1ac41c4eb915c9cfb44f28d60b26e6bd04b7c1ae`，已推送到 `origin/main`。
- 根仓先以 commit `049f63b1a0417e9338f23bfbbbbbaadb1677b6d0` 合入并推送目标变更，随后以独立版本升级 checkpoint 将 CLI gitlink 更新到 `d27293d6fcdb1e43875169a1ea80ea619dab3af0` 并推送 `main`。
- 本轮本体 CLI checkpoint 将根仓 `create-yss-spec` gitlink 更新到 `1ac41c4eb915c9cfb44f28d60b26e6bd04b7c1ae`，与本记录一并进入 `main`。

## 尚未关闭

- 当前进程未注入 `YSS_MAVEN_REPOSITORY_URL`、`MAVEN_REPO_USERNAME`、`MAVEN_REPO_PASSWORD`，因此没有执行可作为发布证据的受控 empty scaffold / golden first slice 根 `./mvnw validate`、`./mvnw test`、`./mvnw package`；不得声明 `empty-scaffold-verified` 或 `first-slice-verified`。
- 本机缓存实际 YSS exception starter 的 TDD 已通过，但还不是受控仓库的可复现证据。
- 未冻结正式候选、未安排独立审查、未运行 release profile 的 candidate/full gate。
- GitHub 分支交付不等同于正式模板或 npm release；尚未创建 tag、GitHub Release 或发布 npm package。

回滚锚点为三个仓库的 `origin/main`；分支交付顺序为“两个子模块提交并推送 → 根仓更新 gitlink 并推送”。正式 release 前仍必须补齐受控 Maven 和发布审查证据。
