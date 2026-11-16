**pstack 与 YSS Spec 工程能力对比结论报告**

研究日期为 2026 年 11 月 16 日。面向 YSS 模板、技能和 CLI 维护者，用于确定后续工程能力增强的采用范围。本报告汇总两轮调研与审核，建议尚待实施和真实项目验证。

**建议借鉴 pstack 的 PR 持续跟进方法，优先增强现有研发入口之间的接续、远程状态与代码版本核对，以及实际交付结果确认。** YSS 已有较完整的 PR/MR 创建、候选审查、修复重验和跨仓验证方法。首轮采用范围可以集中在这些方法如何持续执行到用户指定的完成状态。

本轮基线为 YSS Template 5.8.0、CLI 3.8.0，官方 pstack 0.15.42 固定提交 `bf0c7cd8`，以及社区移植版 pstack-claude 0.9.138 固定提交 `a12b0478`。两份上游具有不同的执行策略，引用按各自版本解释。[YSS 模板版本](../../README.md)、[CLI 发行](https://github.com/iloveZzz/yss-cli/releases/tag/v3.8.0)、[官方 pstack 清单](https://github.com/cursor/plugins/blob/bf0c7cd80abdbf7fe47b634978a7d1b4071f71a7/pstack/.cursor-plugin/plugin.json)、[社区版本](https://github.com/michael-denyer/pstack-claude/blob/a12b04786023e762f12f5de7bb5fafb8c23f8c36/VERSION)

**当前差距集中在远程 PR/MR 的后续执行。**

| 能力 | YSS 当前事实 | pstack 的参考价值与采用判断 |
| --- | --- | --- |
| 规格到实现 | Spec 提供业务规格、高保真交互原型及交互说明，Home 将明确研发请求交给实际工程 | 以现有业务输入和仓库范围为基础接续工程执行 |
| PR/MR 创建 | `handoff` 已覆盖真实差异、base/head、正文保留、创建超时查询与写后回读 | 复用当前方法 |
| 审查与修复 | `code-review` 已绑定实际候选，前后端已有修复后重验方法 | 补充远程反馈适用性判断和处理结果回读 |
| 持续跟进 | 审查意见、CI、冲突和合并的操作指引较分散 | 借鉴 babysit 按完成条件持续推进、失败后诊断再执行的方式 |
| 跨仓交付 | 已要求输入版本、逐仓结果和集成证据 | 将实际 PR/MR、工程提交和组合验证结果关联起来 |
| 长时间运行 | 当前 Agent 承担执行，Workbench 保存工作记录 | 会话内先复用现成平台工具，后台执行与自动恢复按实际需求另行评估 |

现有方法见产品交付、交接、审查和跨仓实现入口。方法分散能够支持导航改进的判断，其对真实任务成功率的影响仍需观察。[产品交付](../../.agents/skills/yss-product-lifecycle/SKILL.md)、[handoff](../../.agents/skills/handoff/SKILL.md)、[候选审查](../../.agents/skills/code-review/references/candidate-capture.md)、[前端重验](../../.agents/skills/yss-frontend-application/references/verification.md)、[Backend 验证](../../profiles/backend/.agents/skills/yss-backend-testing/references/test-execution.md)、[跨仓实现](../../.agents/skills/implement/references/repository-scope.md)

**审核确认了四项会影响采用方式的技术限制。**

1. **远程状态必须关联实际版本。** 受控实验中，官方 watcher 在查询检查结果期间发生 head 或目标分支变化，仍可返回 `READY`，重新读取后才发现 CI 失败或冲突。它也允许部分等待审批的状态进入 `READY`。该结果自身缺少 head 与目标版本，采用时需要补充读取前后的版本核对、平台约束判断及操作后回读。社区移植版已增加相关复读与审批状态处理。本轮实验验证了代码路径，真实远程发生频率未知。[官方判定实现](https://github.com/cursor/plugins/blob/bf0c7cd80abdbf7fe47b634978a7d1b4071f71a7/pstack/skills/poteto-mode/scripts/watch-pr/policy.ts#L58-L215)、[移植版修正](https://github.com/michael-denyer/pstack-claude/blob/a12b04786023e762f12f5de7bb5fafb8c23f8c36/plugins/pstack/skills/poteto-mode/scripts/watch-pr/policy.ts#L145-L332)

2. **旧验证结论需要重新判断适用范围。** 本地 Git 2.56.0 实验中，将输出分别改为 `pay now` 和 `paynow` 的两个补丁，其默认及 stable patch-id 相同，实际输出不同。相同计算补丁应用到不同配置基线后，结果也从 `5` 变为 `-10`。patch-id 适合辅助识别补丁，沿用验证结果还要检查真实差异、基线、依赖与运行环境。社区移植版已补充新目标和依赖的适用性判断。[Git patch-id 语义](https://git-scm.com/docs/git-patch-id)、[官方 Shipping](https://github.com/cursor/plugins/blob/bf0c7cd80abdbf7fe47b634978a7d1b4071f71a7/pstack/skills/poteto-mode/playbooks/shipping.md)、[移植版 Shipping](https://github.com/michael-denyer/pstack-claude/blob/a12b04786023e762f12f5de7bb5fafb8c23f8c36/plugins/pstack/skills/poteto-mode/playbooks/shipping.md#L7-L12)

3. **CI 分类应依据因果证据。** 官方 babysit 将未触碰代码中的失败归为基线过旧。本轮临时仓库反例中，基线是当前 main，仅修改共享导出值，未修改的调用方检查随即失败。建议吸收先分类、再重试或修复的思路，具体原因通过 base/head 对照、调用关系和日志判断。失败位置与重试次数只能作为调查线索。[上游 CI 处理方法](https://github.com/cursor/plugins/blob/bf0c7cd80abdbf7fe47b634978a7d1b4071f71a7/pstack/skills/poteto-mode/playbooks/babysit.md#L19)

4. **平台合并规则需要分别适配。** GitHub 与 GitLab 的源 SHA 条件保护源分支版本，CI 还可能测试临时合并提交或队列组合。GitLab 官方明确说明，MR 加入 merge train 后新增讨论线程仍可继续合并。官方 pstack 的 `queued-stack` 使用本地 PR 列表，其 `merge-queue` 等待原因也没有证明服务端实际入队。采用时应核对具体运行、测试版本、审批状态和最终合并提交。[GitHub 合并参数](https://cli.github.com/manual/gh_pr_merge)、[GitHub merge queue](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/configuring-pull-request-merges/managing-a-merge-queue)、[GitLab merge train](https://docs.gitlab.com/ci/pipelines/merge_trains/#add-a-merge-request-to-a-merge-train)、[pstack 队列判定](https://github.com/cursor/plugins/blob/bf0c7cd80abdbf7fe47b634978a7d1b4071f71a7/pstack/skills/poteto-mode/scripts/watch-pr/policy.ts#L650-L711)

**首轮建议采用三项改进，沿现有内容源维护。**

| 建议 | 最小落点 | 可观察结果 |
| --- | --- | --- |
| 按用户目标接续 PR/MR 工作 | 在现有研发入口增加条件式引用，调用当前交接、审查、冲突和验证方法 | 一次查询、反馈修复、持续跟进和合并请求各自执行到相应完成状态，已有授权得到复用 |
| 将远程结果绑定到实际对象 | 补充当前 head、目标分支、CI 测试对象、反馈适用性和合并回读的判断 | 能识别旧 CI、过期评论、查询期间变化和仅入队状态 |
| 复用项目验证入口并关联跨仓结果 | 沿工程已有运行说明、项目技能和任务交付记录补齐实际缺口 | 新上下文能运行受影响路径，并说明参与组合验证的规格与工程版本 |

现有创建和增量验证方法足够承载基础能力。完整独立的 PR 跟进参考文件，可在内容确实需要复用和展开时提炼。PR 栈自动重排、通用 watcher、Workbench 后台执行与固定多代理审查，适合根据真实任务中的恢复和协调需求继续评估。

实现时需要覆盖实际消费入口。共享方法由 `.agents/skills` 维护，Backend 专有方法沿对应覆盖层维护。Frontend 默认未包含 `implement`，前端消费共享参考时，应从实际前端入口建立引用并核对 project、skills 两种模式的资源闭包。平台副本和清单也应同步。[技能地图](../../.template-spec/agents/profile-skills.md)、[分发维护约定](../../.agents/skills/maintaining-skills/references/authoring.md)

当前 `gh`、`glab` 的本机帮助已确认具备查询、分页、CI 跟进和带源 SHA 条件的合并能力，可以支撑会话内的首轮执行。跨会话续办可复用已有记录和平台当前状态。退出宿主后持续执行、进程重启后自动恢复，需要另行确认运行环境和持久执行职责。上游也有宿主缺少持续运行能力、最终 CI 尚在运行便交接的用户反馈。[宿主限制记录](https://github.com/cursor/plugins/issues/1158)

**首轮试点应验证真实行为，收益结论随证据形成。**

建议在已有授权的实际任务中，观察旧 head 的绿色 CI、审查后新增提交、共享代码引起下游失败、合并请求仅入队，以及多仓组合验证等场景。记录实际平台状态、最终产物、人工接管、重复 CI、耗时与成本。对比方法改动时，尽量保持模型、宿主、权限与任务起点一致。现有资料不足以给出成功率、效率提升比例或精确投入估算。[Agent 评估方法](https://www.anthropic.com/research/demystifying-evals-for-ai-agents)

本轮实际完成了本地源码、官方文档、版本清单和命令帮助核查，执行上游 watcher 的 `policy.test.ts`、`github.test.ts`，结果为 45 项通过、0 项失败，并通过独立受控实验复核上述边界。仓内 Home Demo 的历史记录覆盖本地多仓实现、真实 HTTP 联调和续办，三个工程均无远程，其证据范围止于本地交付。[Home 验证记录](2026-11-15-spec-home-repo-validation.md)

真实远程 PR/MR 合并、GitLab 实例版本与权限、平台保护配置，以及跨宿主长时间运行仍待实际项目验证。采用时重点关注版本与检查错配、验证结论失效，以及异步平台状态被提前报告为完成。
