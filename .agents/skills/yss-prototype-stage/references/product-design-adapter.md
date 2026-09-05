# YSS 原型渲染适配器

生命周期调用方只选择 H1/H2 并验证 schema v3；静态与流程原型渲染细节留在本适配器内。

## H1：静态视觉评审

目录固定为 `docs/.scratch/<feature>/design/prototypes/`。运行：

```bash
node .agents/skills/yss-prototype-stage/scripts/prototype-contract.mjs prepare-static \
  --project-root <project-root> \
  --root <project-root>/docs/.scratch/<feature>/design/prototypes \
  --feature <feature>
```

命令生成语义化 `index.html`、`styles.css` 和 `yss-prototype-adapter.json`，引用项目 Token CSS。它不创建 `package.json`、lockfile、`node_modules` 或运行时构建合同。设计者在此最小壳中实现布局和少量关键交互；交付可以是静态目录或 URL，不要求单文件。

校验：

```bash
node .agents/skills/yss-prototype-stage/scripts/prototype-contract.mjs validate-project \
  --profile H1 --root <prototype-root>
```

## H2：可运行流程

H2 可选择任何能稳定浏览器交付的轻量前端实现。默认 `component_basis=vue-antdv-next`，使用 Vue 3/Vite + Antdv Next：

```bash
node .agents/skills/yss-prototype-stage/scripts/prototype-contract.mjs prepare-flow \
  --project-root <project-root> \
  --root <prototype-root> \
  --feature <feature> \
  --pnpm-version <actual-pnpm-version>

node .agents/skills/yss-prototype-stage/scripts/prototype-contract.mjs validate-project \
  --profile H2 --root <prototype-root>
```

默认命令生成最小 Vue/Vite starter，精确写入 `antdv-next@1.5.2`、`vue@3.5.21`、`vite@6.4.2`、`@vitejs/plugin-vue@5.2.4`，登记实际 pnpm，生成 Vue 入口、`src/yss-theme.js` 与 provider-neutral adapter schema v3。设计 workflow 在 starter 中替换占位页面，再以 `ConfigProvider`、`pnpm install`、`pnpm build` 形成可移植静态输出。已有 Vue 页面不会被重写，但必须通过合同验证。

显式兼容 React/Vite + Ant Design v6 时传入：

```bash
node .agents/skills/yss-prototype-stage/scripts/prototype-contract.mjs prepare-flow \
  --project-root <project-root> \
  --root <prototype-root> \
  --feature <feature> \
  --component-basis react-antd-6 \
  --library-version <exact-6.x-version> \
  --pnpm-version <actual-pnpm-version>
```

历史 `--target-antd-version` 继续映射到 `react-antd-6`，只为在途兼容，不再是默认调用。其他 H2 基座必须在证据中明确记录，不得伪造 Antdv Next 或 AntD 字段。

### Provider fact pack

默认目录为 `docs/design/facts/antdv-next/<exact-version>/`；React 兼容路线使用 `docs/design/facts/antd/<exact-version>/`。至少包含 `manifest.json`、design-md 摘要、组件事实与 digest。只有以下全部相等才为 fresh：

- manifest 的 package 与 exact version 等于原型 lockfile；
- 所需组件均被覆盖；
- 根 `DESIGN.md` path / digest 与当前规范源相等；
- `project_token_baseline_digest` 等于当前 Token 派生基线；
- 没有新的 API/semantic 疑问。

不满足时只查询缺失或变化的事实。默认 Vue 路线调用 `yss-antdv-next-design`；React 兼容路线调用 `yss-antd-design`，且 `lint/doctor` 只在存在相关 React 源时运行。不要创建占位 fact 目录；feature 证据只引用实际 manifest。

## 共同映射与验证

映射的是 semantic role、项目 Token、状态和验收行为，不是 React API 表面。默认视口为 desktop `1440x900` 与 narrow `390x844`；按影响追加其他断点。Design QA 固定写 feature 级 verification 路径，并按 visual/layout/interaction/content/accessibility/cross-platform 六轴执行。

浏览器/Design QA 将每个风险驱动 case 捕获为 PNG，写入 `docs/.scratch/<feature>/handoff/visual-baseline-v<version>/images/`，并从 `docs/design/templates/visual-baseline-template.yaml` 生成 manifest。截图必须使用固定数据、sRGB、DPR 1，等待字体完成，关闭动画、过渡和光标闪烁；长页面使用固定滚动分段。捕获完成后运行：

```bash
node .agents/skills/yss-prototype-stage/scripts/visual-baseline-contract.mjs seal \
  docs/.scratch/<feature>/handoff/visual-baseline-v1/visual-baseline.yaml \
  --bundle-root docs/.scratch/<feature>/handoff/visual-baseline-v1
```

`seal` 校验 PNG 尺寸与大小并写入图像和整包摘要；随后以 `validate` 重验。模型和下游实现只从 manifest 的 `case_id` 取图，不通过 glob 推断含义。工作目录可位于被忽略的 `.scratch`，但 Strategic Design Handoff 必须携带或引用可读取的自包含 Bundle。

H1/H2 的条件验证矩阵与实现阶段交接规则见 [prototype-profile-routing.md](prototype-profile-routing.md)。原型阶段禁止调用 `yss-ui`；真实组件事实只在批准后的前端实现与实现还原验证中取得。
