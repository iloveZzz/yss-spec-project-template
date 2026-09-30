# OpenAI、Claude、Google Skills 规范与 YSS 模板差距研究

## Research Scope

本研究回答：当前研发规格模板的 Skill 是否需要调整，哪些属于确定的不一致，哪些只是需要验证的优化机会。采用 `technical-evidence / evidence-audited`，读取时间为 **2026-09-28**，面向模板维护者。研究提供维护依据，不批准修改、平台扩展或发布。

范围包括 Agent Skills 开放格式、OpenAI Codex、Anthropic Claude Code、Google Gemini CLI 与 Antigravity；API 上传规则仅用于说明可移植边界。排除模型 function calling、MCP 协议本身和市场优劣比较。英文二级标题保留研究包校验器要求，其余解释使用中文。完整边界见 [research-scope.md](research-scope.md)。

仓库基线为 `e1503a536b92b3e0a74182632f0690cc5601de62`，身份 `template-source`，开始时工作区干净。主仓和三个 Agent 子仓共清点 **213 个 canonical 入口实例**，它们包含跨仓重复项，不能称为 213 个不同技能。当前文件、摘要和可复现脚本见 [inventory.json](inventory.json) 与 [audit-inventory.py](audit-inventory.py)。未运行 Claude、Google 客户端、上传 API 或新一轮真实模型基准。

## Executive Read

**需要有针对性地优化，现有体系值得保留。** 当前基础格式与供应链同步没有发现阻断性问题；更明显的缺口位于“注册表意图如何变成宿主实际行为”和“怎样证明 Skill 有效”。

建议先处理三件事：

1. 对齐注册表与实际调用元数据，消除主仓 7 个 `user` 入口的策略差异。
2. 把校验对象从磁盘投影扩展到宿主实际发现的来源、名称、描述与冲突结果。
3. 在已有评测器上增加不点名 Skill 的正例、近邻负例及明确的基线收益比较。

随后再按实际需求决定 Claude Code、Antigravity CLI、Gemini CLI 的正式支持范围，生成对应适配。正文精简按实际读取成本开展，不把“少于 500 行”当成优化完成标准，也不删减生命周期批准、合同新鲜度或明确动作授权。

## Findings

### 1. 应区分开放格式、宿主扩展和 YSS 治理三层

`claim-01`：开放格式要求 `SKILL.md`、非空 `name`/`description`，名称匹配目录；名称上限 64、描述上限 1024。`license`、`compatibility`、`metadata`、实验性 `allowed-tools` 可选。正文约 5000 tokens、500 行属于编写建议，不等于各宿主的加载硬限制。不能把 words、tokens、字符数混用。[Agent Skills specification](https://agentskills.io/specification)

| 层次 | 负责什么 | YSS 应放在哪里 |
|---|---|---|
| 共享内容 | 工作流知识、必要输入、判断、输出、失败分支、按需资料 | `.agents/skills` 的 canonical 内容 |
| 宿主适配 | 发现路径、调用策略、工具名字、插件命名空间、UI 元数据 | 已登记的平台配置与生成适配，不另写一套流程 |
| YSS 治理 | 生命周期、合同批准、写范围、Fresh Verification、提交/推送授权 | 现有 registry、合同、任务包和验证器 |

这是由规范差异推导的维护建议，不是三家共同规定的 YSS 架构。当前 canonical 与生成投影的分工已经符合这个方向。

### 2. 三家共识相近，运行时行为差异明显

| 产品 | 已核实的关键机制 | 对本仓的影响 |
|---|---|---|
| OpenAI Codex | 先提供名称/描述/路径，选中后读正文；当前本地发现包括 `.agents/skills`；`agents/openai.yaml` 可控制隐式调用。 | 继续前置独特触发词；检查生成投影与 canonical 同时可见时的结果。 |
| Anthropic Claude Code | 项目目录为 `.claude/skills`；可通过 `disable-model-invocation` 控制自动调用。 | 现有 Claude 字段不能替代 Codex 策略；支持 Code 应有独立适配验证。 |
| Google Gemini CLI | `.agents/skills` 与 `.gemini/skills` 都支持，前者同层优先；模型使用 `activate_skill`。 | 不必为发现共享内容机械再复制一份 `.gemini`；要测试优先级。 |
| Google Antigravity | 当前各产品项目目录使用 `.agents/skills`，全局目录因 CLI、2.0、IDE 而异；兼容旧 `.agent/skills`。 | 应按具体产品登记，而非笼统声明“Google 支持”。 |

上述分别由 `claim-02` 至 `claim-05` 支持。来源：[Codex Skills](https://learn.chatgpt.com/docs/build-skills)、[Claude Code Skills](https://code.claude.com/docs/en/skills)、[Gemini CLI Skills](https://geminicli.com/docs/cli/skills/)、[Antigravity Skills](https://antigravity.google/docs/skills)。

Google 产品边界还受当前迁移影响：官方已将个人免费/Pro/Ultra 用户迁往 Antigravity，同时保留 Gemini CLI 的企业与付费 API key 使用路径。不能据此写成 Gemini CLI 全面停止维护（`claim-05`）。[Google 官方迁移公告](https://developers.googleblog.com/an-important-update-transitioning-gemini-cli-to-antigravity-cli/)

`claim-06`：格式可移植不代表权限语义可移植。Claude Code 的 `allowed-tools` 是调用回合的预批准，其他工具仍受权限设置管理；它不是写范围沙箱。Gemini 激活代码会加入资源目录，普通技能和 built-in 确认分支不同；这也不授予部署、提交等业务动作权限。来源：[Claude 权限字段](https://code.claude.com/docs/en/skills#pre-approve-tools-for-a-skill)、[Gemini 固定版本激活实现](https://github.com/google-gemini/gemini-cli/blob/bb523741c7429a44d03e964bc124c7c92df59d5f/packages/core/src/tools/activate-skill.ts#L72)。

### 3. 当前基础盘：应保留的部分

`claim-07`：本轮清点与实际命令支持以下范围内的结论。

| 仓库 | canonical 入口实例 | `agents/openai.yaml` | 基础 name/description 问题 | 超过 500 行入口 |
|---|---:|---:|---:|---:|
| 主模板 | 77 | 53 | 0 | 0 |
| backend Agent | 59 | 46 | 0 | 0 |
| design Agent | 23 | 17 | 0 | 0 |
| frontend Agent | 54 | 33 | 0 | 0 |

这里的“基础问题”为非空、类型、当前 ASCII 命名集合、长度、目录匹配的检查；不是完整语义合规认证。`openai.yaml` 可选，缺少它本身不是缺陷。

主仓 `verify-skill-registry`、`verify-skill-governance`、`sync-skills --check`、`update-skill-lock --check`、`sync-profile-skills --check --profile=all` 五项本轮退出码均为 0。完整日志见 [checks.json](checks.json)。这证明相应静态与同步约束，不证明目标客户端真的发现并正确执行。

建议保留：canonical 单源、来源/有效 hash、按类型的 Skill 依赖、三个初始技能的阶段按需分发、平台源码索引、合同校验与现有真实 Agent 评测器。没有证据支持把它们换成三套独立维护的技能库。

### 4. P1：调用策略存在可复现的不一致

`claim-08`：注册表 `invocation_contract.layer_defaults` 将 `maintainer-only` 映射为 `invocation_mode: user`。主仓 13 个 user 入口中，下面 7 个没有对应的 `allow_implicit_invocation: false`：

| Skill | Codex 元数据现状 | 需要解决的语义 |
|---|---|---|
| `git-commit-core` | 没有 `agents/openai.yaml`；正文禁止作为默认入口，frontmatter 仅禁 Claude 自动调用 | 明确它是内部依赖，避免独立自动发现；保留提交入口引用能力 |
| `frontend-commit` | 显式 `allow_implicit_invocation: true` | 自动提供消息/诊断与实际 commit 授权应分开；按意图修正 registry 或适配 |
| `java-backend-commit` | 同上 | 同上 |
| `prototype` | 有 UI 元数据，无 invocation policy | 明确是否需要允许正常语义触发 |
| `using-git-worktrees` | 无 OpenAI 元数据 | 明确自动规划与执行工作区操作的入口边界 |
| `writing-for-agents` | 无 invocation policy | 文档辅助若允许自动使用，应声明对应 override |
| `yss-skill-source-index-refresh` | 无 invocation policy | 明确维护刷新何时可自动路由 |

证据：注册表第 278–318 行及各入口的元数据，全部路径/摘要在 inventory。三个子仓也有同类声明差异，数量分别为 backend 6、design 3、frontend 6；不能按主仓名单盲目覆盖 profile 意图。

**推断与建议：**当前校验允许“治理登记为 user、宿主允许 implicit”并存；应先对齐含义，再建立一致性断言。不能直接把七项全部设为 false：提交 Skill 的正文已明确只有显式提交请求才执行 Git，自动建议仍可能是预期能力。`git-commit-core` 是最清晰的优先修复对象。

验收：生成/检查工具逐项对比 effective invocation；user-only 用例不自动触发，允许的咨询不被误拦；显式调用仍可用；提交/推送授权继续按原合同核验。此处没有观察到实际越权提交，缺陷等级针对声明一致性。

### 5. P1：补“实际发现清单”，不要用磁盘文件数代替

`claim-09`：主仓磁盘递归可找到 `.agents` 77、`.codex` 88、`.cursor` 77、`.pi` 77 个 `SKILL.md`。`.codex` 包含 77 个共享投影和 11 个 Product Design 平台入口；其中共享投影有 46 个目录符号链接、31 个实体目录。它们不是 319 个不同技能，更不是宿主加载计数。

本次会话目录确实重复展示了 `yss-mybatis`、`yss-cache` 等来自 `.agents`/`.codex` 的同名项，并与用户级同名技能并存。该会话观察不能推广为每个 Codex 版本都重复加载，也未证明根因只在实体副本。官方说明同名技能不合并，因此应测实际来源选择，而非假设锁一致就没有发现冲突。[Codex 发现规则](https://learn.chatgpt.com/docs/build-skills#where-codex-loads-local-skills)

建议在既有验证体系增加只读 discovery 探针，输出 `runtime/version`、工作目录、信任/启用配置、skill name、source path、内容摘要、effective invocation、是否截断或冲突。优先覆盖本仓实际支持的 Codex/Cursor/Pi，不为了本研究宣称三家已兼容。Codex 初始目录有预算且会缩短描述，重复发现会增加无效成本，但本轮没有测得可归因的 token 或时延收益。

验收：同一干净 fixture 比较 canonical、符号链接、实体投影、个人同名覆盖和子目录启动；清单与预期身份一致。旧客户端是否依赖 `.codex` 投影仍需验证，**不建议直接删除投影目录**。

### 6. P1：扩展触发与收益评测，复用现有 runner

`claim-10`：仓内 2026-09-20 的证据确实记录 16 场景、两组各两次，共 64 次真实 Agent 运行及语义复核；不能说项目没有行为评测。但这份来源/运行时固定的历史证据不证明今天全部 77 个入口、更不证明 Claude/Google。场景较多明确点名技能，对隐式路由的覆盖不足以支持全仓准确率声明。

当前 `.template-source/scripts/skills-agent-eval.py` 已具备 fixture、写范围、实际轨迹、失败/未完成区分和预算机制；继续扩展它比平行建立评测框架更合理。官方建议也强调任务结果、执行过程和成本的可观察比较，而非只检查文本标记。[OpenAI eval guidance](https://developers.openai.com/blog/eval-skills)、[Anthropic evaluation guidance](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices#evaluation-and-iteration)

建议的首批近邻场景如下，均须先标注预期路由和授权边界：

| 不点名 Skill 的请求对 | 应区分的行为 |
|---|---|
| “查 JetCache 注解行为” / “比较缓存厂商市场口碑” | `yss-research`/组件事实与竞品研究 |
| “设计 Repository 边界” / “排查分页插件配置” | `yss-repository` 与 `yss-mybatis` |
| “展示页面原型” / “实现生产 CRUD 页” | prototype 路由与 `yss-ui` 实现路由 |
| “拟提交信息” / “提交当前指定文件” | 只输出消息与已授权 Git 动作 |
| “一句话解释已有术语” / “起草正式研究包” | 简单咨询与 evidence-audited 落盘 |

记录触发 precision/recall、错误自动调用、目标产物、未授权写入、读取文件/字节、真实 token、延迟和恢复后是否遵守边界。改版比较旧/新 Skill；新增 Skill 再考虑有/无 Skill 基线。测试两侧保留相同 YSS 治理规则，不能用删除安全约束制造“效率收益”。必要样本数由风险和方差决定，不照搬官方工具中的固定数量或分集比例。[Anthropic 固定版本评测流程](https://github.com/anthropics/skills/blob/b0cbd3df1533b396d281a6886d5132f623393a9c/skills/skill-creator/SKILL.md#running-and-evaluating-test-cases)

### 7. P2：渐进加载继续做，但按读取成本选择目标

`claim-11`：没有超 500 行入口，不代表入口成本已最优。主仓正文字符数较大的包括 `wayfinder` 11,924、`archify` 11,552、`code-review` 11,075、`ytable-usage` 9,189；这些是 Unicode 字符统计，**不是 token 数或违规阈值**。

建议先试 `code-review`：入口保留审查输入、角色独立性、规则来源与结论合同，Fowler smell 清单及历史多轴任务包细节按分支加载。`wayfinder`、`archify`、表格技能先观察哪些细节在普通请求中并不需要，再决定拆分。`yss-research` 可保留 profile/mode/来源边界路由，将严格模式的派发与收尾细节条件化；`yss-technical-design` 有重复的文档写作提醒，可合并同义表述。

反证是这些入口包含真实脆弱约束，移出后若不读取会退化。因此只把它们列为优化候选，不判为违反规范。当前 `yss-product-lifecycle` 的合同子树查询、`yss-technical-design` 的 DDD/MVC 分支与组件 source-index 已经体现按需加载，继续保留。[OpenAI 编写指导](https://developers.openai.com/blog/rethinking-skills-and-prompts-for-gpt-6-astra)、[Gemini 编写指导](https://geminicli.com/docs/cli/skills-best-practices/)

验收：候选在相同任务下减少无关读取，路由、拒绝分支、状态和批准结果不退化；若收益不稳定，保留原文。500 行、100/300 行目录建议、5k words/tokens 都不直接变成本仓统一硬门禁。

### 8. P2：跨平台分发需要明确合同，不能原样复制全部内容

`claim-12`：当前 registry 的正式 runtime 只有 `codex/cursor/pi`。没有 `.claude`、`.gemini` 目录本身不是 bug；Google 已能发现 `.agents`，而 Claude Code 的官方项目发现路径不同。若扩展支持，需由模板和 CLI 同步登记，包含最小版本、预期路径、发现优先级、扩展字段、工具映射、授权及 smoke test。

具体有三类已知边界：

- 主仓 8 个入口有 Claude Code 扩展字段，其中 `handoff` 还含 `argument-hint`。Claude Code 可以使用这些字段，但其上传路径只接受通用字段集合，不能把当前目录原样打包就称为 API/claude.ai 可用（`claim-03`）。这是条件性分发问题，不是本地 Code 格式错误。
- Gemini 固定版本 `bb523741c7429a44d03e964bc124c7c92df59d5f` 仅扫描根和一层子目录的 `SKILL.md`，并对部分特殊名称字符作替换。当前 77 个 canonical 名称没有此问题；11 个嵌套 Product Design 入口则属于 Codex 私有包，不能直接转移并宣称 Google 会发现（`claim-04`）。[Gemini loader](https://github.com/google-gemini/gemini-cli/blob/bb523741c7429a44d03e964bc124c7c92df59d5f/packages/core/src/skills/skillLoader.ts#L120)
- Antigravity CLI 官方发布说明也限定目录入口只发现直接子项，嵌套需显式配置；这是发布说明证据，仍需目标版本实测（`claim-05`）。[Antigravity CHANGELOG](https://github.com/google-antigravity/antigravity-cli/blob/8cb7cd1bbab008cada5e8b27b56ed29107f45de0/CHANGELOG.md#L23)

建议共享内容保持标准基础字段，运行时扩展由有来源的适配生成；对禁止隐式调用等无法等价表达的能力，应记录不支持或采用明确的运行时配置，不能静默丢字段后宣布等价。插件显示名 `product-design:index` 也不应直接成为跨端 canonical 名称。

### 9. P2：声明环境依赖，并测试真实资源闭包

`claim-13`：主仓 77 个入口均未使用 `compatibility`；它不是必填项。对依赖根 `CONTEXT.md`、`.template-spec`、Node/Python、组件源码或特定工具的技能，建议说明“需要 YSS project-instance 或 template-source 的配套治理资产”，提供缺失时的明确回退，避免被当作任意目录可运行的独立包。

已有 `skills ensure` 类型依赖和 registry 应继续作为依赖权威；不要再手写第二份不可同步的依赖清单。导出到新宿主或 API 时，对真正选中的包验证 references、脚本导入、运行依赖、资源路径和版本固定。OpenAI hosted/local shell 的 attachment 方式不同，Claude API 又有自身的容器条件，均不能用本地目录可读代替上传与执行成功。[OpenAI API Skills](https://developers.openai.com/api/docs/guides/tools-skills)、[Claude API Skills](https://platform.claude.com/docs/en/build-with-claude/skills-guide)

## Counter-Signals

1. 五项仓内检查均通过且存在真实评测基础，反驳“当前技能整体不合规/没有测试”。这些检查的职责与发现的宿主语义问题不同。
2. 所有 canonical 入口都有有效基础字段且低于 500 行；文档长短不能直接证明质量或收益。
3. `instance_default_discoverable: false` 是分发发现策略，不能直接等同 `allow_implicit_invocation: false`；本研究只比较明确的 `invocation_mode: user`。
4. 正常触发技能不等于获得提交、推送、发布许可；现有公共提交合同提供反证。本轮发现声明差异，没有复现越权。
5. 未登记 Google/Claude 正式支持时，适配缺口属于扩展条件。维护者可以选择保持现有平台范围。
6. 官方产品文档也存在更新不同步：Claude overview 的跨产品隔离描述与 Code 当前同步功能表述有差异，不能把任一全产品断言直接推广。这里不依赖该有争议断言决定整改；采用具体产品/版本限定。[Claude overview](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview)

## Source Map

一手来源包括开放规范、三家官方文档与 Gemini/Anthropic 固定版本源码；本地一手来源包括当前 canonical/元数据/registry、脚本输出和历史评测原记录。聚合站和社区结果未用于成立结论。子 Agent 提供来源定位，主控重开用于主要判断的文档并核对 Gemini 四个源码文件，指纹见 [official-source-fingerprints.json](official-source-fingerprints.json)。

搜索语料、访问错误、具体观察、结论与反证的对应关系在 [skills-evidence.yaml](skills-evidence.yaml)。在线文档读取日期不等于发布日期；固定源码是该版本事实，不冒充已安装客户端事实。

## Decision Handoff

建议维护者采用下列顺序。该表是实施建议，**本研究未授予 `work-unit.ssot-update` 授权**。

| 顺序 | 范围 | 建议验收出口 |
|---|---|---|
| A | 7 项主仓调用意图及三个 profile 差异；同步一致性校验 | registry 与目标宿主策略对应；正确自动建议保留；动作授权仍独立 |
| B | 当前支持 runtime 的实际发现探针、冲突报告 | 记录加载来源与版本；同名、投影、路径、描述截断可解释 |
| C | 现有评测库增加近邻触发/授权场景与必要基线 | 记录真实行为、失败/未完成、质量及成本，不只给总通过率 |
| D | 选定重型入口做小批条件加载改造 | 同一任务证明无关读取下降且边界不退化 |
| E | 按用户真实使用需求扩展 Claude/Google/API | 产品及版本矩阵、adapter、依赖闭包、目标客户端实测完整 |

后续 owner 为 `maintaining-skills` 与 `yss-product-lifecycle` 模板维护路由；由 `.agents/skills` 修改，再同步投影、锁、profile 与命中的 CLI。新模板默认先行，已有实例通过显式冲突感知迁移处理；不为了统一格式批量改写历史批准或评测记录。

研究收尾采用 `work-unit.maintenance-research`。Context 对账为有原因的 `not-applicable`：消费了根词汇合同，本轮不产生业务术语或产品流转。`next_route: null` 表示研究可结束，后续整改仍由用户决定范围。

## Evidence Limitations

- 本轮是静态普查、选择性正文深读、一手资料研究与当前结构验证；不是 213 个入口的逐条语义认证。
- 未运行 Claude/Gemini/Antigravity 或上传 API；不声明三家等价、收益百分比、兼容认证或发布就绪。
- 本会话同名项观察未包含完整宿主内部加载事件，因此重复成本及根因尚需 discovery 探针验证。
- 官方源码的边界不必与所有历史/未来客户端相同；Antigravity 部分行为仅有官方发布说明证据。
- 四个 CLI 未重新构建、安装或验证，本轮 profile 同步通过不能替代固定来源 CLI 发布检查。
- 研究包校验只证明结构、引用关系及当前字节绑定，事实成立范围仍由每个 claim 的来源与限制决定。
