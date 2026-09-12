# Agent 工作流竞品调研

截至 2026-09-11，**YSS 不能把“有 Spec、有审查、有恢复、有 hash”作为独占优势**。Superpowers、GSD Core、Matt Skills 已在这些方面形成可读实现。更值得验证的方向是：在组织规则和跨仓交付场景下，让状态失效原因、恢复动作、上游适配冲突和执行成本可解释。

本报告应用 `yss-research` 的 `strategy-evidence / evidence-audited`、`competitive-intelligence` 和 `i-have-adhd` 中文研究写法。研究是模板维护输入，不批准产品方向，不修改 `CONTEXT.md`、Spec、Ticket 或门禁。来源、精确定位、检索日志、逐条 claim 审计及任务结果见相邻 [agent-workflows.json](agent-workflows.json)。

## 必须先纠正的竞品身份

| 项目 | 当前核验结果 | 比较口径 |
|---|---|---|
| obra/superpowers | 未归档、MIT；最新正式 Release v6.3.0，2026-08-12；读取 HEAD `b36e0829c6d0140e93cfef2ca599b1b07d4a7797` | 当前技能方法论；源码可能晚于 Release |
| gsd-build/get-shit-done | 2026-06-26 归档；当前 README 正式指向 open-gsd/gsd-core | 旧地址仅用于历史和迁移证明 |
| open-gsd/gsd-core | 未归档、MIT；最新正式 Release v1.13.0，2026-09-06；默认分支是 `next` | 能力阅读固定 `main`：`b67f6028ce572f0504a035f9cdf5e11b0cb86bf0`，不把开发分支当已发布能力 |
| mattpocock/skills | 未归档、MIT；最新 Release v1.2.3，2026-08-06；HEAD `3cca18b368ae95cdbdebbff572ccafa662551015` | 小型可组合工程技能；同时也是 YSS 已使用的上游来源 |
| gsd-build/gsd-2 → open-gsd/gsd-pi | 旧 README 指向 GSD Pi；Pi 未归档、MIT；最新 Release v1.19.0，2026-09-09 | 相邻的独立 Agent 运行时，不能和模板直接等同 |

以上由 [Superpowers API](https://api.github.com/repos/obra/superpowers)、[GSD 迁移说明](https://github.com/gsd-build/get-shit-done/blob/bdcaab2c752d9a33a1a1ca9acf3a3c81fb991815/README.md)、[Core API](https://api.github.com/repos/open-gsd/gsd-core)、[Matt Release](https://github.com/mattpocock/skills/releases/tag/v1.2.3)、[GSD 2 迁移说明](https://github.com/gsd-build/gsd-2)及 [Pi Release](https://github.com/open-gsd/gsd-pi/releases/tag/v1.19.0)交叉确认。搜索缓存仍展示旧 GSD 安装介绍，因此这里只采用当前官方页面和 API 的状态。不使用 star 数推断真实用户、满意度或商业价值。

## 能力、采用成本和适用边界

| 维度 | Superpowers | GSD Core | Matt Skills | GSD Pi |
|---|---|---|---|---|
| 定位 | 自动触发的工程方法论 | 由讨论、规划、执行、验证、交付组成的阶段循环 | 显式组合的小技能 | 本地 Agent 运行时与项目工作台 |
| 接入 | 多 Agent 插件入口；按各运行时安装 | 跨运行时 installer；greenfield/new-project 与 brownfield/onboard | 托管 Claude plugin 或可编辑 skills.sh 副本，逐仓 setup | 独立 CLI、provider 配置、TUI/可选 Web |
| 上下文恢复 | 每任务新 implementer；计划范围 ledger、report、review package；跨 compaction 保留进度 | `.planning/` 文件状态；薄主控和新上下文工作 Agent；state validate/sync | handoff 引用已有资产，写 OS 临时目录，建议下一会话技能 | `.gsd/` 本地数据库，Markdown 投影；项目记忆与运行状态 |
| 审查验证 | Fresh Verification、Spec/质量 task review、最终分支审查 | 验证阶段、状态一致性和机器状态合同 | standards/spec 两轴并行审查；明确无 Spec 时可报告跳过该轴 | 计划、摘要、验证记录与工作树自动化，深层审查语义本轮未展开 |
| 协作 | 主控持有任务 brief 和 review diff；修复有轮次上限及 ruling | 分波次并行、运行时特定安装/隔离路径 | 小技能依赖使用者组合；并行审查两个轴 | 工作树隔离、扩展与多 provider |
| 供应链 | 多平台插件分发，更新方式随宿主 | manifest hash 检测修改；备份、patch 重应用、兼容提示 | 可编辑副本与订阅 bundle 分离；marketplace source SHA pin | scoped npm 包迁移与资源更新，不能照搬旧安装名 |
| 本轮主要限制 | 规则存在不等于真实会话必然遵守 | machine state 有 lossy/best-effort 投影；新 issue 待复现 | 灵活性需要团队自行定义正式批准和恢复保留期 | 引入运行时的成本和自由度取舍需实际试用 |

能力定位分别见 [Superpowers verification](https://github.com/obra/superpowers/blob/b36e0829c6d0140e93cfef2ca599b1b07d4a7797/skills/verification-before-completion/SKILL.md)、[SDD](https://github.com/obra/superpowers/blob/b36e0829c6d0140e93cfef2ca599b1b07d4a7797/skills/subagent-driven-development/SKILL.md)、[Core architecture](https://github.com/open-gsd/gsd-core/blob/b67f6028ce572f0504a035f9cdf5e11b0cb86bf0/docs/ARCHITECTURE.md)、[Core update](https://github.com/open-gsd/gsd-core/blob/b67f6028ce572f0504a035f9cdf5e11b0cb86bf0/docs/how-to/update-gsd.md)、[Matt handoff](https://github.com/mattpocock/skills/blob/3cca18b368ae95cdbdebbff572ccafa662551015/skills/productivity/handoff/SKILL.md)、[Matt review](https://github.com/mattpocock/skills/blob/3cca18b368ae95cdbdebbff572ccafa662551015/skills/engineering/code-review/SKILL.md)及 [Pi README](https://github.com/open-gsd/gsd-pi/blob/0fd02c1ea7a87d9d9a8bb8323322de597520e1b4/README.md)。表中的采用成本是接入步骤和架构边界，未测耗时、token 或费用。

## 反证让机会更具体

**更多审查不自动产生更好结果。** Superpowers 用户曾报告流程对小项目偏重、review/test 循环不断扩大验收面；但同一小项目报告也承认审查找到了无效测试和真实验证缺口。当前 v6.3.0 已加入三档任务裁剪、同构小任务合并调度与收敛处理，不能继续把旧版问题写成现版确定缺陷。两个 issue 在 REST API 中均为 closed/completed，而搜索缓存把 #2112 显示为 Open。[历史单例 #1735](https://github.com/obra/superpowers/issues/1735)、[历史单例 #2112](https://github.com/obra/superpowers/issues/2112)、[v6.3.0](https://github.com/obra/superpowers/releases/tag/v6.3.0)。

**“机器可读”与“可据此批准”需要分开。** Core 的 state.json 有固定版本和字段，`next` 复用主路由判断；它仍是 best-effort 展示投影，空阶段列表不能区分没有路线图与路线图不可读，Deferred 被映射成 pending。这是明确记录的取舍，不能简单记成“状态系统弱”。YSS 若面向正式交接，应验证消费端能区分未知、未做、失效和真正通过。[状态合同源码](https://github.com/open-gsd/gsd-core/blob/b67f6028ce572f0504a035f9cdf5e11b0cb86bf0/src/state-contract.cts)、[合同限制](https://github.com/open-gsd/gsd-core/blob/b67f6028ce572f0504a035f9cdf5e11b0cb86bf0/docs/features/machine-readable-state-contract-planningstatejson.md)。

**恢复机会在“为什么停住、怎样继续”，不在再加一个 STATE 文件。** Core 最新单例报告：共享 ROADMAP/REQUIREMENTS 的日常改动让未改实现的验证 stale；另一个 Codex 报告：外部 worktree worker 已完成或阻塞，但主控直到用户再发消息才收敛。两者仍 open，本轮未复现，不代表通用故障。可以据此设计 YSS 故障注入实验，但不能直接把 issue 变成需求。[#4623](https://github.com/open-gsd/gsd-core/issues/4623)、[#4624](https://github.com/open-gsd/gsd-core/issues/4624)。

**可升级适配比“能安装”更值得研究。** Matt 已区分用户可编辑副本和托管插件，并记录官方 marketplace 的 SHA pin。其 Codex 插件延期源于当时技能桶与 manifest 选择方式的冲突；这是该项目的历史集成记录，本轮没有复测当前 Codex 能力。Core 也已有 hash、备份和 patch 重应用。YSS 的进一步机会是展示上游、组织适配和实例本地修改的三方冲突，并验证回滚与投影一致性。[Matt plugin ADR](https://github.com/mattpocock/skills/blob/3cca18b368ae95cdbdebbff572ccafa662551015/.agents/adr/0002-ship-as-a-claude-code-plugin.md)、[Core update](https://github.com/open-gsd/gsd-core/blob/b67f6028ce572f0504a035f9cdf5e11b0cb86bf0/docs/how-to/update-gsd.md)。

## 建议交给主控的四项实验

这些是待验证机会，尚未批准。

1. **解释证据失效。** 用代码变更、共享说明变更、冻结契约变更三类事件，比较失效理由、误阻断及最小重验动作。共享文件不能被一律排除，否则会掩盖真实契约变化。
2. **验证外部 worker 终态恢复。** 注入根会话中断、子进程失败、SUMMARY 缺失和 commit 不匹配，确认不会重复派发或误判完成；恢复不自动授予 Git 操作权限。
3. **验证三方技能升级。** 在 YSS 既有上游/effective hash 基础上，用正常升级与冲突升级测试 dry-run、差异解释、回滚和多运行时安装一致性。
4. **比较最短合规路径成本。** 对文案修复、公开接口变化、跨仓契约分别记录首次可审阅产出耗时、读取量、调用数和缺漏；对照当前 Superpowers 6.3.0 与 Matt 组合，不预设节省百分比。

相邻 JSON 的 `opportunities` 保存各实验的依据、反证、建议验收和未批准状态。主控仍需结合本地已实现能力，确认哪些是展示问题、哪些是真正缺口，再向用户呈现取舍。

## 本轮边界与验证

已读任务包、根 `CONTEXT.md`、指定研究/竞品技能及中文写作规范；只写授权的两个文件。检索使用公开 web search、GitHub 页面、REST API、固定 SHA 的 raw 源码；Google 页面访问由主控集中记录，本子任务不冒称已完成 Google 直接访问。未安装竞品、未运行产品测试、未评价真实用户数或 ROI；正文自检和 JSON 结构检查不构成独立审查或生命周期批准。
