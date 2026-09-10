# 研发文档写作适配研究简报

日期：2026-09-10。本文支持[写作规范草案](writing-guideline-draft.md)的范围判断；语义审计记录在[证据文件](lifecycle-writing-evidence.yaml)。固定英文二级标题由现有研究校验器要求，正文使用简体中文。

## Research Scope

- Profile：`technical-evidence`；Mode：`evidence-audited`。
- 问题：上游适合约束哪些输出？现有证据能否支持把它直接作为中文研发文档的默认规范？
- 读者：模板维护者、Plan / Spec / Ticket 起草者及审阅者；适用时点：2026-09-10 本次草案。
- 纳入：用户指定仓库的第一方技能原文和评测报告，以及当前 YSS 入口、维护政策和文档模板。
- 排除：安装和启用上游技能、ADHD 医学结论、下载数或星数推断、AI 检测规避、非第一方转载。
- 本轮以固定 commit 重新定位来源并记录文件摘要；没有复跑上游实验，也没有进行中文用户研究。

## Executive Read

建议先审阅按阶段适配的中文写法，再验证实际生成行为。研究能确认上游的规则和自报评测边界，不能确认它在本项目中的效果。规范和例子是 YSS 维护提案，尚未成为默认合同。

## Findings

- **观察，claim-001：**上游是会话输出风格技能，采用显式调用和会话持续规则；其限制允许在任务完整性和运行时要求面前让步。[固定版本技能原文](https://github.com/ayghri/i-have-adhd/blob/7b9069b39972e269e61bd95c2f66ebb90cac6a02/skills/i-have-adhd/SKILL.md)
- **观察，claim-002：**作者报告的评测主要改善进度与错误表达，候选仍有阻断项；报告也记录了推断未经证实原因的回归以及实验限制。[固定版本评测报告](https://github.com/ayghri/i-have-adhd/blob/7b9069b39972e269e61bd95c2f66ebb90cac6a02/evals/RESULTS.md)
- **推断：**这些材料不足以证明中文 Plan、Spec、Ticket 的稳定改善。该推断限定于已审阅材料，不声称所有公开资料均无相关研究。
- **建议：**保留准确性和原合同，以业务问题、条件与结果组织正文；将其作为已有起草和修订工作的辅助规范，不新增独立阶段或状态。
- **待验证假设：**本草案能减少读者定位规则和待决定事项的成本，同时保留语义。这项效果没有被本轮证明，需实际生成与盲评。

## Counter-Signals

上游本身已有完整性与运行时例外，不能把它描述成强制删减所有长文的技能。另一方面，其评测报告确实给出了多个维度的改善，不能因残余问题就断言它毫无价值。两项反向信息分别绑定到 claim-001 与 claim-002；结论因此收窄为“值得适配试验，效果未验证”。

## Source Map

外部证据来自第一方原文，用来核对规则以及作者实际报告了什么；不把作者自评等同于独立验证。证据文件记录固定 revision、原始文件 SHA-256、章节定位、搜索过程和审计结论。

本地材料用于限定维护路径：根 `yss-project.yaml` 为 `template-source`；根 `CONTEXT.md` 定义标准文档语言和阶段词汇。Plan、Spec、Ticket 当前模板分别位于 `docs/plan/templates/plan-template.md`、`docs/templates/spec-template.md`、`docs/templates/vertical-slice-ticket-template.md`。本草案没有改写这些权威文件或新增阶段资产。

## Decision Handoff

下游由 `yss-product-lifecycle` 持有模板维护范围，正式技能或路由调整由 `maintaining-skills` 承接。交付为[规范草案](writing-guideline-draft.md)和[三组对照](rewrite-comparisons.md)。当前用户授权是形成这些可审阅资产；本研究不批准技能默认接入，不设置 Ticket 状态，不执行 Git 提交或发布。

## Evidence Limitations

证据可信度分开判断：对固定文件所写内容的核对可信度高；对跨模型、中文文档和真实团队效果的外推证据不足。报告由同一模型体系生成与评价，试验次数有限，存在工具执行条件问题。本轮的对照由作者手工编写，只能用于审阅目标写法及核对规则，不能冒充三条件实验结果或独立评审。
