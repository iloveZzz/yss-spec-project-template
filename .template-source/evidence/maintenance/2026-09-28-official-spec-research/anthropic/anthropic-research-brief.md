# Anthropic / Claude 研发规格与执行机制研究

## Research Scope

- Profile：`technical-evidence`；Mode：`evidence-audited`；访问日：2026-09-28。
- 面向 YSS 模板维护者，回答官方机制能否引入现有生命周期。研究范围先于检索登记在上级 `research-scope.md`，仓库为 `template-source`。
- 纳入 Anthropic 官方文档、工程文章和 `anthropics` 官方源码；社区 Spec 套件、客户效率宣传及模型行为规范不作为技术门禁依据。
- 本次没有调用 Claude 模型，也没有运行其示例。研究不修改生命周期、技能、批准或 Ticket。

## Executive Read

可以借鉴 Anthropic 的**验收可执行、会话恢复、独立证据核对和按风险裁剪**，适合增强已有 YSS 合同与验证路径。公开样本分别属于产品使用建议、实验 harness 和 Skill 格式，不能合称为一套可直接替换 YSS 的官方生命周期模板；这只是本次样本的边界，不是“官方不存在其他模板”的穷举结论。

优先研究“每条验收绑定当前证据”和“恢复后核对工作状态”的最小增量。固定多 Agent、每 sprint 重复审查、自动提交，以及演示钩子应保留为可选机制。其实际收益须在 YSS 项目中测量。

## Findings

### 1. Spec 要能指导执行，也允许小改动跳过完整规划

`claim-anthropic-001`：官方建议先探索与计划，大功能先访谈并生成自包含 Spec，包含文件、接口、非目标和端到端验证。文档同时允许范围明确的小修复跳过 Plan。它是工作流建议，没有为 YSS 的 OpenAPI Freeze、合同批准或发布会签赋权。[官方最佳实践：规划与 Spec](https://code.claude.com/docs/en/best-practices#explore-first-then-plan-then-code)

建议：在当前 Spec 和 Slice 合同中核对“可观察完成条件”，避免另建一个与权威合同并行维护的 `SPEC.md`。

### 2. 常驻指令与强制执行分层

`claim-anthropic-002`：CLAUDE.md 是持久上下文；专项过程可按需加载。导入文件仍进入启动上下文，文本指令也不是动作阻断器。[官方 memory 文档](https://code.claude.com/docs/en/memory#claudemd-vs-auto-memory)

建议：保持 YSS 入口短小，继续消费 canonical Skill；只有需要机械保证的约束才映射至运行时适配器或既有校验器。不能以“已写在 CLAUDE.md”为执行证据。

### 3. 默认失败的验收清单与恢复检查

`claim-anthropic-003`：2025 试验用功能清单、进度记录和基础测试帮助新会话恢复，要求实际测试后更新完成状态。这是全栈 Web 演示经验，浏览器和模型视觉仍可能漏检。[2025 长任务研究](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents)

建议：验收状态从既有 Slice 合同的稳定项派生，未验证保持未通过；交接引用版本、当前修改和验证记录。不要另设能覆盖 Ticket 五态的 feature list。

### 4. 独立评估有效性取决于任务边界，固定 sprint 并非不变原则

`claim-anthropic-004`：2026 试验先使用可测试的 sprint contract 与独立 evaluator；后续 Opus 4.6 试验移除 sprint，仍保留 planner 与 evaluator。文章承认评估器需调校且会漏检。[2026 长应用 harness 研究](https://www.anthropic.com/engineering/harness-design-long-running-apps)

建议：在已有分级维护与强制独立审查的边界内做裁剪；模型升级后重测冗余步骤，不据此删除 mandatory 门禁。

### 5. 官方 demo 的证据读取不等于有效逐项验收

`claim-anthropic-005`：演示仓库拆出默认未通过、独立上下文评估及交接原语，但 builder 状态与 evaluator verdict 是分离的。源码明确：Bash 能绕过 Write/Edit 钩子，任意一次证据读取能解锁任意结果行；evaluator 的 Bash 权限也不是硬只读边界。[README](https://github.com/anthropics/cwc-long-running-agents/blob/ad107a974bced5244f74dd283dbf2bfd3baee3a1/README.md)、[verify-gate.sh](https://github.com/anthropics/cwc-long-running-agents/blob/ad107a974bced5244f74dd283dbf2bfd3baee3a1/claude-code-config/.claude/hooks/verify-gate.sh#L5)、[evaluator.md](https://github.com/anthropics/cwc-long-running-agents/blob/ad107a974bced5244f74dd283dbf2bfd3baee3a1/claude-code-config/.claude/agents/evaluator.md#L2)

建议：未来试点应检验 criterion ID、合同摘要、候选源码、执行命令和证据摘要的同一性；证据未读、旧证据、错项证据、Bash 写入都应有负例。该建议尚未实现或测量。

### 6. Skill template 不是产品规格模板

`claim-anthropic-006`：`anthropics/skills/template/SKILL.md` 是技能元数据及指令占位；`spec/` 指 Agent Skills 封装规范。README 声明演示用途，且部分文档 Skill 的许可证与普通开源技能不同。[Skill template](https://github.com/anthropics/skills/blob/33375500bcea98d610eb30ce10ac4e59b89c390d/template/SKILL.md)、[spec 指向](https://github.com/anthropics/skills/blob/33375500bcea98d610eb30ce10ac4e59b89c390d/spec/agent-skills-spec.md)、[README 限制](https://github.com/anthropics/skills/blob/33375500bcea98d610eb30ce10ac4e59b89c390d/README.md#disclaimer)

建议：仅在 `maintaining-skills` 下审查格式兼容、许可证和行为差异，不导入第二套规格权威。

### 7. 自动提交钩子不适合直接带入共享脏工作区

`claim-anthropic-007`：示例停止钩子用 `git commit -am` 纳入已跟踪改动，隐藏输出并最终返回成功。它没有按 YSS 本轮范围过滤提交。[commit-on-stop.sh](https://github.com/anthropics/cwc-long-running-agents/blob/ad107a974bced5244f74dd283dbf2bfd3baee3a1/claude-code-config/.claude/hooks/commit-on-stop.sh#L5)

建议：保留当前显式 Git 授权和范围限制。恢复能力可以先通过只读交接核对实现，不能为了耐久性把无关用户改动提交进去。

## Counter-Signals

反信号已逐项登记到 evidence 文件。最关键的是：官方自己在新模型实验中移除了部分结构；独立 evaluator 仍可能接受缺陷；活动 demo 声明不维护；“读过文件”不足以证明“本项通过”。这些证据反对把任何固定 harness 形态提升为无条件流程。

没有将文章中的成本、质量改善或模型能力推广为 YSS 的实测效果。官方没有承诺该演示满足本仓权限、批准、兼容及审计合同。

## Source Map

| 来源 | 本次作用 | 日期与定位 |
|---|---|---|
| Claude Code docs | 工作流、Spec 和上下文机制 | 动态页，发布日期未列；访问 2026-09-28，精确章节见 evidence |
| Anthropic 两篇工程文章 | 长任务机制及演进反例 | 2025-11-26 / 2026-03-24 |
| `anthropics/cwc-long-running-agents` | 静态核对示例边界 | SHA `ad107a974bced5244f74dd283dbf2bfd3baee3a1`，commit 2026-05-13 |
| `anthropics/skills` | 分清技能格式与研发 Spec | SHA `33375500bcea98d610eb30ce10ac4e59b89c390d`，commit 2026-09-24 |

Search Log 在相邻 evidence 文件。GitHub 页面两个目录链接曾返回 Internal Error，改为固定 SHA raw URL 后成功。Python 直连四个官方 HTML 页返回 403，web 工具已成功读取；七个固定 SHA raw 文件返回 200，准确探测时间与摘要在 `source-manifest.json`。没有保存或镜像文章全文。

## Decision Handoff

交回主控 `yss-research` 核验和三家横向汇总。建议试点优先级：逐项证据绑定、恢复检查、上下文按需加载；后续若采纳，再由模板维护工作单元确定写入事实源、兼容策略和验收。

本研究只给证据，不批准修改生命周期；`context_reconciliation` 为 `not-applicable`，原因是模板维护研究且没有产品术语变更。

## Evidence Limitations

- 第一方文档证明其建议和实现形态，不证明跨模型、跨工程栈普遍优越。
- 动态文档没有固定版本，采用前须重新检索。源码以 SHA 固定，但没有运行这些脚本。
- 未实际调用 Claude、执行真实应用生成或统计 token、时长、缺陷率。收益仍是待检验假设。
- 本轮非穷举检索，未发现完整统一合同不能推导不存在；社区项目不冒称官方。
- 研究包校验只检查结构与引用闭合，不等于独立语义审查，也不改变下游批准状态。
