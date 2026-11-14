# Spec 技能定向优化设计

日期：2026-11-13。状态：设计与实施计划已起草，尚未实施。用户请求是在本轮研究基础上构建优化方案与计划；本文件中的具体改法是方案建议，不表示已验证收益或已获提交、发行授权。

## 1. 目标与依据

保留现有规范驱动设计闭环，修正两处模板问题，增强跨规则判断与业务效果表达，再用有限的实际任务观察确认方法能否被正确使用。完整 Spec 仍由业务规格、高保真交互原型和交互说明组成；本次不增加交付类别。

本地研究基于 `9f7d9d56` 上的工作树。已有 28 个未提交文件涉及设计主题、Token 和对应副本，本次规划不消费或改写其视觉决定。实施前以实际工作树复读受影响文件，不以该提交号覆盖后续修改。

上游固定依据：

- Matt 最新正式发布为 [v1.3.2](https://github.com/mattpocock/skills/releases/tag/v1.3.2)，发布于 2026-10-29；本次查询 main 为 `5863806dd4e15c63174bee4e7515a4256792ecfa`。
- 本仓已比较 `4ae2317ddb22b046e26455e4f9c9b3aaaf62212d`。两者[差异](https://github.com/mattpocock/skills/compare/4ae2317ddb22b046e26455e4f9c9b3aaaf62212d...5863806dd4e15c63174bee4e7515a4256792ecfa)只有实验性 software-factory 的两处文字修订，Spec 核心无新增变化。
- 上游 [to-spec](https://github.com/mattpocock/skills/blob/5863806dd4e15c63174bee4e7515a4256792ecfa/skills/engineering/to-spec/SKILL.md) 服务工程实施，包含模块、接口、schema 和测试决定；不将这些内容引入 YSS Spec 默认职责。
- 上游 [code-review](https://github.com/mattpocock/skills/blob/5863806dd4e15c63174bee4e7515a4256792ecfa/skills/engineering/code-review/SKILL.md) 对照规格识别遗漏、额外行为和错误实现；[SCOPE.md](https://github.com/mattpocock/skills/blob/5863806dd4e15c63174bee4e7515a4256792ecfa/SCOPE.md) 强调真实失败证据。本轮吸收检查角度，不复制其执行流程。

现有业务分析已覆盖反例、权限变化和重复动作；Spec 模板已有规则—AC—原型对应；共享规格方法已有来源复读和研发反馈回写。本次不将这些已有能力重新称为缺口。

## 2. 方案取舍

| 方案 | 收益与代价 | 本次选择 |
|---|---|---|
| 仅清理两处模板 | 范围最小，但未覆盖研究提出的方法增强与执行观察 | 可单独交付前两项任务，不作为整轮方案终点 |
| 定向校准现有方法 | 修改少量叶子参考和模板，保持技能入口与分发接口；需验证方法增强是否有效 | 本方案建议采用 |
| 整包引入 Matt 或新增 Spec 总控技能 | 当前没有 Spec 上游增量依据，且会引入重复职责、技术设计或流程负担 | 不采用 |

“定向校准”由本方案提出，未将其表述为用户已逐项批准的设计。

## 3. 全局约束

- 仅修改本仓模板、技能源、实际副本、必要的既有哈希与来源记录；不修改 CLI 源码或用户业务项目。
- 保留业务规格、高保真交互原型、交互说明三类交付；业务票仅按明确拆票请求组织，技术设计与实现切片由研发承担。
- 保持技能名称、发现描述、调用政策、默认集合和分发路径；Spec 16、Backend 41、Frontend 13 项默认集合不变。
- 不新增技能、依赖、脚本、测试套件、强制 Gherkin/TDD、阶段审批、固定报告或产品成果。
- 普通查询仅回答问题，局部修订只处理受影响范围；未知不等于不适用，模拟和历史检查不证明本次实际效果。
- 保留并行主题改动、Backend 专有覆盖、许可证及原始来源字段；同步仅限本次实际改变的文件。
- 本次方案与实施范围均不自动包含提交、推送、远程写入、用户实例同步或发行。

## 4. 具体设计

### D1：区分业务状态与界面状态

拥有文件为 `.template-spec/design/templates/state-matrix-template.md`。现有“状态矩阵同时承担轻量状态机合同”与 loading/error 等列举混在一起，可能使界面失败被写成业务状态转换。

修改方式：

- 开头说明业务状态描述业务对象的生命周期；界面状态描述展示、请求及交互反馈，两者按规则关联。只覆盖当前任务相关状态，不为未命中枚举逐项填表。
- 将“页面状态”标题明确为“页面展示与请求状态”，保留现有页面、触发、反馈、数据来源、规则与场景列。
- 转换表增加“状态类别”和“规则 / AC”两列；“状态类别”填写“业务”或“界面”，一行只表达一类转换。沿用当前状态、事件、Guard、下一状态、进入/退出动作、恢复或退出路径；Guard 说明可包含角色与业务前提。
- 页面状态表、转换表可按需选用；有现成权威状态规则时引用，不另建第二份状态机。关键条件未知仍进入待确认项。

验收例：提交请求失败时，业务对象仍为“草稿”，界面为“提交失败”；重试前后输入与正式数据按已知规则说明。不能写成“草稿→error→草稿”的业务生命周期，也不能从示例推断生产事务实现。

### D2：收敛历史 Delta 模板

拥有文件为 `.template-spec/templates/spec-delta-template.md`。保留文件路径，改为可选的既有行为差异表达，允许内容直接并入原 Spec。

保留的结构：采用材料与旧新来源、ADDED/MODIFIED/REMOVED 行为差异、受影响规则/AC/页面、需要复查的场景及实际结果、未决影响。删除项保留可追溯的旧引用；无稳定 ID 时使用章节，缺旧基线时明确无法还原旧行为。

去除：必须冻结的前提、OpenAPI Freeze/Design Review/技术切片资格、`inspect-plan-spec diff` 命令引用、按测试层级填充的强制表格。已有 API 等技术约束可作为来源记录其业务影响，不设计新的契约或数据库。

增量示例只要求更新受影响的规则、AC、页面与说明；旧版本“检查通过”不能直接用于变化后的行为。未执行的复查标未验证，独立工作可继续。

该文件当前没有核心技能引用，也未列入六种安装组合的 files/skillReferences。本次只清理残留，不增加调用入口或分发项，不宣称默认安装会开始使用它。现行增量工作继续由共享规格方法和 Spec 模板承接。

### D3：增强跨规则检查与业务效果表达

在 `.agents/skills/yss-stage-decision/references/business-analysis.md` 的现有反例方法旁补充：只对当前相关的规则组合，检查条件重叠、未覆盖结果、动作顺序和优先关系；可以从已确认规则推导的结果直接解释，存在真正冲突或缺失决定时定位涉及的规则，不自行选择优先级。无需枚举笛卡尔积。

教学例用于说明：R1“仅当前负责人能撤回待处理事项”；R2“转交只改变负责人”；R3“已撤回事项不能转交”。转交 A→B 后，A 不再满足 R1，B 在其他前提成立时可以撤回。若材料另称“原负责人仍可撤回”，应指出与 R1 的冲突并询问该取舍，不能暗定例外。

在同一业务分析方法的问题/方案部分补充：存在真实方案取舍时，区分“功能按约定工作”与“业务问题得到改善”，说明预期改善、支持证据及何种观察会促使重新考虑。未知基线、指标、负责人保持未知，收益不得由功能验收通过推出。

在 `.template-spec/templates/spec-template.md` 的“问题与目标”增加上述区分的短提示，复用现有章节，不添加强制 KPI 表或新产物。

在 `.agents/skills/prototype-review/references/review-method.md` 增加与复核职责对应的检查：对相关组合核对承诺行为的遗漏、额外行为和错误结果；来源内部冲突与产物偏差分别报告。已有 Spec/原型/说明回流和实际操作要求继续适用，不再复制一套业务分析正文。

这些属于方法增强假设。本轮只能通过下面的观察证明具体样本表现，不能承诺准确率或效率提升。

### D4：以有限观察记录实际结果

在临时目录使用明确标为教学的资料和既有方法，观察五类输入：状态混淆、局部变更与缺旧来源、规则组合及冲突、业务效果资料不足、纯研究/局部文案的范围边界。源文档案例通过不等于 Agent 运行通过。

执行时优先复用支持临时项目上下文的现有宿主。在原文和新文的对照中使用相同请求、相同输入和可取得的运行配置，子会话独立；不在请求里点名应调用的技能或粘贴正文。记录可见读取路径、实际输出/差异、纠正及限制。若只能显式提供方法，结果标为方法演练，不称自动发现验证；没有旧版输出则不宣称前后改善。

不改全局配置，不新建用户可见聊天，不把教学输入或检查脚本加入分发。工具缺失时报告不能验证的那一层，仍完成独立的模板修改与文本核对。结果复用 `.template-spec/agents/matt-skills-adaptation.md` 的本轮记录，不另设测试报告。

## 5. 文件与分发边界

| 权威源 | 需同步的现存普通文件副本 |
|---|---|
| `.template-spec/design/templates/state-matrix-template.md` | `profiles/backend/.template-spec/design/templates/state-matrix-template.md` |
| `.template-spec/templates/spec-delta-template.md` | 无 |
| `.agents/skills/yss-stage-decision/references/business-analysis.md` | `.workbuddy/skills/yss-stage-decision/references/business-analysis.md`；`profiles/backend/.workbuddy/skills/yss-stage-decision/references/business-analysis.md` |
| `.agents/skills/prototype-review/references/review-method.md` | `.workbuddy/skills/prototype-review/references/review-method.md`；`profiles/frontend/.workbuddy/skills/prototype-review/references/review-method.md` |
| `.template-spec/templates/spec-template.md` | 无 |
| `.template-spec/agents/matt-skills-adaptation.md` | `profiles/backend/.template-spec/agents/matt-skills-adaptation.md`；`profiles/frontend/.template-spec/agents/matt-skills-adaptation.md` |

共 13 份内容文件；另只更新 `profiles/backend/skills-lock.json` 的 `skills.shared.yss-stage-decision.effectiveHash`。有效树算法见 `../agents/skills-maintenance.md`。根与 Frontend 锁无对应 effectiveHash 时不新增；模板和来源记录不在技能树内，不据其变化重算其他技能哈希。

两项技能的根 `.claude/skills/` 是共享源软链接，只核对。Frontend 状态矩阵从白名单选取共享源，不新增实体副本；Backend 的矩阵实体存在，但当前两模式不选择它，同步不扩大安装范围。Backend 不分发 prototype-review，Frontend 不分发 yss-stage-decision，均不补入口。

三份 bundle-profile.json、技能注册表、公开清单、profile-skills 地图只核对，不计划改动。来源记录区分原始引入 `0ab1b63…`、本次比较 `5863806d…`、本地方法调整及实际观察；保持锁中的 sourceRevision/upstreamHash/sources revision 不变。

## 6. 完成判断与风险

本轮实施完成应能指出 D1—D3 的实际差异、适用副本和哈希结果，并如实给出 D4 的已观察与未验证范围。不得把方法文字完成标为安装、自动调用或业务收益已经验证。

主要风险是误将所有状态组合变成强制表格、在冲突时补造决定、将旧验证沿用到新规则，以及同步时覆盖主题/专有内容。计划中的针对性案例与逐文件同步处理这些风险。设计和计划本身不自动启动实施或对外动作。

实施任务见 [实施计划](2026-11-13-spec-skills-optimization-plan.md)。
