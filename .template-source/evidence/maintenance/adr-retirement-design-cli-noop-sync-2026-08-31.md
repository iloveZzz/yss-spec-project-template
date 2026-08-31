# 战略设计 CLI ignored 快照同步与可复现证据

- executed_at: `2026-08-31T11:14:20Z`
- source_repository: `https://github.com/iloveZzz/yss-harness-design-agent.git`
- source_head: `f2c5f5878589667919f9000913743a288580ef46`
- cli_repository: `submodules/create-yss-strategic-design`
- cli_head: `161a79e818ee17bef14f914d26ac698957dfea23`
- profile_id: `harness.business-ddd-strategy-handoff`
- snapshot_hash: `be84a48c1a93b6f85e6c9f8101e2b0abf2de7bd4c03dc9df04934eee93990635`

## 实际执行

在 CLI 仓库以 `YSS_STRATEGIC_DESIGN_TEMPLATE_REPO=https://github.com/iloveZzz/yss-harness-design-agent.git`、`YSS_STRATEGIC_DESIGN_TEMPLATE_REF=f2c5f5878589667919f9000913743a288580ef46` 执行 `npm run sync-template`。生成器从已推送的稳定模板 commit 重新投影实例分发清单，得到 `snapshot_hash=be84a48c1a93b6f85e6c9f8101e2b0abf2de7bd4c03dc9df04934eee93990635`。该 profile 不分发 `.template-source/adr/**`、模板源治理 README、wiki 与治理校验脚本，但会分发 `docs/adr/README.md`；后者的“模板源不再维护实时治理 ADR、project-instance 仍可维护产品 ADR”边界变更已经进入 761 个 ignored 发布 post-image。由于 `template/`、`template.manifest.json`、`template.snapshot.json` 均被 Git 忽略，CLI 工作树没有对应 tracked 内容 diff 不代表发布字节无变化。

Round 2/3 独立审查进一步发现，旧生成器每次以墙钟时间重写 `generatedAt`，使 `prepack` 无法复现冻结字节。已按 TDD 新增“同一稳定 commit 连续同步产生字节一致 snapshot metadata”测试，先观察失败，再把 `generatedAt` 改为模板 commit 的提交时间；完整测试 6/6 通过，`npm pack --dry-run` 前后 snapshot SHA-256 一致。修复提交 `161a79e818ee17bef14f914d26ac698957dfea23` 已推送至设计 CLI 远端 `main`。

随后执行 `npm test`，6/6 通过。该证据证明稳定来源同步、受控 profile 投影与 prepack 可复现；不构成发布批准。
