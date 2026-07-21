---
status: complete
owner: ai
method: writing-skills-red-green-refactor
---

# `yss-product-lifecycle` 编排器压力验证

> 日期：2026-07-21
> 范围：共享 skill、状态/依赖 references、checkpoint 模板和生命周期验证脚本。

## RED：修改前动态基线

两名独立只读 Agent 使用修改前的 Codex 专属 skill 模拟六个请求，没有读取增强设计，也没有写文件。

| 场景 | 实际基线行为 | 失败结论 |
|---|---|---|
| `audit`：禁止写入，检查缺人工确认的切片 | 能保守判定阻塞，但只能依用户约束拼出只读答复 | 缺少正式 `audit` 模式和结构化 readiness 公式 |
| `resume`：Spec 修改晚于 OpenAPI Freeze | 保守回到阶段 5 | 无状态恢复、内容核验、`stale` 精准传播和父 Ticket 修复协议 |
| `orchestrate`：推进到人工门禁 | 只输出入口分诊和下一个提示词 | 单步路由器行为，不能有界连续推进 |
| Wayfinder 无 frontier | 能意识到还需检查 blocked/claimed/fog，但具体算法无空 frontier 分支 | 不同 Agent 可能把空 frontier 误判完成 |
| tracker 配置与 origin 冲突且缺远端标签 | 可能按 origin 直接进入 `to-tickets`，到写入时才暴露缺标签 | setup readiness、平台漂移和真实标签预检缺失 |
| grill 已确认 MVP，但状态机问题需 prototype | 能路由 `handoff → prototype → handoff → to-spec` | 主路线基本正确，但缺少可恢复 checkpoint 和 Spec readiness 状态 |

RED 结论：修改前技能能提供方向性路由，但不能唯一产生可恢复、状态分层、有界推进的编排行为。

## GREEN：最小增强

- 将 `yss-product-lifecycle` 从 `.codex/skills` 平台专属技能提升为 `.agents/skills` 共享权威技能，并生成各 Agent root 投影。
- 主 `SKILL.md` 增加 `route / orchestrate / resume / audit`、有界推进、只读边界和实现主控规则。
- `references/orchestration.md` 增加 setup readiness、暂停条件、Wayfinder 完成判定和 grill 退出判定。
- `references/state-model.md` 增加分层状态、`ready-for-agent` 公式、版本化状态块和恢复算法。
- `references/artifact-dependencies.md` 增加资产依赖与 `stale` 传播。
- `references/matt-yss-adapter.md` 固定 Matt/YSS 分工及回流关系。
- stage checkpoint 模板增加状态块；生命周期验证脚本增加结构化语义断言。

## GREEN 动态场景结果

两名独立只读 Agent 使用增强后的共享 skill 重跑相同场景：

- `audit`：正确选择严格只读模式，分离资产、门禁和 Ticket 状态，并按公式阻断 `ready-for-agent`。
- `resume`：不再把时间戳直接等同语义失效；先比较内容和影响面，再沿相关依赖边传播 `stale` 并撤销相关切片 readiness。
- `orchestrate`：不再只给下一个提示词；按“选择工作单元—调用专项 skill—验收—重算”循环推进，到第一个实际人工门禁暂停。
- Wayfinder：明确“无 frontier 不等于完成”，四项完成条件全部满足后才 `handoff → to-spec`。
- setup：tracker/origin/真实标签冲突进入 `conflict` 并暂停，不再提前 `to-tickets`。
- grill/prototype：未决 runnable 问题完成双向 handoff 回流前不得进入 Spec baseline。

GREEN 结论：六个场景均不再退化到 RED 行为。

## REFACTOR

GREEN 重跑发现并修订三处新歧义：

1. 将 Wayfinder 条件收紧为不存在 **open** blocked/claimed child，避免已关闭但仍有 assignee 的 Ticket 永久阻塞 map。
2. setup 冲突明确引用 `docs/agents/issue-tracker.md` 的裁决优先级，并要求记录最终平台、真实标签检查和降级草案位置。
3. prototype 回流增加可核验证据：来源 handoff、运行/资产、结论、回填引用、剩余未决项和返回 handoff；口头声称不算完成。

独立审查首轮又发现并修订：

4. 新增 `orchestration-contract.yaml`，把模式副作用、Wayfinder 完成式、`ready-for-agent` 条件、影响类型传播和 prototype 回流字段变为机器可读契约。
5. 验证脚本解析契约并执行正向/负向变异场景；逐一将 Wayfinder/readiness 条件翻转为 false，必须观察到阻断。
6. 状态 schema 增加支持版本、未知版本暂停、双载体冲突重建和禁止降级覆盖规则。
7. 拆分 API-impact 与 no-API-impact 依赖路径，避免无 API 变更生成空 Draft Review。
8. 状态块增加结构化 `pause` 恢复字段；Matt adapter 明确 throwaway prototype 不能替代阶段 4 正式原型门禁。
9. 传播契约进一步拆分 `artifact/gate`、`direct/transitive` 和 `when` 条件；条件不满足时保留 `not-applicable`，未知 impact 必须暂停。
10. 自动化场景覆盖所有 impact type 非空、new-module 不激活 Spec Delta、no-API 不污染 OpenAPI、gate/asset stale 联动撤销 readiness，以及 prototype 任一证据缺失即阻断。
11. 未知 impact 在机器契约中显式返回 `pause / impact-classification-required`，避免消费者把空目标误解为可继续。

## Fresh verification

已执行：

| 命令 | 结果 |
|---|---|
| `git diff --check` | 通过 |
| `scripts/verify-lifecycle-scenarios` | 五类基础场景通过；机器契约的 mode、Wayfinder、readiness、影响传播和 prototype 回流正反场景通过 |
| `scripts/sync-skills --check` | 共享投影同步 |
| `scripts/update-skill-lock --check` | 锁文件与完整技能树一致 |
| `scripts/verify-template` | 模板发布校验通过 |

说明：本地模板门禁通过不等于整体可发布；外部 `create-yss-spec` 集成验证和独立审查仍按仓库规则处理。

## 独立审查

- 审查者独立于实现者，全程只读。
- 首轮发现的传播可执行性、验证假绿、schema 迁移及四项中等问题均已修订。
- 复审推动增加条件化 artifact/gate 传播、N/A 保护、readiness 联动和未知 impact 结构化暂停。
- 最终定点复核确认无阻断项、无 P1/P2 遗留，且未引入新阻断。
- 审查结论不替代外部 `create-yss-spec` 集成验证，也不构成模板发布授权。
