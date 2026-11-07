---
name: yss-design-system
description: 设计信息结构、流程、内容与视觉，制作产品 UI 原型及交互说明；完整有 UI 的 Spec 交付需高保真原型。
---

# 产品设计与 UI 原型

承担产品设计和 UI 原型制作。先读已有规格、业务决定、DESIGN.md、页面与组件约定，按 [设计方法](references/spec-design.md) 明确任务、信息结构、操作及状态。缺少事实交给 `.agents/skills/yss-research/SKILL.md`；业务取舍交给用户，不用视觉选择替代业务决定。

完整 Spec 交付只包含业务规格、高保真交互原型及交互说明。完整有 UI 交付需高保真，核心操作或状态变化提供可操作闭环；纯展示可用高保真静态设计；无 UI 由 `.agents/skills/prototype/SKILL.md` 提供业务逻辑或状态原型。覆盖范围与必要状态按风险选择，低保真草稿支持探索但不能单独算完整交付。普通查询、局部改稿只完成当前范围，不自动扩成完整产品设计。

按需读取 [产品原型与说明](references/product-prototype.md)。产品 UI 的低保真草稿和完善版统一使用 [Vue + shadcn-vue](references/shadcn-vue-prototype.md)，在同一页面与场景上逐步完善。无设计基线的企业后台默认采用 [YSS 标准亮色主题](references/high-fidelity-default-theme.md)，其完整值与使用规则见 [默认 DESIGN.md](assets/DESIGN.md)；建立项目规范时据此裁剪，主题 CSS 与文档保持一致；列表与销售机会提炼的页签、组合筛选、双月日期、团队选择、视图切换和阶段看板按 [标准页面模式](references/standard-theme-patterns.md) 选用。已有项目沿用实际规范，明确要求迁移时才替换；营销、品牌展示等非后台任务按实际目标设计。页面组合见 [页面模式](references/business-patterns.md)、[组件配方](references/component-recipes.md) 和 [页面组织](references/page-composition.md)。有实质方向取舍时用 [方案比较](references/concept-comparison.md)，不强制多方案。

产品页面、草稿、工作区评审和候选比较工具，有对应 shadcn 组件就直接使用：Button、Input/Textarea、Select/Combobox、Checkbox、Field/Label、InputGroup、Collapsible 及对应弹层。不以原生控件加相似 CSS 代替，不因临时或评审用途豁免。允许 form、布局/语义标签、链接、iframe、SVG、Vite HTML 挂载页，以及组件内部 DOM 和隐藏输入；不提供独立 HTML 轻量路线。不为 Form 名称新增表单库。草稿方法见 [低保真演练](references/low-fidelity-exercise.md)。

缺少官方组件时，在原型制作授权内自主检查已有实现、固定兼容来源、补齐必要依赖和配置，并按现有主题/尺寸适配及验证。组件发现、接入与决策边界共用项目根 `.agents/skills/yss-frontend-application/references/component-engineering.md`（仅分发此参考，不要求安装完整应用技能）。大版本升级、改动已有定制组件或全局主题时，先给出具体影响与处理方案，由用户决定；原型来源记录不自动回写模板共享 vendor。

制作方按 `.agents/skills/prototype-review/references/review-method.md` 操作验证并修正；需要单独复核时使用 `.agents/skills/prototype-review/SKILL.md`。静态画面不证明交互，模拟结果不证明真实服务；未执行或工具受限如实记录。原型可以编写演示代码、数据和模拟请求来表达业务行为，不将这些结构或所用框架升级为生产 API、物理库表或技术选型，不自动修改生产代码。

保存到项目已有或用户指定位置，没有约定时新建清晰任务目录，保护已有成果。附规则与验收对应、查看方式、模拟范围、实际检查和未覆盖项；真实业务未决项回到规格。不自行批准、冻结或授予实施资格。

共享默认值的采用、排除与验证范围见 [适配来源](references/integration-source.md)。
