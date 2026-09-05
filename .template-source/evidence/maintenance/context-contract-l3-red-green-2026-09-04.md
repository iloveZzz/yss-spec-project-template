# CONTEXT.md 统一合同 L3 RED / GREEN 记录

日期：2026-09-04
范围：主模板、战略设计子项目、生命周期阶段证据、领域建模、战略交接与两套 CLI

## RED

- `yss-stage-decision` 场景先升级为 schema v2，并要求 `context_snapshot`；旧验证器首次运行不能识别新合同，明确暴露原先只保存路径、无法证明术语集与全文版本的问题。
- `context_reconciliation`、战略上下文导入和 `grill-with-docs` 上下文场景在实现前均无公开验证入口，场景按“缺少命令即失败”建立，证明原流程没有在批准或 `next_route` 前留下可机器核验的上下文对账证据。
- 主模板完整门禁首次执行发现战略设计技能来源树摘要漂移并失败，证明跨仓投影不能依赖陈旧 hash 静默通过。

## GREEN

- 主模板与战略设计模板都只允许 Git 根目录存在一个大小写严格的 `CONTEXT.md`，禁止嵌套副本、`CONTEXT-MAP.md`、跨仓相对/绝对引用和伪锚点。
- `CONTEXT.md` 使用 `context_schema_version: 1`、统一流程/业务表格、PascalCase 英文标识和 `<ContextId>/<EnglishIdentifier>` 稳定术语引用。
- 生命周期在批准或进入下一步前消费 `context_reconciliation`；项目实例必须为 `reconciled`，模板源记录带原因的 `not-applicable`。
- 领域战略与阶段决策包使用 schema v2 `context_snapshot`，旧 v1 只读并返回 `migration-required`；只有引用能唯一解析时才允许确定性迁移。
- 战略交接 v2 携带来源快照与结构化 `context_delta`，目标主项目完成根目录上下文合并及对账后才能进入战术设计。

## Fresh verification

以下命令均在本轮实际通过：

```text
scripts/verify-template-fast
cd submodules/yss-harness-design-agent && scripts/verify-template-fast
cd submodules/create-yss-spec && node --test tests/*.test.js
cd submodules/create-yss-strategic-design && npm test
```

两次 `verify-template-fast` 均因核心治理资产变化自动提升并完成 release profile；这证明候选当前通过完整机器门禁，但不代表已冻结候选、已提交、已推送或获得发布批准。

## REFACTOR 与压力场景

- 公共解析和摘要逻辑集中到 `scripts/lib/context-contract.mjs`，避免每个消费者自行解释 `CONTEXT.md`。
- 场景覆盖文件位置、大小写、嵌套副本、表格结构、标识格式、别名冲突、摘要漂移、旧 schema、未对账战略增量和合法跨仓导入。
- `.agents/skills` 继续作为权威技能源，其余 Agent 目录由同步命令生成；技能锁和战略来源摘要已重新计算并通过治理校验。
- 遗留的 `wait-what` 与 `setup-matt-pocock-skills` 多上下文说明已改为单根词汇表合同，不再建议创建或读取 Context Map。

## 当前边界

本轮状态仅为模板维护 `implementation-ready`。未执行 Git commit、push、候选冻结或发布动作；若要声明 `release-ready`，仍需按仓库流程显式进入候选与发布批准路径。
