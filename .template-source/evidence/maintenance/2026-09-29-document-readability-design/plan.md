# 研发文档可读性优化实施方案

方案版本：v1，2026-09-29。适用仓库：`yss-spec-project-template`，身份：`template-source`。

本方案把机器合同转成可直接审阅的中文材料，并减少重复维护。先扩展现有阅读机制，再按证据精简结构；生命周期状态、业务事实和批准仍由原权威资产及其校验器决定。

八项范围决定已由用户在本聊天三轮澄清中确认。本文件是确认结果的设计展开，不是产品 Spec、实现合同或生命周期批准记录。本轮交付范围为方案及方案核查；实现、实例迁移、Git 提交、推送和发布均未执行。

导航：[已确认决定](#已确认决定) · [事实基线](#事实基线) · [阅读流程](#目标阅读流程) · [架构](#生成架构) · [命令](#命令接口) · [更新与一致性](#自动更新与失败处理) · [结构精简](#结构精简与版本迁移) · [实施批次](#实施批次与依赖) · [验收](#验收与默认启用) · [回滚](#回滚与未决风险)

## 已确认决定

| 编号 | 用户确认的选择 | 本方案落实方式 |
|---|---|---|
| D1 / Q1 | 人工审阅优先，材料维护次之，Agent 消费成本作为约束 | 以找规则、看状态、识别变化为验收任务；测量读取量，不以字符缩减替代完整性 |
| D2 / Q2 | 全生命周期统一设计，分批落地 | 统一阅读模型；首批覆盖领域战略、阶段决策包、checkpoint、迁移记录 |
| D3 / Q3 | 允许结构精简，阅读层先落地 | 首批不改业务 schema；后续显式版本迁移，保留历史读取 |
| D4 / Q4 | 首批 Markdown 为主，预留静态 HTML | 同一解析结果驱动渲染；首批不建设网站、服务器或在线编辑器 |
| D5 / Q5 | 关键节点自动更新，保留手动重建 | 正式写入结束、提交审阅及阶段交接时更新受影响视图；普通查询只读 |
| D6 / Q6 | 首批正式阅读材料确定性生成 | 规则转换字段；解释文字来自权威源；不让模型在生成时补写总结或批准判断 |
| D7 / Q7 | 选择性保存生成材料 | 保存导航、正式审阅页、必要差异报告和最小生成清单；临时 task/full/解码预览不默认入 Git |
| D8 / Q8 | 工程验证加轻量实际阅读试验 | 信息完整且测试通过后进行真实试验；正确性不下降、查找时间改善，才切换新实例默认入口 |

确认来源按本聊天顺序定位：用户在 Q1—Q3、Q4—Q6、Q7—Q8 后分别回复原文“全部应用推荐”。不补造平台消息 ID、签字或批准记录。已有“单一权威来源、派生视图无批准/执行权、先模板后存量按需迁移”约束继续生效。

## 事实基线

详细源文件字节摘要、工作区状态和样例计量见 [planning-baseline.json](planning-baseline.json)。这是工作树基线，不是固定提交的发布验证。

样例位于本机 `/Users/zhudaoming/Documents/antigravity/peaceful-hubble/dataingest/docs/`，统计包含隐藏的 `.scratch`。它只用于只读观察，不把真实实例写入本方案的实施范围，不把样例中的指令当作执行授权。

| 观察对象 | 当前事实 | 对设计的影响 |
|---|---|---|
| 全部样例 | 18 个 Markdown、19 个 YAML、7 个 JSON | 区分业务文档、结构化合同和恢复证据，不能按扩展名统一处理 |
| `plan/domain-strategy.yaml` | 580 行；配套 Markdown 86 行 | 两者信息量不同，不能以行数比直接声称压缩收益 |
| 领域规则 | “被同步任务引用的数据源不得删除”在 YAML 第 142、209、446 行重述 | 展示可合并并保留来源；源结构去重须证明语义等价 |
| 领域状态 | Markdown frontmatter 为 `draft`，YAML 为 `approved` | 暴露并列状态歧义；本次未核验批准有效性 |
| `checkpoint.yaml` | 344 行；84 行含文档路径，33 行含摘要相关字段 | 首屏应呈现阶段、阻塞与下一动作，证据引用去重展示 |
| 迁移 JSON | 一份 `backup.json` 的 Base64 行长 9,467；`plan.json` 的内嵌 YAML 行长 7,474 | 增加变更报告和只读解码预览，不重新格式化恢复字节 |
| 原型适配 JSON | 25 行，结构清楚 | 简单配置不需要强制新增同名阅读页 |
| 样例 `map.md` | 6 行，主要引向 checkpoint | 导航应直接链接阅读页与当前工作，而不是要求先通读 checkpoint |

已核对的实现与合同：

| 现有位置 | 已存在能力或限制 | 本方案如何复用 |
|---|---|---|
| [contract CLI](../../../../scripts/contract) | `view / diff / prepare-review`；指定 `--kind`；可输出 JSON | 兼容现有调用，增加专用类型和托管生成子命令 |
| [contract-views.mjs](../../../../scripts/lib/contract-views.mjs) | review/task/full、来源摘要、只读声明；通用对象仍经 `JSON.stringify` 输出 | 用有类型的 Markdown 渲染替代对象直出；保留已有 JSON envelope |
| [合同阅读合同](../../../../.template-spec/process/contract-reading.md) | 默认角色视图、原始摘要、未知约束保留、无批准/执行权 | 更新同一合同，不复制成第二套审批规则 |
| [阶段追踪合同](../../../../.template-spec/process/stage-tracking.md) | checkpoint.stage_tracking 唯一持有进度；map/父 Ticket 引用 | 新导航和状态页只做派生展示 |
| [stage-tracking-migration.mjs](../../../../scripts/lib/stage-tracking-migration.mjs) | plan/apply、观察输入、Base64 备份、回执及冲突感知回滚 | 保持事务协议；成功后接阅读生成，不让生成失败伪装事务失败 |
| [lifecycle-status.mjs](../../../../scripts/lib/lifecycle-status.mjs) | 只读诊断，部分核验明确 `not-checked` | 状态页消费已有诊断，不重新计算生命周期就绪 |
| [domain-strategy-contract.md](../../../../.agents/skills/yss-stage-decision/references/domain-strategy-contract.md) | v3 新写入、v2 历史读取、稳定规则与传播映射 | v3 优先专用渲染；历史按可证明内容呈现 |
| [stage-decision-package-contract.md](../../../../.agents/skills/yss-stage-decision/references/stage-decision-package-contract.md) | 未决项、引用版本和批准入口已有规则 | 决策与未决项置前，批准仍回原验证器 |

## 目标阅读流程

1. 使用者打开功能包 `map.md`，看到当前阶段、登记阻塞、负责人、下一动作及源文件入口。
2. 点击领域设计或阶段决策阅读页，先读本期范围和待判断事项，再读完整规则、场景、例外与风险。
3. 审阅变化时打开绑定前后版本的差异报告；业务变化、证据变化、无法判断的变化分别列出。
4. 需要追溯时跟随来源链接、稳定 ID 或字段路径查看原文；不要求从头通读全部 YAML。
5. 使用者通过自然语言向 Agent 提出修改；Agent 在原资产所有者规则下修改权威源、运行适用校验，再更新视图。手动编辑生成页不会反向修改权威源。
6. 原文件缺失、状态冲突或生成页过期时仍能查看诊断，但不能把该页作为当前、完整的审阅材料。

以下只是格式示意，不是该实例的当前批准结论：

> **业务规则：被引用的数据源不能删除**<br>
> 条件：数据源仍被同步任务引用。<br>
> 结果：拒绝删除，展示引用任务并提示先解除引用。<br>
> 成功路径：无任务引用时，删除成功且不再可被任务选择。<br>
> 规则：`rule.referenced-datasource-no-delete`；场景：`scenario.delete-datasource`。<br>
> 来源：领域战略的规则目录、删除场景及对应不变量。批准有效性：未核验。

## 权威来源与产物职责

| 内容 | 权威位置 | 阅读层职责 |
|---|---|---|
| 业务解释、取舍、Spec 正文 | 该类资产既有 Markdown 或其他明确权威源 | 保留正文及作者语义，不强制全部改为 YAML |
| 领域战略、阶段包、实现合同 | 各自结构化合同及 schema | 渲染，不反向写入或另存一份可编辑事实 |
| 阶段工作项进度 | checkpoint.stage_tracking | 展示登记值和本次可核验诊断 |
| 审批事实、范围、有效性 | 原批准记录、用户决定及原校验器 | 区分“源文件声明 approved”与“本次批准有效性已核验” |
| 术语和中文名称 | 根 CONTEXT.md、生命周期注册表的适用字段 | 引用当前正式名称，不另造术语表 |
| 编码备份、迁移计划、回执 | 原事务目录 | 只读解释、对比及解码；不重写原始记录 |
| 视图来源、输出摘要和生成版本 | 自动生成的 reading manifest | 追踪生成物，不决定业务状态或批准 |

旧 `domain-strategy.md` 一类人工说明不直接覆盖为生成页。新视图使用独立目录；旧文档若包含独有解释，继续作为单独作者资产。若需要合并或退休，必须先逐段归属及冲突检查，再显式迁移。状态不一致先列为冲突，不能按修改时间选一个“最新状态”。

## 全生命周期覆盖矩阵

| 资产组 | 阅读重点 | 落地批次 |
|---|---|---|
| 领域战略、阶段决策包 | 边界、规则、场景、传播、取舍、未决项 | P1 首批专用适配器 |
| checkpoint、阶段工作项、导航 | 当前状态、依赖、阻塞、下一动作、证据 | P1/P2 |
| 阶段追踪迁移记录 | 文件变化、前后差异、执行结果、恢复入口 | P1/P2 |
| Plan、Spec、产品设计 | 原有正文、验收、设计约束、来源与状态区别 | P5；先链接已有 Markdown，不复制整篇正文 |
| 技术设计、API/数据决定、脚手架 | 决定、协议、风险、验证、适用范围 | P5 |
| Slice、handoff、后端交付、前端接收 | 当前任务、边界、完整约束、验收与恢复 | P5；兼容现有 review/task/full |
| approval、user-decision、Context 对账、发布验证 | 决定范围、证据、新鲜度、实际核验范围 | P5；不生成新的批准或释放权限 |
| 简单配置、原始日志、二进制备份 | 原文入口或临时预览 | 无强制独立审阅页 |

未知资产类型只提供诊断与原文入口；不得套用 `plan` 类型来假装完成专用校验。专用适配器未覆盖的已支持类型保留兼容入口，并明确标记渲染覆盖能力。

## 生成架构

```mermaid
flowchart LR
  A[权威资产与明确引用] --> B[现有解析器及资产校验器]
  B --> C[类型适配器与来源映射]
  C --> D[内存阅读模型 ViewDocument]
  D --> E[中文 Markdown 渲染]
  D --> F[兼容 JSON 输出与临时任务视图]
  E --> G[审阅页和生成清单]
  G --> H[只读新鲜度与完整性检查]
  H --> I[原审阅及阶段交接入口]
```

扩展 `scripts/contract`，不新增第二个生命周期 CLI。建议新增模块均为拟议文件：

| 拟议模块 | 责任 | 明确不负责 |
|---|---|---|
| `scripts/lib/reading-view-model.mjs` | 阅读模型、来源定位、字段覆盖及类型分派 | 生命周期状态裁决 |
| `scripts/lib/reading-view-adapters.mjs` | 首批四类专用映射，调用已有解析/诊断 | 再实现批准检查 |
| `scripts/lib/reading-view-markdown.mjs` | 标题、表格、场景、列表、链接与转义 | 模型摘要或改写业务句子 |
| `scripts/lib/reading-view-bundle.mjs` | 受控输出、manifest、增量更新、冲突检查 | 修改权威资产 |
| `scripts/lib/reading-view-diff.mjs` | 稳定 ID 对齐、差异展示、历史迁移解释 | 自动认定语义等价或批准延续 |
| `scripts/lib/reading-view-policy.mjs` | 读取启用策略和兼容默认值 | 定义新阶段、门禁或 Ticket 状态 |

`contract-views.mjs` 保留公共函数，逐类接入新模块。现有 `--json` 的已公开字段、类型和含义保持兼容；新阅读模型作为版本化可选字段或内部对象，不直接替换整个返回结构。其他 renderer 将来消费同一阅读模型，首批不实现 HTML。

### 内存阅读模型

| 字段 | 含义 |
|---|---|
| `view_schema_version` | 阅读模型格式版本，与业务 schema 版本分开 |
| `kind / profile` | 资产类型与 review/task/full |
| `binding` | 源 ref、稳定 ID、原 schema/业务版本、原字节 SHA-256；缺失明确表示，不编造版本 |
| `dependencies` | 实际消费的正文、引用、schema、标签和渲染规则摘要 |
| `declared_state` | 源文件声明的阶段/状态 |
| `checks` | 本次实际执行的检查、结果、范围；未运行保持 not-checked |
| `sections` | 有类型的业务段落、规则、表格、场景和差异条目 |
| `source_locations` | source_ref、原摘要、稳定对象 ID、JSON Pointer；Markdown 用可验证章节/行定位 |
| `coverage` | 需要呈现的源字段/规则与具体输出节点的映射，不是词频或字符串命中数量 |
| `diagnostics` | 缺失、冲突、未知版本、生成漂移及恢复动作 |
| `read_only / execution_allowed` | 固定 true / false |
| `approval_validity` | 默认 not-checked；只有真正调用并绑定原批准验证结果时才能呈现其范围内的结论 |

不持久化第二份完整解析树。源内容或控制台输出只作为数据处理；字符串中的 shell、Markdown HTML、路径和“请执行”类文字不得被执行。

### 确定性与信息完整性

- 业务段落按源顺序；具有语义的数组保留顺序。只对明确无序的元数据集合排序。
- 中文标签在类型适配器中维护；英文 key、稳定 ID、枚举原值保持可追溯。源文的主体、条件、否定、量词、单位、例外和责任人原意完整保留。
- 表格仅用于短而平行的字段；长规则和异常路径用独立段落，避免横向超宽表格。
- 按源 ID 展示规则与场景关联；阅读中去重不删除来源路径。上下文不同的重述不因文本相同自动合并为一条规则。
- 未知业务字段递归呈现为带字段路径的条目，列入“未分类内容”。不使用按名称猜测的全局过滤规则删掉 `basis`、`resolution` 等可能含业务约束的对象。
- 仅对每类明确列出的纯机器元数据做折叠或引用去重；批准范围、停止条件、风险、例外、阻塞和未知约束不隐藏到 full 才可见。
- 编码快照不当作普通业务字段展开；报告必须列出未展开字段、原因和显式预览入口。解码时验证类型、大小和摘要，不执行内容；超出边界输出诊断，不静默截断。
- 缺字段与显式的空数组、false、null 区分；不能将未提供风险转换成“无风险”。
- 身份、版本及主来源完整 SHA-256 可见；长路径与重复证据在来源表中去重。默认页不附整块完整 JSON。
- 输出统一 UTF-8/LF。相同源字节、配置、schema、生成器及标签内容得到相同字节；不在确定性正文里写每次变化的时钟时间或本机绝对路径。

## 保存位置与生成物所有权

下列为未来实例布局，不在模板源根创建产品功能包：

```text
docs/.scratch/<feature>/
  map.md                         # 新实例的功能导航；旧实例不自动接管
  checkpoint.yaml                # 既有权威状态
  plan/                          # 既有权威资产与人工解释
  reading/
    .manifest.json               # 工具维护的最小依赖与输出清单
    domain-strategy.review.md
    stage-decision-package.review.md
    status.review.md
    changes/<comparison-id>.md   # 仅为一次正式审阅生成，后续不改历史报告
```

`comparison-id` 由前后源摘要、类型和生成器身份确定。临时 task/full、解码预览默认走 stdout；若需要落盘，由调用者选择临时输出目录，不默认加入版本管理。已有迁移 backup/plan/receipt 继续遵循原保存规则，不能因为视图可重建而删除它们。

manifest 只保存源绑定、实际依赖、生成器摘要、输出路径/摘要、覆盖检查结果和管理范围，不重复业务正文、进度或批准。多个视图共享同一依赖记录。manifest 不包含自己的摘要；源资产不反向绑定生成页或 manifest，避免摘要循环。

新项目 `map.md` 可整体由工具管理。旧项目已有 map 不自动覆盖：启用计划展示差异；保留人工正文，并只维护有明确标记和前次输出摘要的导航块。视图依赖集合排除其自身输出；若旧 map 含需要消费的人工信息，显式选取人工部分或独立作者文件，避免自依赖。

对无生成标记的同名文件、人工修改过的托管块、符号链接或范围外路径，返回冲突并保留原文件。不提供默认覆盖式 `--force`。写入先暂存并校验，逐文件原子替换且 manifest 最后提交；并发读取遇到输出与 manifest 不匹配时判为未完成，不能谎称多文件操作具有文件系统级原子性。崩溃后以生成日志恢复，只回滚本轮仍未被他人修改的派生文件。

## 命令接口

以下前三行是已存在接口；命令参数以当前源代码为准。其余是待实现的接口设计，当前不得当作可运行功能。

```sh
# 已有：只读输出；默认 Markdown，--json 输出兼容结构
scripts/contract view <资产> --kind <已有类型> --profile review
scripts/contract diff <旧资产> <新资产> --kind <已有类型> --json
scripts/contract prepare-review <旧资产> <新资产> --kind <已有类型> --decision <原决定.yaml> --json
```

拟议新增 `--kind`：`domain-strategy`、`stage-decision-package`、`checkpoint`、`tracking-migration`。`tracking-migration` 的位置参数为显式 `plan.json`，备份/回执仅从其事务目录或显式选取输入读取，不扫描历史猜“最新计划”。

```sh
# 拟议：stdout 预览，不写项目
scripts/contract view <领域战略.yaml> --kind domain-strategy --profile review
scripts/contract view <checkpoint.yaml> --kind checkpoint --profile review
scripts/contract view <事务目录/plan.json> --kind tracking-migration --profile review

# 拟议：明确功能入口，更新受影响的托管阅读材料
scripts/contract render --checkpoint <checkpoint.yaml> --root <项目根>

# 拟议：提交审阅前检查，不写项目
scripts/contract check-views --checkpoint <checkpoint.yaml> --root <项目根> --json

# 拟议：向已有项目启用托管阅读，先看计划再显式应用
scripts/contract plan-enable --checkpoint <checkpoint.yaml> --root <项目根> --output <启用计划.json>
scripts/contract apply-enable <启用计划.json> --root <项目根>
```

render 的资产来自指定 checkpoint 的已登记引用、显式输入和其必要来源闭包。没有登记的 future-stage 资产不生成空页，也不当作缺失失败；确需阅读未登记草案时使用单资产 view。项目源根的实际路径不写入便携阅读页。

现有子命令的退出码不改。新增 check-views/render：0 表示本次请求范围内成功或 unchanged；1 表示来源、结构、覆盖、漂移或写冲突；2 表示用法不合法。check-views 成功不表示原业务门禁或批准有效。JSON 给出稳定诊断码及恢复动作，stderr 为简短中文说明。

## 自动更新与失败处理

新增拟议 `.template-spec/process/reading-policy.yaml`，只保存 `schema_version: 1` 与 `mode: manual | managed`；由模板及启用工具维护，不要求项目人员填写另一套表单。缺文件等同 legacy/manual。类型展示规则在代码中，不在实例复制另一份生命周期注册表。

试用期主模板和 CLI 默认仍为 manual，允许显式 managed 试验。工程验收和真实阅读试验通过后，新实例才默认 managed；attach/sync 不自动改变旧项目模式。阅读能力必须先在相关 CLI/Profile 中实际分发，才能启用其自动调用。

| 触发点 | 动作 | 失败影响 |
|---|---|---|
| 资产草稿生成或修订事务成功后 | 按依赖摘要刷新受影响页 | 保留成功写入的权威源，报告视图未更新；草稿仍可继续编辑 |
| 提交正式审阅前 | render 后 check-views，绑定同一批输入 | managed 且该类已纳入正式阅读支持时阻止提交陈旧/不完整阅读包 |
| 阶段交接前 | 原阶段校验之外核对阅读包 | 只阻止受影响交接；不额外请求人工批准，不改变原阶段定义 |
| 普通 view/status 查询 | 内存读取、返回当前诊断 | 不写项目、不触发全量模板验证 |
| 恢复工作 | 只读检查 manifest 与实际源，给出重建动作 | 不把旧 completed/approved 文本自动恢复为当前结论 |
| 历史迁移计划已应用 | 生成对应报告，保持原 plan/backup/receipt | 事务 applied 与阅读生成失败分别报告；不得因此重复 apply |

自动刷新不是靠后台监听，也不能只写一句 Skill 提示。P2 必须落实共同 `finalize-reading` 代码入口，并接入已有写入命令的成功分支、原正式审阅/交接准备入口。Agent 直接编辑源文件时，所属工作单元结束前调用同一入口；提交审阅的实际代码入口再次检查，以捕获遗漏。Skill 只说明调用时机与恢复，不另存状态。

不在底层原批准校验器中偷偷附加通用文件生成副作用。更新权威源和生成阅读页属于可区分的两个步骤；代码返回必须能区分 `source_operation=applied` 与 `reading_update=failed`。若进程在两步间崩溃，下次 check-views 检测不匹配并重建派生物，不回滚已成功的业务变更。

人工确认继续沿用原生命周期聚合边界。新增的是机器一致性检查，挂到已有审阅/交接准备，不新增 `gate.*` 或用户反复签字点；更新核心流转代码仍按 L3 核验。

## 新鲜度、状态冲突与静态页面限制

“生成时有效”不等于“此刻有效”。Markdown 首部只写“基于以下来源摘要生成；当前有效性需 check-views 核验”。离线页面无法发现后来发生的源变更，不显示无条件的绿色“当前有效”。

check-views 比较四类输入：实际消费的源原字节、schema/标签/配置、生成器闭包、输出与 manifest 字节。`renderer_version` 之外还绑定实际代码摘要，避免忘记升版本导致旧视图误命中；输出篡改、删除、新增依赖和缺失引用均可检测。检查及生成结束前再核对输入，读写期间变更则失败，不发布混合版本结果。

同一原文件同时有语义摘要和字节摘要时，保留各自用途；不以“只是排版”忽略原字节绑定。渲染器升级只使视图需要重建，不自动使未变业务批准失效。业务源发生变化时，批准影响仍由原校验及授权延续规则决定。

状态页分别呈现：源声明状态、当前可检查事实、未检查项、冲突。`blockers: []` 只能表述为“未登记阻塞”，不能替代完整就绪检查。源文件批准状态与关联说明不一致时，输出具体来源和差异，不自行选择其一。

manifest 不保存可跨执行边界直接信任的批准结果。验证结果若展示，必须标明本次范围、绑定和时点；历史结果作为历史证据呈现，不作为 Fresh Verification。

## 首批专用展示与差异报告

| 类型 | 正文顺序 | 必须保留的细节 |
|---|---|---|
| domain-strategy | 边界与职责 → 关系 → 规则 → 场景 → 对象候选 → 传播 → 未决/来源 | 非职责、上下游语义、传输方向、所有成功/失败结果、不变量、置信度、关键场景及传播条件 |
| stage-decision-package | 问题/用户 → MVP/非目标 → 决定 → 成功标准与 seam → 假设/约束 → 未决 → 传播/来源 | 候选与确认状态、blocker/deferred、责任人、恢复动作、目标版本/日期、重新批准条件 |
| checkpoint | 当前阶段/下一动作 → 登记阻塞 → 工作项/依赖 → 资产与检查 → 未核验项 → 来源 | 生命周期状态与工作项进度分开；延期、取消、recheck_required、证据范围不得合并掉 |
| tracking-migration | 计划身份 → 变更文件 → 前后差异 → 执行回执 → 备份/恢复引用 | proposed/applied/failed 区分，新增/删除/权限变化、恢复冲突和未知基线 |

差异先用稳定 ID 对齐对象，再比较字段；没有稳定 ID 时保留位置与顺序差异，不自行发明身份。区分 `business-change`、`binding-change`、`presentation-change` 与 `unclassified`；分类只是审阅辅助，不能单独授予批准沿用。路径或 digest 变化可能影响决策依据，binding-change 不能显示为“无需审查”。

报告中完整列出否定、阈值、单位、范围、例外、验收和状态变化。对象重排与内容变化分别说明；有序数组的重排本身保留为变化。未分类字段照常显示，不隐藏。

迁移报告的 before 必须来自计划匹配的旧快照或 backup，并用 `before.digest` 核对；after 来自计划内嵌内容并核对 `after_digest`；receipt 仅说明原事务记录的结果。缺少旧快照时写“无法比较旧内容”，不能拿已变更的当前文件充当 before。报告不解密、执行或写回解码内容。正式留证报告只由受控命令保存，历史报告不追随当前源覆盖。

## 结构精简与版本迁移

P3 独立于首批阅读层交付；允许研究并实现确有收益的结构优化，不要求把每一类文件都改版。每个候选先建立字段读写者清单和原/新语义映射，再决定是否更改 schema。

| 候选 | 拟议变化 | 开始迁移的证据要求 | 默认取舍 |
|---|---|---|---|
| 领域规则重述 | 新版领域 schema 将规则正文集中在 rule_catalog，场景/不变量保存 rule_refs 及其特有条件/结果 | 同一 ID 规则逐条一致；场景特有细化不可丢；导出与消费者闭包可解析 | 首个结构试点；暂定 v4，新版号实施前检查冲突 |
| 阶段包重复绑定 | 新版阶段包减少可从已绑定领域合同确定性读取的重复快照或声明 | 当前与历史读取、离线交付、术语双摘要和原批准验证都成立 | 可与领域新版配套，不能只为了短而删除闭包证据 |
| checkpoint 重复证据 | 评估同一证据 ref/digest 的受控引用表 | stage_tracking 仍单点持有状态；旧 schema 读取及恢复路径明确 | 无明显收益则只在视图去重；不按行数拆散状态源 |
| 工作项数组与独立说明 | 明确 items 是登记输入、work-items 是说明、checkpoint 是当前状态 | 工具/Skill 不再误读 seed 中 pending 摘要为当前证据 | 优先职责标注和生成入口修正，不新增状态文件 |
| 迁移内嵌 after / Base64 | 首批保留原协议，用报告解决阅读问题 | 若后续需外置 blob，必须证明事务恢复、原字节、文件权限与完整分发不退化 | 本方案不以可读性为由迁移恢复存储格式 |

源结构迁移只做显式 plan/apply：绑定输入、列出差异、生成新候选，旧源及批准记录原样保留。新候选为 draft，不继承旧批准；若要延续原决定，仍由现有差异审查和真实决定验证处理。缺少规则引用、正文不一致或离线依赖缺失时停止该候选迁移，不猜测修复。

已有 v2/v3 读取与原预检保持；更旧格式按当前支持范围返回历史诊断或 migration-required。不能把“解析成功”描述为“完成业务验证”。新 schema 的交付必须同步 schema、validator、生成模板、战略导出/导入、跨仓消费、Skill、锁与 CLI 快照；任一消费链未闭合时不切换新格式默认写入。

## 实施批次与依赖

推进链：P0 → P1 → P2 → P4 → P6。结构分支 P3 在 P1 后开展；扩面分支 P5 在首批试验结果后开展。P3/P5 每次交付都复用 P4/P6 验收与分发。这里是工作顺序，不是已创建或已批准的产品 Ticket。

| 批次 | 可验收交付 | 主要改动位置 | 退出条件 |
|---|---|---|---|
| P0 基线与反例 | 冻结最小脱敏 fixture、字段覆盖清单、历史版本矩阵、既有调用兼容断言 | 拟议 `scripts/fixtures/reading-views/`；现有 contract-efficiency、stage-tracking fixtures | 能复现长字符串、状态分歧、未知约束丢失和过期风险；样例原目录零写入 |
| P1 专用阅读 | 阅读模型、四类适配器、中文 Markdown 和兼容 JSON、差异预览 | `scripts/contract`、`scripts/lib/contract-views.mjs` 及上述拟议模块 | 信息覆盖反例通过；既有 CLI/API 输出不破坏；只读预览零写入 |
| P2 托管生成 | manifest、导航、增量更新、check-views、启用计划/应用、成功写入后联动 | 拟议 reading-policy/schema；stage-tracking-migration；生命周期准备入口及相关 Skill | 并发/崩溃/冲突可恢复；managed 审阅包过期时阻断提交；legacy 不被自动接管 |
| P3 结构精简 | 逐候选语义映射、显式新版 draft 迁移、双读与跨仓兼容 | yss-stage-decision schema/validators/templates；strategic-handoff 相关工具 | 字段与引用无丢失、消费者全部兼容、旧批准不可被继承；无证据收益候选不迁移 |
| P4 首批试用 | 工程验证结果、阅读试验记录和默认启用结论 | 拟议评估 fixture 与模板源维护证据目录 | D8 全部满足；否则保留显式试用，修复后重测 |
| P5 生命周期扩面 | 逐资产增加 renderer 和行为反例，接入既有阅读入口 | 对应资产所有者、`contractKinds`、相关 fixtures | 每类单独证明约束覆盖，不用首批通过替代全类型验证 |
| P6 分发与交付 | 主模板/专职模板工具、Skill 投影、锁、四 CLI 快照及实例验证 | 同步脚本、三专职模板、四生成器仓库 | 实际初始化与显式旧实例启用通过；正式发布另需固定 SHA 验证及发布授权 |

P0/P1 工具试用不提前切换默认。P4 使用候选的隔离实例，不要求先把候选推广到新项目。P6 中任何未通过试验的扩展类型仍保留旧入口或显式开关，不能因共享渲染器已发布而自动宣称全类型可用。

### 拟修改资产清单与职责

| 位置 | 计划修改 |
|---|---|
| `.template-spec/process/contract-reading.md` | 合并专用类型、产物职责、只读/生成区别、过期及兼容约定 |
| `.template-spec/process/document-writing.md` | 仅补与现有写法衔接的生成材料规则；不复制 schema 或生命周期状态定义 |
| `.template-spec/process/stage-tracking.md` | 自动更新点、map 管理范围、事务结果与阅读生成结果分开 |
| `.template-spec/process/reading-policy.yaml`、`schemas/reading-policy.schema.json`（拟新增） | 启用策略，旧实例缺省兼容 |
| `.template-spec/process/schemas/reading-manifest.schema.json`（拟新增） | 生成清单最小结构；不存业务事实 |
| `.agents/skills/yss-stage-decision/` | 正式写入后生成、源结构迁移与新版双读 |
| `.agents/skills/yss-product-lifecycle/` | 提交审阅及交接前检查；恢复时只读发现漂移 |
| `.agents/skills/yss-implementation-contract-compiler/` | P5 中衔接现有 Slice task/review，保留全局、专项与未知约束 |
| `scripts/lib/stage-tracking-migration.mjs` | 保留原计划/备份/回执协议，成功后接生成入口；无更新时仍支持缺失视图修复 |
| `scripts/lib/lifecycle-status.mjs` | 增量给出视图可用性/恢复命令，保持已有批准未核验语义 |
| `scripts/sync-strategic-handoff-tools` | 将新增工具依赖纳入正确 Profile 分发，不向专职角色授予额外写权 |
| `.template-source/process/template-verification-profiles.yaml` | 登记新增行为回归和分发检查；不降低 fast/candidate/release 既有要求 |

只编辑 `.agents/skills` canonical；Agent 投影、锁与 snapshot 使用仓库脚本生成。当前已有无关脏改涉及 Skill 治理、工具同步、锁和三个专职模板，详见基线；实现开始前必须重新核对，必要时使用托管隔离 worktree。不得 reset/clean/覆盖或将它们混入本任务提交。

模板维护实现按 generation-semantics、cross-repo-contract、必要时 core-validator 等实际触发项判 L3；普通日常维护按仓库政策自检与 fresh verification，等级本身不强制独立审查。当前仅新增设计文档，按 textual-only / L1 做直接相关的文档核查，不标记实现或发布就绪。

## 验收与默认启用

### 工程验收

| 编号 | 场景/反例 | 通过标准 |
|---|---|---|
| E1 | 规则、例外、否定、单位、阈值、风险、阻塞、停止条件、未知嵌套字段 | fixture 的全部必需决策信息映射到可见输出；中文和兼容 JSON 两种输出均检查；不能只比较完整 raw/full |
| E2 | v2/v3、缺字段、未知版本、非法 YAML/JSON、重复 ID | 当前支持矩阵正确；不编造数据，未知版本不声称验证通过 |
| E3 | 同输入重复生成、仅正文/标签/schema/renderer 改变 | 相同输入字节相同；每种相关变更使正确视图过期；不发生无意义时间戳 diff |
| E4 | 冲突状态、旧批准、空 blockers、历史验证记录 | 声明、检查与未核验分开；视图永不授予执行权 |
| E5 | view/status/check-views、来源变化与输出手改 | 只读命令零项目写入；实际字节漂移检出；并发变更不产出伪 current |
| E6 | render 中途失败、双进程、manifest 损坏、部分输出 | 旧权威源不受损；失败可诊断、重建可幂等，人工修改不被覆盖 |
| E7 | managed/manual、未登记未来资产、专职 Profile 缺能力 | 仅适用已登记资产要求阅读包；旧实例不新添门禁；无能力命令不自动调用 |
| E8 | 历史 plan 缺 before、备份摘要错、Base64 错、receipt 失败 | 不拿当前文件伪造旧版本；不能将预览当迁移成功 |
| E9 | 结构迁移及回滚 | 旧字节保留、新候选 draft、引用闭包完整；相同计划重复应用不改变结果 |
| E10 | 真实 CLI 安装/初始化/旧实例显式启用 | 缺模块/漏模板/投影漂移可发现；新实例策略符合试用或默认阶段；业务文件与旧证据不被覆盖 |

覆盖率的分母是人工核对过的必需规则与源字段映射，不是生成器自己声称的 coverage 值。对关键限制做删除/否定/顺序/未知字段反例，证明测试会捕获遗漏。业务上必要的重述可保留，验收不设总字数压缩门槛。

### 实际阅读试验

使用用户或明确指定的实际使用者；Agent 模拟答题不能替代。选两组难度相近、包含异常与状态冲突的固定材料，交叉安排旧/新展示顺序，减少重复阅读记忆效应。三类任务对应已确认 Q8：找阶段/阻塞/下一动作，找规则及例外/失败，判断业务与绑定变化。

试验记录参与者、材料摘要、展示方式、题目与标准答案、开始/结束时间、耗时、答案、遗漏和误判。标准答案由权威源及明确核验范围得到，不由待测 renderer 输出反推。参与者可判定材料不足，不强迫把缺证据题答成“无阻塞”。

通过条件：所有关键规则/例外/阻塞题无新遗漏或错误；整体正确率不低于旧材料；配对任务耗时中位数低于旧材料，逐题结果一并公开。只有一个参与者或少量任务时，结论仅适用于本试点；不外推通用效率提升比例。不通过则保留 manual/显式试用，修改材料或渲染后重测。

### Agent 与工具成本记录

同一机器、同一固定 fixture 集比较 cold 首次与重复读取，分别记录耗时、文件读取数、输出 UTF-8 字节数；有稳定 tokenizer 时才记录 token 数并写明版本。观察当前任务所需内容是否减少、未知/全局约束是否保留；不以 bytes 直接等同真实 Agent 成本。不运行付费 Agent 评估或引入模型摘要作为本方案交付前提。

P0 建立基线，P1/P2 记录变化。若增量读取实际上每次展开整个项目，或视图把无关恢复数据塞进 task，上报为优化未达目标并修正；不通过删关键内容满足预算。具体验收结论保留测量范围，不先承诺未经测量的百分比。

## 验证命令与分发路径

下列是实施时的执行清单，本轮未运行实现测试。新建测试文件会在 P0/P1 落地；标记“拟新增”的命令在此之前不可执行。

```sh
# 拟新增：完整性、确定性、更新/冲突、差异与兼容行为
node --test scripts/fixtures/reading-views/*.test.mjs

# 已有：受影响回归，在模板根执行
node --test scripts/fixtures/contract-efficiency/views.test.mjs scripts/fixtures/lifecycle-core/views.test.mjs tests/contract-review-preparation.test.mjs
node --test scripts/fixtures/stage-tracking/tracking.test.mjs

# 已有：Skill / 共享工具同步；先核对脏改范围，按影响选择 Profile
scripts/sync-skills
scripts/update-skill-lock
scripts/sync-profile-skills --dry-run
# 检查计划后仅应用本次受影响 Profile，不能顺带覆盖其他任务
scripts/sync-profile-skills --apply --profile <受影响ProfileID>
scripts/sync-strategic-handoff-tools

# 已有：分级核验
scripts/verify-template-fast
scripts/verify-template-candidate
scripts/verify-template
```

fast 用于实现内循环；未映射路径或核心验证变化可能按既有策略升级，不能为节省时间裁掉。PR 用 candidate；main 与发布前用完整 verify-template。更新测试调度的变更也要验证调度器选择正确、无漏跑。

四个 CLI 包已有 `sync-template` 和 `test:prepared` scripts：`submodules/create-yss-spec`、`submodules/create-yss-strategic-design`、`submodules/create-yss-harness-backend`、`submodules/create-yss-harness-frontend`。使用 pnpm 调用，先同步主模板和对应专职模板，再指定来源；不手改 content-addressed blobs。设计 CLI 包名为 `create-yss-harness-design`，目录名仍为 create-yss-strategic-design，不混写。

主 CLI 从本地路径、不加 require-committed 时读取工作树，只能作为内循环证据。固定来源必须同时指定环境变量及 require-committed；三个专职 CLI 则要求位置参数 source-repo、commit。各模板仓有各自的固定 SHA，不能把主模板 SHA 填给专职模板。以下占位符需替换为本次已授权固定的路径/提交，未有提交授权时不能为运行命令擅自提交。

```sh
# 已有：主 CLI 固定来源快照
YSS_SPEC_TEMPLATE_REPO='<主模板绝对路径>' YSS_SPEC_TEMPLATE_REF='<主模板40位SHA>' pnpm --dir submodules/create-yss-spec run sync-template --require-committed
pnpm --dir submodules/create-yss-spec run test:prepared

# 已有：三个专职 CLI 固定来源快照
pnpm --dir submodules/create-yss-strategic-design run sync-template '<设计模板仓绝对路径>' '<设计模板40位SHA>'
pnpm --dir submodules/create-yss-harness-backend run sync-template '<后端模板仓绝对路径>' '<后端模板40位SHA>'
pnpm --dir submodules/create-yss-harness-frontend run sync-template '<前端模板仓绝对路径>' '<前端模板40位SHA>'
pnpm --dir submodules/create-yss-strategic-design run test:prepared
pnpm --dir submodules/create-yss-harness-backend run test:prepared
pnpm --dir submodules/create-yss-harness-frontend run test:prepared

# 正式发布边界已有入口：必须先有已授权形成的固定提交，输出目录在仓库外
node .template-source/scripts/verify-template-release.mjs --commit <40位模板SHA> --output <仓库外绝对目录>
```

发布验收还要求外部生成器固定版本集成、打包、干净安装、真实入口初始化与幂等性。沿用现有发布工具的 npm pack/local tarball 格式验证例外；不将本地快照检查当作 npm 发布或 GitHub CI 已通过。主模板、三个专职模板与四生成器的引用关系按现有同步流程记录；任一外部集成未闭合时不称可发布。

## 回滚与未决风险

| 情况 | 回滚/处置 |
|---|---|
| 新阅读器错误 | 切回现有 view/原始文件入口；保留源与历史证据；修复后重建派生页 |
| 自动刷新故障 | 将相关实例策略显式退回 manual，保留原审阅门禁；不会自动清除阻塞或沿用批准 |
| 派生文件被人工修改 | 保留冲突；通过显式合并或恢复管理范围处理，不能强制覆盖 |
| 新 schema 候选未通过 | 停止新格式默认写入；保留已生成新版的读取能力；不把新批准套回旧版 |
| 新版资产已有实质修改 | 不做有损自动降级；使用显式逆迁移或原始字节回退并重验受影响来源和批准 |
| CLI/Profile 分发不完整 | 保持旧版本/显式试用，不先切换默认入口 |

已知限制与处理责任：

- 静态页无法自证实时有效：由来源绑定、check-views 与提交审阅入口解决；离线读者仍需理解生成快照语义。
- 真实阅读收益尚未测量：P4 由用户或指定使用者提供真实试验输入，实施者记录；不能填入模拟通过。
- P3 去重后的全部消费者影响尚待逐项建立：由实现者在版本迁移前完成读写者与闭包检查，出现新业务决定时再展示差异请求决定。
- 当前工作区包含其他任务改动：实施前重新核对基线并隔离写范围；本设计不授权接管这些改动。
- Markdown 链接和表格在不同阅读器可能不同：工程验收至少覆盖本地编辑器预览和目标 Git 平台的实际呈现；若后者不可访问，保留未核验状态，不宣称一致。

## 本轮交付与下一动作

本轮只新增本目录的方案、事实基线和核查结果。适用的产品 context_reconciliation 为 not-applicable：模板源仅设计通用机制，不改产品术语或工作单元；本轮使用根 CONTEXT.md 的现有合同术语。

文档核查见 [plan-check.json](plan-check.json)。本轮期间监测到既有 `.template-source/scripts/skills-agent-eval.py` 与 `.template-source/scripts/tests/test_skills_agent_eval.py` 字节变化；本轮未写这两个文件，不恢复或接管这些变化。它们不在本方案消费的 33 份源码/合同/命令事实源中。报告分别记录方案核查结果和外部工作区漂移，不声称整个工作区字节未变，也不将此文档核查当成实现测试。

下一实施动作已被具体化为 P0：固定脱敏反例、测试矩阵及来源覆盖基线。开始实现需要后续实施指令；一旦进入已授权批次，应完成相关代码、canonical Skill、投影、锁、分发和适用验证，不以首次编辑结束。用户已确认的八项决定不重复询问；只有新增业务决定、未知影响或既有授权边界变化时再澄清。
