# `yss-research` 增强与重命名研究记录

日期：2026-09-03  
范围：模板源共享 `research` 技能、Discovery / DDD 战略设计研究路由及与专项研究技能的边界。

## 研究问题

1. `research` 是否应重命名为 `yss-research`，影响哪些权威资产与投影？
2. 技术事实研究、战略设计研究、竞争情报和 Product Design UX 研究应如何分工？
3. Academic Research Skills 中哪些机制适合以轻量方式引入？

## 观察到的事实

- 仓库身份为 `template-source`，因此本轮只能维护可复用技能、路由和证据，不生成具体产品 Spec 或领域战略资产（`yss-project.yaml`；`AGENTS.md` 第 1、4 节）。
- 原 `research` 是 `.agents/skills/research` 下的共享 canonical skill，来源记录为 `mattpocock/skills` 的 `skills/engineering/research/SKILL.md`，并投影到七个平台 root（`skills-lock.json` 原 `skills.shared.research`）。
- 原技能只有“优先一手资料、后台 Agent、单 Markdown 落盘”三项核心行为，没有研究 profile、搜索日志、证据台账、反证、claim-source 对齐、失败降级或战略资产所有权规则（原 `.agents/skills/research/SKILL.md`）。
- `research` 被 Discovery 机会调研、DDD 战略设计、`grill_exit`、需求经理和产品经理角色直接引用；重命名必须同时更新生命周期合同、`yss-stage-decision`、角色注册表、技能注册表、场景校验、锁文件和平台投影（`.agents/skills/yss-product-lifecycle/references/orchestration-contract.yaml`、`docs/agents/digital-human-roles.yaml`、`docs/agents/yss-skill-registry.yaml`、`scripts/lib/scenario-checks.mjs`）。
- `competitive-intelligence` 已有竞品、定价、市场定位和口碑研究合同；Codex `product-design:research` 已有 UX 问题扫描合同。把它们并入通用研究技能会造成职责重叠（`.agents/skills/competitive-intelligence/SKILL.md`；`.codex/skills/product-design/skills/research/SKILL.md`）。
- `yss-stage-decision` 拥有领域战略和阶段决策包，`domain-modeling` 拥有统一语言；研究输出若直接修改或批准这些资产会破坏既有所有权与会签边界（`.agents/skills/yss-stage-decision/SKILL.md`；`.agents/skills/domain-modeling/SKILL.md`）。
- Academic Research Skills 公开描述了 Material Passport、系统化搜索、来源验证、claim-to-reference alignment、完整性门禁和失败分类等机制；同时包含固定多 Agent、论文写作、同行评审、投稿和跨模型流程，后者超出 YSS 通用事实研究的范围（[项目 README](https://github.com/Imbad0202/academic-research-skills)、[架构说明](https://github.com/Imbad0202/academic-research-skills/blob/main/docs/ARCHITECTURE.md)、[Deep Research skill](https://github.com/Imbad0202/academic-research-skills/blob/main/deep-research/SKILL.md)）。

## 推导与建议

- 将 canonical skill 改为 `yss-research`，把 `research` 保留为 deprecated alias；退役条件应是全部权威调用方、模板快照、投影和跨仓契约迁移并通过正式发布验证，而不是固定日期。
- 一个共享技能提供 `technical-evidence` 和 `strategy-evidence` 两个 profile；前者对决策性技术主张要求一手来源，后者允许直接体验和近一手证据，但必须记录样本、访问和时效限制。
- 保留 `quick` 探索模式；外部证据进入 Spec、领域战略、阶段决策、OpenAPI 或架构批准输入前，升级为 `evidence-audited`。
- 引入轻量 Search Log、Evidence Ledger、claim-source audit、反证搜索和 `needs-deeper-research`，并用确定性校验器验证结构和引用闭合。
- `yss-research` 只输出证据；`domain-modeling`、`yss-stage-decision`、生命周期编排器和既有会签人继续拥有下游资产和门禁。
- 后台 Agent 改为能力自适应。它能增加吞吐，但不能证明结论可靠；最终消费方仍需核验关键主张。

## 反证与风险

- `yss-research` 前缀降低了通用可移植性，并偏离 Matt 上游名称。通过保留上游 revision、原始 skill path、upstream hash、适配说明和 deprecated alias 降低迁移风险。
- 对所有早期探索强制 Evidence Ledger 会显著增加成本，因此只在显式深度研究或生命周期决策输入时强制。
- JSON-compatible YAML 提高了无依赖校验的可移植性，但手写可读性低于普通 YAML；模板和 Agent 生成是主要使用路径。
- 两次后台研究 Agent 调度均因运行时 API 返回 404 而失败，未产生任何文件。本文由主控基于仓库权威资产、CodeGraph 检索和官方公开参考完成；该失败进一步说明后台 Agent 不能成为通用硬依赖。

## 结论

建议实施 `yss-research` canonical rename、`research` deprecated alias、双 profile、双模式、共享证据合同与校验器，并原子迁移生命周期和战略设计调用方。不要移植 Academic Research Skills 的论文生产、固定 Agent 团队或跨模型审稿流水线。
