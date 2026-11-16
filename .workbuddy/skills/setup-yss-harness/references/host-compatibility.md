# 宿主发现与跨工程技能

配置、诊断宿主加载，或从 Home 读取外部工程技能时按需阅读。技能格式可共享，目录发现、指令优先级、工具权限和会话缓存分别由宿主决定；不要把某个宿主的行为推广到全部客户端。

## 先区分四项事实

1. 完整载荷是否存在：`SKILL.md`、references、scripts、templates 和包外引用资源。
2. 宿主是否原生发现：目录列表或真实技能调用有对应入口，不能只看模型自报。
3. 使用的是哪个工程、worktree 和版本：正文、资源、工程规则分别核实；同名不代表同来源。
4. 需要的工具是否可用：MCP、浏览器、构建命令、写权限和子 Agent 单独检查。

显式读取完整路径可以提供技能上下文，是另一条使用方式，不证明原生注册。读取外部技能不会自动加载外部 AGENTS；资源相对 `SKILL.md` 目录，命令 cwd 使用目标工程。保留宿主的系统与组织规则优先级，不宣称项目技能一定覆盖个人技能。

同名冲突、来源更新或能力受限时，将文件存在、原生发现、实际采用及行为结果分别保留证据。路径、摘要或相关未提交差异绑定内容版本；工具调用或可核查的上下文注入记录支持正文与本次必需资源的实际读取；动作、产物和环境结果支持行为结论。只有技能列表时可说明发现，缺少读取记录时采用来源保持未知。

技能内相对资源以该技能目录为基准，明确的工程根引用按目标工程根解析。正文与必要资源核对同一有效来源，缺失时说明依赖缺口及可继续工作。显式读取接续单独记录，保留首次误用、人工纠正和恢复后的结果。刷新方式依实际宿主核实，新会话仍需核对读取内容；退出码、最终自述与文件一致各自只支持其可观察范围。

## 各宿主采用方式

| 宿主 | 工程内内容与 Home 使用方式 | 边界 |
| --- | --- | --- |
| Codex | 工程 `.agents/skills`；Home 跨仓显式读取目标完整路径 | `--add-dir` 是可写目录范围，不是任意技能根注册开关；切 shell cwd 不证明刷新 |
| Claude Code | 工程 `.claude/skills`；`--add-dir` 可加入实际工程的技能目录 | 同名可能需要目录限定命令，以实际注册入口为准；附加目录不代表工程规则也已加载；避免读取主 checkout 的旧副本 |
| Pi | 复用 `.agents/skills`；跨仓可使用已确认的 `--skill` 或 settings 路径 | 默认发现受项目根、信任和同名优先级影响；明确子集可用 `--no-skills --skill <路径>`，不需新增 `.pi` 副本 |
| DeepSeek Harness | 复用 `.agents/skills`；按真实 preset 使用 `customSkillDirs` 或显式读取 | registry/provider/skill tool 必须启用；相对自定义路径不能猜基准，外部规则需另读；Claude 专有扩展字段不自动获得执行语义 |
| WorkBuddy | 保留已采用的 `.workbuddy` 载荷；在实际客户端核实目录发现，外部工程使用完整路径 | 官方代码开发配置说明兼容 `.codebuddy/skills`；未确认当前模式和版本前不删除旧目录或批量增加重复入口，也不套用 CodeBuddy CLI 参数 |

同名技能按任务用途和真实来源选择，例如 Spec 的业务拆票与 Backend 的实现切片并非同一方法。Pi/DSH 复用 canonical 内容，不增加另一套手工内容源。宿主不能直接加载外部目录时，先验证显式读取；不可访问时报告缺少挂载/权限，不换成另一个 checkout。

## 受管入口与升级

采用含新视图的开发 Bundle 时，Backend/Frontend 的 Claude 资源从当前 Profile 的有效 `.agents` 内容派生；源模板的根 Claude 链接不能代替 Backend 覆盖。实际版本以 CLI 构建来源、安装文件和收据为准，模板说明更新不让旧程序自动支持新分发。

新增受管入口与已有未知文件重名时，保留文件并处理冲突，即使字节相同也不自动接管。首次创建入口若与本次将保留的本地 `.agents` 定制不一致，应先统一采用版本，不能通过删除收据或强制覆盖来取得新入口。已有工程中的多个宿主副本不是持续同步关系，分别修改后仍需核实实际来源。

不为普通调用自动升级项目或用户技能。任务需要工具但宿主未提供时，区分可继续的工作与缺失验证；没有子 Agent 可以串行。修改技能后按该宿主已确认的刷新方式处理，无法确认时新建会话核实正文和资源，不能把旧缓存结果当新版本。

## 本次核实范围（2026-11-15）

本机入口基线：Codex 0.167.2、Claude Code 2.1.319、Pi 1.5.2、DSH 0.2.2-rc.3、WorkBuddy App 5.11.3。版本只说明本次检查对象，不是通用最低支持版本，也不是自动升级目标。

本轮使用合成工程和不同随机标记核实实际来源，结果分层记录：

| 宿主 | 已取得的证据 | 未完成或限制 |
| --- | --- | --- |
| Codex | 目标 worktree 的目录枚举、规则/正文/reference 读取；Home 完整路径读取；新会话读取更新资源；缺失路径不回退 | JSONL 未提供宿主 catalog 注入证据，不能把目录枚举报为原生注册；存在不影响本次文件读取的 MCP 启动告警 |
| Claude Code | `--add-dir` 的真实 worktree 出现在技能目录，包含目录限定的同名入口 | 模型请求返回 `Not logged in`，没有正文/资源工具调用；显式读取对照、刷新及实际执行未验证 |
| Pi | 原生启动目录中包含目标 `.agents` 技能元数据与工程规则标记 | 模型返回 `InvalidSubscription`，未执行资源读取；进程退出 0 不能代表成功；Home 显式入口及刷新未验证 |
| DSH | 核实 headless 参数和只读工具配置入口 | 实际请求返回 `MISSING_CREDENTIAL`，尚无原生发现或资源调用成功证据 |
| WorkBuddy | `.workbuddy` 单入口经 GUI 技能选择及实际资源读取成功；双目录项目中选到正确 `.workbuddy` 来源后标记匹配；新会话显式读取更新资源、外部 Backend 安装载荷与规则；缺失路径不回退 | 同名列表也包含其它项目入口，切换项目、新会话及本次重启都未排除旧项目项；`.codebuddy` 单入口未取得当前项目调用证据，不能据此宣称它不可用 |

因此本轮保留 `.workbuddy`，不新增 `.codebuddy` 分发。WorkBuddy 同名入口必须核实注入的完整路径；目录显示、模型侧技能工具注册、正文/资源读取仍是不同层次。不能按列表顺序或当前分组猜来源，来源不符先停止，必要时显式读取正确路径。仅在一个项目成功不代表跨项目隔离或缓存行为已普遍保证。

这些结果不保证全局配置隔离、所有模型供应商或其它系统版本可用。工具白名单不等于 OS 沙箱；既有 hooks/组织策略仍可能生效。本轮没有调整登录、订阅、用户凭据或全局配置来绕过阻塞。

## 受控对照补充（2026-11-16）

Codex CLI 0.167.2、配置模型 gpt-6.1-sol/custom、medium 推理配置下，六次独立只读会话分别观察自然请求、明确来源和未提交资源更新。两侧都实际读取各自工程的正文与必要参考，缺失的另一来源参考及目标目录均被准确报告。相同 HEAD 下更新参考后，新会话的读取输出包含更新内容。未观察到这组场景的行为增益。

本轮原始 JSONL 支持上述读取和输出，catalog 注入仍不可观测，旧会话自动缓存刷新尚待验证。独立留出文件的固定时间晚于候选冻结，该时序限制随运行记录保留。Claude Code、Pi、DSH、WorkBuddy 的本轮内容已按有效来源处理，实际宿主调用尚未重跑，各宿主沿用自己的历史记录与限制。

## 依据

- [Agent Skills 格式](https://agentskills.io/specification)：内容与资源约定，不规定所有宿主的扫描目录。
- [Codex Skills](https://learn.chatgpt.com/docs/build-skills)、[Claude Code Skills](https://code.claude.com/docs/en/skills)：各自的发现与外部目录行为。
- [Pi 1.5.2 CLI](https://github.com/earendil-works/pi/blob/b4afdddf44e059c67ccf5097e5317d913521b470/packages/coding-agent/docs/cli.md)、[加载实现](https://github.com/earendil-works/pi/blob/b4afdddf44e059c67ccf5097e5317d913521b470/packages/coding-agent/src/core/resource-loader.ts)：明确技能路径与会话资源加载。
- [DSH filesystem provider](https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.2.2-rc.3/packages/skill/skill-filesystem/README.md)：本次预发布版的目录和优先级。
- [WorkBuddy 项目配置](https://www.workbuddy.cn/docs/workbuddy/From-Beginner-to-Expert-Guide/Function-Description/Project)：代码开发场景兼容配置。实际客户端行为需分别核实。
