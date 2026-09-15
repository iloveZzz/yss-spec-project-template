# YSS HTML 原型适配器

H1/H2 表示验证深度，不表示低/高保真。统一消费 Prototype Evidence schema v4 与 Visual Baseline schema v1。默认 `html-css-js`，接收者可离线打开；生产组件验证仍归下游 `yss-ui`，原型阶段不得调用。

## 构建与交付

在项目实例中，低保真和状态矩阵评审通过后运行；模板源仅在临时 fixture 测试生成器：

```bash
node .agents/skills/yss-prototype-stage/scripts/prototype-contract.mjs prepare-flow \
  --project-root <project-root> --root <project-root>/docs/.scratch/<feature>/design/prototypes --feature <feature>
```

H1 将 `prepare-flow` 换成 `prepare-static`。两者输出 `index.html`、`styles.css`、`tokens.css`、`scenarios.js`、`app.js` 和 `yss-prototype-adapter.json`。初始交互仅为模板示例，必须按已评审的 Spec、页面与状态替换。已有非空目录拒绝覆盖；旧批准版本保持只读，新工作版本使用新的工作目录标识并保留业务 feature 的追踪关系。

制作时可以使用必要工具，交付包不携带 package、lockfile、node_modules，不要求接收方运行 Node。使用普通 script、本地相对路径和随包数据；模块与工具源需先转换成可离线执行的脚本。场景状态默认在内存中，不以 file:// 下不确定的 localStorage 行为作为正确性前提。无需为简单流程建设路由或状态框架。

所有运行资源收在交付目录内，Token 从 `DESIGN.md` 的项目派生 CSS 复制并保存来源摘要。静态扫描拒绝远程资源、越出目录、符号链接、缺失文件和常见网络依赖；动态构造资源及浏览器差异仍由真实离线复验发现。

完成编辑后执行：

```bash
node .agents/skills/yss-prototype-stage/scripts/prototype-contract.mjs seal-project --root <prototype-root> --profile H2
node .agents/skills/yss-prototype-stage/scripts/prototype-contract.mjs validate-project --root <prototype-root> --profile H2
```

`seal-project` 更新资源清单和摘要，不表示设计通过；修改批准原型前先建立新版本。封存后资源变化会使验证失败。规范或 Token 变化时先由设计系统重新派生，再更新包内副本与对应来源摘要，重新验证受影响场景并取得当前版本确认。

## 规范直出与视觉还原

- `source_visual.kind=design-system`：输入为根 `DESIGN.md`、交互说明、状态矩阵和已有页面模式；由本适配器直接构建，QA 使用 `design-contract`，核对 Token、实际计算样式、密度、内容和交互。不要调用要求图片前置的 Product Design prototype/image-to-code/design-qa，不改写上游插件的规则。
- `source_visual.kind=visual-reference`：已有用户选定、可定位的图像或页面捕获，QA 使用 `visual-comparison`。只有选用的 focused workflow 能满足本交付边界时才调用；要求 Node starter 的 workflow 不用于默认离线构建，可由 YSS adapter 直接还原该视觉目标。
- 没有足够设计依据时先澄清；仅视觉方向或信息架构不确定时比较候选方案。首版图不可当作独立来源来证明符合规范，必须先完成规范审查和用户确认，才能成为后续回归基线。

## 流程和内容

使用现有状态矩阵约束事件、guard、动作与退出路径。以 `case_id/data_scenario` 定位固定场景，支持重置和重复操作；场景入口留在独立评审区域，不混入产品主流程。H2 覆盖主流程及命中的 failure/no-permission/conflict/recovery 状态，记录 `scenario_replay_ref`、`scenario_reset_result`。

表格、表单与说明使用代表性业务内容和数据密度，覆盖长中文、空值、校验反馈与窄屏形态。复杂组件只实现当前决策需要的可操作模拟；若模拟无法支持关键结论，记录 gap 并返回设计澄清，真实组件假设由 `implementation_handoff` 交给实现阶段。

## 统一 QA 与离线复验

六轴仍为 visual/layout/interaction/content/accessibility/cross-platform，写同一份 feature 级 `verification/design-qa.md`。原生语义优先；弹窗按适用行为验证初始焦点、Tab、Escape 和关闭后的焦点去向。ARIA 属性或自动扫描不替代键盘实操。

复制资源包到脱离源仓的目录，以 `file://` 且无网络运行，检查所有采用的场景、资源加载、console、键盘、焦点、200% zoom/reduced motion。证据写 `delivery_contract=offline-html-v1`、`resource_manifest_ref`、`offline_verification_ref/result`。机器静态检查通过只代表结构可检查。

默认视口 desktop `1440x900`、narrow `390x844`；按影响追加。Visual Baseline 捕获固定数据、浏览器及版本、操作系统、字体、时区、locale、sRGB、DPR 1，关闭动画与光标，等待字体就绪；复验前重置场景。长页面按固定滚动位置分段。

```bash
node .agents/skills/yss-prototype-stage/scripts/visual-baseline-contract.mjs seal \
  docs/.scratch/<feature>/handoff/visual-baseline-v1/visual-baseline.yaml \
  --bundle-root docs/.scratch/<feature>/handoff/visual-baseline-v1
```

从 manifest 的 `case_id` 读取语义与截图，不依赖 glob；视觉回归按风险采用，首次生成基线不声称已有回归通过。六轴 QA、独立评审、用户确认和生产实现隔离保持原合同。

## 条件 AntD 路线

已确认复杂交互需要真实组件时，按 [AntD 集成](antd-integration.md) 使用 `react-antd-prebuilt`；这是作者侧预构建，接收者仍无需 Node，所有资源离线随包。默认 `html-css-js` 保持原生实现。组件库知识仅作为本阶段设计事实，不取代根 DESIGN.md 或授权生产实现。
