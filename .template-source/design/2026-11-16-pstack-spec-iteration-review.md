**pstack 深度审核与 Spec 下一版迭代结论报告**

研究日期为 2026-11-16。面向 YSS 模板、技能与 CLI 维护者，支持下一版范围取舍。本报告保留研究定稿时的建议与证据。用户随后选择方案 A 并批准实施，范围与实际结果见[设计](2026-11-16-spec-engineering-reliability-design.md)和[实施计划](2026-11-16-spec-engineering-reliability-plan.md#2026-11-16-实施结果)。版本号和发行时间尚未确定。

**建议下一版集中改善三件事。让 Agent 找到项目实际验证入口，让技能行为改动得到可信对照，让来源冲突时的采用依据可见。** 三项均可复用已有技能和参考。当前证据支持小范围方法修订与针对性验证。工程执行器、通用宿主探测、自动调度和形式化工具适合在出现具体需求后单独评估。

本次复核收窄了上一轮建议。YSS 已有调用者视角设计、备选方案、真实候选审查、版本绑定、增量重验、跨仓续办、复盘与知识维护。下一版的增量应落到这些方法被实际采用的环节，避免把已有能力重新包装为新功能。[设计比较](../../.agents/skills/codebase-design/DESIGN-IT-TWICE.md)、[跨仓实施](../../.agents/skills/implement/references/repository-scope.md)、[技能维护](../../.agents/skills/maintaining-skills/SKILL.md)

**研究对象与证据边界已经固定。**

| 对象 | 核查基线 | 本次证据 |
| --- | --- | --- |
| YSS Template | 5.8.0，`bc008f11252507601549f079511f957ce73d301e` | 当前方法、资产、分发规则及已有验证记录。研究开始时工作区干净 |
| YSS CLI | 3.8.0，`4b6f6fb405fa46c00143cda831fe7769138734ec` | 当前源码、已安装程序版本、`doctor` 与 `workbench request` 帮助 |
| Lauren Tan / poteto 的 pstack | 官方 `cursor/plugins`，0.15.42，`bf0c7cd80abdbf7fe47b634978a7d1b4071f71a7` | 技能、执行方法、适配文档、公开问题与变更记录 |
| phthomas/pstack | 独立同名项目，变更记录 2.3.1，`faa4e9fb22e5cd19ac85ca094f6056ba89eaa701` | `ps-doctor`、`ps-review`、`ps-build`、`ps-init` 与变更记录 |

两份上游提交在本轮重新查询后与上一轮一致。以下将 Lauren Tan 项目称为“官方 pstack”，phthomas 项目始终标明作者。源码能证明机制写了什么，已有运行记录能证明相应场景的观察。两者都没有提供 YSS 与 pstack 的受控效率比较。官方版本和 YSS 发行信息可分别定位。[pstack 清单](https://github.com/cursor/plugins/blob/bf0c7cd80abdbf7fe47b634978a7d1b4071f71a7/pstack/.cursor-plugin/plugin.json)、[phthomas 变更记录](https://github.com/phthomas/pstack/blob/faa4e9fb22e5cd19ac85ca094f6056ba89eaa701/CHANGELOG.md)、[YSS 发行记录](https://github.com/iloveZzz/yss-cli/releases/tag/v3.8.0)

**审核发现一，现有流程覆盖已有基础，下一版优先核查方法采用与执行可重复性。**

事实是，`codebase-design` 已要求方案说明类型、参数、不变量、调用顺序、错误和调用示例，且按真实取舍决定方案数。`implement` 已要求委派携带输入版本、目标工程和技能路径。前端验证已区分工程、视觉、交互证据，明确修复后重验受影响部分。技能维护已有代表请求、邻近非触发和授权反例。[设计方法](../../.agents/skills/codebase-design/DESIGN-IT-TWICE.md)、[仓库定位](../../.agents/skills/implement/references/repository-scope.md)、[前端验证](../../.agents/skills/yss-frontend-application/references/verification.md)、[维护要求](../../.agents/skills/maintaining-skills/SKILL.md)

推断是，继续增加相似入口会增加选择与维护成本。下一版更有价值的工作，是检查 Agent 在新上下文、同名技能和受限工具下，能否采用已有方法。Home Demo 的一次同名来源误选支持这个调查方向，但该样本无法给出普遍错误率，也不足以证明需要中央调度器。[Home 验证记录第 53—59 行](2026-11-15-spec-home-repo-validation.md)

**审核发现二，项目验证指南值得借鉴，维护范围需要由实际项目决定。**

官方 pstack 生成验证技能时要求真实启动、诊断、操作、证据和清理，并建立功能入口资料。生成交付只需实际运行一个映射功能。维护过程才要求覆盖所有功能文件。因而“生成成功”只能支持已运行范围的结论。其维护方法还明确区分说明漂移、驱动工具缺口和产品回归，这一判断值得吸收。[生成方法](https://github.com/cursor/plugins/blob/bf0c7cd80abdbf7fe47b634978a7d1b4071f71a7/pstack/skills/create-verification-skill/SKILL.md)、[维护方法](https://github.com/cursor/plugins/blob/bf0c7cd80abdbf7fe47b634978a7d1b4071f71a7/pstack/skills/maintain-verification-skill/SKILL.md)

YSS 已有操作证据、服务身份、日志、恢复与清理要求。缺口是部分实际项目可能尚未把入口集中到可复用位置，本轮尚未取得多个真实项目都存在该问题的证据。建议在现有方法中补充条件式指引，优先读取项目已有 README、运行说明或项目技能。出现真实资料缺口时，在同一入口补齐。模板维护提供方法，具体启动命令、身份和数据由获授权的实现工程维护。[前端工具方法](../../.agents/skills/yss-frontend-application/references/quality-tooling.md)、[Backend 运行说明方法](../../profiles/backend/.agents/skills/implement/references/build-deploy-guide.md)

Spec 负责说明行为、条件与验收结果，研发负责选择测试、驱动工具和环境。规格与实现冲突时，应核对原始决定和变更授权。phthomas 的 `ps-init` 总则倾向于按代码现实修正文档，但正文也对产品方向、ADR 和判断性修复保留人工决定。采用时应保留这些限定。YSS 当前已明确禁止通过修改规格迁就实现。[ps-init](https://github.com/phthomas/pstack/blob/faa4e9fb22e5cd19ac85ca094f6056ba89eaa701/.claude/skills/ps-init/SKILL.md)、[YSS 输入与反馈](../../.agents/skills/implement/references/repository-scope.md)

**审核发现三，盲测有明确增量，实验设计还需要控制变量。**

官方 pstack 的 Eval 使用自然请求、隔离输出、匿名候选和实际读取记录。它还允许不同模型并行生成候选。若同时改变技能与模型，结果难以归因到技能修改，因此建议对技能改版采用相同模型、推理配置、宿主、权限和任务起点。模型变化可以另作比较因素。[Eval 源码](https://github.com/cursor/plugins/blob/bf0c7cd80abdbf7fe47b634978a7d1b4071f71a7/pstack/skills/poteto-mode/playbooks/eval.md)

建议在现有观察方法中增加自然请求、独立上下文、未参与改稿的案例和修改前后对照。检查实际产物与环境结果，读取轨迹用于解释来源选择。评分应接受符合目标的合理执行路径。业务正确性与授权边界仍按任务判断。多次尝试、环境隔离、最终状态检查和评审校准也得到 Anthropic 官方评估实践支持。[现有观察方法](../../.agents/skills/i-have-adhd/references/pr-and-retro.md)、[Anthropic 评估实践](https://www.anthropic.com/research/demystifying-evals-for-ai-agents)

这项建议只适用于实际改变触发或行为、且需要判断效果的技能维护。一次运行可以发现具体问题。当结果波动或结论会影响采用决定时，再增加对照观察。样本不足时保留逐例结论。宿主缺少读取轨迹时，来源选择保持未知。开发子代理中的演练只覆盖该运行环境，宿主原生发现需在真实宿主另行验证。

反向核查也发现，上游另有 `benchmark-checklist` 要求性能比较重复、交替运行并报告波动，`swarm` 要求测量任务说明样本与方法。因此，实验控制的限制具体指 Eval 中技能变体与模型配置的归因问题，上游性能测量方法仍可按场景参考。[性能测量方法](https://github.com/cursor/plugins/blob/bf0c7cd80abdbf7fe47b634978a7d1b4071f71a7/pstack/skills/benchmark-checklist/SKILL.md)、[swarm 测量约定](https://github.com/cursor/plugins/blob/bf0c7cd80abdbf7fe47b634978a7d1b4071f71a7/pstack/skills/swarm/SKILL.md)

**审核发现四，宿主能力的事实来源决定了 CLI 可以承诺的范围。**

phthomas 的 `ps-doctor` 以能力、provider 和 fallback 组织信息，主要采用文件、依赖、命令等便宜探测。它有助于解释降级，但发现提供者与调用成功仍是两个观察。YSS 当前 `doctor` 实现读取安装收据、文件差异和事务状态。它缺少当前 Agent 会话的工具目录、权限和实际调用结果。[ps-doctor](https://github.com/phthomas/pstack/blob/faa4e9fb22e5cd19ac85ca094f6056ba89eaa701/.claude/skills/ps-doctor/SKILL.md)、[YSS doctor 固定源码](https://github.com/iloveZzz/yss-cli/blob/4b6f6fb405fa46c00143cda831fe7769138734ec/src/project/mod.rs#L172)

YSS 已有直接反证。Claude Code 发现目录后模型请求返回未登录，Pi 退出码为 0 仍有订阅错误，Codex 的文件读取记录也缺少原生 catalog 注入证据。建议继续分别描述载荷存在、宿主发现、采用来源与工具调用，只在同名冲突、来源变化或能力受限时补充本次采用依据。[宿主核实记录第 34—50 行](../../.agents/skills/setup-yss-harness/references/host-compatibility.md)

通用宿主探测器宜延期，后续若有稳定的宿主查询接口或真实调用协议，再确定 CLI 切片。现有收据、Bundle 摘要、三方更新和文件保护已覆盖分发层的重要风险，可以直接复用。[收据结构](https://github.com/iloveZzz/yss-cli/blob/4b6f6fb405fa46c00143cda831fe7769138734ec/src/project/state.rs#L23)、[更新处理](https://github.com/iloveZzz/yss-cli/blob/4b6f6fb405fa46c00143cda831fe7769138734ec/src/project/plan.rs#L250)

**审核发现五，运行复核与多代理审查有价值，证据门槛需要保留适用范围。**

官方 `interrogate` 要求排除未执行证明的发现，并由协调者重跑失败命令。该方法适合具备复现条件的缺陷，但按字面移植会漏掉静态可证、环境暂缺或运行可能产生外部副作用的问题。建议沿用 YSS 当前证据标准，明确说明实际运行、源码推导或验证受阻的依据和影响。未复现的疑点可继续调查，报告结论随证据变化。[interrogate](https://github.com/cursor/plugins/blob/bf0c7cd80abdbf7fe47b634978a7d1b4071f71a7/pstack/skills/interrogate/SKILL.md)、[YSS 审查方法](../../.agents/skills/code-review/SKILL.md)

上游相邻的 Bugbot 分诊方法保留了有合理依据的正确性、安全性问题以及需要判断的高风险事项，说明这些证据门槛各有适用范围。借鉴时应按具体方法核对，不能把 `interrogate` 的筛选条件外推到全部审查。[Bugbot 分诊规则](https://github.com/cursor/plugins/blob/bf0c7cd80abdbf7fe47b634978a7d1b4071f71a7/pstack/skills/poteto-mode/references/bugbot-triage.md)

phthomas 按风险调整审查人数值得参考，但 YSS 已经按目标、依赖、资源隔离和协调成本决定委派。其作者记录过多代理输出溢出与较高耗时，随后缩小审查规模。这属于单次作者经历，缺少可归因的前后对照。因此本轮将“风险比例审查并行”归入已有方法的运用，后续根据实际漏检或协调失败选择具体修订。[ps-review](https://github.com/phthomas/pstack/blob/faa4e9fb22e5cd19ac85ca094f6056ba89eaa701/.claude/skills/ps-review/SKILL.md)、[作者变更记录](https://github.com/phthomas/pstack/blob/faa4e9fb22e5cd19ac85ca094f6056ba89eaa701/CHANGELOG.md)、[YSS 并行开发](../../profiles/backend/.agents/skills/implement/references/parallel-development.md)

**审核发现六，借鉴工具前需核对授权、持续运行与证明边界。**

官方 `poteto-mode` 默认允许部分团队消息和工单更新，`reflect` 要求直接向 backlog 发送条目。这些授权假设与当前 YSS 的外部动作规则有差异。若移植相关方法，外发动作应继续依据用户的真实授权，研究产出先保留为当前报告中的建议。[poteto-mode](https://github.com/cursor/plugins/blob/bf0c7cd80abdbf7fe47b634978a7d1b4071f71a7/pstack/skills/poteto-mode/SKILL.md)、[reflect](https://github.com/cursor/plugins/blob/bf0c7cd80abdbf7fe47b634978a7d1b4071f71a7/pstack/skills/reflect/SKILL.md)、[YSS 工作入口](../../AGENTS.md)

官方 Claude Code 适配对部分模型与 Cursor 功能执行回退或跳过，公开讨论也记录了持续运行的宿主限制。这支持按实际宿主验证自动执行能力。YSS 的 `workbench request` 当前生成产品问题与答复的续办文本，任务模型保存个人跟踪状态。增加依赖调度、Agent 归属、进程恢复会引入新的运行语义，本轮未取得必须由 CLI 接管这些职责的证据。[Claude Code 适配](https://github.com/cursor/plugins/blob/bf0c7cd80abdbf7fe47b634978a7d1b4071f71a7/pstack/docs/harness/claude-code.md)、[持续运行问题讨论](https://github.com/cursor/plugins/issues/1158)、[request 源码](https://github.com/iloveZzz/yss-cli/blob/4b6f6fb405fa46c00143cda831fe7769138734ec/src/workbench/content.rs#L407)、[任务模型](https://github.com/iloveZzz/yss-cli/blob/4b6f6fb405fa46c00143cda831fe7769138734ec/src/workbench/model.rs#L162)

形式化验证可以探索普通测试难以覆盖的状态组合，但结论受模型、原子步骤、边界和代码对应关系约束。上游本身要求用破坏变体证明检查能够识别错误，并维护同步提交。YSS 已有状态、不变量和并发验证方法，当前缺少必须采用形式化工具的具体目标，建议保留为高风险研发问题的专题选项。[形式化验证生成](https://github.com/cursor/plugins/blob/bf0c7cd80abdbf7fe47b634978a7d1b4071f71a7/pstack/skills/create-formal-verification-skill/SKILL.md)、[维护机制](https://github.com/cursor/plugins/blob/bf0c7cd80abdbf7fe47b634978a7d1b4071f71a7/pstack/skills/maintain-formal-verification-skill/SKILL.md)、[YSS 逻辑原型](../../.agents/skills/prototype/LOGIC.md)、[Backend 测试方法](../../profiles/backend/.agents/skills/yss-backend-testing/references/test-design.md)

源码复核还确认，`statechart` 有真实执行器，以及与 TLC 对照的差分测试和未完成检查的结果测试。这些设施支持模型检查与输出解释，产品代码和模型的语义对应仍需要逐项建立。本轮仅阅读相应源码和测试，没有运行该执行器。[执行器](https://github.com/cursor/plugins/blob/bf0c7cd80abdbf7fe47b634978a7d1b4071f71a7/pstack/skills/statechart/scripts/run.ts#L282)、[差分测试](https://github.com/cursor/plugins/blob/bf0c7cd80abdbf7fe47b634978a7d1b4071f71a7/pstack/skills/statechart/scripts/test/differential.test.ts#L398)

**下一版建议采用以下范围。表内验收均为后续目标，本轮尚未执行。**

| 候选改进 | 最小修改与归属 | 可观察验收 | 代价与适用条件 |
| --- | --- | --- | --- |
| 项目验证入口 | 在前端 `verification.md`、Backend `build-deploy-guide.md` 补充优先使用项目已有操作说明的指引。实际出现缺口时，沿原入口补真实启动、就绪、代表路径、异常、证据与清理 | 新上下文能从已有入口运行受影响场景。服务来源错误或必要条件缺失能被识别。操作结果与预期匹配。清理只涉及本任务资源。已有资料继续由原入口维护 | 依赖真实工程和运行条件。入口完整时直接复用，维护者关注后续命令与路径漂移 |
| 技能行为的盲测对照 | 在现有 `pr-and-retro.md` 补充对照方法，由 `maintaining-skills`、`writing-for-agents` 的现有引用消费 | 自然请求在隔离上下文中执行。修改前后条件可比。至少能辨认来源误选、执行偏差与工具阻塞。邻近非触发及授权反例得到核对。留出案例结论与产物可追溯 | 发生需要判断效果的行为改动时采用。工具记录和模型运行有成本，缺失指标保留未知 |
| 来源冲突的采用依据 | 在 `repository-scope.md` 的现有来源段落补充条件式表述，详情引用已有 `host-compatibility.md` | 目标工程与全局同名时可说明实际采用路径和版本依据。显式读取被如实标记。工具缺失对应具体未验证范围。正常局部任务可直接完成 | 适用于跨仓来源变化、同名冲突或能力受限。来源说明仅保留任务所需信息 |

建议顺序是先落实项目入口和来源表述的最小候选，再用盲测方法检验这些候选及后续行为改动。已有合成案例可以用于回归，新增真实任务用于检查迁移效果。若现有文字在相同条件下已经满足预期，就保留原文，并将观察结果记录在已有任务资料中。

以下方向的处理结论用于控制下一版范围。

| 方向 | 本轮建议 | 再次评估的触发条件 |
| --- | --- | --- |
| 调用者优先设计、备选比较、候选版本与增量重验 | 复用现有方法 | 实际任务出现可定位遗漏，再修对应入口 |
| 重复纠正到结构性修复 | 沿现有复盘处理具体根因 | 同类错误有可复核记录，明确属于来源、接口、校验或指令发现问题 |
| 新增统一多代理入口与固定审查角色 | 延期 | 现有委派方法反复产生可确认的协调或覆盖损失 |
| CLI 通用宿主探测 | 延期 | 有稳定可访问的宿主事实接口，且已界定不同层次的成功含义 |
| Workbench 执行调度、任务依赖图、自动重试 | 延期 | 真实任务存在现有续办方法难以处理的丢失、重复或错误恢复，并已确认产品职责 |
| 形式化工具与模型维护 | 专题研究 | 有高风险性质、现有验证缺口和模型到代码的对应依据 |

**维护影响可以控制在现有内容源与分发范围内。**

共享方法从 `.agents/skills` 修改，Backend 专有方法从 `profiles/backend/.agents/skills` 修改。采用上述候选时，按实际消费关系同步受影响 WorkBuddy 副本、Claude 入口与 Profile 有效内容。跨技能增加叶子引用时核对 project、skills 两种安装模式的引用闭包。来源说明记录此次比较的固定提交，避免改写原始引入来源。直接复制上游实质内容时按其许可证保留声明。[技能维护说明](../agents/skills-maintenance.md)、[编写与分发约定](../../.agents/skills/maintaining-skills/references/authoring.md)、[pstack 许可证](https://github.com/cursor/plugins/blob/bf0c7cd80abdbf7fe47b634978a7d1b4071f71a7/pstack/LICENSE)

上述三个候选可通过既有能力落地。模板仓保存通用方法，工程中的操作与测试由实际项目承担。发布记录应区分方法已修改、内容已分发、宿主已采用和真实项目效果，每项说明实际证据。首轮采用所需的工程投入与收益尚无可靠估算。

**建议用下列场景判断候选是否值得保留。**

| 观察场景 | 期望看到的结果 | 需要保留的证据 |
| --- | --- | --- |
| 新上下文接续已有项目验证 | 找到真实入口，操作受影响路径，指出具体运行限制 | 实际读取位置、命令或操作、环境结果 |
| 目标仓与全局存在同名技能 | 按任务采用适用来源，相对资源来自同一技能目录 | 可见读取轨迹与采用路径。轨迹缺失时记录未知 |
| Spec 或工程有未提交更新 | 使用本次选定材料，重验受影响部分 | HEAD、相关差异或观察时点、检查对应范围 |
| 修改技能触发描述 | 目标请求得到适当处理，邻近请求完成自身任务 | 相同起点的前后结果、留出案例、实际人工纠正 |
| 宿主缺少必要工具或凭证 | 对受影响步骤给出准确限制，独立工作继续 | 真实工具结果、已完成与待验证范围 |
| 仅授权研究或审查 | 产出所需结论，外部动作遵守授权 | 实际产物和工具调用记录 |

这些场景服务于本次候选的判断。已有记录可解释的事实直接复用，新演练明确注明模拟范围。只有获得相应原始记录时才统计人工纠正、重复澄清、耗时和 Token。样本结论限定在实际任务、宿主和版本。若新方法增加了资料维护与运行开销，且观察不到目标问题的改善，应缩减或撤回对应修订。

**本轮实际完成与剩余未知。**

已完成当前两个 YSS 仓库的基线核对、已安装 CLI 的版本与帮助核验、两份上游固定版本的源码研究、适配取舍审查，以及本报告的编写。三个并行只读调查分别复核模板重合、CLI 职责和上游限制，结论经主 Agent 合并。遵照仓库规则先尝试 CodeGraph，目标 Markdown 未得到准确索引结果后直接读取相关文档。

报告另经独立复核，检查 YSS 范围与上游事实。复核指出执行可重复性尚属待验证方向，正文已据此修正。报告中的 20 处本地引用均存在，28 个唯一外部链接均可访问。链接可访问只用于核对引用有效性，各项行为结论仍以上述证据范围为准。

研究阶段没有执行 pstack 端到端工作流、跨宿主新实验、真实产品试点或技能改版对照。报告引用的宿主与 Home 运行结果来自 2026-11-15 既有记录。公开问题中的运行现象属于报告者证据，状态和适用版本应在实际采用时复核。研究证据不足以给出稳定成功率、效率收益或精确工期。随后用户确认三个候选的采用范围，实施阶段的受控对照另见[实施计划执行记录](2026-11-16-spec-engineering-reliability-plan.md#2026-11-16-实施结果)。
