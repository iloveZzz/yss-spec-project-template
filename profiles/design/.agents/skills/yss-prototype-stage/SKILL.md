---
name: yss-prototype-stage
description: Use when a YSS feature has product-design impact on a primary flow, navigation, state, recovery, permission experience, or UI-driven API contract and needs profile-routed prototype assets before implementation readiness, or when handing off a confirmed unchanged existing UI baseline.
---

# YSS Prototype Stage

把产品设计影响收敛为跨 Agent 一致的原型交付物、证据和生命周期回流合同。它不替代 `yss-product-lifecycle` 的门禁裁决，也不把原型当作生产前端代码。

文档输出时按 `lifecycle-document-output` 条件调用 `i-have-adhd`，读取 `.template-spec/process/document-writing.md`；作用域仅限当前产物，派发时传递条件及引用。

## 文档写作

起草或修订交互说明、状态说明和设计结论前，读取 `.template-spec/process/document-writing.md` 的共用写法及产品设计指引；原型视觉和行为仍消费当前设计合同。

## 进入条件与主入口

- 先由 `yss-product-lifecycle` 判断产品设计影响；无行为变化的孤立视觉修复记录 `not-applicable`，不创建空资产。
- 先读取 Spec、产品总体设计、`CONTEXT.md`、`yss-design-system`，再按 `DESIGN.md` → `.template-spec/design/design.md` → `.template-spec/design/tokens/*` 顺序消费设计基线，形成交互说明、低保真页面/流程和状态矩阵。
- 用独立 `prototype-review` 评审低保真与状态；未通过不得选择档位或构建原型交付物。
- 按 [原型档位路由](references/prototype-profile-routing.md) 选择 H1/H2 中满足当前决策风险的最低档位。没有充分证据时默认 H2。
- 默认以 `DESIGN.md`、交互说明和状态矩阵进入 YSS HTML 适配器；有已选视觉稿时才条件调用 `product-design:index` 的还原 workflow。规范直出不调用要求先有图片的 `prototype/image-to-code/design-qa`；六轴 QA 仍由本阶段合同持有，所有 Agent 交付等价证据。
- `high-fidelity-html-prototype` 仅为历史兼容入口；新资产统一为 `artifact.prototype-deliverable`、Prototype Evidence schema v4 与 Visual Baseline schema v1。

## 执行顺序

1. 形成简短设计输入（用户任务、保持项、可调整项、状态与适用 Token），再整理内容优先级、长度变化、数据来源和动作结果。形成交互说明、低保真与状态矩阵；状态至少包含事件、转换、guard、动作与可退出路径。信息架构或交互不确定时，先按 [方案比较方法](references/concept-comparison.md) 比较三个候选并取得用户选择，再进入低保真评审。
2. 完成独立 `prototype-review`，提取仍需由原型回答的风险。
3. 计算并记录 `prototype_profile`。仅视觉方向仍未确定时比较三个高保真候选并由用户选择，保持已评审行为；已解决的问题不重复探索。已有规范和页面模式足够时记录 `not-applicable`、规范依据与理由。发现行为变化，返回受影响的低保真评审。
4. 高保真 H1/H2 优先使用 `build-shadcn-vue-prototype.mjs --profile H1|H2`（Vue 3 + shadcn-vue）；React 作者路线已退役，旧包仅显式 legacy 只读校验；轻量原生路线分别使用 `prototype-contract.mjs prepare-static` / `prepare-flow`。二者都交付 `index.html` 与本地 CSS/JS/资源。按 `references/product-design-adapter.md` 完成场景、离线复验和 `seal-project`，不把 starter 示例当作业务验收。
5. 自动采集版本、digest、视口、截图、console 与扫描结果。截图按 `route + page + state + viewport + theme + locale + data_scenario` 写入 `Visual Baseline Bundle`，执行 `visual-baseline-contract.mjs seal` 后由 feature 级 schema v4 `prototype-evidence.yaml` 引用；人工只补决策、风险、允许差异和用户确认。
6. 完整构建后集中检查桌面/窄屏，统一修整并复验受影响场景；对明确的保持项与原页面做同视口、同状态的前后核对，不能仅凭操作仍可用判定布局已保持，窄屏适配也不得扩大本次变更范围；迭代预算耗尽仍有关键缺陷时保留阻塞，不以轮次数代替通过。以统一六轴 Design QA 和档位验证矩阵完成浏览器/无障碍验证。用户确认后才可校准 Spec、分析 API 影响或进入 实现合同编译器 readiness。

## 档位边界

- H1 `visual-review`：浏览器可复验的 HTML/CSS/少量 JS 或设计工具导出；不得要求接收者安装 `package.json`、lockfile、Node 或组件 CLI。
- H2 `flow-review`：新高保真优先使用 `vue-shadcn-prebuilt`（`react-shadcn-prebuilt` 仅历史只读），轻量路线使用 `html-css-js`，主流程与关键异常状态可操作；场景可重复触发并重置。制作阶段允许必要工具，接收者无需安装 Node 或组件库，也不依赖网络。复杂控件只模拟当前决策需要的行为；简化会改变关键结论时，按 shadcn 集成说明补齐组件行为；仍无法支撑的部分列为 gap 并回到设计澄清。
- 原型代码默认 throwaway；可复用的是项目 Token、组件语义映射、状态、测试场景和验收标准。任何源码进入生产仍需 实现合同编译器、Slice Contract 和 TDD。
- 原型阶段不得调用 `yss-ui`，不得读取生产组件 API 来制造“真实组件原型”。需要核验真实 YSS/AntDV 组件的事项写入 `implementation_handoff`，由前端实现计划、已批准切片的实现和实现还原验证负责。

## 事实、QA 与确认

优先级固定为：根 `DESIGN.md` 规范 Token / 组件变体 → `.template-spec/design/design.md` 治理解释 → `.template-spec/design/tokens/*` 派生快照。行为由 Spec、交互说明与状态矩阵定义。HTML 消费包内 Token CSS，保存根规范与 Token 摘要，不再调用组件 Provider 或采集新的 fact pack。标准格式与工具版本沿用项目锁定值，不跟随上游 main 自动升级。

Design QA 合并 visual、layout、interaction、content、accessibility、cross-platform 六轴，不再建立第二份评审。所有档位至少证明 desktop/narrow 非空渲染、项目 Token、console 和基础键盘/焦点/对比度；H2 追加主流程、关键异常、200% zoom/reduced motion 与按风险视觉回归。规范直出使用 `design_qa.mode=design-contract`，对照规范和实际计算样式审查；已有视觉稿使用 `visual-comparison`，对照同视口同状态源图。首版截图在审查和用户确认后冻结，不能与自身对比来证明符合规范。图片是视觉基准而非唯一事实来源；模型必须从 `visual-baseline.yaml` 的 `case_id` 读取对应语义引用，禁止靠目录 glob 猜测页面含义。

用户确认必须绑定提问者或其明确指定负责人的原始回复，使用生命周期 `user_decision_policy` 和统一用户决定记录；产品数字人只提供确认建议，不能代答。正式证据追加 `user_decision_ref/decision_subject_ref`，校验原型、视觉基线和操作范围与用户所见快照一致。用户确认只描述原型确认了什么、哪些范围可操作、哪些为模拟或 gap，以及接受/拒绝结论；不要求用户确认技术栈、CLI 或构建细节。

`check.prototype-reviewed` 和 `check.prototype-verified` 是 `gate.product-design-approved` 的内部检查；独立评审和验证通过后，用户统一确认当前原型。档位选择属于验证输入，不单独请求批准，也不授权实现。

## 按需读取

- 搜索选择或纯日期区间任务：读 [搜索与日期配方](references/search-date-patterns.md)；验证时读 [统一入口](references/prototype-verification.md)。
- 新流程、陌生角色或复杂恢复仍有可用性疑问：读 [条件式用户研究](references/usability-research.md)，把待验证问题转为可观察任务。

- 新企业高保真默认使用 [应用壳与多页工作区](references/enterprise-workspace.md)：登记真实导航页面，切换保留草稿，关闭按 dirty 状态确认，场景重置全量清空；既有批准页面仍遵守保持项。

- 选择或接入高保真组件时，按 [任务→页面组合→组件配方](references/component-recipes.md) 读取适用条件、依赖、状态、键盘、焦点和窄屏规则；只用已登记组件，不自动覆盖 preset。

- 新高保真页面默认选择根规范的紧凑变体；既有页面保持当前密度，详见 `yss-design-system/references/prototype-default-theme.md` 与 [Vue 组件集成](references/shadcn-vue-integration.md)。
- 完整任务模式与低保真演练：按需读取 [业务模式](references/business-patterns.md)、[低保真演练](references/low-fidelity-exercise.md)；不替换已确认页面的保持项。
- 内容规划、信息架构/交互或视觉候选比较：[concept-comparison.md](references/concept-comparison.md)；需要离线切换候选时读 [comparison-tool.md](references/comparison-tool.md)。

- 档位、上游融合与迁移：[prototype-profile-routing.md](references/prototype-profile-routing.md)
- 渲染适配、fact pack 与命令：[product-design-adapter.md](references/product-design-adapter.md)
- 证据模板：`.template-spec/design/templates/prototype-evidence-template.yaml`
- Visual Baseline 模板与 schema：`.template-spec/design/templates/visual-baseline-template.yaml`、`.template-spec/design/schemas/visual-baseline.schema.json`

## 常见错误

- 把 H1/H2 当作低/高保真；把离线 HTML 降为静态截图，或继续要求 Provider、Node starter、预先生成图片。
- 低保真未评审就选择技术栈；用主观评分代替确定性触发规则。
- 空填 lockfile/fact pack；把自身生成图当成独立来源，或宣称已验证生产真实组件。
- 重复抄写机器可采集的版本、digest、截图和 console；创建第二份状态机、QA 或 handoff 资产。
- 把原型源码直接复制进生产，或在原型阶段调用 `yss-ui`。


## 既有 UI 的交接入口

确认 UI、交互、状态和权限体验均无改动的跨仓既有工程，读取 [既有 UI 分支](references/existing-ui-entry.md)，使用 existing-ui-baseline v1 和当前真实用户确认。任何 UI 改动回到上面的原型流程；输入核验不授予实现权限。

## 高保真组件路线

新页面优先 [shadcn-vue + Vue 3](references/shadcn-vue-integration.md)，真实 Select、菜单、Sheet 等承担产品交互；不能只给原生控件套主题就称组件化。按任务借鉴 Blocks 的组合，保持项目 Token 与已评审行为。React 作者依赖与生成入口已移除；[历史包](references/shadcn-integration.md)只读保留，原生 HTML 用于轻量修改或明确例外；不混用两套组件 API。生产 Vue/YSS 合同不变。

## 业务草案校准

按 `.template-spec/process/business-tickets.md` 校准 Spec 已起草的业务 Ticket：页面流、状态、失败与恢复路径映射原 FR/AC，复用稳定 ID。无产品设计影响时由主控记录不适用后业务正式化，不生成空原型。语义不变复验既有授权延续，实质变化回到原决定边界。

## 浏览器与草稿生命周期

本地自动化浏览器使用 [临时会话模块](scripts/browser-session.mjs)，用法及中断边界见 [资源生命周期](references/resource-lifecycle.md)。配置目录放系统临时目录，正式截图和详细报告仍写原证据路径；摘要默认标准输出，仅在明确指定路径时保存。未正式化草稿使用临时工作区；已被批准、验证或交接引用的文件按正式资产保留。
