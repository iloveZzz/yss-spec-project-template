# YSS 前端应用

Vue 3 + TypeScript + Vite，以 shadcn-vue、Tailwind CSS 4 和 Reka UI 为组件底座，内含本地 Button、Input、VueUse 与 YSS 主题。

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

`components.json` 声明 new-york-v4 风格、CSS 入口和别名，其中 `ui` 指向 `src/components/ui`，`composables` 指向 `src/hooks`。Frontend Profile 的 `shadcn-vue` 技能指导组件开发。新增组件时用兼容版本的 shadcn-vue CLI 运行 `info --json`，核对本地组件与导出，按需从 registry 添加。用 `src/styles/theme.css` 将组件需要的语义色映射到 YSS tokens。

如需 YSS 技能，先确认当前 CLI 支持 Frontend Profile，再在本目录单独执行 `yss attach --root . --profile frontend --installation skills`。这一步不接管应用源码；`.yss/scaffold.json` 只记录生成来源。
