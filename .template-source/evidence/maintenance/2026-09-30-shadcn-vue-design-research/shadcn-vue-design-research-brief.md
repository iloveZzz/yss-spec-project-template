# shadcn-vue 组件研究与 YSS 高保真设计资产审计

## Research Scope

- Profile / Mode：`technical-evidence / evidence-audited`。
- 决策问题：哪些组件和组合方法值得增强现有高保真 Skills；两个 design 目录哪些资产需要修订；是否需要更换原型框架。
- 读者：当前用户与 `yss-prototype-stage`、`yss-design-system`、`prototype-review` 维护者。
- 研究日期：2026-09-30。官方源码固定到 `unovue/shadcn-vue@67c9a3926dc0a854507b325c6337ff2210d16379`，提交日期 2026-09-22；这是 dev 分支观测快照，不是推荐安装版本。
- 本地输入：当前脏工作树中的根 DESIGN.md、两个 design 目录、现行 React 作者工具与主题、profile 同步配置。40 个输入摘要见 [source-baseline.json](source-baseline.json)。分析当前字节，不把 HEAD 当成当前实现。
- 纳入官方组件目录、组件/Skill 文档、固定源码、W3C 说明、当前仓库与浏览器诊断；不采用聚合转载、未核验社区 registry 或单凭 Star 的质量判断。范围及写入边界见 [scope.md](scope.md)。
- 部分组件页面的网页提取失败，已记录访问失败并改读同一官方仓库固定源码。未安装 shadcn-vue，未运行其完整组件集，未进行新的真实 Agent A/B。

## Executive Read

**建议增强高保真 Skills，也需要调整 design；优先修复规范、预览与分发的一致性，再扩展页面组件。当前证据不要求把原版 shadcn/ui + React 原型切换为 Vue。**

本轮最明确的三个问题是：根规范仍要求 HTML 原型默认 32px，而作者工具已默认 compact；旧预览加载不到 Token；design/frontend 两个 profile 缺少预览 JS。它们会分别造成 Agent 选择冲突、页面失真和演示交互失效。问题已定位，浏览器实测了主仓旧预览，但本研究未修改现行 Skills、DESIGN.md、投影或历史资产。

shadcn-vue 最值得借鉴的是“任务 → 页面组合 → 组件结构 → 状态与键盘验收”的组织方式。补齐 Field、反馈组件、详情侧栏、列表工具栏和页面导航，比一次性收录全部组件更契合现有五类业务模式。组件数量、紧凑程度、Star 数都不能单独证明设计质量改善。

## Findings

### 1. shadcn-vue 是可定制的源码分发体系，适合作为方法来源

**事实（claim-001）：** 官方介绍把组件源码和组合能力交给项目；当前 Vue 组件主要消费 Reka UI，官网已将 Tailwind v3 放到 legacy 文档。当前本地构建器只支持现有 React/JS 作者入口，不具备 `.vue` SFC 编译适配。Vue 源码不能直接放入现在的作者目录就宣称可运行。

来源：[官方介绍](https://shadcn-vue.com/docs/introduction)、[legacy 边界](https://shadcn-vue.com/docs/legacy)、[固定源码](https://github.com/unovue/shadcn-vue/tree/67c9a3926dc0a854507b325c6337ff2210d16379)、[本地接入约定](../../../../.agents/skills/yss-prototype-stage/references/shadcn-integration.md)。GitHub API 此次观测为 10,647 Stars，仅作来源背景，不用于证明可靠性或收益。

**建议：** 保持用户已选择的 React 原型和 Vue/YSS 生产边界。先吸收框架无关的组合方法；若后续确需 Vue 作者路线，应另做 SFC 编译、固定依赖、IIFE/离线资源、场景初始化、许可来源和浏览器回归适配，而不是把生产组件替换成 shadcn-vue。

### 2. 应从页面任务补能力，而不是按组件目录逐个安装

**事实与建议（claim-002）：** 官方 Field、Sheet、Empty、Data Table 文档提供了字段、侧栏、反馈与列表组合方式；这些能为现有任务模式补充可复用结构。以下优先级是针对本仓缺口的推断，尚未验证其视觉收益。

| 页面任务 | 可借鉴组件 / 组合 | YSS 增强位置与验收重点 |
|---|---|---|
| 查询与详情 | Breadcrumb、筛选工具栏、Table + Pagination、DropdownMenu、Sheet | 保留同一筛选/排序/分页/选择语义；详情关闭后回到原行或合理替代入口；主要动作保持可发现 |
| 表单与分步任务 | Field/FieldGroup/FieldSet、InputGroup、现有 Tabs/表单控件；步骤语义 | label、说明与错误关联；第一处错误可定位；返回保留输入；不能只增加步骤条外观 |
| 审批与异常 | Alert、Empty、Skeleton、Spinner、现有 AlertDialog | 区分无数据、无匹配、加载、无权限与失败；部分失败后剩余项可处理；阻断原因不能只放 toast |
| 工作台壳 | Sidebar、Breadcrumb、Separator，按需使用 Card | 页面上下文、主任务与导航层级；窄屏导航可开关；避免每个区块都套 Card |
| 高密度分析 | 指标区、Tabs、表格、按需 Chart | 指标口径、单位、筛选联动、明细定位、空/异常数据；图表保留文本或表格替代 |
| 390px 关键流程 | Item 类摘要列表、单列表单、Sheet/合适的浮层 | 身份/名称/状态/动作可见；次要字段在详情；不能把桌面整页等比缩小 |

来源：[Field 固定文档](https://github.com/unovue/shadcn-vue/blob/67c9a3926dc0a854507b325c6337ff2210d16379/apps/v4/content/docs/components/field.md)、[Sheet](https://github.com/unovue/shadcn-vue/blob/67c9a3926dc0a854507b325c6337ff2210d16379/apps/v4/content/docs/components/sheet.md)、[Empty](https://github.com/unovue/shadcn-vue/blob/67c9a3926dc0a854507b325c6337ff2210d16379/apps/v4/content/docs/components/empty.md)、[Item](https://github.com/unovue/shadcn-vue/blob/67c9a3926dc0a854507b325c6337ff2210d16379/apps/v4/content/docs/components/item.md)。更完整的接入顺序和反例见 [component-adoption-matrix.md](component-adoption-matrix.md)。

### 3. Data Table、日期与图表不能按同名组件推断兼容

**事实（claim-003）：** Data Table 页面是 Table 与 TanStack Table 的组合指南，当前固定文档使用 v9；它不是一个自动拥有全部业务语义的通用组件。日期示例组合 Popover/Calendar，并涉及 `@internationalized/date`；Vue Chart 使用 Unovis。当前 React revision 的 Chart 使用 Recharts、Calendar 使用 react-day-picker。不能把 Vue API 或日期类型原样搬到 React。

来源：[Data Table](https://shadcn-vue.com/docs/components/data-table)、[Date Picker 固定文档](https://github.com/unovue/shadcn-vue/blob/67c9a3926dc0a854507b325c6337ff2210d16379/apps/v4/content/docs/components/date-picker.md)、[Chart 固定文档](https://github.com/unovue/shadcn-vue/blob/67c9a3926dc0a854507b325c6337ff2210d16379/apps/v4/content/docs/components/chart.md)、[React 固定 Chart 源码](https://github.com/shadcn-ui/ui/blob/db2db460a26fa84fb65c8d903b213925fbdee9ed/apps/v4/registry/new-york-v4/ui/chart.tsx)。

**建议：** 每种组合记录“提供什么 / 不提供什么”。排序、筛选、分页、跨页选择、批量处理、日期范围、时区与错误恢复继续由交互说明和状态矩阵定义；教学 fixture 必须固定数据、日期基准与格式环境。没有任务需要时不默认引入表格引擎、日历或图表依赖。

### 4. 现有 React 路线能扩展，但新增组件仍有实际接入成本

**事实（claim-004）：** 本地只登记了 11 个组件。相同 React 上游 revision 中已有 Field、InputGroup、Empty、Sheet、Pagination 等候选；源码存在不等于本地已支持。特别是 Combobox 引用 `@base-ui/react`，Sidebar 引用额外 hook，Command 引用 cmdk，Sonner 引用 next-themes 与 sonner，均超出现有固定依赖或导入边界。

来源：[当前组件清单](../../../../.agents/skills/yss-prototype-stage/assets/shadcn-authoring/registry-manifest.json)、[React Combobox](https://github.com/shadcn-ui/ui/blob/db2db460a26fa84fb65c8d903b213925fbdee9ed/apps/v4/registry/new-york-v4/ui/combobox.tsx)、[React Sidebar](https://github.com/shadcn-ui/ui/blob/db2db460a26fa84fb65c8d903b213925fbdee9ed/apps/v4/registry/new-york-v4/ui/sidebar.tsx)、[React Sonner](https://github.com/shadcn-ui/ui/blob/db2db460a26fa84fb65c8d903b213925fbdee9ed/apps/v4/registry/new-york-v4/ui/sonner.tsx)。

**建议：** 首批优先低依赖组件；搜索选择可以先评估 Popover + Command 组合。直接接入 Base UI 会扩大现有组件原语范围，应单独评估，不能作为“同是 shadcn”而自动通过。新增本地适配必须保留上游原始来源，并另记差异；不把修改后文件称为未改动上游源码。

### 5. 上游 Skill 可借鉴选择与结构规则，但不能整包照搬

**事实与建议（claim-005）：** 官方 Skill 提供按任务选择组件、语义颜色、组合结构、字段错误和浮层标题等规则，适合转成 YSS 的按需参考与正反例。它同时要求频繁使用 `@latest` CLI、探测/安装 registry 和应用 preset；这与当前固定 revision、独立作者目录、项目 Token 权威及离线交付边界不同。

来源：[官方 Skill 固定版本](https://github.com/unovue/shadcn-vue/blob/67c9a3926dc0a854507b325c6337ff2210d16379/skills/shadcn-vue/SKILL.md)、[表单规则](https://github.com/unovue/shadcn-vue/blob/67c9a3926dc0a854507b325c6337ff2210d16379/skills/shadcn-vue/rules/forms.md)。这些是被研究的外部规则，没有在本仓执行。

具体增强建议：Skill 入口只增加任务触发与导航；references 写选择条件、依赖、状态、误用例和验收；assets 放受控示例与源码；scripts 继续负责固定来源与构建。样式语法偏好不新增生命周期门禁；上游默认尺寸、字体和颜色不覆盖根 DESIGN.md。

### 6. 场景隔离必须覆盖组件自身的持久化状态

**事实（claim-006）：** 固定 Vue SidebarProvider 默认读取 cookie，并在切换时写 cookie；React Sidebar 同样写 cookie。直接复制可能让导航状态与场景初始值不一致。仅禁用 localStorage 不能自动消除该问题。

来源：[Vue SidebarProvider](https://github.com/unovue/shadcn-vue/blob/67c9a3926dc0a854507b325c6337ff2210d16379/apps/v4/registry/new-york-v4/ui/sidebar/SidebarProvider.vue)、[React Sidebar](https://github.com/shadcn-ui/ui/blob/db2db460a26fa84fb65c8d903b213925fbdee9ed/apps/v4/registry/new-york-v4/ui/sidebar.tsx)。

**建议：** 原型导航展开、筛选、草稿和浮层状态由当前场景初始化管理；采用 Sidebar 时显式适配持久化与重置，不依赖 `file://` 下 cookie 恰好不起作用。对候选切换、重复重置、深链接恢复继续使用现有比较 v2 和浏览器断言。是否曾在当前包中发生泄漏未实测，本文不宣称现行 11 组件已经存在这一缺陷。

### 7. design 目录需要定向修订，最先解决以下问题

| 优先级 / 结论 | 当前证据与影响 | 建议处理 |
|---|---|---|
| **P1：默认密度冲突（claim-007）** | DESIGN.md:229/241、design.md:133、README:11 仍要求默认32px/compact显式；作者工具:34 和新主题说明已默认compact。根规范已有28px变体，缺的是适用边界统一 | 根规范正文明确“新原型默认命名紧凑变体；窄屏普通控件；生产默认与既有批准资产保持原约定”，然后同步治理、README和证据模板注释；不需要为此重做色板 |
| **P1：预览资源断开（claim-008）** | preview.css:1 指向不存在的 `./tokens/variables.css`。Chromium 在明/暗×1440/390四种组合均报 ERR_FILE_NOT_FOUND；body 计算样式退为16px Times，背景Token为空 | 修复权威预览加载链；预览声明它展示的是生产默认还是原型紧凑；复验计算样式和资源完整性 |
| **P1：profile缺预览脚本（claim-009）** | 两个 profile 同步列表包含 HTML/CSS，却缺 preview.js；当前 design/frontend 两处目标 JS 均不存在 | 将JS作为现有同步资源登记，再经脚本同步；在两个实际输出根打开预览测试，不能只验证主仓页面 |
| **P2：暗色未完成当前验证（claim-010）** | 暗色页只加载preview.css；变量文件的 `.dark` 与独立 variables.dark.css 的表面值不同；治理已明确新seed未完成暗色重派生 | 保留历史快照；当前入口标明能力边界；按规范工具派生、加载和验证后才声明可用，不能手改CSS掩盖摘要漂移 |
| **P2：指南和TODO未对齐（claim-011）** | design.md:266–285 的条件React AntD指南混在当前路线中；:301–306仍把Token接入和计算样式写成未来工作；同文件:158–177重复数值 | 分清原型作者、生产映射、历史主题来源；已有能力改为导航，暗色等真实缺口保留。生产Vue/YSS与历史AntD来源不因原型退役被删除 |
| **P2：展示控件像完整业务（claim-012）** | preview.js的“重试”改为“查看”后仍保留重试监听；若干导出/查看无处理；重置只还原筛选 | 标记展示性动作或补完确定性教学行为；旧组件外观页不再充当完整H2流程样例，主导航指向现有五类业务模式 |

可定位源文件：[根规范](../../../../DESIGN.md)、[治理](../../../../.template-spec/design/design.md)、[README](../../../../.template-spec/design/README.md)、[预览CSS](../../../design/preview.css)、[预览脚本](../../../design/preview.js)、[同步配置](../../../profile-skill-sync.json)。浏览器记录见 [preview-browser.json](preview-browser.json)，文件存在性见 [local-path-check.json](local-path-check.json)。

这里的 P1 是维护优先级，不新增生命周期状态。新原型包独立复制 Token；旧预览失败不能外推为新五类模式全部失败。Markdown 相对链接专项检查发现的1条链接有效，未把正常的 `../../DESIGN.md` 误报成断链。

### 8. 紧凑风格应补充可操作性检查，不能继续靠缩小控件提升密度

**事实与建议（claim-013）：** WCAG 2.2 的目标尺寸最低要求为24×24 CSS px，并有间距、等效入口、行内、用户代理与必要性例外。单看28px控件高度不能证明复选框、图标按钮、菜单项或整个页面合规；还需核对实际点击区域和相邻目标。

来源：[W3C 2.5.8 说明](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)。这不要求把所有桌面控件统一改成44px；窄屏关键动作可以采用更易操作的命中区域，但应由项目 Token 和实际任务验证支撑。

六轴 QA 继续检查实际计算样式、文字及状态对比、键盘/焦点、视口/缩放、状态连续操作和 console。新增 Field 要检查错误关联；新增 Sheet 要检查焦点返回；新增菜单要检查方向键与 Escape；新增搜索选择要检查输入法、空结果、清除和取消；不能用组件自述“accessible”替代验收。

## Counter-Signals

1. 本仓已有命名紧凑变体、共同场景、比较v2、五类模式、低保真演练与六轴QA。问题不是缺少全部基础设施；重建一套流程会增加重复事实源。
2. 上游也有版本和文档不一致风险：官方Skill的样式语法偏好与若干文档示例不同；当前Data Table示例采用v9，旧资料可能不同。采用时必须绑定具体源码和依赖，不能仅引用“官网”。
3. 原版React固定revision已有大部分候选组件，构成“不必切Vue”的反证；同revision的Combobox/Sidebar等又说明“源码存在即可无成本接入”不成立。
4. 所有AntD字样不是过时信号：项目Token历史来源、生产Vue/YSS语义、算法避免重复应用以及旧批准兼容仍有效。退役的是React AntD新原型生成路线。
5. 官方组件或演示没有提供本仓Agent效率和用户视觉收益的对照证据。浏览器诊断只证明四个旧预览加载组合的问题，不证明修订后效果，也不是全量无障碍认证。

## Source Map

| 来源类别 | 使用方式 | 限制 |
|---|---|---|
| 用户指定官方目录 | 盘点组件类别和官方导航 | 官网可变化，部分正文提取失败 |
| shadcn-vue固定源码 | 组件文档、官方Skill、依赖和Sidebar行为 | 获取88份文件，含不同样式/legacy对照；并非88个组件均已运行 |
| 当前React固定源码 | 抽查12个候选的实际imports；核对固定tree中组件是否存在 | 未安装候选依赖或做运行兼容证明 |
| 本仓当前资产 | 40份输入摘要、5个维护设计文件、实例设计模板/Token与相关消费者 | 基线包含其他已存在的未提交工作；不据Git HEAD推断当前字节 |
| 浏览器与文件检查 | Chromium四组file://预览、计算样式、资源错误、profile脚本缺失 | 未执行完整WebKit、键盘、200%或当前新模式全量QA |
| W3C | 紧凑命中区域的验收边界 | 标准说明不是本页面合规证明 |

来源URL、摘要和获取边界见 [upstream-snapshot.json](upstream-snapshot.json)、[source-inventory.json](source-inventory.json)、[react-source-inventory.json](react-source-inventory.json)。正式主张、反证与检索记录见 [shadcn-vue-design-evidence.yaml](shadcn-vue-design-evidence.yaml)。

## Decision Handoff

建议维护顺序：**规范与预览修复 → 小批组件接入 → 五类页面模式深化 → 同步与专项验收**。可实施范围和验收写在 [enhancement-blueprint.md](enhancement-blueprint.md)，包含文件级改动、迁移边界与不应照搬的上游规则。

- `yss-design-system`：根规范适用范围、主题角色、页面布局、设计预览和来源导航。
- `yss-prototype-stage`：任务到组件组合、固定源码接入、作者工具、场景重置与五类模式。
- `prototype-review`：已有评审与六轴QA中的组件状态/可操作性核验。
- 投影、profile与CLI分发继续走仓库现有脚本；历史批准资产只读，不批量迁移。

本轮正式产物是研究包和下游增强蓝图，**不代表增强方案已实施，也不批准框架迁移或关闭此前维护验证阻塞**。本轮没有改写现行 Skill 规则、DESIGN.md、Token、投影、锁文件或分发快照。继续实施会改变默认Agent生成行为，应按L3维护，使用当前授权范围与已有用户决定协议绑定，不新增生命周期门禁。

## Evidence Limitations

- shadcn-vue的浏览器运行、Vue离线作者适配、额外依赖与许可闭包仍未验证；没有给出“无成本接入”结论。
- 本轮的正式结论是组件事实、具体缺陷和有边界的建议；组件/模式能否提高生成质量为待验证假设。未启动新的14次/12次Agent预算，也未把独立只读研究Agent算作效果试点。
- 暗色、命中区域、表格及日期的完整行为需要后续针对性验收；不因目录中已有示例就宣称满足所有要求。
- 原始来源与本地证据都以本次观测为准；输入改变后重新核验受影响结论。结构验证只校验研究包，不代替用户对视觉结果的确认。
