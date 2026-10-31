# Matt skills 来源与本地适配

首次核验日期：2026-10-31；本次修订日期：2026-11-01。此文件记录来源与本地差异，不是技能使用前置或执行授权。

- 原始来源：[mattpocock/skills](https://github.com/mattpocock/skills)，引入提交 `0ab1b63a410a03d3627979a109c8695de27af954`。
- 本次比较提交：`4ae2317ddb22b046e26455e4f9c9b3aaaf62212d`（插件 1.3.2）；比较不表示整包升级或重新引入。
- `skills-lock.json` 的 `sourceRevision`、`upstreamHash` 继续表示原始来源。`effectiveHash` 若存在，表示当前 profile 的有效内容，与上游哈希含义不同。
- 共享源为 `.agents/skills`；Backend 源仓覆盖位于 `profiles/backend/.agents/skills`。安装后的同名技能遵循所选 profile；不是每个 profile 都含所有相关技能。

| 技能 | 本地职责与保留差异 | 本轮状态 | 有效入口 |
|---|---|---|---|
| `code-review` | 有证据的只读审查 | 已适配；文本与结构已核对 | `.agents/skills/code-review/SKILL.md` |
| `codebase-design` | 模块边界与接口备选 | 已适配；文本与结构已核对 | `.agents/skills/codebase-design/SKILL.md` |
| `diagnosing-bugs` | 故障与性能诊断 | 已适配；文本与结构已核对 | `.agents/skills/diagnosing-bugs/SKILL.md` |
| `domain-modeling` | 根 CONTEXT 与业务词汇 | 已适配；文本与结构已核对 | `.agents/skills/domain-modeling/SKILL.md` |
| `grilling` | 围绕真实分歧逐项提问 | 已适配；文本与结构已核对 | `.agents/skills/grilling/SKILL.md` |
| `handoff` | PR/MR 文件交付 | 保留本地差异，已核对 | `.agents/skills/handoff/SKILL.md` |
| `implement` | 承接明确 Ticket 或当前需求 | 已适配；文本与结构已核对 | `.agents/skills/implement/SKILL.md` |
| `prototype` | 临时逻辑实验；Backend 保留后端边界 | 已适配；文本与结构已核对 | `.agents/skills/prototype/SKILL.md` |
| `resolving-merge-conflicts` | 保护用户修改的冲突解决 | 保留本地差异，已核对 | `.agents/skills/resolving-merge-conflicts/SKILL.md` |
| `setup-matt-pocock-skills` | 按明确目标配置 tracker | 已适配；文本与结构已核对 | `.agents/skills/setup-matt-pocock-skills/SKILL.md` |
| `tdd` | 用户要求的测试优先方法 | 已适配；文本与结构已核对 | `.agents/skills/tdd/SKILL.md` |
| `to-spec` | 复用讨论综合规格；Backend 保留研发定位 | 已适配；文本与结构已核对 | `.agents/skills/to-spec/SKILL.md` |
| `to-tickets` | 业务票与实现 Slice 拆分 | 已适配；文本与结构已核对 | `.agents/skills/to-tickets/SKILL.md` |
| `triage` | 已有条目的分析与授权更新 | 已适配；文本与结构已核对 | `.agents/skills/triage/SKILL.md` |
| `wayfinder` | 决策地图与依赖前沿 | 已适配；文本与结构已核对 | `.agents/skills/wayfinder/SKILL.md` |
| `writing-for-agents` | 条件引用与清晰指令 | 已适配；文本与结构已核对 | `.agents/skills/writing-for-agents/SKILL.md` |
| `yss-research` | 事实研究与竞品研究路由 | 保留本地差异，已核对 | `.agents/skills/yss-research/SKILL.md` |

另核对本地 `maintaining-skills`、`i-have-adhd`、`yss-product-lifecycle`、`llm-wiki` 的直接消费者；它们不因此改标为 Matt 原始来源。

采用范围：按需参考、完整 Ticket 读取、测试边界说明、真实关系、独立任务上下文、PR/复盘方法与知识时效。保留 YSS 业务身份、显式调用政策、动作授权和文件保护；不恢复统一阶段门禁、批准包、脚本或测试套件，不增加技能入口。

`chief-of-staff` 和 `software-factory` 仍为观察材料；不引入常驻采集、默认全代理实施、运行器或服务。未被本地采用的上游步骤不构成本仓执行要求。

来源与分发核对不证明实际 Agent 行为、CLI 安装兼容或远程发布成功；这些结论需对应执行结果。

本轮已完成上述内容修订与分发核对，未整包替换上游。实际观察包括临时 Git 审查范围、只读公开 GitHub 字段及临时 wiki 的查询/更新；其余方法先完成文本场景核对。GitLab 实例、跨宿主发现/调用及已安装项目升级兼容未验证，没有发布。

2026-11-01 修订：此前记录的 P3（明确新 Issue URL 与已存配置不同时重复询问）已修正。GitHub/GitLab 及当前配置说明均允许明确目标用于本次动作，保留持久配置与原授权范围；只在实际无法消歧时询问，访问失败不回退到默认目标。本项已做文本场景核对，未进行远程写入或跨宿主运行验证。

同次修订补齐 code-review、grilling、wayfinder 的已有委派分支独立上下文规则，以及 wayfinder 的方法类型保存、恢复与缺失/冲突处理。GitHub 关系命令示例经本机 gh 2.102.0 帮助核对；i-have-adhd 的发现描述明确包含 PR/MR 与复盘，保留既有调用政策。共享副本、Backend 有效内容和相关哈希已核对；场景只做文本核对，尚未验证安装宿主的实际发现/调用、远程关系写入或已安装项目升级。
