# 相邻研发执行平台研究：OpenHands、Aider

2026-09-11；strategy-evidence / evidence-audited。面向 YSS 模板维护者，支持未来 1–2 个迭代的机会取舍。使用 yss-research、competitive-intelligence 与当前文档范围内的 i-have-adhd。事实、推断和方案分开；本研究不批准路线。完整 Search Log、Evidence Ledger 和 claim audit 见同目录 `platforms.json`。

最需要调整的判断是：**OpenHands 已进入控制面竞争，YSS 不能靠“我们有治理、别人只会写代码”定位。** 当前 OpenHands 主仓 README 是 Agent Canvas，支持多 Agent、多后端及自动化；企业官网也明确展示 Agent Control Plane。YSS 值得验证的差异应具体到：一次执行结束后，是否能证明它消费了当前合同、批准仍有效、跨仓状态一致、验证证据完整。这是由本地合同和竞品能力得出的机会假设，尚非市场需求证明。[evidence-platforms-001](https://github.com/OpenHands/OpenHands#agent-canvas)、[evidence-platforms-006](https://www.openhands.dev/enterprise)、本地 `CONTEXT.md`（evidence-platforms-018）；claim-platforms-001/002/007。

## 当前能力与采用边界

| 维度 | OpenHands | Aider | 对 YSS 的含义 |
|---|---|---|---|
| 产品入口 | 当前主仓是 Agent Canvas；可接 OpenHands、Claude Code、Codex、Gemini、ACP，选择多个后端，调度及 webhook 由独立 automation 仓负责（001） | 终端 AI 结对编程；官方文档提供 repo map、lint/test、脚本化、多模型入口（017） | Aider 更像执行适配器；OpenHands 同时是执行底座和相邻控制中心，不能只列作底层库 |
| 沙箱/环境 | README 同时提供宿主机直接运行和 Docker；直接运行明确有全文件系统访问警告，Docker 将指定 projects 目录挂入（001） | 官方提供 core/full Docker 镜像；项目目录挂载，/run 在容器内，测试环境可能不同于宿主机（011） | 研究只确认配置能力；隔离强度与环境可复现性需要实验 |
| 审批 | 开源 SDK 支持 AlwaysConfirm/NeverConfirm/ConfirmRisky、可组合风险分析器；直接 execute_tool 不受这套策略保护（002） | ask/code 可分讨论与编辑；architect 将建议与编辑分给模型；Git 默认自动提交且有开关（008/010） | 工具动作确认、代码修改意图、生命周期批准必须分别适配；“可配置”也意味着不能把默认差异当不可集成 |
| 恢复 | SDK 有事件与状态持久化；ACP 的恢复界面、租约等议题另见 #15912（003/015） | /save、/load 重建文件集，/clear、/drop、/reset 管上下文，/undo 基于 Git（009） | 恢复不是空白市场；可验证的问题是恢复后上游合同是否过期以及证据是否足够 |
| 跨仓/协作 | README 可访问 projects 下多个项目并切换后端；这并不证明跨仓契约变更可整体批准/顺序发布（001） | 本次确认文档主要围绕本地 Git repo；未穷尽插件，不断言无法做跨仓（008/017） | “能读多个仓”与“跨仓交付状态一致”需要不同验收场景 |
| 可观测/成本 | 开源 SDK 按 usage_id 统计多模型成本，提供 OTLP tracing；Enterprise 网页另外宣传项目/团队预算、组织策略和指标（004/005/006） | /tokens 能看上下文；architect 文档提醒两次请求可能增时增费；BYOK模型元数据诊断有用户提议（009/010/014） | 基础 token/trace 面板不构成独特机会；候选增量是将返工、等待、证据缺口关联到工作单元 |
| 许可/商业 | 当前主仓显示 MIT；官方套餐页把 OSS、Individual、Enterprise 分开，企业版 custom pricing、VPC/SSO/支持；企业页称 source-available（001/006/007） | 主仓 LICENSE.txt 为 Apache-2.0（012）；本次未核实付费团队包装 | 开源 SDK 的原语不能等同 Enterprise 全功能免费可用；不要从许可推算总成本 |

对应原始来源：[001 README](https://github.com/OpenHands/OpenHands)、[002 Security](https://docs.openhands.dev/sdk/guides/security)、[003 Persistence](https://docs.openhands.dev/sdk/guides/convo-persistence)、[004 Metrics](https://docs.openhands.dev/sdk/guides/metrics)、[005 Observability](https://docs.openhands.dev/sdk/guides/observability)、[007 Pricing](https://www.openhands.dev/pricing)、[008 Git](https://aider.chat/docs/git.html)、[009 Commands](https://aider.chat/docs/usage/commands.html)、[010 Modes](https://aider.chat/docs/usage/modes.html)、[011 Docker](https://aider.chat/docs/install/docker.html)、[012 LICENSE](https://github.com/Aider-AI/aider/blob/main/LICENSE.txt)、[017 Docs](https://aider.chat/docs/)。每个短编号均对应 JSON 中 `evidence-platforms-` 前缀 ID；精确章节和观察限制保存在 ledger。

## 三个实际问题信号及反证

1. **Aider #4113，2025-05-27，coogle。** 用户描述长会话或复杂请求后回答质量下降，需要重启、手工摘取历史继续。问题原因仅为用户猜测；没有本研究复现，也不能外推发生率。当前命令文档已有上下文管理，是“完全没有恢复工具”的反证。可用于访谈“重建上下文究竟丢了哪些决定”，而非直接创建功能需求。[Issue（013）](https://github.com/Aider-AI/aider/issues/4113)、[反证（009）](https://aider.chat/docs/usage/commands.html)。
2. **Aider #5567，2026-08-13，AayushBehera。** 请求解释本地/BYOK模型的能力、元数据来源和连接失败路径。它支持“有人需要接入诊断”这一窄结论；不能证明所有兼容端点不可靠。Aider 已支持多模型和自定义设置，机会更可能在可解释的预检而非另建模型接入层。[Issue（014）](https://github.com/Aider-AI/aider/issues/5567)、[现有文档（017）](https://aider.chat/docs/)。
3. **OpenHands #15912，2026-05-18，simonrosenberg。** 议题要求 ACP 暂停、恢复、取消界面与旧租约错误处理，同时写明相关 API 已存在。此为工程提案信号，不能拿仍显示 Open 当作当前实现缺陷证明；旧会话中的上下文及成本被明确提及，但未量化损失。[Issue（015）](https://github.com/OpenHands/OpenHands/issues/15912)、[持久化反证（003）](https://docs.openhands.dev/sdk/guides/convo-persistence)。

以上 issue 页面在 2026-09-11 查询均显示 Open；仅表述观察到的页面状态，不断言所有问题仍未解决。三条是目的性样本，不是市场调研样本量或同类问题频率。（claim-platforms-005）

## 可验证机会

**候选一：跨执行器的合同与证据接收。** 用户继续使用既有客户端，YSS 接收一次工作单元的合同摘要、执行器版本、repo SHA、实际退出码与证据引用，明确缺了哪项，以及哪项已因变更失效。候选验证只需同一任务用两个执行器交接，中途改变 Spec 或 repo HEAD，比较与纯会话恢复基线的漏判和人工核对时间。若现有事件加模板已够用，就没有建立新平台的理由。（opportunity-platforms-01；claim-platforms-006/007）

**候选二：可解释的中断恢复预检。** 面向跨天、断线、换模型/运行时的任务，先比较版本、授权、环境与证据，再给最小上下文包及需重验项。试验注入历史丢失、旧租约、Git变化、模型元数据缺失；首先复现场景，再测收益。OpenHands 的 persistence 与 Aider 命令已经解决一部分问题，因此预检必须证明额外发现了错误，才值得继续。（opportunity-platforms-02；claim-platforms-005/007）

建议优先验证这些小范围接收能力，而不是复制完整聊天客户端、沙箱或成本平台。这是基于现有供给的取舍建议，暂无用户访谈、采用率、付费意愿或ROI支持；不能批准为MVP。（claim-platforms-006）

## 排除、矛盾和交接

- **HumanLayer 当前状态值得单列。** 实时主 README 明确称公开仓是 issues repo、现有代码基本 deprecated，并指向重建版。因此将历史 CodeLayer 功能当成当前可采用开源产品会误导；本轮只作为演进/依赖风险反证，不判断重建版成败或完整开源状态。[evidence-platforms-016](https://github.com/humanlayer/humanlayer#humanlayer)（claim-platforms-008）。
- OpenHands 搜索结果仍可命中旧 1.7.0、旧 app-server/enterprise 目录介绍，当前主 README 已拆分为 Canvas/SDK/TS client/automation。不同版本资料不能拼成一张“现状”表；Enterprise 精确许可条款应在采用前单独核实。[旧页面（019）](https://docs.openhands.dev/overview/introduction)、[当前边界（001）](https://github.com/OpenHands/OpenHands#repository-boundaries)。
- 分发、沙箱、恢复、成本和协作能力均未实机安装验证。未对源码全量搜索，没有证据就不声称这些项目绝无 Spec 绑定门禁。企业官网是公开产品主张，不是能力实测。
- 排除搜索中出现的非官方 fork、生成式管理员指南和自动 AI 代码质量报告作为决策支持来源；它们只作线索。

本子任务只写 `agents/platforms.md` 与 `agents/platforms.json`。template-source 的 context_reconciliation 为带理由的 not-applicable；未修改 CONTEXT、门禁、Ticket 或实现合同，ready-for-agent=false，未做 Git checkpoint。下一步由主控核对关键来源、合并竞品证据并交付机会取舍；本子任务不批准路线或发布。
