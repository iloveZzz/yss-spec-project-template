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

H2 可选择任何能稳定浏览器交付的轻量前端实现。采用 Product Design React/Vite + Ant Design v6 时：

```bash
node .agents/skills/yss-prototype-stage/scripts/prototype-contract.mjs prepare-flow \
  --project-root <project-root> \
  --root <prototype-root> \
  --feature <feature> \
  --target-antd-version <exact-6.x-version> \
  --pnpm-version <actual-pnpm-version>

node .agents/skills/yss-prototype-stage/scripts/prototype-contract.mjs validate-project \
  --profile H2 --root <prototype-root> \
  --target-antd-version <exact-6.x-version>
```

`prepare-flow` 只做机械适配：精确写入 `antd`、登记 pnpm、生成 `src/yss-theme.js` 与 adapter manifest。随后用 `ConfigProvider theme={yssTheme}`、`pnpm install`、`pnpm build` 形成可移植静态输出。H2 不使用 AntD 时无需执行该命令，在证据中写明 component basis，不能创建空 AntD 段。

### AntD fact pack

建议目录为 `docs/design/facts/antd/<exact-version>/`，至少包含 `manifest.json`、design-md 摘要、组件事实与 digest。只有以下全部相等才为 fresh：

- manifest 的 exact AntD version 等于原型 lockfile；
- 所需组件均被覆盖；
- `project_token_baseline_digest` 等于当前设计基线；
- 没有新的 API/semantic 疑问。

不满足时只查询缺失或变化的事实。`lint/doctor` 只在存在相关 React 源时运行。不要创建占位 fact 目录；feature 证据只引用实际 manifest。

## 共同映射与验证

映射的是 semantic role、项目 Token、状态和验收行为，不是 React API 表面。默认视口为 desktop `1440x900` 与 narrow `390x844`；按影响追加其他断点。Design QA 固定写 feature 级 verification 路径，并按 visual/layout/interaction/content/accessibility/cross-platform 六轴执行。

H1/H2 的条件验证矩阵与实现阶段交接规则见 [prototype-profile-routing.md](prototype-profile-routing.md)。原型阶段禁止调用 `yss-ui`；真实组件事实只在批准后的前端实现与实现还原验证中取得。
