---
name: competitive-intelligence
description: "执行竞品、市场定位、定价、功能差距与用户口碑调研；复用现有模板输出竞品功能矩阵和深度分析报告，向 Plan、Spec 与产品策略提供证据。"
---

# Competitive Intelligence

本项目请求的上游来源：`anthropics/knowledge-work-plugins`，`sales/skills/competitive-intelligence`。保留 YSS 适配；上游更新不能直接覆盖当前合同。

竞品或市场事实影响 Plan、Spec 范围、定位、差异化、定价假设或路线取舍时使用本技能。`yss-research` 是统一入口和研究证据包所有者，本技能负责专项采集、比较与分析并回传引用结果。直接调用本技能时也按 `yss-research` 的 profile、模式和证据合同组织结果。

文档输出按 `lifecycle-document-output` 条件调用 `i-have-adhd`，读取 `.template-spec/process/document-writing.md`；只作用于当前产物。正文用简体中文，产品名、来源 URL、API 与 metadata 保持原样。

## 模式与产物

读取 `.agents/skills/yss-research/references/competitive-analysis.md`，遵守以下输出选择：

| 请求 | 模式 | 默认输出 |
|---|---|---|
| 普通竞品探索 | `quick` | 聊天简报＋精简功能矩阵，标明未审计 |
| 深度、严格、可复现或可审计研究 | `evidence-audited` | 完整矩阵＋深度报告＋研究双文件 |
| 明确只要矩阵或报告 | 按研究深度与用途确定 | 只输出指定阅读材料；审计模式保留研究双文件 |
| 正式生命周期批准输入 | `evidence-audited` | 指定阅读材料＋可绑定证据包 |

不因选择单一产物而降级审计，也不把普通探索自动升级。竞品策略使用 `strategy-evidence`；技术能力、框架和协议事实按 `technical-evidence` 的一手来源要求审计。

完整矩阵使用 `.template-spec/plan/templates/competitive-matrix-template.md`，报告使用 `.template-spec/plan/templates/competitive-analysis-template.md`。审计模式在同一目录保留 `<slug>-research-brief.md`、`<slug>-evidence.yaml` 和选定的 `<slug>-competitive-matrix.md` / `<slug>-competitive-analysis.md`。报告是附属阅读材料，不替代研究简报。

## 执行

1. 明确研究要支持的决定、竞品 / 替代方案、用户、能力边界、地区、版本 / 套餐、截至日期和问题；优先消费用户提供或已登记材料，记录排除与访问失败。
2. 核验当前公开资料：产品与定价页、官方文档、更新日志、第一方案例、备案 / 披露和可追溯数据。口碑、采用与痛点可用带日期的评论、社区、市场记录和可检查方法的行业报告，保留来源类别、抽样及独立性限制。
3. 将事实、来源、观察和 Claim 回传统一证据台账，采集功能、定价 / 套餐、流程、集成、目标用户、定位、投诉与变通方案，寻找反向信号。
4. 审计模式在 `competitive_analysis` 中登记比较范围、竞品、能力和每个竞品 × 能力结果；矩阵及报告消费同一组结果。`supported / partial / absent / unknown` 分开表达，未查到资料写未知；部分支持须写限制，明确不支持须有适用范围内的已审计依据。
5. 审计模式从结构化结果渲染功能比较区，区外补充定位、流程、优势、风险、机会及 MVP 建议；`quick` 在聊天中综合简报与精简矩阵。结论引用 Claim / 来源，推断标明依据；来源冲突时保留冲突和置信度，不猜竞品意图。
6. 审计模式执行研究包校验并交回 `yss-research`；`quick` 回传未审计结果。交接保留事实及审计状态、反向信号、缺口与补证计划、候选术语、产品机会、MVP / 非目标及成功标准建议、下游所有者。由接收者核验后用于其原生工作单元。

审计模式从仓库根运行渲染与校验：

```bash
node .agents/skills/yss-research/scripts/render-competitive-outputs.mjs <slug>-evidence.yaml
node .agents/skills/yss-research/scripts/validate-research-package.mjs <slug>-research-brief.md <slug>-evidence.yaml
```

## 分析边界

- 比较结论记录产品、版本、套餐、地区与日期；未知范围明确写 `unknown`，不能默认为所有版本适用。
- 默认不生成数字排名。用户明确要求评分时先确认量表、维度 / 权重和依据；未知记不评分，不能计低分或零分。
- 功能对齐是证据信号，产品机会与优先级属于建议，不直接成为需求。候选术语回交 `domain-modeling`，Plan / Spec 由对应所有者更新；不写 `CONTEXT.md`、Spec、批准或 Ticket 状态。
- 使用公开证据或用户明确提供的内部材料；不绕过付费墙或访问私有系统，不将竞品专有内容、文本、截图或工作流直接复制到项目产物。
- 当前来源访问不可用时说明边界，仅根据可访问的固定资料作限定结论，或返回研究计划与假设；不声称已核验当前竞品事实。
- 结构校验只证明格式、引用和跨文件一致性，来源是否支持结论与推断是否合理仍需研究审核。
