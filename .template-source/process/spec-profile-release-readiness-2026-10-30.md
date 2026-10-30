# Spec 改造正式来源与发行准备

日期：2026-10-30。用户要求获得提交/发行授权后执行固定来源及完整检查。本记录是可审阅的准备，不代表授权、提交或发行结果。

## 当前事实

- 模板工作树 `/workspace/spec-redesign-template`，分支 `spec-redesign`，基线 `89b06397c89206ed0014fa995a6de0e14f1bc61e`；CLI 工作树 `/workspace/spec-redesign-cli`，同分支，基线 `74ce95303bae26adbeebfc01498efaf481a5b060`。两者均有未提交及未跟踪改动。
- CLI 正式 `docs/source-lock.json` 仍绑定模板 v4.8.3 / `4efd67df00c9e415ab206970dfdd9c39c3ad6851`，不包含本次改造。来源刷新默认预演因模板工作树不干净拒绝；没有修改正式锁。
- 本次候选 Bundle 与上次全量测试针对 working-tree 来源，只证明候选；不能充当新的正式版本证据。
- `docs/superpowers/` 和 `.superpowers/` 被忽略；若希望持久保存计划和工作台账，提交前应确定去向，不能假定其自动进入提交。
- 发现 CLI 参考文档曾错误使用精简模式生成，减少约 1 万行；已按正式工具使用 `go run ./tools/helpdocs --reference` 重新生成并通过 `--reference --check`。仍有 682 行删除和 172 行新增，需在正式发行审阅时结合 Spec 路由变化检查；生成一致性不单独证明内容语义正确。

## 拟执行顺序

1. 审阅并明确两个仓库提交范围、目标版本和发行摘要；处理正式版本所需的文档与生成物。提交、推送、合并及发行分别以明确授权覆盖，不把设计批准当作发布授权。
2. 模板正式发行入口要求干净 `main` 且 HEAD 与 `origin/main` 一致；以当前最新正式模板提交 `4efd67df00c9e415ab206970dfdd9c39c3ad6851` 为 base，独立执行 `scripts/verify-template --base <SHA>` 的完整 release 档。`.template-source/scripts/release-template.mjs` 的准备阶段只跑 fast，不能代替完整档。准备、审查证据与发行说明后，再按授权执行 tag、推送和 Release，并回读核验。
3. CLI 以已实际发布的模板 tag 先预演来源锁刷新，再使用 `node tools/refresh-source-lock.mjs --source-root <模板根> --profile all --tag <新标签> --apply --regenerate` 更新固定来源和生成物；验证来源提交、tag、摘要与产物。模板须干净且符合来源工具策略。
4. 提交适用 CLI 变更，在固定源码与真实 Bundle 上执行全量测试、覆盖率、构建、冒烟、产物重算及 release tooling，真实记录失败及未覆盖项。正式 native 证据需要实际 darwin/arm64，可使用现有 `.github/workflows/release-evidence.yml` 的 macOS runner；本机 Linux 交叉编译不能替代。公开发行后的下载及校验另记结果。

版本号、目标仓库及分支、推送/合并/发布权限仍需明确。当前尚无正式来源提交、固定版本的完整模板检查或正式发行证据；本计划不声称这些已完成。
