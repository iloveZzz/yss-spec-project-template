# Matt skills 来源与本地适配

首次核验日期：2026-10-31；本次修订日期：2026-11-03。此文件记录来源与本地差异，不是技能使用前置或执行授权。

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
| `to-tickets` | Spec 显式拆业务票；Backend 按真实输入拆实现 Slice | 已适配；文本与结构已核对 | `.agents/skills/to-tickets/SKILL.md` |
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

2026-11-01 Backend 完整研发适配：Backend 对 `implement` / `to-tickets` 新增同名文件覆盖，按已授权研发任务允许方法选择，保留共享来源、tracker 身份、真实关系与仓库/子模块/委派保护。共享 Spec 入口仍为显式调用。Backend 继承共享 references，并由 implement 持有构建部署手册方法；手册不授予部署权限。`tdd` 的共享发现描述与正文均限定明确测试优先请求，普通集成/回归测试不触发 TDD。原始 `sourceRevision` / `upstreamHash` 不变，Backend 的有效树哈希单独更新。这些适配不表示实际宿主已完成自动发现验证。

2026-11-01 职责边界修订：Spec 的 to-tickets 仅在明确要求拆票时将规格组织为业务票，不增加必交付物或技术设计；Backend 同名覆盖只细化研发实现 Slice，直接消费既有 Spec/业务票/明确需求。两侧分别分发业务票和切片模板，保留原调用政策、tracker 授权与上游身份；现役研发切片模板由 Backend 持有。内容调整不代表已有实例或宿主行为已验证。

2026-11-03 交付可靠性修订：共享维护方法区分源码、指定 CLI/Bundle 安装、实际宿主读取与真实项目结果；Spec 与 Backend 沿原规则处理来源变化及研发反馈。Backend implement 持有策略 A：已授权、依赖就绪、路径及运行资源可隔离且宿主支持时自行并行，主控集成验证后才释放下游。七项显示名称按 profile 校准，prototype/to-spec 增加 Backend metadata 覆盖；移除 prototype/agents 的旧排除。技能 ID、调用政策和默认 16/41 集合不变。

分发核对：共享与 Backend 有效 WorkBuddy 文件、Claude 共享链接、四个默认集合和既有来源字段已核对；只更新受影响的 10 项 Backend effectiveHash。14 个 profile/模式/调用者的最小资源合成案例可读到新增叶子参考，未引入额外 SKILL.md；这是源码合成检查，不是 CLI 独立补装证据。宿主观察与 CLI 证据见下文；未发布或更新用户实例。

2026-11-03 实际观察补充（匿名演练，不是业务项目交付）：使用现有 npm Codex CLI 0.163.0 的 ephemeral 会话，在源码合成的 profile 默认技能目录执行自然语言请求；没有点名应选技能或粘贴技能正文。核对可见命令读取路径、最终文件差异和运行日志，结果如下。模型信息未独立取得，不推导其他宿主或纯净安装表现。

| 场景 | 可见证据与结果 | 限制 |
|---|---|---|
| Spec 局部文案 | 读取本地写作方法，只修改规格及一个直接引用，其他文件哈希不变 | 无 GUI 显示验证 |
| Spec 准备交接 | 读取本地 spec-workflow，仅新增交接说明；原型及补充 7 个状态检查通过，提示词默认分析 | 无真实认证、数据库或接收方访问验证 |
| Backend MVC 修复 | 读取本地 implement 与一般测试方法，保留 Controller/Service，Java 8 编译及 16 个场景通过 | Java 方法级，不是 HTTP 集成 |
| 普通补测 | 只新增测试，5 个用例通过，现有实现不变；无可见 TDD 技能读取 | 首次编译缺 out 目录，创建后重试通过 |
| Backend 明确实现 | 读取本地 implement，完成撤回及 Service/Controller 测试 | 首次未读取 spec-feedback，不能算该参考命中；编译目录缺失后重试通过 |
| 规格来源 v1→v2 定向复查 | 将引用提前到读取实际规格的步骤后，实际读取 spec-feedback；按已确认 v2 撤销管理员代撤回权限，旧原型保留；6 组回归通过 | 单次复查不证明普遍改善，也不是运行中来源竞争测试 |
| 相邻只读分析 | 读取技术设计与写作方法，全部文件哈希不变 | 未执行实现或测试 |
| 两项独立修复 | 读取 parallel-development，有协作 wait 事件及两项真实修改，主控统一编译并运行两个测试类 | JSONL 未暴露 spawn 参数或子任务状态；不能仅凭叙述证明独立上下文、实际并发及完整回收过程 |
| 共享资源与未提交前提 | 保留当前未提交 traceId 接口与调用方，两个回归串行运行，无提交 | 共享库/端口条件是场景输入，没有真实外部资源竞争 |

PATH 中 Codex 0.153.4 的首次尝试因缺少 code-mode-host 未能读写，返回限制后主控终止仍在退出的进程；改用已有 0.163.0，没有修改 CLI 或全局配置。运行中存在插件/MCP 启动告警，本文不将其视为已修复或全部环境正常。首轮遗漏参考后的定向复查使用修订后的 implement，其余场景只证明各自实际读取的内容，不宣称运行时内部步骤全部可见。

YSS CLI 3.1.2 的 Backend skills 基线安装在临时目录成功，默认 41 项，未含新增 spec-feedback 或 prototype metadata；最初 /var 符号路径被 UNSAFE_PATH 拒绝，使用同一新目录的真实路径后成功。此结果仅验证旧内嵌 Bundle，不证明本轮新内容已由 CLI 安装。新 Bundle 四种安装组合、真实单项补装、既有实例升级、其他宿主/GUI、生产服务以及失联/中止恢复未实测。源码单项资源合成与文本异常分支核对不能替代这些结果。未发布、未更新用户实例。

最终独立只读审查已完成：未发现需修复的问题；分发、政策、副本、10 项已有有效哈希及观察表述均已复核。此结论只覆盖本轮模板与技能源维护，不代表新 Bundle 安装、完整并发隔离或真实业务环境已验证，也不授予提交或发布权限。

2026-11-03 后续 review 修复 P2：手工 worktree 回退现在区分普通主 checkout 与 linked worktree；后者跳过内部目录默认值，选择物理父目录下的独立并列位置。创建前解析实际祖先与符号链接，拒绝与已登记工作树重叠或嵌套的目标；项目内忽略检查针对实际选定目标，不再用另一个目录代替。入口、排查参考、两套 WorkBuddy 副本及 using-git-worktrees 的现有有效哈希同步更新。

本次在一次性本地仓库完成 12 个路径规则案例，并实际创建并列 worktree，验证含斜杠的分支名不会决定目录层级、父工作区未提交文件和已有目录内容保留。案例包括普通主 checkout 默认目录、linked 同级目录、原嵌套目标、符号链接/.. 回指、同路径/祖先路径、相似名称和未忽略目标。这是规则演练与 Git 路径行为验证，未重跑 Agent 自主选择或新 Bundle 安装，不沿用此前“未发现问题”作为本次修复的独立审查结论。未提交或发布。
