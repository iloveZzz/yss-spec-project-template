# Agent 入口上下文优化聚焦审查

Status: `ready-for-human`

## 范围与分级

- 强度：L2
- 触发：`local-rule`、`template-structure`
- 理由：调整根 `AGENTS.md` 的信息层级和 context pointer，改变 Agent 读取路径，但不改变生命周期门禁、Ticket 状态、生成语义或发布语义。
- 变更资产：`AGENTS.md`
- 未变更上游 skill：`.agents/skills/writing-for-agents/` 与锁定的 `mattpocock/skills@6acc160e4e0cd062dbbbd7a1b26ae92855edf07e` 完整目录无差异。
- escalation: `none`

## 最小反例

修改前执行：

```bash
wc -l -w -c AGENTS.md
rg -n 'implementation-repo-integration|Slice Implementation Contract|allowed_write_paths|apps/backend/<project>|ready-for-agent' AGENTS.md
```

基线为 147 行、13,662 字节。Slice Contract 字段、脚手架步骤和实现路径细节在根入口展开，而 `docs/process/implementation-repo-integration.md` 只在展开结束后才被弱指针引用。

## 修订结果

- 根入口为 106 行、约 9.9 KB，减少约 28% 行数和 27% 字节。
- 仓库身份、单一事实来源、条件门禁、Ticket 就绪语义、合同批准边界、实现路径禁令和 fresh verification 仍常驻。
- 生命周期、tracker、实现接入、Router contract 和 subagent 细则均由带触发条件的 context pointer 指向原权威资产。
- 未修改 `.agents/skills`、生成投影或 `skills-lock.json`；无差异不刷新 hash。

## Fresh verification

本轮已通过：

```text
scripts/sync-skills --check
scripts/update-skill-lock --check
scripts/verify-lifecycle-registry
scripts/verify-maintenance-intensity-scenarios
scripts/verify-template
git diff --check -- AGENTS.md docs/reviews/agents-entry-context-optimization-2026-08-18.md
```

`scripts/verify-template` 包含 Node tooling 9 项测试、六类生命周期压力场景、实现路径策略、YSS Router、脚手架受控生成、Matt/YSS 集成和 OpenAPI 场景，结果均通过。

## 聚焦独立审查清单

请非实施者确认：

- [ ] 任一 `template-source` skill 变更仍会触发 `maintaining-skills` 和 L1 / L2 / L3 分级。
- [ ] 任一 `project-instance` 变更仍会先执行影响面裁剪，再执行命中门禁。
- [ ] Spec / 原型 / OpenAPI Draft 与垂直切片的 `ready-for-human` / `ready-for-agent` 语义未改变。
- [ ] Router 仍不能批准合同、设置 `ready-for-agent` 或宣布完成。
- [ ] 脚手架仍只能在批准的受控生成合同下产生机械骨架，业务行为仍使用 `behavior-tdd`。
- [ ] `apps/backend/<project>/` / `apps/frontend/<project>/` 和禁止的单数 `app/` 路径语义未改变。
- [ ] 所有外移细节都有可触发、可解析的指针，且不需要猜测应读哪份资产。

独立审查完成前，本记录保持 `ready-for-human`，不生成通过的 L2 maintenance checkpoint，不声称可合并或可发布。
