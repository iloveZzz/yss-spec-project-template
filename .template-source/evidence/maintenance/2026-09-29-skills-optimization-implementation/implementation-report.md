# Skills 优化实施与校准记录

2026-09-29；维护强度 L3；状态：本批基础设施与首项正确性修复已实施，完整 W0–W6 尚未完成。用户授权来源为“OK 确认按完整执行计划来实施”，沿用 [完整计划](../2026-09-29-skills-optimization-plan/plan.md) 的范围及 Q7 资源边界。

## 已实施的本地变更

- 核对根模板和三个 profile 共 213 个 canonical 入口，记录完整技能资源摘要、所有权、基线依赖摘要和逐项待办。不以 84 个名称或 105 组入口字节合并不同环境；目前保守使用 213 个独立评测组。清单见 [effective-skill-inventory.json](effective-skill-inventory.json)。资源摘要完成不代表正文及外部依赖语义审查完成。
- 对齐 23 处有效 invocation 差异：六类公共辅助允许在既有授权内自然选用；handoff 与既有宿主元数据统一为显式入口；design 的 code-review、maintaining-skills 与已有自动使用规则一致。git-commit-core 保持内部依赖，并在根/backend/frontend 补 Codex 禁止独立隐式选用元数据。逐项变更见 [invocation-changes.json](invocation-changes.json)。
- 四份 registry 选择启用 `runtime_metadata_version: 1`；校验 Codex/Pi 声明与登记意图，拒绝非布尔值和未知版本。没有选择启用的新旧实例保持原有校验兼容。宿主策略声明校验不等于宿主实际强制执行证明。
- 新增 `scripts/inspect-skill-discovery` 和 `scripts/lib/skill-discovery.mjs`：记录磁盘资源与宿主观测，区分 catalog、实际选择和有效策略。同资源重复只告警；已提供轨迹的实际选择发生来源差异则阻断，即使没有再次列在 required 中。关键选择缺证据或环境摘要不完整也阻断；不自动删除投影或修改个人技能。
- 扩展现有评测器：共享跨进程次数/Agent 秒数账本，保留崩溃预留；显式绑定既有供应商；支持 Codex、Pi 只读运行及 Cursor 凭据预检；保留原始事件并归一化；缺失 token 指标为 unknown/null。Pi 写入/真实提交工作流和 Cursor 完整行为适配尚未验证。
- 修正 writing-for-agents 的 SKILL-MECHANICS.md，将发现、自动选用、显式调用、依赖读取、执行授权分开，移除“显式入口不能被其他技能读取”“description 永久加载/零成本”等错误绝对化陈述。根模板已做冻结旧文本与新文本的同场景 Codex 配对；三个 profile 同步共享正文，但运行环境等价尚未证明。
- 用既有脚本同步 profile、投影、技能锁和共享工具锁。11 个技能实例的完整资源摘要发生变化；四个生成器的固定来源快照及端到端安装/升级尚未进入最终集成。

## 静态检查与新鲜验证

当前变更的聚焦检查：Node registry/discovery 共 36 项；评测器 Python 共 32 项；四仓 registry/governance、投影与锁检查，以及全 profile 同步检查。正式结果以外部最终验证记录为准。

首次 verify-template-fast 按 fast 影响面执行 46 条计划命令，发现共享工具锁未同步，导致实现合同分发场景 80/81 通过。已通过 `scripts/sync-strategic-handoff-tools` 修复，定向 distribution 场景重新通过；失败报告继续保留，没有覆盖原记录。

第二次 fast 运行的 49 条计划命令及附加 diff 检查均返回 0，但最终输入摘要变化，门禁结果为 failed，不能计为通过。验证窗口内可见更新集中在被 Git 忽略的 `.codegraph/codegraph.db`、`daemon.log`、`codegraph.db-wal`，源码及八仓 Git 状态未变；快照函数包含忽略文件，支持后台索引状态导致漂移的判断。保留原报告 `verification-final`，待材料及后台索引稳定后重新冻结输入，既不忽略漂移，也不修改用户的 CodeGraph 配置。

本批最后一次验证在完成源文件及本记录后冻结输入执行，输出位于：

`/Users/zhudaoming/.codex/artifacts/yss-skills-optimization-2026-09-29-w6dd3k2z/verification-final-r2`

本文只登记位置，验证结论必须读取该目录的实际报告与退出码；不得由该位置存在推断通过。最终交接记录为同级 `delivery.md`。这次校验最多证明当前工作树批次的适用静态/确定性门禁，不替代完整真实模型评测、固定提交来源集成或发布验收。

## 24 次真实校准

详见 [calibration-summary.json](calibration-summary.json)，原始轨迹、输入副本、结果和运行配置保留于外部归档。共启动 24 次，账本累计 Agent 时间 **1586.589 秒（26.44 分钟）**；无未结束预留。次数先达到 24 上限，已停止后续模型启动。

| 宿主 | 启动次数 | 自动断言通过 | 结果范围 |
|---|---:|---:|---|
| Codex | 15 | 14 | 1 次本地 CLI 缺少配套 code-mode host 失败；改用已安装配套 CLI 后完成 6 类基线/候选及 1 项文本正确性配对 |
| Pi | 9 | 9 | 4 类基线/候选和 1 次修正输入副本后的非配对诊断；包括语义/路由未闭合样本 |
| Cursor | 0 | 0 | 隔离 HOME 无可用登录态，预检失败后未启动模型 |

**23 次自动断言通过不等于 23 次完整语义验收通过。** 每条记录均有主控语义复核及限制，不以独立审查名义记录。

- Codex 配套版本为 0.158.0-alpha.2.1，gpt-6-astra/xhigh，沿用 custom/OpenAI/responses；Pi 为 0.85.1，agent-plan/ark-code-latest/high。组件摘要见 [runtime-components.json](runtime-components.json)。不跨宿主比较模型优劣或归因成本变化。
- Codex 累计报告 input 2,075,915、其中 cached input 1,651,328、output 21,965；Pi input 798,742、其中 cached input 590,728、output 24,138。缓存输入已包含于 input，不能再次相加。Codex cache-write 未报告，保持 null；Pi 报告为 0。包括失败启动报告的使用量。
- 六类任务仅用于校准。两个命名含 neighbor 的负例实际为不相关常识题，只证明这两个远端控制没有误触发，不满足 Q5 的近邻负例要求。拟提交场景没有真实 Vue 差异，只证明缺前提时仍能给有限建议、读取公共/core 并保留提交授权边界。
- Pi 候选文档任务没有读到 writing-for-agents 或 CONTEXT.md；它把被校准副本遗漏的治理文档误报为源仓缺失。初次自定义 source_paths 漏掉 `.template-source/agents`、docs/package 等必要上下文；已补默认复制范围及反例测试。最后一轮修正已知缺失输入后读到了技能、写作参考和 CONTEXT.md，未再报告该缺文件，但它是单次非配对诊断，不能证明稳定性、收益或把之前漏读归因于技能正文。
- Pi 的 to-spec 自然语言请求两侧均正确拒绝在 template-source 创建产品 Spec，但没有读取 to-spec 正文。原生 `/skill:to-spec` 调用仍未验证。所有校准任务为只读；已授权提交、生命周期恢复及真实产物工作流需要另补。
- Codex 旧文本配对中模型已经识别出原文问题；新文本配对确认修正后的边界。它支持文本正确性修复，不证明模型从错误转为正确。无纯精简项或可确认成本下降。
- 历史 Pi 小批的 run-config 尚未包含新增的 provider 摘要字段；最后一轮才记录该字段。保留已知模型/供应商信息及后采集的组件摘要，不将后补信息伪装为每次运行前已冻结证据。
- 部分 Codex 只读 Git 命令通过登录 shell 绕过 PATH 替身并返回“非 Git 仓库”；没有观察到提交/推送或持久化源文件写入，但替身日志不能作为完整行为隔离证明。后续真实写入场景必须使用受控真实 fixture 及可靠观察，不能直接沿用此次只读判分。

## 宿主发现证据与缺口

Codex app-server 的 skills/list 能返回当前配置下 catalog；0.153.4 的首次项目观测为 240 条，49 个同名集合中 31 个资源相同、18 个资源不同。另保存配套 0.158.0-alpha.2.1 的观测，不能混用两个版本作为同一环境。catalog 不证明实际选中哪个副本，也不证明 description 截断或有效策略。

隔离 fixture 的配套 Codex 观测为 canonical 1 条、符号链接投影 1 条、实体重复 2 条、不同资源重复 2 条。无 Git 根时从子目录启动未发现祖先技能；额外真实临时 Git fixture 能发现祖先 canonical。首次报告因 `/var` 与 `/private/var` 过滤失配误记空集，已另存 v2 修正并保留原始 catalog。Codex 的用户级注入冲突没有在隔离 HOME 验证，不冒充完成。

Pi 默认目录 loader 项目观测 79 条。canonical-only 不进入该 loader，.pi 投影可发现，真实用户同名 fixture 体现用户目录优先。该探针只加载已安装 core/skills.js 默认发现逻辑，没有运行扩展或配置包，不能外推完整 Pi CLI 会话。Cursor 暂无已核实只读 catalog API，观测状态为 unknown；CLI 预检已有主账户登录，但隔离 HOME 不能取得登录态。

`--required` + 实际选择轨迹会按 Q4 阻断缺失关键来源/环境证据。当前 CLI 仅构建文件资源身份，尚不自动生成完整依赖及有效策略摘要，因此不得把关键技能检查当作已可签发验证通过的工具。纯 catalog 模式 exit 0 最多代表 catalog 观测。

已运行 `cursor agent --help` 时官方启动器自动安装了缺失的 Cursor Agent CLI（2026.09.28-64d2043）；这是本轮实际环境副作用。没有新建账户、购买订阅或修改个人技能/调用配置。私有临时认证副本不进入轨迹归档。

## 后续执行与一次总预算决定

保持完整范围，不把当前 11 个资源实例变更当作 213 个入口全部处置。接续顺序为：

1. 离线补齐每组正例、真正近邻负例、内部 core 的公共调用、授权/禁止、显式入口与生命周期恢复场景；列明输入依赖和可判分产物。修复 Cursor 受控环境能力；未解决时如实阻断相关宿主覆盖。
2. 在用户确认 Q7 后，用冻结旧输入跑对应基线，再逐族审查/修改/候选比较；校准遗漏及失配场景统一重跑两侧，不扩张个人环境权限。
3. 分批同步 profile、投影、锁；完成全部逐项处置后，准备四个生成器新建/ensure/更新/定制冲突/幂等场景。在获得 Git 交付授权后闭合真实固定 SHA 来源集成。
4. 汇总 Q4/Q5/Q6 全部出口及回滚说明；无适用证据继续标记未完成，推送/发布另遵守授权。

**建议后续总预算：最多新增 1200 次启动、累计 36 小时 Agent 时间、单次 300 秒，任一先到停止；失败、重试、所有宿主与多步场景统一累计。** 本次已结束的 24 次不重复计入新增预算，但保留在总执行台账。

计算依据：213 个尚不能跨环境复用的组 × 正例/近邻负例 2 × 基线/候选 2 = 至少 852 次；另外 348 次用于宿主差异、显式/内部/授权边界、多步流程及必要复测。校准成功样本的进程耗时均值约为 Codex 64.6 秒、Pi 72.7 秒，仅粗略对应 1200 次约 22–24 小时；复杂实现任务可能更长，36 小时为建议控制上限，不承诺在此预算内一定全部完成。没有可核验费率/账单，货币费用未知，这不是金额封顶。

需要此决定的依据是已确认计划 Q7 原文：“根据实测数据取得一次全量预算决定后，在该预算内自动分批推进”。达到校准次数后没有自动扩容权限；不重复澄清 Q1–Q6。

## 保全与恢复

[baseline-manifest.json](baseline-manifest.json) 绑定八仓起点 SHA、7894 个源码文件副本、45 个既有研究/计划文件摘要；[preservation.json](preservation.json) 记录八仓 HEAD 未变、45 个受保护文件无变化。当前没有提交、推送、npm 发布或业务项目迁移。

回滚只恢复本批 canonical/registry/工具到保存副本并重新生成其投影/锁；不执行 reset/clean/自动 stash，不覆盖既有研究、计划或用户工作。原始校准、失败结果和冻结副本持久归档信息见 [evidence-archive.json](evidence-archive.json)。
