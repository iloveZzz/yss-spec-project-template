---
name: yss-design-ui
description: 设计页面结构、视觉和交互，制作界面原型与说明，或将已采纳的正式前端视觉或交互回写原型。
---

# 产品设计与 UI 原型

承担产品设计和 UI 原型制作。先读已有规格、业务决定、DESIGN.md、页面与组件约定，按 [设计方法](references/spec-design.md) 明确任务、信息结构、操作及状态。缺少事实交给 `.agents/skills/yss-research/SKILL.md`；先复用已有答复。影响本次交付且只有业务方能决定的取舍，当轮按 `grilling`（`.agents/skills/grilling/SKILL.md`）向用户澄清，说明影响和建议，不用视觉选择替代业务决定。

写入交互说明、原型或相关工作台记录前，先按[设计方法](references/spec-design.md)核对本轮归属。

- 材料将本次要修订的业务行为标为归属待定，或仍有多个实际归属候选时，本轮只在普通会话问一个能决定归属的问题，结束本轮并等用户答复。答复前相关原型、交互说明、OQ 和工作台记录只供查阅。并列展示候选、补待定占位和写草稿也属于写入。共用原型和当前 Spec 登记提供查阅线索。
- 归属明确后，先在会话发出一条用户可见消息，说清沿用或新建的 Spec 标题及业务依据，再按本轮授权写入。只有本轮已经发出同一归属说明时才复用。
- 仅受托修订指定原型时，直至交付的写入范围均限于该原型。规格正文、元数据、问题状态和工作台登记用作查阅依据。发现影响本次原型交付的规格或确认缺项时，在会话提示并留待对应规格的维护任务处理。查无关联 Spec 时，在写前消息里说明查阅结果和本次修改依据，再按本轮授权继续。

将已确认采纳的正式前端视觉或交互回写原型或交互说明时，直接读取项目根的 `.agents/skills/prototype-review/references/frontend-handoff.md` 中的「正式前端回写原型」，没有既有复核也可使用。复用前端侧对照证据，按本次授权核实采用版本、实际画面与行为，再按上述归属和写入范围更新。涉及业务规则或验收变化时，交由 Spec 侧 `yss-build-spec` 处理。

完整 Spec 交付只包含业务规格、高保真交互原型及交互说明。完整有 UI 交付需高保真，核心操作或状态变化提供可操作闭环；纯展示可用高保真静态设计；无 UI 由 `.agents/skills/yss-prototype-logic/SKILL.md` 提供业务逻辑或状态原型。覆盖范围与必要状态按风险选择，低保真草稿支持探索但不能单独算完整交付。普通查询、局部改稿只完成当前范围，不自动扩成完整产品设计。

按需读取 [产品原型与说明](references/product-prototype.md)。产品 UI 的低保真草稿和完善版统一使用 [Vue + shadcn-vue](references/shadcn-vue-prototype.md)，在同一页面与场景上逐步完善。无设计基线的企业后台默认采用 [YSS Tesla Light 亮色主题](references/high-fidelity-default-theme.md)，其完整值与使用规则见 [默认 DESIGN.md](assets/DESIGN.md)；建立项目规范时据此裁剪，主题 CSS 与文档保持一致；列表与销售机会提炼的页签、组合筛选、双月日期、团队选择、视图切换和阶段看板按 [标准页面模式](references/standard-theme-patterns.md) 选用。已有项目沿用实际规范，明确要求迁移时才替换；营销、品牌展示等非后台任务按实际目标设计。页面组合见 [页面模式](references/business-patterns.md)、[组件配方](references/component-recipes.md) 和 [页面组织](references/page-composition.md)。有实质方向取舍时用 [方案比较](references/concept-comparison.md)，不强制多方案。

产品页面、草稿、工作区评审和候选比较工具，有对应 shadcn 组件就直接使用：Button、Input/Textarea、Select/Combobox、Checkbox、Field/Label、InputGroup、Collapsible 及对应弹层。不以原生控件加相似 CSS 代替，不因临时或评审用途豁免。允许 form、布局/语义标签、链接、iframe、SVG、Vite HTML 挂载页，以及组件内部 DOM 和隐藏输入；不提供独立 HTML 轻量路线。不为 Form 名称新增表单库。草稿方法见 [低保真演练](references/low-fidelity-exercise.md)。

缺少官方组件时，在原型制作授权内自主检查已有实现、固定兼容来源、补齐必要依赖和配置，并按现有主题/尺寸适配及验证。组件发现、接入与决策边界共用项目根 `.agents/skills/yss-frontend-application/references/component-engineering.md`（仅分发此参考，不要求安装完整应用技能）。大版本升级、改动已有定制组件或全局主题时，先给出具体影响与处理方案，由用户决定；原型来源记录不自动回写模板共享 vendor。

制作方按 `.agents/skills/prototype-review/references/review-method.md` 操作验证并修正；需要单独复核时使用 `.agents/skills/prototype-review/SKILL.md`。静态画面不证明交互，模拟结果不证明真实服务；未执行或工具受限如实记录。原型可以编写演示代码、数据和模拟请求来表达业务行为，不将这些结构或所用框架升级为生产 API、物理库表或技术选型，不自动修改生产代码。

保存到项目已有或用户指定位置，保护已有成果。无约定的新 Spec 沿用固定 `YYYY-MM-DD-<topic>` key：主规格 `docs/spec/<key>/<key>-spec.md`，分文件交互说明为同目录 `<key>-interaction.md`，新独立原型为 `prototypes/<key>/`；具体复用与重名规则见 [设计方法](references/spec-design.md)。附规则与验收对应、查看方式、模拟范围、实际检查和未覆盖项；真实业务未决项回到规格。不自行批准、冻结或授予实施资格。

共享默认值的采用、排除与验证范围见 [适配来源](references/integration-source.md)。
