# YSS 前端应用

Vue 3 + TypeScript + Vite + Tailwind CSS，包含 Button/Input、VueUse 与共享设计起点。生成源码完成后，仍需安装并验证运行。

使用 package.json 声明的 Node 与 pnpm；安装前检查父目录 workspace 是否会包含当前工程。确认环境后运行：

```sh
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm build
pnpm dev
```

页面按 `src/views/<Page>/{index.vue,components,hooks,schemas}` 组织，通用组合函数放 `src/hooks`，跨页面组件放 `src/components`。请求、API 类型与测试按任务接入。默认页面无业务请求。

读取 DESIGN.md，并沿用项目确认的原型和规范。来源与许可见 [provenance](provenance/README.md)。

`components.json` 描述现有 Tailwind 4、new-york-v4 组件源码、CSS 入口与别名，便于后续工具识别；`composables` 指向既有 `src/hooks`。其中 baseColor 是 registry 元数据，实际颜色继续来自 YSS tokens。生成时不执行 shadcn-vue init/apply，不预装 CLI 或其他组件；开发需要缺失组件时由应用技能按固定兼容来源补齐依赖、配置、适配与验证，保留项目定制及主题。

如需 YSS 技能，先确认当前 CLI 支持 Frontend Profile，再在本目录单独执行 `yss attach --root . --profile frontend --installation skills`。这一步不接管应用源码；`.yss/scaffold.json` 只记录生成来源。
