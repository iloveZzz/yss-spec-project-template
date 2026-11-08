# Matt skills 来源与本地适配

首次核验日期：2026-10-31；本次修订日期：2026-11-08。此文件记录来源与本地差异，不是技能使用前置或执行授权。

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

2026-11-08 环境事实与安装后调用观察：再次核对上游最新正式发行 v1.3.2 和 main `4ae2317ddb22b046e26455e4f9c9b3aaaf62212d`，与既有比较基线一致。仅补强 `writing-for-agents`：可直接检查的 scripts、配置、目录和实际帮助以环境为事实源，文档保留隐性约定、原因与陷阱；确需缓存或提供可运行示例、可复现快照时注明来源并按版本/时点维护，保留安全操作与恢复说明。入口增加“决定哪些事实应写入 Agent 文档”这一条件引用，名称、描述、调用政策和默认集合不变。

共享源、根与 Backend WorkBuddy 副本已同步，Claude 共享链接保留，仅更新 Backend 该技能已有 effectiveHash；原始 sourceRevision / upstreamHash 保留。Frontend 白名单不包含此技能，不新增入口或副本；共同适配记录仍同步到三个 Profile。未新增脚本、测试套件、依赖或 CLI 命令。

本轮为匿名临时演练，不是业务项目结果。使用现有 Codex CLI 0.167.0，以 `exec --ephemeral --ignore-user-config` 和自然语言任务运行，未在提示中点名应选技能或粘贴正文；写入样例使用 workspace-write，审查样例使用 read-only。核读 JSONL 中的实际本地读取、命令输出及文件差异；仍可见宿主预装全局技能，不称纯净环境，模型信息未独立取得。

旧规则样本通过已安装 YSS CLI 3.3.2（Bundle `a8dce5add4831f14a7e4ae74db6d83bf24540f533656ee6d75bb0b6acd1d1865`）真实 attach，并 ensure 写作技能。新样本使用同一 CLI 源码提交 `cbc0d53f6facea923761e72e5697d9d63166805e` 的临时 debug 构建，重新内嵌本轮模板工作树：模板 HEAD `c506055ec86dee866cf4b5d976f69ecbbeeef792`，snapshot `ec2e8bcf4aab30485b0ece5612b07fd8af7b782db79ed285307a2ba4e12e7d6b`，Bundle SHA-256 `feef211dce9a3a294e12a031a8035cef78245bfbabca4a4158ba84eb48f594b6`。该 Bundle 生成于追加本节观察记录之前，包含本轮写作规则，不包含事后记录；不是正式发行或对现有工具的升级。

| 场景 | 实际观察 | 限制 |
|---|---|---|
| Spec 旧规则写作对照 | 实际安装默认 16 项并补装 writing-for-agents；读取本地技能，未见 writing-principles 读取；修正过期命令、保留姓名大小写及合作方匹配原因，Git 差异仅 AGENTS.md | 一次旧规则样本已经能正确完成主要任务，不能据此认定旧规则失效 |
| Spec 新规则写作 | 新 Bundle 的同一安装组合共 17 项；安装后的两份变更正文与共享源逐字节相同；实际读取本地技能和 writing-principles，修正过期命令、保留业务原因，Git 差异仅 AGENTS.md | 仍保留少量当前命令；仅观察到条件引用被读取，未证明减少缓存或提高准确率、效率 |
| Backend 未提交审查 | 新 Bundle 默认 41 项；读取本地 code-review 和候选范围参考；找出暂存、未暂存、新文件中的三项预置缺陷，并用 Node 调用核实；审查前后全部已采集文件哈希一致 | 匿名方法级演练，不是生产权限验证 |
| Backend 普通集成补测 | 新 Bundle 默认 41 项；读取本地 yss-backend-testing 及测试设计/执行参考，无可见 TDD 技能读取；仅新增测试文件，javac 编译、SmokeTest 和三个集成场景均通过 | Controller → Service → 内存 Map，不含真实 HTTP、数据库或认证 |
| Frontend 局部文案与间距 | 新 Bundle 默认 13 项；读取本地 yss-frontend-application，无可见 Vue/composable 专项技能读取；实际差异仅按钮文案和 8px→12px，其他已采集文件哈希不变 | 未安装依赖、构建或运行浏览器，不能据此声称视觉还原完成 |

安装准备中，一次在旧样本原事务完成前的重复 attach 返回 RECOVERY_REQUIRED，原操作随后成功，recover --dry-run 返回 unchanged；不作为 CLI 缺陷。新集成样例已有 .gitignore 时 attach 返回 CONFLICT；保留原内容、安装后合并样例忽略规则再继续，没有强制覆盖。Codex 日志含状态库告警，写作样例 npm 输出兼容性提示；未改全局配置或宣称环境全部正常。

以上仅覆盖 macOS 上三种 Profile 的 skills 安装、Spec 单项补装和这些自然语言样例；未验证 project 模式、本轮已有实例升级、Windows/GUI、远程关系写入、完整并发隔离或生产服务，不外推整体收益。未提交、推送、发布或更新用户安装实例。

2026-11-08 同日补充：第三方问题清单与模块边界检查。继续从相同上游比较提交取材，借鉴 [to-questionnaire](https://github.com/mattpocock/skills/blob/4ae2317ddb22b046e26455e4f9c9b3aaaf62212d/skills/productivity/to-questionnaire/SKILL.md) 的接收者、所需答复、已知事实与知识缺口组织方式，完善现有 grilling 的第三方清单分支及发现描述。请求清单时直接形成草稿，只有缺少接收者或用途信息时才问当前用户，不把对方掌握的事实转问用户；保留草拟与外发的授权区别。

Frontend 在现有质量参考中补入已确认模块边界的检查方法，来源与取舍另见其包内 source-adaptation。只在本次需要时复用工程现有检查，说明静态路径、动态导入、别名解析和依赖环的覆盖差异，实际观察合法通过、越界被目标规则拒绝、恢复后通过。没有新增技能入口、默认安装项、固定目录、应用依赖或 CLI 命令；没有向模板加入检查脚本或测试套件。

本轮仍为匿名演练，使用 Codex CLI 0.167.0 和上节相同启动参数，未点名应选技能或粘贴正文。独立运行清单与相邻事实查询；安装后的 grilling 正文/显示元数据、Frontend 质量参考与共享源逐字节相同。新试验构建仍为 CLI 源码 `cbc0d53f6facea923761e72e5697d9d63166805e` 的 3.3.2 debug 构建，模板 HEAD `c506055ec86dee866cf4b5d976f69ecbbeeef792` 的工作树 snapshot 为 `70f9722b4d1645230475f0a3303ed65e8277fb6ce5080b8f857eaeb9564d3704`，Bundle SHA-256 `02734aeba7945d805171c3cd9ba9f2222ce2df9dfbb772b4c9a4dec3ab389589`。本节执行后追加的观察记录不在该 Bundle 中，不把试验构建称作正式发行。

| 场景 | 实际观察 | 限制 |
|---|---|---|
| 第三方待答清单 | 真实 Spec project 安装，默认 16 项；读取本地 grilling 与已有匿名资料，直接返回含背景和答复槽的清单，复用已知事实、聚焦幂等与查单缺口；未向当前用户索要对方才知道的事实，未外发或写文件 | 无真实接收者答复，不证明接口具备草稿所询问的能力 |
| 相邻纯事实查询 | 在同一安装目录开启另一个只读会话，只读资料并准确返回 30 分钟和每租户每秒 20 次请求，无可见 grilling 读取；两个会话前后全部已采集文件哈希一致 | 单样本不证明所有相邻请求都能正确选择技能 |
| Frontend 静态导入边界 | 真实 Frontend skills 安装，默认 13 项；临时样例预装 ESLint 10.14.0 和现有 pnpm lint，实际读到新增质量参考。先通过；新探针越界使 lint 返回 1 并命中 no-restricted-imports；清理后再次通过。五个导入断言覆盖公开入口、直接/嵌套越界、模块内部引用和相似模块名。只有 eslint.config.mjs 改变，业务源码、原未提交注释、package.json 和锁文件哈希保持 | JS 静态路径样例，不含动态 import、别名解析、依赖环、完整 Vue 构建或浏览器 |

本节补齐一个 Spec project 的真实安装和自然语言观察，不覆盖其他未测组合或现有实例升级。模型信息仍未独立取得，宿主仍可读预装全局技能；不外推跨宿主可靠性、准确率或效率收益。共享/适用 Profile 副本及已有有效哈希按实际内容同步，原始来源字段、调用政策、技能清单和白名单保持。未提交、推送、发布或更新用户安装实例。

2026-11-08 检验与工作树 review 收尾：范围为 HEAD `c506055ec86dee866cf4b5d976f69ecbbeeef792` 以来的当前 24 个未提交文件。按实际请求与仓库规范复核三项技能正文、显示元数据、直接引用、Profile 分发及已有观察记录，不引入统一交付门禁。

本次修订两处方法边界，并保留原发现语义：普通运行示例引用维护来源，只有可复现快照额外记录真实版本或观察时点；边界检查区分文本匹配与平台模块标识解析，补入等价路径、重导出和恢复前实际内容。grilling 的描述恢复原有“需求假设”措辞，同时保留第三方清单入口。

review 的反向验证发现：前轮临时正则能拒绝通常内部路径，却放过 `../modules/./contacts/internal/normalize.js`，Node 实际可加载该文件；后续仅使用文件路径规范化的临时规则仍放过 URL 编码路径。主控将该匿名样例改用文件 URL 解析，并补充非法编码的正常诊断。这些演练配置与测试均未进入模板，方法参考明确要求按目标平台核对解析及覆盖，文件路径判定不等同于模块缓存身份。

宿主演练仍使用 Codex CLI 0.167.0，写作与边界任务读取本地技能/参考。该阶段试验 Bundle 为 `563d461cfd050f854bd3912964a57d7d23ad8b1b7d84fa64acf2c5a399b4bea6`（模板工作树 snapshot `d6fc2a8a5f70d5374d2cb359905d5dab475ce6d26776fd165162a4904a7d1a86`）。URL 细节由主控补验后重新生成最终方法 Bundle `df3d283d84f9d6c51c18115b36477fefa86a31d391b599f15163be19784db173`（snapshot `4fbd31b0f0ffae76546e1f032fd71733e31966e56430998419ad4a58c41a5f0d`），再次用 CLI 3.3.2 临时构建同步并核对安装内容；未再次运行 URL 措辞补充后的宿主发现演练。两次构建仍基于 CLI `cbc0d53f6facea923761e72e5697d9d63166805e` 和模板 HEAD `c506055ec86dee866cf4b5d976f69ecbbeeef792`，均不包含事后追加的本节记录，不是正式发行。

| 检验 | 实际结果 | 范围与限制 |
|---|---|---|
| 已有 Spec skills 安装同步 | 从前轮 Bundle `02734aeb…` 安装默认 16 项并 ensure writing-for-agents，使用新构建同步成功；用户 AGENTS、源码未提交注释和自有文件保持。重复同步返回 unchanged，全部已采集文件哈希一致 | 同版本 CLI 下不同 Bundle 的临时项目同步，不是用户实例或工具程序升级 |
| 本地修改冲突 | Frontend skills 的受管质量参考追加本地内容后同步，返回 CONFLICT；拒绝前后全部已采集文件哈希一致 | 顺序冲突预检，不证明运行中并发或跨平台恢复 |
| 写作规则复查 | 实际读取本地 writing-for-agents 与写作原则；仅 AGENTS.md 改变，保留原约定，增加可复制命令及独立来源快照，记录实际 HEAD、工具版本和未提交状态。语法与空白检查通过，测试发现 0 个用例并明确说明 | 匿名文档任务，不证明业务规则已测试或普遍减少文档缓存 |
| 边界反例与修正 | 宿主演练先观察旧配置失败，再使 36 项回归通过。主控随后补验 10 项编码、等价路径、重导出与非法编码断言，36 项回归及 pnpm lint 再次通过；Node 核实编码路径确实指向原内部文件。仅临时 ESLint 配置及临时回归文件改变，应用源码、依赖锁和既有未提交内容保持 | 限定静态相对文件引用；动态 import、别名、符号链接、依赖环及完整 Vue/浏览器未验证 |
| 最终方法分发 | 最终方法 Bundle 在两个临时项目同步成功，正文与当前共享源逐字节相同；AGENTS、业务文件、依赖锁和临时检查实现均保留，重复同步仍为 unchanged | 本节观察记录追加后未重新打包，不把记录或结构检查当作新的宿主行为证据 |

当前执行者完成工作树复审，未发现遗留需修复问题。副本、Claude 共享链接、已有有效哈希、源字段与清单按实际内容核对；保留原授权、默认集合与白名单。验证仍限 macOS 临时样例，其他宿主、Windows、生产服务及真实对外动作未覆盖；没有性能或准确率收益结论。未提交、推送、发布或更新用户安装实例。

## 实际 Codex GUI 宿主观察（2026-11-08）

后续已发行 Template 5.3.4（`aa7607eb912b3ce910046c900018cb4590cea49c`）与 CLI 3.3.3，并同步所选真实 Spec project 实例。本节使用该实例的实际 GUI 会话轨迹，区别于前述临时 Codex CLI 演练。宿主专用只读接口返回 Codex `26.1103.41825`、build `25679`、prod；本机为 macOS 27.2 ARM64。接口未提供精确模型标识，不据应用版本推断模型。

| 场景 | 实际证据 | 能确认的范围 |
| --- | --- | --- |
| 显式业务澄清 | 用户点名项目内 grilling；可见读取 `.agents/skills/grilling/SKILL.md`，完整读取输出与当前实例正文逐字一致；后续沿用已确认答复并汇总，所查会话无文件写入 | 该 GUI 请求实际读取本地已同步方法，不是只根据最终回答推断调用 |
| 自然语言 UI 改稿 | 用户未点名技能；同步后的轮次读取项目内 yss-design-system、vue-best-practices，完整输出与当前两份正文逐字一致 | 该任务自主选用项目技能；不证明所有同类请求或全部 Profile 均可靠 |
| 相邻局部名称调整 | 同一真实 GUI 会话的局部改名轮次无新增 SKILL.md 读取，继续完成局部改动并说明浏览器未复核 | 只说明该轮没有新增读取；此前上下文仍在，不声称完全没有使用既有技能知识 |
| 手动交接发现与显式加载 | 用户手动确认 Spec 实例输入 `$handoff` 后显示 Handoff，描述为交接到 PR/MR；随后本模板项目会话收到带 `.agents/skills/handoff/SKILL.md` 路径的技能正文 | 菜单可见性为用户手动确认，正文加载在本会话可见；不等同于真实 PR/MR 写入或完整交付通过 |

手动交接另行区分：实例存在 handoff，`allow_implicit_invocation: false`。按 [OpenAI 官方技能说明](https://learn.chatgpt.com/docs/build-skills#optional-metadata)，该设置保留显式调用能力。Computer Use 工具明确禁止操作 `com.openai.codex`，自动点击仍未验证；本次菜单可见性采用用户手动确认，没有绕过该限制，也未执行真实 PR/MR 交付。

本节仅支持这些实际读取、执行观察和用户手动确认，不包含 Windows 原生程序、其他宿主、原生窗口自动点击或真实 PR/MR 交付。上一轮尚未发布的别名、动态导入、符号链接和依赖环指引不在已发行实例中，不能把这些 GUI 轨迹当作其验证。本节事后追加，未重新打包；未改全局配置或创建新聊天，也不由少量样本推导准确率和效率收益。
