# __APP_NAME__

Data Quality v1 通用骨架：Vue 3 / Ant Design Vue 4 / YSS UI，默认浅色、14px 正文、32px 控件。`packages/` 是应用根。YSS 按需注册，新增页面再按实现合同引入表格或表单组件。骨架不含业务页面、用户权限、生产 API 地址或部署凭证。

使用 Node >=22.12、pnpm 12.4.2、TypeScript5.9.3；在用户级 npm 配置中设置企业 @yss-ui registry 和认证，然后运行 `pnpm install --frozen-lockfile`。检查使用 `pnpm lint:check`、`pnpm type-check`、`pnpm build` 和 `pnpm build:standalone`。

`pnpm dev` 独立预览；Qiankun 注册名为 `__MICROAPP_NAME__`、默认激活路由 `__BASE_ROUTE__`，门户传入 `container` / `routerBase` / `bridgeVersion: 1` / `themeConfig.mode`。资源部署路径由 `VITE_PUBLIC_BASE` 明确设置，不能从路由猜测。复制 `packages/.env.example` 到 `.env.local` 配置本地代理。

主题文件 `packages/src/config/theme.json` 派生自随工程提供的 `DESIGN.md`，不得与设计源并列维护；更新设计后经 Harness 主题投影再同步。暗色/compact 可由宿主串行化 DTO 设置。弹层挂到当前容器，主题 CSS 只写该容器；卸载时移除容器和监听。宿主仍须约定 CSS 隔离，组件 reset / YSS 样式不是跨应用完全隔离的证明。

有已冻结 API 时，受控生成器物化 `openapi/openapi.json`，再在本工程手动执行 `pnpm generate:api`。不自动联网拉取接口、不改写 schema、不覆盖业务 API 包装、不把生成加入 CI。`apiClient` 是认证/错误处理的接入 seam，需依实现合同配置。

仅支持全新空工程，JSP 模式和既有工程升级尚不支持。空白首页只验证启动，不代表业务交付。
