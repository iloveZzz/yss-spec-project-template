# 低保真与高保真原型技能深度研究

## Research Scope

采用 `technical-evidence / evidence-audited`。本报告回答：热门开源设计技能里，哪些具体方法能补强 YSS，哪些已经具备，哪些与当前合同冲突。研究范围、排除标准与写边界见 [research-scope.md](research-scope.md)；证据与承重结论见 [台账](prototype-skills-evidence.yaml)。

读者：YSS 模板维护者。观察日期：2026-09-29。当前本地基于 `e1503a536b92b3e0a74182632f0690cc5601de62` 的工作树，仓库已有其他未提交工作；所读文件摘要见 [local-baseline.json](local-baseline.json)。本文只新增研究资产。

## Executive Read

**建议第一批参考 Owl 的低保真候选比较、Impeccable 的 Operate、Interface Design 的任务与视觉层级方法，再用 Emil 的原尺寸切换方式展示方案。** UI/UX Pro Max 适合作为后续按需知识检索的参考；Google Stitch 适合补强生成输入；taste-skill 不适合作为后台原型主技能。

当前主要机会是把已有规则变成容易执行的设计步骤、示例和可验证的产物。YSS 已经具备状态、离线包、用户确认、六轴 QA 和视觉基线；无需因外部技能热度再建同类流程。研究尚未证明任何方案提高了原型质量或节省了 Token。

## Findings

### 1. 热度与样本边界（claim-001）

下表 Stars 来自 GitHub REST，抓取于 **2026-09-29 22:42:27–33（北京时间）**。精确字段、完整 40 位 HEAD 与时间保存在 [repo-metrics.json](repo-metrics.json)。排序按关注量与用途组织，不是质量排名。

| 仓库 / 主要对象 | Stars | 许可证观察 | 对 YSS 的价值判断 |
|---|---:|---|---|
| [anthropics/skills](https://github.com/anthropics/skills) · `frontend-design` | 178,954 | frontend-design 文件 Apache-2.0 | 内容、方案草图与视觉取舍；择取方法 |
| [nextlevelbuilder/ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) · `设计知识检索` | 131,444 | MIT | 按任务检索与核验；先不整库接入 |
| [Leonxlnx/taste-skill](https://github.com/Leonxlnx/taste-skill) · `营销与展示视觉` | 91,133 | MIT | 明确排除后台核心表面；非主路线 |
| [pbakaus/impeccable](https://github.com/pbakaus/impeccable) · `Operate / shape / critique` | 72,398 | Apache-2.0 | 高保真方法优先参考 |
| [emilkowalski/skills](https://github.com/emilkowalski/skills) · `prototype / emil-design-eng` | 41,779 | MIT | 变体评审与动效细节 |
| [vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills) · `web-design-guidelines` | 31,708 | API 未识别，需核对 | QA 规则补充；整仓热度 |
| [google-labs-code/design.md](https://github.com/google-labs-code/design.md) · `设计规范格式，非原型 Skill` | 28,161 | Apache-2.0 | YSS 已采用，重复建设价值低 |
| [google-labs-code/stitch-skills](https://github.com/google-labs-code/stitch-skills) · `enhance-prompt / design-md` | 8,393 | Apache-2.0 | 提示输入和语义解释 |
| [Dammyjay93/interface-design](https://github.com/Dammyjay93/interface-design) · `产品界面设计` | 5,746 | MIT | 企业后台设计执行法 |
| [Owl-Listener/designer-skills](https://github.com/Owl-Listener/designer-skills) · `parallel-concepts / concept-selection` | 2,801 | MIT | 低保真探索优先参考 |
| [rjs/shaping-skills](https://github.com/rjs/shaping-skills) · `breadboarding` | 1,441 | API 未识别，需核对 | 已归档/过时；只参考方法 |

小众对照：[yhassy/wireframe-skill](https://github.com/yhassy/wireframe-skill) **15 Stars**、[JimmySadek/wireframe-doc](https://github.com/JimmySadek/wireframe-doc) **4 Stars**。它们因低保真方法匹配而纳入，不能称为高热度。Vercel 实际规则库 [web-interface-guidelines](https://github.com/vercel-labs/web-interface-guidelines) **911 Stars**；31,708 是整个 agent-skills 集合的数值。

这不是完整 GitHub 排名。没有历史 Star 序列，无法判断近期增长；没有安装量和统一效果实验。14 项包括 Skill 集合、独立技能和辅助规范，统计对象并不等价。

### 2. 现有 YSS：流程完整，重点补执行质量（claim-002）

| 能力 | 当前事实 | 本次判断 |
|---|---|---|
| 低保真 | 交互说明、页面地图、状态矩阵、独立 prototype-review | 已具备；补内容优先级、方案差异与比较标准 |
| 候选探索 | 新视觉方向或信息架构不确定时比较三个方案 | 已具备触发；补“怎样才算不同方案” |
| 高保真依据 | 根 DESIGN.md、Token、规范直出或视觉稿还原 | 已具备；补实际画面中的层级诊断与对照示例 |
| 后台风格 | 系统字体、32px 控件、语义色、主次操作、密度规则 | 已具备；不能导入外部字体/间距覆盖它 |
| QA/证据 | 六轴 QA、desktop/narrow、状态、截图语义、digest、离线复验 | 保留；增加建议应进入这套 QA |
| 原型到生产 | throwaway 原型与正式 Slice 实现分开 | 保留；外部“选中即写入生产”不采用 |

依据：[原型入口](../../../../.agents/skills/yss-prototype-stage/SKILL.md)、[设计执行清单](../../../../.agents/skills/yss-design-system/references/design-system.md)、[档位规则](../../../../.agents/skills/yss-prototype-stage/references/prototype-profile-routing.md)、[交互说明模板](../../../../.template-spec/design/templates/interaction-spec-template.md)。

本机另有 [通用 design](/Users/zhudaoming/.agents/skills/design/SKILL.md)（metadata 2.1.0），主要覆盖品牌、Logo、CIP、Banner、图标和社交素材，UI styling 路由到外部子技能；它不是 YSS 正式产品原型的合同所有者。本地 [Product Design ideate](../../../../.codex/skills/product-design/skills/ideate/SKILL.md)已要求信息层级、布局、交互模型等实质变化，也要求沿用现有设计上下文。因此不是本机完全缺少“不同方案”的指导：本次建议是在 YSS 默认规范直出/低保真路线里明确行为差异轴、同等保真与事前标准，让这套做法不依赖可选的图片工作流。

**H1 是 visual-review，H2 是 flow-review；两者都以低保真为前置，并非低保真/高保真两个名称。** “缺执行质量”是对本轮所读入口和模板的差距推断，不能推断本仓所有原型效果差。

### 3. 低保真首选：让方案在行为上不同（claim-003）

[Owl parallel-concepts](https://github.com/Owl-Listener/designer-skills/blob/9a6930cf84a822eb458624bd11c61aac5bbdf224/prototyping-testing/skills/parallel-concepts/SKILL.md) 与 [concept-selection](https://github.com/Owl-Listener/designer-skills/blob/9a6930cf84a822eb458624bd11c61aac5bbdf224/prototyping-testing/skills/concept-selection/SKILL.md)提供了最直接的补强：按用户步骤、批量粒度、人与系统分工、入口和承诺时点制造差异；保持相近保真度；比较前区分硬约束和可权衡项；记下入选代价及落选条件。

建议在既有“三候选”条件被触发时应用。例如审批工作台可比较“逐项处理”“批量勾选＋异常单独处理”“队列引导”；三张同布局不同颜色的图不算三个交互方案。这个例子是研究建议，不是新增业务需求。比较标准引用现有 Spec，不能临时编造步骤上限。

YSS 已融合 Owl 的 prototype-strategy/state-machine/QA/handoff，增量应放在既有 `条件 ideation` 和交互说明中。未完成新旧上游全量 diff，不宣称本轮方法是 Owl 最近新增。Owl 自带用户测试经验阈值未继续溯源，不采用为本仓门禁。

### 4. 低保真制作：先内容，再区域与连接（claim-004、claim-012、claim-013）

[yhassy 内容清单](https://github.com/yhassy/wireframe-skill/blob/948d4331343b18d913d5bc502da72ed0c5f19101/wireframe-designer.md)先列出内容类别、重要性和长度变化，再布局，最后核对覆盖。建议补充到现有页面细节：哪些数据必须首屏可见，哪些属于辅助信息，哪些文案会变长；灰度下也应能辨认主任务。不照搬它的固定网格和字号。

[rjs breadboarding](https://github.com/rjs/shaping-skills/blob/23e32c1ee2293595906d0d55f44424427afa7bac/breadboarding/skill.md)区分页面导航与数据来源，可用于发现有按钮无结果、有数值无来源的断点。YSS 已有 actionKey/状态/API 映射，应从已有资产派生视图。其 [README](https://github.com/rjs/shaping-skills/blob/23e32c1ee2293595906d0d55f44424427afa7bac/README.md)明确标为过时，仓库已归档且许可证未识别；只作方法参考，不整包采纳，也不引入上游切片数量限制。

[wireframe-doc](https://github.com/JimmySadek/wireframe-doc/blob/8364b2442f937fdeaa779ed6b7ad58c0aa51f203/SKILL.md)的可定位页面备注有利于异步反馈。但 [HTML 模板](https://github.com/JimmySadek/wireframe-doc/blob/8364b2442f937fdeaa779ed6b7ad58c0aa51f203/assets/render-template.html)使用 CDN，且技能明确不支持可操作状态流。可以借鉴 case/page 深链接表达，不能把它的单文件直接认作符合 YSS 的离线 H2 包。

### 5. 高保真优先：Impeccable 的 Operate（claim-005）

[Operate](https://github.com/pbakaus/impeccable/blob/114ea1d3838fca73b253af45f873b9c4f5f213c8/.github/skills/impeccable/reference/operate.md)对后台操作界面允许系统字体、熟悉导航和高数据密度，强调一致控件、状态反馈及克制动效。这比笼统的“更独特、更大胆”更符合 YSS。[入口](https://github.com/pbakaus/impeccable/blob/114ea1d3838fca73b253af45f873b9c4f5f213c8/.github/skills/impeccable/SKILL.md)还把不同表面分型，并要求有界的视觉检查。

建议把后台审美检查变成三个可回答的问题：主任务是否一眼可定位；数据、动作与辅助信息的视觉权重是否合适；装饰或动画是否妨碍高频操作。YSS 已有数值 Token，这里只补判断方法与正反例。

可尝试“完整产出→同批查看桌面/窄屏→集中修整→确认”的节奏，减少逐像素自我循环。**轮次数只用于预算控制；关键缺陷仍未解决时必须保留阻塞，不能借有界检查宣布通过。** 上游具体字号、动效毫秒值和模态偏好不自动成为 YSS 规则。

### 6. Interface Design：把规范落成可见样例（claim-006）

[固定技能](https://github.com/Dammyjay93/interface-design/blob/2f9be3206855bcb2d1d0af262c8bae25cba6658d/.claude/skills/interface-design/SKILL.md)从人、任务和使用场景出发，用焦点、字重、间距和密度组织画面，并倡导展示可见的设计样例。适合补一个企业后台页面的局部前后对照，例如筛选区、工具栏、表格、详情抽屉如何保持主次。

不引入其 `.interface-design/system.md`，也不强制每个页面“独一无二”、改系统字体或另起 Token 名称。设计结论引用现有 `DESIGN.md`；必要的组件变体仍由 `yss-design-system` 维护。收益目前是可检验假设。

### 7. UI/UX Pro Max：借检索协议，暂不搬整库（claim-007）

[Query Contract](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill/blob/09170eec67eefd46a7ae85de61b40c194020f997/src/ui-ux-pro-max/templates/base/skill-content.md)按问题选择设计系统、领域或技术栈查询，核验返回领域与内容，仅重试一次，拒绝持久化失配结果。值得借鉴的是按需获取相关规则，而不是让 Agent 预读全部知识。

不采用 `MASTER.md + pages override` 并行权威。未来如接知识检索，应把结果标为建议，映射到 YSS 当前 Token、状态和 QA，再由所属 Skill 消费。

历史 [issue #484](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill/issues/484)现已关闭；报告使用旧 SHA 和特定模型，且 shell 受权限限制，不能把其中 82% 当成本轮实际加载统计。主控已读 [当前 search.py](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill/blob/09170eec67eefd46a7ae85de61b40c194020f997/src/ui-ux-pro-max/scripts/search.py)，`--design-system + --stack` 已明确输出忽略警告。这里只确认源码行为，未执行测试。

### 8. Taste：热度高，但范围不匹配（claim-008）

[当前 SKILL](https://github.com/Leonxlnx/taste-skill/blob/ce26fc25c0e5e8cab638f883de62d9a86ee5e45b/skills/taste-skill/SKILL.md)开头明确排除 dashboard、data table 和 multi-step UI；[CHANGELOG](https://github.com/Leonxlnx/taste-skill/blob/ce26fc25c0e5e8cab638f883de62d9a86ee5e45b/CHANGELOG.md)将当前默认 v2 标为 experimental。因此不把它设为企业后台原型的上位技能。

可参考简短设计意图说明和改版前区分保留/重做；不沿用其 8/6/4 风格、动效、密度默认值，也不把“反 AI 风格”规则凌驾于已经批准的 YSS 规范。

### 9. Google：增强输入，不另造设计事实源（claim-009）

[enhance-prompt](https://github.com/google-labs-code/stitch-skills/blob/0337446dadde6f8c94210444e2aa9d546126480f/plugins/stitch-utilities/skills/enhance-prompt/SKILL.md)能把模糊输入细化为页面类型、结构、平台和必需设计上下文；[design-md](https://github.com/google-labs-code/stitch-skills/blob/0337446dadde6f8c94210444e2aa9d546126480f/plugins/stitch-utilities/skills/design-md/SKILL.md)强调色彩角色、形状和层次的语义解释。可将其方法改成按当前页面组装的短设计输入块：用户任务、页面结构、状态引用、适用 Token、保持项、可调整项。

Google `design.md` 规范与 Stitch 同名生成 Skill 是两个不同对象。YSS 已采用前者；后者的五节自然语言模板不能直接覆盖本仓 canonical 格式。[stitch-loop](https://github.com/google-labs-code/stitch-skills/blob/0337446dadde6f8c94210444e2aa9d546126480f/plugins/stitch-utilities/skills/stitch-loop/SKILL.md)还允许可选视觉验证和自行扩展下一页，不符合当前强制证据和范围边界。两者只取输入表达方法，不新增 `.stitch/DESIGN.md`。

### 10. Emil、Vercel 与 Anthropic 的补充（claim-010、claim-011、claim-014）

[Emil prototype](https://github.com/emilkowalski/skills/blob/d16ebe60d09a5ba2afcb7054ede9d0a10c9f6128/skills/prototype/SKILL.md)让方案在真实上下文中原尺寸切换，名称说明差异轴，比较适用情况和代价。适合做现有三方案的轻量评审壳；不用缩小缩略图评判密度。[动效指引](https://github.com/emilkowalski/skills/blob/d16ebe60d09a5ba2afcb7054ede9d0a10c9f6128/skills/emil-design-eng/SKILL.md)可补高频操作的克制动效。选中后自动转生产、删除原型的步骤不采用。

[Vercel 规则](https://github.com/vercel-labs/web-interface-guidelines/blob/e3d624baaf29dc1fc645aff3e38f03e564d2d6b1/command.md)可补 QA 的代码定位项，例如焦点遮挡、标签、错误定位、数字列和长文本；[技能入口](https://github.com/vercel-labs/agent-skills/blob/063bee94c3f4df8453406c830b0a7df0f2860278/skills/web-design-guidelines/SKILL.md)每次拉最新 main 的做法不适合可复现证据，应固定 revision。英文 Title Case、默认提交按钮策略、列表数量经验阈值须按实际合同取舍，不整体升级成门禁。

[Anthropic frontend-design](https://github.com/anthropics/skills/blob/8a1541c4a3ffa5a20a5a91de0dcf3f0bab1d1ef4/skills/frontend-design/SKILL.md)当前强调真实任务内容、先计划和 ASCII 草图比较、构建后克制修整。YSS 已有旧引用，可人工审阅当前 revision 的方法差异；不能照搬其拟写业务内容、重定字体与调色的自由度。

### 11. 建议的最小优化清单（建议，尚未实施）

| 优先级 | 具体改动 | 进入现有位置 | 如何判断有增量 |
|---|---|---|---|
| P0 | 三方案必须标出行为差异轴、相同输入与保真、事前标准、落选理由 | prototype-profile-routing + interaction-spec 模板 | 审查者能说清每个方案测试了什么；不以换色凑数 |
| P0 | 低保真内容清单：任务、优先级、长度变化、区域、动作结果 | interaction-spec + prototype-review | 必需字段和动作有对应区域，显示内容有来源 |
| P0 | 后台高保真 craft 示例：同 Token 下的层级、密度、状态和收敛 | yss-design-system references + HTML practices | 盲评能指出主任务与真实缺陷；无 Token 越界 |
| P1 | 三方案原尺寸切换、同场景重置、稳定 case/page 链接 | 现有 HTML adapter 的评审区域 | 切换不改变数据，截图能定位方案和状态 |
| P1 | 小改动引用所需规则；核心条件明确触发必要 reference | 所属 SKILL 的按需读取段 | trace 证明该读的被读到，少读不是漏掉要求 |
| P1 | 集中检查与修整；区分代码规则、画面观察和用户证据 | 同一六轴 QA | 减少重复往返，关键 finding 仍需全部关闭 |
| P2 | 从已有 actionKey/state/data 引用派生跨页连接检查 | prototype-review，可选派生图 | 找出断开动作和无来源显示，不另建 SSOT |
| P2 | 需要时接入查询型知识；输出先做范围与来源核验 | 可选 reference/helper | 当前规则冲突为零，失败有明确降级，不默认联网 |

先做 P0 的方法与示例，再评估是否值得建设 P1/P2 工具。不要先拆出大量新 Skill。低保真、高保真能力继续由 `yss-prototype-stage` 持有总合同，按需加载参考；独立 Reviewer 的职责不变。

### 12. 如何证明优化有效（试验设计，未执行）

建议首轮使用 6 个固定 fixture：查询列表＋详情；多步骤表单；审批与权限；并发冲突＋恢复；高密度分析台；沿用既有页面的局部修整。至少有一个完全不需要重新 ideation 的任务，防止增强后过度探索。

以现有技能为基线、候选增强技能为实验组。每题每组 3 次，共 **36 次 Agent 会话**，这是建议样本量而非统计保证；执行前确认实际预算。固定模型/版本、初始上下文、工具、Token 预算、任务输入、网络资源和测试视口；记录首次与缓存命中运行，失败不能从统计中删除。

| 维度 | 记录什么 | 防止什么误判 |
|---|---|---|
| 行为正确性 | Spec 场景覆盖、恢复路径、权限/冲突误导、关键 blocker | 只看截图美观 |
| 方案有效性 | 行为差异、同保真、标准可失败、是否无必要探索 | 候选数量冒充质量 |
| 视觉质量 | 隐去组别的两名审查者看同视口同数据产物；记录分歧 | Agent 自评、品牌偏好冒充结论 |
| 规范符合 | Token/字体/密度越界、是否另建 SSOT、证据绑定 | 把外部风格覆盖当优化 |
| 实际成本 | 总 Token、耗时、工具调用、图片生成、失败重试 | 文档短即等于运行省 |
| 接收体验 | 离线打开、状态复现、重置、实际键盘/焦点 | 静态校验冒充可操作 |
| 可用性 | 条件允许时让目标用户执行不泄漏点击路径的任务 | 已知脚本的 Agent 冒充用户研究 |

报告中分开给中位数、离散情况、失败案例和审查分歧；不在小样本上宣称普适收益。现有硬门禁继续执行；视觉偏好改善不能抵消新增关键失败。若成本增加而缺陷未减少，撤回对应增强点，并保留哪个任务不适用。

## Counter-Signals

1. 热门仓库范围可能不匹配：taste 明确排除后台；rjs 已过时；集合 Stars 不属于单个 Skill。
2. 方法可能与现行合同冲突：多个上游另建设计文件、自动转生产或删原型；Stitch 验证可选；wireframe-doc CDN 依赖。
3. 规则存在不代表 Agent 读取或正确运用：Pro Max 历史 issue 提供了一次受限运行记录，当前已部分修复，仍需本仓实测加载和结果。
4. YSS 已有大量对应规则。新参考只有在提高可执行性或补足特定缺口时才有价值；更多规则可能增加上下文成本和相互冲突。
5. “不同”不是本仓唯一目标。后台标准模式和跨页一致性有明确价值；不接受为独特而重做所有页面。

## Source Map

14 个 GitHub 对象取得元数据和固定 HEAD；主要源码由主控通过固定 SHA raw 重读。完整 URL、字节长度和 SHA-256 见 [source-fingerprints.json](source-fingerprints.json)。没有把第三方整包复制进本仓。网页搜索用于发现，关键结论均追到原始 Skill/代码；镜像、聚合站和模型摘要不作承重证据。

CodeGraph 首次检索返回无关 llm-wiki 符号，随后使用精确路径与 rg 定位，没有刷新索引。匿名 tree API 的 403 和猜测路径的 404 已登记；大小写错误的 rjs 路径随后改为 `breadboarding/skill.md` 并成功读取。两个后台 Explorer 只回传结论，主控负责采用结论和研究包。

## Decision Handoff

接收者为 `maintaining-skills` 与 `yss-prototype-stage / yss-design-system / prototype-review` 的模板维护负责人。下一轮建议先评审 P0 的具体编辑方案，再执行 canonical 修改、适用测试、投影/锁/分发同步和真实 Agent 实验。若改脚本行为或证据合同，按实际影响重新判定 L2/L3，不沿用本研究的 L1。

本包可独立结束 `work-unit.maintenance-research`，`next_route: null`。研究完成不授予维护实现、产品设计、Slice 或发布批准；未修改任何现有技能、锁、投影及产品状态，未提交或推送。

## Evidence Limitations

本轮是固定源码与元数据审查，没有运行外部技能、制作实际 UI、执行浏览器/无障碍测试、真实用户可用性研究或付费 Agent A/B。上述优化收益仍需验证。结构校验通过只证明包结构、来源引用与审计状态一致。当前源文件字节以 local-baseline.json 为准，后续维护前应再次检查漂移。
