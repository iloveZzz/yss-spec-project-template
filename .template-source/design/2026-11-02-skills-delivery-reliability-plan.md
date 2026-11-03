# Spec / Backend 交付可靠性与按需并行研发 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [x]) syntax for tracking. 本计划建议使用 executing-plans，由当前 Agent 顺序实施；用户于 2026-11-03 批准计划并选择 executing-plans 顺序实施。

**Goal:** 落实已批准的四项改进，使 Backend 在策略 A 下有条件自行并行，保持 Spec 与研发规则一致，并给出有实际依据的发现、分发和行为验证结果。

**Architecture:** 复用共享技能与 Backend 文件覆盖，将交接回流和并行执行放在 Backend implement 的两个条件参考中。既有方法持有观察、测试和隔离职责；一个集成人维护清单、副本与有效树哈希。保持 Spec 16 项、Backend 41 项默认集合，内容改动不替换用户安装实例。

**Tech Stack:** Markdown、JSON、YAML、Git、现有 YSS Rust CLI 与 Codex CLI；临时检查使用本机 Python/PyYAML 和 Node，无新增依赖、脚本、测试套件或运行器。

**Spec:** [已批准设计](2026-11-02-skills-delivery-reliability-design.md)。用户于 2026-11-02 批准设计，2026-11-03 用户批准计划并开始实施，执行结果见文末。

## Global Constraints

- Spec 默认 16 项入口，Backend 默认 41 项入口；两种安装模式保持原集合、技能 ID 和调用政策。
- Backend 使用策略 A：已获开发授权、任务可拆、依赖明确、修改可隔离且宿主支持时自行并行，由主 Agent 集成验证；不满足条件时顺序完成。
- 业务规则、权限、FR/AC 与原型模拟边界保持来源一致；技术事实不能静默改写业务决定。
- MVC 保持既有 Service 边界；普通测试不触发 TDD。本次是技能和资料维护，不套用通用计划示例的测试优先或逐任务提交步骤。
- 不增加技能入口、安装选项、后台运行器、自动化服务、统一门禁、审批包、脚本或测试套件。
- 不修改已安装用户实例、全局配置、系统 CLI 或 yss-cli 仓库，不复制凭据、用户业务文件或子模块内容。
- 提交、推送、合并、PR/MR、远程建票、关闭条目、发布和部署使用对应授权；当前未获这些动作授权。
- .agents/skills 是共享源，profiles/backend/.agents/skills 是 Backend 覆盖；不把稀疏覆盖当成完整有效技能树。
- sourceRevision/upstreamHash 保持原始来源语义；只更新受影响的现有 effectiveHash，不新增锁 schema。
- 所有临时观察留在仓外，设计与计划不作为业务工程安装资产；结构核对、安装、宿主观察和真实业务效果分别报告。

## Review Focus

1. **前置修改尚未提交或来源中途改变**：下游必须读取真实当前内容，不能使用旧 HEAD 或覆盖用户工作。任务 2、3 的 R1 覆盖。
2. **独立目录却共用接口、测试库或构建输出**：不能误判为可并行；子任务完成须先集成才释放下游。任务 3 的 R2 覆盖。
3. **子任务失联或用户中止时仍可能写入**：确认写入停止后再分配路径，保留未回收成果。任务 3 的 R3 覆盖。
4. **全量预装掩盖独立技能的引用缺失**：单项资源闭包、Backend 显示覆盖和原调用政策须分别成立。任务 4、5 的 R4 覆盖。
5. **旧内嵌 Bundle 或正文自评被当作新版本行为证据**：明确实际来源，宿主执行日志可见才记录真实调用。任务 1、6 的 R5 覆盖。

---

## 工作位置、已核实工具与执行方式

本计划路径相对模板仓 /Users/zhudaoming/Projects/yss-spec-project-template。执行时先核对 Git 根、实际 HEAD 和其他修改；源基线是 a818a64b43eb838c5b17a5819148ad652886b0ab。设计和本计划目前是本任务未提交文件，应保留。

2026-11-02 编写计划时只读核实：YSS CLI 3.1.2；Codex CLI 0.163.0；Python 可导入 PyYAML 6.0.3；Node v24.14.1。执行时再次查看实际版本及帮助，不把本次值当版本最低要求。

YSS init 只使用程序内嵌 Bundle，没有本地模板源参数。现有程序不会随此次 Markdown 修改生效；不使用不存在的 --template-root，也不照抄历史计划中的 Go 构建命令。新内容的实际 CLI 安装验证取决于是否已有对应内容的可用二进制；本计划不构建或发布新 CLI。

Codex exec 当前支持 --ephemeral、--cd、--sandbox、--skip-git-repo-check、--json 和标准输入提示词，可用于仓外临时宿主观察。不得使用绕过沙箱、忽略规则或跳过 hook 信任的选项，也不为观察改全局配置。若认证、策略或工具能力阻止观察，保留具体限制，不虚报结果。

建议实施顺序 1 → 2 → 3 → 4 → 5 → 6。任务 2 与 3 共用 implement，任务 5 负责所有共享清单与哈希；集中顺序处理比多名作者同时更新这些文件更合适。用户批准的策略 A 是 Backend 的目标行为，不强制本次模板维护使用并行执行。

## 文件归属与交付边界

| 任务 | 源文件范围 | 输出 |
|---|---|---|
| 1 | maintaining-skills、writing-for-agents、i-have-adhd 的相关方法 | 有触发条件的观察与证据记录规则 |
| 2 | spec-workflow、Backend implement/spec-feedback 与相关消费者 | 同一规则的接收、变更与回流方法 |
| 3 | Backend implement/parallel-development、to-tickets、测试方法、共享 worktree 方法 | 策略 A、隔离、集成及恢复规则 |
| 4 | 指定 agents/openai.yaml、Backend 两种安装入口和 README | 职责准确且政策不变的发现说明 |
| 5 | 两套 bundle-profile、锁、适配说明、有效副本；核对注册表与公开名单 | 一致的分发与单项资源闭包 |
| 6 | 仓外临时场景、实际工具输出，既有适配记录 | 分层验证结果和未覆盖范围 |

每个内容任务先完成自己的源文件和语义核对；平台副本、清单与哈希集中由任务 5 同步。在任务 5 完成之前不得把中间状态作为可分发结果。各任务修改范围如下，已有内容足够的地方仅加条件指针，不重写整项技能。

### Task 1：接通真实使用观察与证据表达

**Files:**
- Modify: .agents/skills/maintaining-skills/SKILL.md
- Modify: .agents/skills/maintaining-skills/references/authoring.md
- Modify: .agents/skills/writing-for-agents/SKILL.md
- Modify: .agents/skills/i-have-adhd/references/pr-and-retro.md

**Interfaces:** 消费本次技能触发/行为改动及实际可读任务记录；产出条件观察方法。观察记录唯一正文位于 i-have-adhd/references/pr-and-retro.md；两项调用者按项目根路径读取 .agents/skills/i-have-adhd/references/pr-and-retro.md，资源由任务 5 分发，不隐式调用整个写作技能。

- [x] **Step 1：记录适用基线。** 阅读四份当前文件，保留其调用政策；确认已有观察方法已经区分事实与未知，仅补本设计新增的触发与记录细节。
- [x] **Step 2：完善记录方法。** 在现有“真实任务观察与反馈关闭”段落加入设计 §4 的四类证据与最小记录：请求/来源版本、profile/宿主、预期、实际行为、纠正和限制。场景演练与真实项目分开；不可见的内部调用、成本和时间保持未知。
- [x] **Step 3：加入条件引用。** maintaining-skills 在修改触发或行为时选择相邻正反例；writing-for-agents 在需要记录实际使用结果时读取上述方法。普通文档润色或业务任务不因此运行评测。authoring 说明跨技能引用需随安装资源闭包分发。
- [x] **Step 4：核对 R5 的三个反例。** 旧 Bundle 安装成功只能证明旧内容；给 Agent 正文后回答正确只能证明该次方法演练；没有工具读取轨迹时不能报告已自动调用技能。核对普通改字请求不会被要求建立报告或先做评测；这些检查先记为文本核对，实际宿主结果留给任务 6。

### Task 2：贯通 Spec、Backend 与原验收

**Files:**
- Modify: .agents/skills/yss-product-lifecycle/references/spec-workflow.md
- Modify: profiles/backend/.agents/skills/implement/SKILL.md
- Create: profiles/backend/.agents/skills/implement/references/spec-feedback.md
- Modify: profiles/backend/.agents/skills/to-tickets/SKILL.md
- Modify: profiles/backend/.agents/skills/yss-technical-design/references/design-method.md
- Modify: profiles/backend/.agents/skills/yss-backend-testing/references/test-design.md

**Interfaces:** 消费真实材料位置、可获得版本、FR/AC 或章节、原型模拟范围和当前授权；产出针对同一业务规则的实现/验证关联及具体差异。Backend 新参考的有效安装路径固定为 .agents/skills/implement/references/spec-feedback.md；后续消费者按项目根路径按需读取，避免 WorkBuddy 相对路径指向未安装目录。

- [x] **Step 1：编写 Backend 回流参考。** 按设计 §5 明确来源、技术决定、业务变更、来源漂移与未验证范围的处理。没有编号用现有章节；没有版本用读取时点。不要求票据、台账、文件快照或另一份规格。
- [x] **Step 2：补充 Spec 交接方法。** 保留三类交付和准备交接默认只读的规则；说明研发发现沿原规则回流，动态来源按风险复读，已授权范围内增量修订。远程或其他仓库仅准备建议，实际写入仍使用对应授权。
- [x] **Step 3：接入消费者。** implement 在承接材料或发现差异时读取新参考；to-tickets 保留原验收和真实依赖；技术设计在改变业务结果时定点澄清；测试方法按原验收解释实现、实际验证和缺口。已明确的技术选择不重复向用户提问。
- [x] **Step 4：核对 R1 与交接反例。** “Spec 允许撤回但原型禁止”“上游只改排版”“上游收窄了撤回权限”“原型成功但数据库未运行”分别应触发真实分歧澄清、继续原工作、定位受影响下游、分别说明模拟与真实结果。未获其他仓写入授权时不能自动修改 Spec；无业务编号时不新建 ID。保持未受影响工作可继续。

### Task 3：落实策略 A、工作区隔离与集成恢复

**Files:**
- Modify: profiles/backend/.agents/skills/implement/SKILL.md
- Create: profiles/backend/.agents/skills/implement/references/parallel-development.md
- Modify: profiles/backend/.agents/skills/to-tickets/SKILL.md
- Modify: profiles/backend/.agents/skills/yss-backend-testing/references/test-execution.md
- Modify: .agents/skills/using-git-worktrees/SKILL.md
- Modify: .agents/skills/using-git-worktrees/references/git-fallback.md
- Modify: .agents/skills/using-git-worktrees/references/troubleshooting.md

**Interfaces:** 消费任务 2 的真实来源/依赖和已授权研发范围；产出策略 A 的条件入口及唯一并行方法 .agents/skills/implement/references/parallel-development.md。隔离由 using-git-worktrees 提供，集成验证由 yss-backend-testing 提供；任务状态留在当前任务，不创建 schema 或调度 API。

- [x] **Step 1：编写条件与调度方法。** 实现设计 §6.1—6.2：至少两个就绪独立工作，权限、路径、资源及验收清楚，宿主允许且并行有价值。条件满足后先说明分工再执行；无空槽或不可隔离时顺序完成。新工作项使用独立上下文，Codex 支持时 fork_turns: "none"；主控统一再分派，不复制整个会话、不指定模型、不设置固定并发配置。
- [x] **Step 2：编写回收与集成方法。** 实现设计 §6.3—6.4：核对真实基线和未提交前置修改；分别处理文件差异及已获授权的分支集成。完整计入新增、修改、删除、重命名和未跟踪产物；目标漂移则停止受影响应用。不提交也可完成可靠差异集成，无法可靠回收时顺序处理。主控集成和必要验证后才解除依赖。
- [x] **Step 3：编写恢复与清理方法。** 实现设计 §6.5：失联/超时先查状态及产物，确认写入停止再收回路径；中止时停止相关写入；会话恢复回读实际状态；只清理本次创建且成果已确认回收的资源，不强制删除。
- [x] **Step 4：修正共享 worktree 方法。** Step 0、Red Flags、fallback 和 troubleshooting 同时改为按当前执行单元判断隔离；主控已在 worktree 不排除给独立任务创建并列工作区。已有本地隔离授权直接复用，缺失时保持原权限判断；不在共享方法中全局授予策略 A。保留宿主优先、忽略规则、子模块和用户文件保护，移除指向不存在的 Step 2“自动安装/运行”的悬空要求，工程准备仍由实际任务决定。
- [x] **Step 5：接入主入口和依赖结果。** Backend implement 用短条件指向并行参考，替换原笼统委派段，保持只读不转实现。to-tickets 说明真实前提及共享文件负责人；test-execution 明确验证主控集成后的内容和实际运行环境，不只汇总各分支测试。
- [x] **Step 6：核对 R1、R2、R3。** 覆盖“未提交公共接口已变化”“不同目录共用一个测试库”“父任务已隔离但两个写入者共用目录”“子任务完成但尚未集成”“子任务超时且写入状态未知”“用户中途停止”“无提交授权的文本差异”“无法回收的二进制/LFS”。逐项检查预期的等待、顺序降级、集成或保留行为，实际操作演练由任务 6 承担。

### Task 4：校准 profile 显示与安装入口

**Files:**
- Modify: .agents/skills/yss-product-lifecycle/agents/openai.yaml
- Modify: .agents/skills/to-spec/agents/openai.yaml
- Modify: .agents/skills/to-tickets/agents/openai.yaml
- Modify: profiles/backend/.agents/skills/implement/agents/openai.yaml
- Modify: profiles/backend/.agents/skills/to-tickets/agents/openai.yaml
- Create: profiles/backend/.agents/skills/prototype/agents/openai.yaml
- Create: profiles/backend/.agents/skills/to-spec/agents/openai.yaml
- Modify: .template-source/distribution/entries/project-AGENTS.md
- Modify: .template-source/distribution/entries/backend-skills-AGENTS.md
- Modify: .template-source/distribution/entries/backend-project-README.md
- Modify: profiles/backend/AGENTS.md
- Modify: profiles/backend/README.md

**Interfaces:** 消费设计 §7 的七项显示名称及任务 3 的策略 A；产出职责准确的有效元数据。现有政策不变：Spec to-spec/to-tickets 显式，Backend implement/to-tickets 可按需自动选择，Backend to-spec 显式，prototype 保留原有效默认政策。

- [x] **Step 1：保存元数据政策基线。** 在仓外记录七项有效 metadata、相关 frontmatter 和默认安装名单，区分 Backend 稀疏覆盖与共享继承。不存在的 policy 字段不等同于 false，也不凭空添加新语义。
- [x] **Step 2：写入显示文案。** 依设计 §7 使用“YSS Spec 与研发交接”“Spec 规格综合”“Spec 业务拆票”“Backend 研发实现”“Backend 实现切片”“Backend 技术试验”“Backend 规格整理”。短描述按对应职责写明触发和结果；保留存在的 default_prompt 并仅修正相关职责，所有技能 ID 不变。
- [x] **Step 3：补齐两项 Backend 元数据覆盖。** prototype 只表示后端状态、算法或接口试验；to-spec 沿用显式调用政策，不继承 Spec 的产品完整交付显示说明。两者只新增所需文件，不复制整棵共享技能。
- [x] **Step 4：更新真正的安装入口。** Backend project/skills AGENTS 用一句话说明已授权研发满足条件可自行并行，并指向 implement；Backend 两份 README 和覆盖入口保持一致。根 Spec 入口不获得默认并行政策，避免把模板源 profiles/backend/AGENTS.md 当成唯一生成入口。
- [x] **Step 5：核对 R4。** 用当前可用 PyYAML 解析全部改动 YAML，前后比较 name、disable-model-invocation、allow_implicit_invocation 等政策字段。分别读取有效 Spec/Backend prototype、to-spec、to-tickets、implement，确认职责和调用边界无串用。新增 yaml 的出现不能被当作宿主已显示正确。

### Task 5：统一分发资源、副本与来源记录

**Files:**
- Modify: .template-source/distribution/bundle-profile.json
- Modify: profiles/backend/.template-source/distribution/bundle-profile.json
- Modify as applicable: skills-lock.json、profiles/backend/skills-lock.json
- Modify: .template-spec/agents/matt-skills-adaptation.md
- Modify: profiles/backend/.template-spec/agents/matt-skills-adaptation.md
- Sync: .workbuddy/skills 下本轮受影响技能文件、profiles/backend/.workbuddy/skills 下相应有效文件
- Verify links: .claude/skills 下对应共享技能链接
- Read; modify only conflicting consumed fields: .template-spec/agents/yss-skill-registry.yaml、profiles/backend/.template-spec/agents/yss-skill-registry.yaml、yss-public-skills.json

**Interfaces:** 消费任务 1—4 的最终源文件；产出一致的有效技能树及资源闭包。一个集成人独占本任务清单、哈希和投影写入，不引入新 schema、别名或技能。

- [x] **Step 1：补充必要资源引用。** 两个 profile 的 project/skills 模式中，向 maintaining-skills 与 writing-for-agents 的 skillReferences 加入 .agents/skills/i-have-adhd/references/pr-and-retro.md。Backend 两种模式中，为 to-tickets、yss-technical-design、yss-backend-testing 加入 .agents/skills/implement/references/spec-feedback.md。使用现有路径字段分发只读方法，不为了读取叶子参考递归安装整个 implement 或建立循环依赖。
- [x] **Step 2：检查实际引用闭包。** 新参考自带内容应可单独阅读，不再产生未声明资源；跨技能调用者明确按项目根 canonical 路径读取。现有 writing-for-agents 的 SKILL-MECHANICS.md 会读取 maintaining-skills/references/authoring.md，将该实际必需叶子参考加入同名 skillReferences。检查新边不增加 discoverable SKILL.md；本轮未改动的历史资源问题单独说明，不顺带全库重构。
- [x] **Step 3：同步有效副本。** 共享源逐文件同步至根 WorkBuddy；Backend 按相对路径“共享源 + Backend 覆盖”合成后同步有效 WorkBuddy，保留属性及已有排除规则。先检查目标差异，保护无关内容；根 Claude 链接保持链接，不新增 Backend Claude 目录。所有新参考和 YAML 覆盖都要出现在对应有效树。
- [x] **Step 4：更新来源与哈希。** 按 .template-source/agents/skills-maintenance.md 对受影响且已有 effectiveHash 的 Backend 有效树计算 SHA-256：Node localeCompare 排序，每项输入路径、NUL、内容、NUL，文本 CRLF 归一、指定文件忽略。保留来源 revision/upstreamHash；根锁没有有效哈希字段时不补加。适配说明记录策略 A、显示修正和实际验证层级，任务 6 未执行的项目先标未验证。
- [x] **Step 5：执行结构检查。** 使用现有 Python/PyYAML 与 Node 的内联临时检查，解析两套 JSON/YAML，断言两种 Spec 模式各 16 项且名单与基线相同，两种 Backend 模式各 41 项且名单与基线相同；新增文件不产生技能 ID，所有新增叶子参考可由有效源取得。断言受影响 WorkBuddy 文件与有效源字节一致、Claude 链接可读、已有哈希与重算一致；每个失败输出实际路径。
- [x] **Step 6：核对单项闭包与范围。** 在仓外仅按每个指定技能及其声明资源准备最小集合，检查五个引用调用者和 writing-for-agents 的 metadata 分支能找到必需参考，不以默认全装掩盖缺失。将此结果标为源码资源合成检查；实际 CLI 单项安装留给任务 6。执行 git diff --check 并检查未跟踪新文件，确认无脚本、套件、发行资产、用户实例或 CLI 仓改动。

结构检查使用的原集合可从固定源码读取，不从待测文件反推：

```sh
git show a818a64b43eb838c5b17a5819148ad652886b0ab:.template-source/distribution/bundle-profile.json
git show a818a64b43eb838c5b17a5819148ad652886b0ab:profiles/backend/.template-source/distribution/bundle-profile.json
```

这些只读命令成功输出原 JSON；随后将 installations.project.skills 与 installations.skills.skills 分别和改后集合比较。集合相同、数量为 16/41 及资源存在才能通过该项结构检查。

### Task 6：实际宿主观察与分层交付

**Files:**
- Temporary only: 仓外各场景目录、最小合成技能/资源、原始请求、JSONL 事件与执行结果。
- Update actual outcomes: 两份现有 matt-skills-adaptation.md 及本计划任务状态。
- No changes: 用户已有安装、全局 Codex 配置、系统 CLI、远程项目。

**Interfaces:** 消费任务 5 的最终有效源、真实工具能力和设计 §4 的代表输入；产出可定位的实际结果，不能将临时演练描述为生产项目交付。

- [x] **Step 1：准备独立观察目录。** 使用 mktemp -d 创建仓外目录并记录真实路径，变量使用 SKILLS_VERIFY_ROOT、SKILLS_CASE_ROOT 等任务专用名称；SKILLS_REQUEST_FILE、SKILLS_EVENTS_FILE 指向场景工作区之外、本次临时根内的请求与观察记录，避免测试对象修改日志或读取自身持续输出。每个场景只合成对应 profile 的默认技能、相关资源和真实安装入口；不得把本模板根 AGENTS、历史设计、用户目录或敏感信息一并复制。场景无业务代码时使用最小匿名材料，并标记为演练。
- [x] **Step 2：执行真实宿主发现观察。** 先核实 codex exec --help 仍支持下列命令。请求文件仅给自然语言任务和允许范围，不指定应选哪项技能、不粘贴技能正文。使用独立场景目录分别运行 Spec 交接、局部文案、Backend 实现入口、MVC 修复、普通测试，以及只读分析的相邻非触发请求。检查事件中的可见读取和动作，再比对最终文件变化；不能只依赖模型自报。

```sh
codex exec --ephemeral --skip-git-repo-check --cd "$SKILLS_CASE_ROOT" --sandbox workspace-write --json - < "$SKILLS_REQUEST_FILE" > "$SKILLS_EVENTS_FILE"
```

预期证据是实际会话完成、记录可读，并观察到符合场景的读取/修改与边界；退出 0 或回答里出现技能名不是通过条件。确认读取的是本场景有效内容；若同名全局技能被优先读取，记录发现冲突，不能计为本轮技能验证通过。CLI 版本、profile、实际模型信息可取得时记录，不声称测试了纯净安装或其他宿主。

- [x] **Step 3：观察策略 A 与异常。** 在匿名临时工程中给出两个可独立修改的小任务，检查实际工具是否派发独立上下文、写入范围、主控集成和结果验证。另用共享测试资源、未提交前置修改、来源变化与无提交授权案例检查正确等待或顺序降级。宿主不提供子代理或状态查询能力时，记录限制，不伪造派发；失联与中止无法安全复现时仅完成文本场景核对并明确未实测。观察任务不能向远端写入或提交。
- [x] **Step 4：检查分发安装的证据边界。** 先读取实际 yss --version。仅在可用二进制确实包含本轮内容时，使用下面已核实命令对四个新目录完成 spec/backend × project/skills 的实际安装，比较新增参考、显示覆盖、名单和来源。若二进制仍是旧 Bundle，不进行无意义的全矩阵安装；可以核对一个基线安装，但必须标为旧内容，不能称本轮 CLI 安装已验证。

```sh
yss init --root "$SKILLS_VERIFY_ROOT/spec-project" --profile spec --installation project
yss init --root "$SKILLS_VERIFY_ROOT/spec-skills" --profile spec --installation skills
yss init --root "$SKILLS_VERIFY_ROOT/backend-project" --profile backend --installation project
yss init --root "$SKILLS_VERIFY_ROOT/backend-skills" --profile backend --installation skills
yss skills list --root "$SKILLS_VERIFY_ROOT/backend-skills" --json
```

只有匹配本轮内容的二进制才继续在各自新安装根执行独立资源案例：Spec 按需 ensure maintaining-skills、writing-for-agents；Backend 默认已全装 implement 等，不能据此宣称独立补装闭包已实测。可用工具无法创建不含其余默认技能的合法受管安装时，Backend 独立补装保持未验证，不修改收据、删默认文件或构建缩减 CLI 来伪造条件。

- [x] **Step 5：整理 R5 和实际结果。** 用任务 1 的方法更新既有适配记录：源码/合成检查、真实宿主演练、CLI 当前或新 Bundle 安装、未观察的宿主/真实业务分别说明。发生缺陷则修正责任源与受影响副本/哈希，只复查相关范围；未获得证据不能将复盘建议写成已经改善。
- [x] **Step 6：完成范围检查与交付。** 核对 Git 差异、未跟踪文件和文档链接。按最终选定执行方式做必要的整体验收与独立审查，修正有证据的问题；不固定逐任务评审门禁。报告修改位置、实际结果、未覆盖与 Git 状态，保留未回收产物和观察记录；没有对应授权不提交、推送或发布。

## 计划自检与执行交接

设计覆盖：§1—3 对应全局约束与任务顺序；§4 对应任务 1/6；§5 对应任务 2；§6 对应任务 3；§7 对应任务 4；§8 对应任务 5；§9—10 对应各任务验收及任务 6。R1—R5 均有责任任务和具体输入/期望；新参考路径、显示名称、16/41 集合和政策在任务间一致。

本计划已按设计自查，未派发计划审阅代理。计划编写时只核实文件、工具版本和帮助；编写时所有实施与观察复选框均未勾选，当前进度按下文实际执行更新。实际 CLI 3.1.2 使用固定内嵌 Bundle，不能假定包含本计划未来改动，能否验证本轮新内容需执行时查证；计划没有把这项限制藏成自动通过。

建议用户确认计划后采用 Native：由当前 Agent 使用 superpowers:executing-plans 顺序实施，完成后独立复核。若用户选择按任务委派，则改用 superpowers:subagent-driven-development，仍由单一集成人维护共享清单和哈希。2026-11-03 用户已批准计划并明确使用 executing-plans；未授予提交、发布权限。

## 2026-11-03 执行记录

任务 1—5 已落实到内容源、分发参考、有效副本与既有哈希；保持四个默认名单及原调用政策。任务 6 完成 9 次正常结束的匿名宿主观察并核对实际产物，同时保留旧 CLI 失败与新 Bundle 未验证等限制，详见现有 Matt 适配记录。Backend 初次未读取规格反馈参考，经指针位置与触发条件修正后做了来源变化定向复查；不从单次样本推导效率或普遍成功率。

结构核对包括 JSON/YAML、有效树与平台副本、已有哈希、39 项本地 Markdown 引用（按安装入口/覆盖合成语义解析）、14 个最小资源合成组合。尚未提交、推送、合并或发布；工作区与原始观察保留。独立最终审阅已完成，未发现需修复或延期的事项；审阅包括全部 66 个改动/新增文件，并独立重算 10 项有效哈希。缺少新 Bundle、完整派发轨迹和真实环境的部分继续保持未验证。

后续用户 review 指出手工回退的默认目录仍可能嵌套（P2），已按修复授权处理：linked worktree 使用外部并列位置，创建前核对实际路径包含关系，忽略检查针对所选目标；入口、排查、副本及已有哈希同步。12 个路径案例和实际 Git 并列创建通过；此为定向规则/Git 验证，未重跑自主宿主演练或新 Bundle 安装。先前独立审查结论仅表示当时审查结果。
