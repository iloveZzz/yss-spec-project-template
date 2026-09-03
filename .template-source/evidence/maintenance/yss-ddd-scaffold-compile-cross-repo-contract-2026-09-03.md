# YSS DDD 脚手架跨仓分发合同

## 影响面

- Harness-only：主模板仓 canonical skill、Router / 生命周期合同、投影、锁文件和验证场景。
- Release-only：`yss-harness-dev-agent` 分发源与 `create-yss-harness-dev` 内置模板快照。
- Backend runtime：`not-applicable`，没有修改产品后端实现仓库。
- Frontend runtime：`not-applicable`。
- OpenAPI：`not-applicable`。
- `/Users/zhudaoming/Projects/demo/yss-meta/apps/backend/metadata-platform/`：只读参考，不属于写入或交付范围。

## 单向分发顺序

1. 修改主模板仓 `.agents/skills/yss-ddd-scaffold-generator` canonical 与调用方合同。
2. 运行 `scripts/sync-skills`、`scripts/update-skill-lock` 生成主仓运行时投影。
3. 将相同脚手架能力同步到 `submodules/yss-harness-dev-agent` canonical；按该仓当前 `harness-orchestrator` 合同适配调用方，再生成其投影和锁文件。
4. 在 `submodules/create-yss-harness-dev` 运行 `npm run sync-template`，只从本地 `yss-harness-dev-agent` 工作树生成 CLI 内置模板快照。
5. 执行主仓 fast verification、分发源场景检查、CLI `npm test` 与 `npm pack --dry-run`。

禁止从 CLI 快照或参考工程反向覆盖主仓 canonical。

## 实际验证

- 早期“14/14 通过、包含真实 Maven 三阶段”的记录未绑定当前 Target Profile 的受控仓库环境，现撤回其 `empty-scaffold-verified` / `first-slice-verified` 证明力；当前结论以后续 Target Profile 跨仓验证记录为准。
- 主仓 `scripts/verify-template-fast`：退出码 0。
- `yss-harness-dev-agent` 投影 / lock / 脚手架场景：退出码 0。
- `create-yss-harness-dev`：56/56 测试通过；`npm pack --dry-run --json` 退出码 0。

## 发布与回滚边界

当前只达到 `implementation-ready`，没有创建 commit、tag、PR 或发布包，不声明 `release-ready`。正式发布仍需分别冻结两个 submodule 候选、完成各仓要求的独立审查和完整发布门禁。回滚点为三个仓库各自当前 HEAD 加本轮未提交工作树差异；任何回滚必须按仓单独审查，不使用跨仓强制覆盖。
