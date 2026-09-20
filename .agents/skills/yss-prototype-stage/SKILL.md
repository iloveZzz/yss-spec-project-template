---
name: yss-prototype-stage
description: Use when a YSS feature has product-design impact on a primary flow, navigation, state, recovery, permission experience, or UI-driven API contract and needs profile-routed prototype assets before implementation readiness, or when handing off a confirmed unchanged existing UI baseline.
---

# YSS Prototype Stage

把产品设计影响收敛为跨 Agent 一致的原型交付物、证据和生命周期回流合同。它不替代 `yss-product-lifecycle` 的门禁裁决，也不把原型当作生产前端代码。

文档输出时按 `lifecycle-document-output` 条件调用 `i-have-adhd`，读取 `docs/process/document-writing.md`；作用域仅限当前产物，派发时传递条件及引用。

## 文档写作

起草或修订交互说明、状态说明和设计结论前，读取 `docs/process/document-writing.md` 的共用写法及产品设计指引；原型视觉和行为仍消费当前设计合同。

## 进入条件与主入口

- 先由 `yss-product-lifecycle` 判断产品设计影响；无行为变化的孤立视觉修复记录 `not-applicable`，不创建空资产。
- 先读取 Spec、产品总体设计、`CONTEXT.md`、`yss-design-system`，再按 `DESIGN.md` → `docs/design/design.md` → `docs/design/tokens/*` 顺序消费设计基线，形成交互说明、低保真页面/流程和状态矩阵。
- 用独立 `prototype-review` 评审低保真与状态；未通过不得选择档位或构建原型交付物。
- 按 [原型档位路由](references/prototype-profile-routing.md) 选择 H1/H2 中满足当前决策风险的最低档位。没有充分证据时默认 H2。
- 默认以 `DESIGN.md`、交互说明和状态矩阵进入 YSS HTML 适配器；有已选视觉稿时才条件调用 `product-design:index` 的还原 workflow。规范直出不调用要求先有图片的 `prototype/image-to-code/design-qa`；六轴 QA 仍由本阶段合同持有，所有 Agent 交付等价证据。
- `high-fidelity-html-prototype` 仅为历史兼容入口；新资产统一为 `artifact.prototype-deliverable`、Prototype Evidence schema v4 与 Visual Baseline schema v1。

## 执行顺序

1. 形成交互说明、低保真与状态矩阵；状态至少包含事件、转换、guard、动作与可退出路径。
2. 完成独立 `prototype-review`，提取仍需由原型回答的风险。
3. 计算并记录 `prototype_profile`。新视觉方向或信息架构不确定时比较三个候选方案并由用户选择；可用低保真或 HTML 比较，图片 ideation 按需使用。已有规范和页面模式足够时记录 `not-applicable`、规范依据与理由。
4. H1 使用 `prototype-contract.mjs prepare-static`；H2 默认使用 `prepare-flow`，条件真实组件路线使用 `build-antd-prototype.mjs`。二者都交付 `index.html` 与本地 CSS/JS/资源。按 `references/product-design-adapter.md` 完成场景、离线复验和 `seal-project`，不把 starter 示例当作业务验收。
5. 自动采集版本、digest、视口、截图、console 与扫描结果。截图按 `route + page + state + viewport + theme + locale + data_scenario` 写入 `Visual Baseline Bundle`，执行 `visual-baseline-contract.mjs seal` 后由 feature 级 schema v4 `prototype-evidence.yaml` 引用；人工只补决策、风险、允许差异和用户确认。
6. 以统一六轴 Design QA 和档位验证矩阵完成浏览器/无障碍验证。用户确认后才可校准 Spec、分析 API 影响或进入 实现合同编译器 readiness。

## 档位边界

- H1 `visual-review`：浏览器可复验的 HTML/CSS/少量 JS 或设计工具导出；不得要求 `package.json`、lockfile、Node 或 AntD CLI。
- H2 `flow-review`：默认使用 `html-css-js`，主流程与关键异常状态可操作；场景可重复触发并重置。制作阶段允许必要工具，接收者无需安装 Node 或组件库，也不依赖网络。复杂控件只模拟当前决策需要的行为；简化会改变关键结论时，按 AntD 集成说明选择预构建真实控件；仍无法支撑的部分列为 gap 并回到设计澄清。
- 原型代码默认 throwaway；可复用的是项目 Token、组件语义映射、状态、测试场景和验收标准。任何源码进入生产仍需 实现合同编译器、Slice Contract 和 TDD。
- 原型阶段不得调用 `yss-ui`，不得读取生产组件 API 来制造“真实组件原型”。需要核验真实 YSS/AntDV 组件的事项写入 `implementation_handoff`，由前端实现计划、已批准切片的实现和实现还原验证负责。

## 事实、QA 与确认

优先级固定为：根 `DESIGN.md` 规范 Token / 组件变体 → `docs/design/design.md` 治理解释 → `docs/design/tokens/*` 派生快照。行为由 Spec、交互说明与状态矩阵定义。HTML 消费包内 Token CSS，保存根规范与 Token 摘要，不再调用组件 Provider 或采集新的 fact pack。标准格式与工具版本沿用项目锁定值，不跟随上游 main 自动升级。

Design QA 合并 visual、layout、interaction、content、accessibility、cross-platform 六轴，不再建立第二份评审。所有档位至少证明 desktop/narrow 非空渲染、项目 Token、console 和基础键盘/焦点/对比度；H2 追加主流程、关键异常、200% zoom/reduced motion 与按风险视觉回归。规范直出使用 `design_qa.mode=design-contract`，对照规范和实际计算样式审查；已有视觉稿使用 `visual-comparison`，对照同视口同状态源图。首版截图在审查和用户确认后冻结，不能与自身对比来证明符合规范。图片是视觉基准而非唯一事实来源；模型必须从 `visual-baseline.yaml` 的 `case_id` 读取对应语义引用，禁止靠目录 glob 猜测页面含义。

用户确认必须绑定提问者或其明确指定负责人的原始回复，使用生命周期 `user_decision_policy` 和统一用户决定记录；产品数字人只提供确认建议，不能代答。正式证据追加 `user_decision_ref/decision_subject_ref`，校验原型、视觉基线和操作范围与用户所见快照一致。用户确认只描述原型确认了什么、哪些范围可操作、哪些为模拟或 gap，以及接受/拒绝结论；不要求用户确认技术栈、CLI 或构建细节。

`check.prototype-reviewed` 和 `check.prototype-verified` 是 `gate.product-design-approved` 的内部检查；独立评审和验证通过后，按生命周期用户决定协议核验当前范围。已有明确授权且决定依据不变时用 `continuation_ref` 延续；新的业务体验取舍、范围或重要风险仍由用户确认。档位选择属于验证输入，不单独请求批准，也不授权实现。

## 按需读取

- 档位、上游融合与迁移：[prototype-profile-routing.md](references/prototype-profile-routing.md)
- 渲染适配、fact pack 与命令：[product-design-adapter.md](references/product-design-adapter.md)
- 证据模板：`docs/design/templates/prototype-evidence-template.yaml`
- Visual Baseline 模板与 schema：`docs/design/templates/visual-baseline-template.yaml`、`docs/design/schemas/visual-baseline.schema.json`

## 常见错误

- 把 H1/H2 当作低/高保真；把离线 HTML 降为静态截图，或继续要求 Provider、Node starter、预先生成图片。
- 低保真未评审就选择技术栈；用主观评分代替确定性触发规则。
- 空填 lockfile/fact pack；把自身生成图当成独立来源，或宣称已验证生产真实组件。
- 重复抄写机器可采集的版本、digest、截图和 console；创建第二份状态机、QA 或 handoff 资产。
- 把原型源码直接复制进生产，或在原型阶段调用 `yss-ui`。


## 既有 UI 的交接入口

确认 UI、交互、状态和权限体验均无改动的跨仓既有工程，读取 [既有 UI 分支](references/existing-ui-entry.md)，使用 existing-ui-baseline v1 和当前真实用户确认。任何 UI 改动回到上面的原型流程；输入核验不授予实现权限。

## AntD 组件补充

消费 [组件集成说明](references/antd-integration.md) 与 [组件索引](references/antd-component-catalog.json)：默认原生 HTML，复杂交互确实影响评审结论时记录理由并选 `react-antd-prebuilt`。`--pattern workbench` 提供查询列表、详情、编辑和失败恢复 starter；真实 AntD 在独立作者目录按固定 lock 预构建，交付包仍离线运行、接收者无需 Node。两条路线统一根 DESIGN.md、六轴 QA、场景重置及当前用户确认，不恢复 Provider 技能、不证明生产 YSS 组件兼容。
