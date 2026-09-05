---
name: yss-prototype-stage
description: Use when a YSS feature has product-design impact on a primary flow, navigation, state, recovery, permission experience, or UI-driven API contract and needs profile-routed prototype assets before implementation readiness.
---

# YSS Prototype Stage

把产品设计影响收敛为跨 Agent 一致的原型交付物、证据和生命周期回流合同。它不替代 `yss-product-lifecycle` 的门禁裁决，也不把原型当作生产前端代码。

## 进入条件与主入口

- 先由 `yss-product-lifecycle` 判断产品设计影响；无行为变化的孤立视觉修复记录 `not-applicable`，不创建空资产。
- 先读取 Spec、产品总体设计、`CONTEXT.md`、`yss-design-system`，再按 `DESIGN.md` → `docs/design/design.md` → `docs/design/tokens/*` 顺序消费设计基线，形成交互说明、低保真页面/流程和状态矩阵。
- 用独立 `prototype-review` 评审低保真与状态；未通过不得选择档位或构建原型交付物。
- 按 [原型档位路由](references/prototype-profile-routing.md) 选择 H1/H2 中满足当前决策风险的最低档位。没有充分证据时默认 H2。
- Codex 按档位消费 `product-design:index` 的 focused workflow；H1 可直接走静态适配器，H2 使用 `get-context/image-to-code/design-qa`。其他 Agent 必须交付等价合同资产。
- `high-fidelity-html-prototype` 仅为历史兼容入口；新资产统一为 `artifact.prototype-deliverable`、Prototype Evidence schema v4 与 Visual Baseline schema v1。

## 执行顺序

1. 形成交互说明、低保真与状态矩阵；状态至少包含事件、转换、guard、动作与可退出路径。
2. 完成独立 `prototype-review`，提取仍需由原型回答的风险。
3. 计算并记录 `prototype_profile`。新视觉方向或信息架构不确定时执行三方案 ideation；复用已批准模式时记录 `not-applicable` 与 source visual。
4. H1 用 `prototype-contract.mjs prepare-static` 生成无 Node 运行时的静态适配器；H2 按 `references/product-design-adapter.md` 构建可运行流程。
5. 自动采集版本、digest、视口、截图、console 与扫描结果。截图按 `route + page + state + viewport + theme + locale + data_scenario` 写入 `Visual Baseline Bundle`，执行 `visual-baseline-contract.mjs seal` 后由 feature 级 schema v4 `prototype-evidence.yaml` 引用；人工只补决策、风险、允许差异和用户确认。
6. 以统一六轴 Design QA 和档位验证矩阵完成浏览器/无障碍验证。用户确认后才可校准 Spec、分析 API 影响或进入 实现合同编译器 readiness。

## 档位边界

- H1 `visual-review`：浏览器可复验的 HTML/CSS/少量 JS 或设计工具导出；不得要求 `package.json`、lockfile、Node 或 AntD CLI。
- H2 `flow-review`：主流程与关键异常状态可操作；Vue 3/Vite + Antdv Next 是受支持默认。React/Vite + Ant Design v6 仅作为显式兼容路线；只消费与实际 `component_basis` 匹配的精确版本事实或 fresh fact pack。
- 原型代码默认 throwaway；可复用的是项目 Token、组件语义映射、状态、测试场景和验收标准。任何源码进入生产仍需 实现合同编译器、Slice Contract 和 TDD。
- 原型阶段不得调用 `yss-ui`，不得读取生产组件 API 来制造“真实组件原型”。需要核验真实 YSS/AntDV 组件的事项写入 `implementation_handoff`，由前端实现计划、已批准切片的实现和实现还原验证负责。

## 事实、QA 与确认

优先级固定为：项目根 `DESIGN.md` 规范 Token / 组件变体 → `docs/design/design.md` 治理解释 → `docs/design/tokens/*` 派生快照 → 当前功能语义 → 相关上游组件事实。H2 默认通过 `yss-antdv-next-design` 使用 Antdv Next exact-version fact pack；只有显式选择 `react-antd-6` 时才调用 `yss-antd-design`。fact pack 仅在精确版本、组件集合、根 `DESIGN.md` digest 和项目 Token digest 均匹配且无新 API 疑问时可复用；否则做增量查询。`antd lint/doctor` 只对 React 兼容路线的相关源文件执行。

Design QA 合并 visual、layout、interaction、content、accessibility、cross-platform 六轴，不再建立第二份评审。所有档位至少证明 desktop/narrow 非空渲染、项目 Token、console 和基础键盘/焦点/对比度；H2 追加主流程、关键异常、200% zoom/reduced motion 与按风险视觉回归。图片是视觉基准而非唯一事实来源；模型必须从 `visual-baseline.yaml` 的 `case_id` 读取对应语义引用，禁止靠目录 glob 猜测页面含义。

用户确认必须绑定提问者或其明确指定负责人的原始回复，使用生命周期 `user_decision_policy` 和统一用户决定记录；产品数字人只提供确认建议，不能代答。正式证据追加 `user_decision_ref/decision_subject_ref`，校验原型、视觉基线和操作范围与用户所见快照一致。用户确认只描述原型确认了什么、哪些范围可操作、哪些为模拟或 gap，以及接受/拒绝结论；不要求用户确认技术栈、CLI 或构建细节。

`gate.prototype-reviewed`、`gate.prototype-verified`、`gate.user-confirmation` 保持三个既有门禁。档位选择是 `gate.prototype-verified` 的输入证据，不增加新门禁，也不授权实现。

## 按需读取

- 档位、上游融合与迁移：[prototype-profile-routing.md](references/prototype-profile-routing.md)
- 渲染适配、fact pack 与命令：[product-design-adapter.md](references/product-design-adapter.md)
- 证据模板：`docs/design/templates/prototype-evidence-template.yaml`
- Visual Baseline 模板与 schema：`docs/design/templates/visual-baseline-template.yaml`、`docs/design/schemas/visual-baseline.schema.json`

## 常见错误

- 继续把 React/AntD 当作 H2 默认，或把单个 HTML 文件当成所有档位的答案。
- 低保真未评审就选择技术栈；用主观评分代替确定性触发规则。
- H1 伪造 lockfile/AntD 段，或 H2 声称已验证生产 YSS/AntDV 真实组件。
- 重复抄写机器可采集的版本、digest、截图和 console；创建第二份状态机、QA 或 handoff 资产。
- 把原型源码直接复制进生产，或在原型阶段调用 `yss-ui`。
