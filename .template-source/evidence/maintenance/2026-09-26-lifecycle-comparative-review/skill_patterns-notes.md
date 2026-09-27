# 生命周期配套技能机制调研

## Research Scope

研究日期：2026-09-26。使用 `yss-research` 的 `technical-evidence / evidence-audited`，并由 `competitive-intelligence` 处理同类方案比较。先读用户材料、本地技能与历史评估，再查官方源。本文仅向主控交付研究依据；所有建议仍需与当前 YSS 合同和实际痛点对照。

范围为 Superpowers、GSD → GSD Core、Matt Pocock skills、Agent Skills 规范和 OpenAI 官方技能指导。排除安装与运行竞品、流行度排序、未经核验的性能收益。来源、实际检索词、反证和访问失败见相邻 sources.json。

## Executive Read

YSS 应保留身份、批准、合同新鲜度和 Git 授权边界，改进重点放在“每次只取得下一步所需输入、任务能独立验收、恢复先对账事实、效率必须测量”。同类工具已经提供这些机制，但其自动就绪、自动 commit、由 Agent 处理一般歧义等默认行为不适合直接移植。

本次发现旧 `gsd-build/get-shit-done` README 已指向 `open-gsd/gsd-core`。关键源码已固定 SHA；main/next 仍是可变分支，本报告不把固定快照说成长期稳定行为。见 claim-08。

## Findings

| 洞见 | 一手观察 | 可迁移建议与约束 |
|---|---|---|
| 1. 薄入口需要测到实际装载量（claim-01） | Agent Skills 将元数据、正文、资源分层；OpenAI 文档指出发现列表也有预算。 | 保留当前查询器与最小 Skill 集，按典型任务统计实际读取文件、字节、tokens、误触发率。不要只压 SKILL.md 行数后宣布提效。 |
| 2. 模板应描述执行者不能自行决定的内容（claim-02） | Superpowers 显式列输入输出与全局约束；GSD 把行为、产物与关键连接分开。 | 检查各阶段模板是否能回答“新增了什么决定、哪个下游消费、怎样证明”。用派生视图关联现有规则/场景/合同，避免新增重复事实表。测试 seam 和真实验证优先于行数/关键词代理。 |
| 3. 独立上下文和共享磁盘是两回事（claim-03） | Superpowers 每任务新上下文；每个计划各有 ledger 与 workspace。GSD 用落盘状态连接子 Agent。 | 继续用 YSS 任务包、允许写路径和角色绑定；可评估更小 dispatch 上下文。不要把 fresh context 描述成安全沙箱，也不要因此默认增派 Agent。 |
| 4. 恢复必须区分工作未做、已做未记账、外部仍在运行（claim-04） | GSD 恢复比对 handoff 与 git status，识别异步任务，避免因缺 SUMMARY 重复执行。 | 为现有 checkpoint/resume 补针对性的真实场景：崩溃发生在写文件后、证据登记前；状态与磁盘冲突；同任务外部作业未结束。复用 checkpoint，不另立一套状态权威。 |
| 5. 轻量工程技能能借用拆分法，不能借用就绪语义（claim-05） | Matt 确认 seam、垂直切片与依赖；其 to-spec 源码仍直接标 ready-for-agent。 | YSS 的 Spec ready-for-human、工程冻结和 Slice 合同批准是必要适配。宽机械迁移可研究 expand-contract 例外，但要落入既有影响裁剪和合同，不直接解除门禁。 |
| 6. 评估应扩展真实失败和成本，而非再建 runner（claim-06） | OpenAI 强调触发正负例、实际轨迹、产物、效率；Superpowers 有压力与反证记录。本仓已有 runner。 | 在既有基线/候选机制上增加跨阶段连续推进、恢复、摘要漂移、重复派发与边界授权场景；同步记录停顿、调用数和读取量。9 月 20 日报告未显示效率提升，不能由缩短文本推断加速。 |
| 7. 精简流程应靠影响面和运行成本决定（claim-07） | GSD 文档承认小任务全流程不划算；Superpowers 区分同会话实现与每任务子 Agent。 | 优先验证 YSS 现有影响裁剪和 continuation_ref 是否被实际正确执行；若轻任务仍多次无效暂停，针对可复现分支调整路由。保留 mandatory 门禁、明确 Git 授权与真实用户决定。 |

### 可独立复核的重点来源

- [Superpowers 编排](https://github.com/obra/superpowers/blob/8ca22dba9a94f28898bbce59f2537ff4d87c747d/skills/subagent-driven-development/SKILL.md)：工作区、上下文与审查机制，也显示其 ruling 边界。
- [Superpowers 实施计划](https://github.com/obra/superpowers/blob/8ca22dba9a94f28898bbce59f2537ff4d87c747d/skills/writing-plans/SKILL.md)：模板粒度与接口承接。
- [GSD 恢复源码](https://github.com/open-gsd/gsd-core/blob/b3a055c07d6577f5bcbce8d360653ddd6979d1c5/gsd-core/workflows/resume-project.md)、[阶段模板](https://github.com/open-gsd/gsd-core/blob/b3a055c07d6577f5bcbce8d360653ddd6979d1c5/gsd-core/templates/phase-prompt.md)：对账状态与目标反推。
- [Matt to-spec](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/to-spec/SKILL.md)、[to-tickets](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/to-tickets/SKILL.md)：显式调用与状态默认。
- [Agent Skills 规范](https://agentskills.io/specification)、[OpenAI Build skills](https://learn.chatgpt.com/docs/build-skills)、[OpenAI 技能评估](https://developers.openai.com/blog/eval-skills)、[OpenAI 指令精简指导](https://developers.openai.com/blog/rethinking-skills-and-prompts-for-gpt-6-astra)：标准、运行时与评估分别看待。

## Counter-Signals

- Superpowers 自己公开的 [2026-07-06 评估报告](https://github.com/obra/superpowers/blob/8ca22dba9a94f28898bbce59f2537ff4d87c747d/docs/superpowers/specs/2026-07-06-sdd-plan-scoped-workspace-eval-results.md) 承认原假设没有复现，且原始工具调用数没有下降。结构更清楚不等于性能更好。
- GSD 的上下文说明承认延迟与运行时维护成本；暂停模板包含 WIP commit。不要为了借用恢复能力而移植其副作用默认。
- Matt 的轻模板能减少起草门槛，但上游就绪标签与 YSS 有实质冲突。
- 本仓历史报告显示已有 16 场景 × 2 版本 × 2 次评估，两侧均通过；它不是全生命周期当前认证，也没有效率改善证据。

## Source Map

sources.json 提供 17 条实际检索/语料检查、23 条支持或反向证据、8 条主张与固定 revisions。GitHub 关键机制取固定 SHA 原文；官方网页保留检索日；本仓历史交付报告只说明既有能力与当时范围。

访问失败：Superpowers 固定 SHA 的 `evals/README.md` 返回 404。改读公开评估报告，未取得其临时原始轨迹。搜索命中的非官方 forks 与搜索摘要未作为判断依据。

## Decision Handoff

交回 `yss-product-lifecycle / yss-research` 主控做本仓实际差距评估。研究本身不批准方案，不修改 Skill、模板、CONTEXT、阶段状态或审批记录。建议优先选择 2—3 个真实失败案例，复现后再判断是否改合同、模板或执行器。

## Evidence Limitations

没有安装、执行或性能测试竞品；一手源码证明其规定了某机制，不能证明所有运行时都能实现。在线文档会变化，固定 SHA 也不代表已发行版本。子包只写任务允许的 notes.md / sources.json / result.json；正式研究校验器要求另一组固定文件名，完整研究包由主控聚合后校验。本次只验证 JSON 结构、引用闭包、文件非空与写范围。
