# 工程检查、网络模拟与浏览器验证

新建工程、调整接口/依赖、编写回归或明确维护技能时读取。本版本不提供 starter、检查脚本或测试套件；现有项目复用实际工具，缺少工具时按本次需要选用，纯文案不安装整套依赖。检查数量随风险选择，不增加固定数量门禁。

## 静态检查

先读项目的 ESLint、TypeScript 与 `package.json` 配置。Vue 工程可使用兼容版本的 ESLint flat config、eslint-plugin-vue、Vue 官方 TypeScript 配置与 vue-tsc；先确认实际脚本是否写入，不根据 `lint` 或 `typecheck` 的名称推断行为。修复命令是修改动作，静态检查不能代替行为验证。

生成目录可单独排除 lint，手写 transport、services、hooks、权限和组件仍在检查范围。固定 vendor 的命名或页面 index 命名仅作精确规则覆盖，不能为通过检查关闭整个源码树。沿用项目格式，不把样式偏好升级为业务缺陷。

## 请求模拟

优先在网络边界使用 MSW，让业务 service、Orval 生成函数、Axios transport 和页面状态照常执行。直接注入受控 service 仍适合精确验证迟到响应，二者验证不同边界。

已有 MSW 时沿用其版本与配置；新增时核对该版本官方 API，不把来源工程的 MSW 3 导入路径或 Vite 插件配置直接套到其他版本。只在明确的开发模拟入口注册 worker，等待初始化后再挂载依赖它的页面，生产产物不携带 worker/handlers；初始化或请求失败不退回内存成功。

- handlers 依据明确合成或真实契约构造，浏览器/Node 测试共用；有状态的重试场景按实例创建，每个测试重置。
- 测试显式拒绝未匹配请求；断言 URL、参数、状态码、错误/取消与映射，不能只断言 mock 被调用。
- DTO 是类型，不是运行时校验。service 对不可信响应验证，再映射给页面；错误保留，取消不改写为业务成功。
- 开发模拟与真实模式有明确入口；生产构建检查不包含 worker 和 handlers。模拟 HTTP 不是实际 API、认证或权限联调。

## 浏览器与可访问性

已有浏览器设施优先；需要可重复回归时使用 Playwright Test。可用的官方 Playwright 技能只提供操作方法，不授权全局安装、修改其他会话、上传痕迹或发布结果。

运行前核对已有浏览器命令与服务地址，使用身份明确的本地服务、隔离上下文及设计要求的桌面/窄屏视口；不假定 `pnpm test:e2e` 存在。需要安装匹配浏览器时使用项目本地 Playwright 命令，不修改全局包管理器。用 role/name 等稳定定位和自动等待，避免硬编码睡眠；失败保留 trace/screenshot，不用重试掩盖稳定失败。

加载、空态、错误、键盘重试、取消/返回焦点按实际涉及路径验证。`@axe-core/playwright` 在展开后的相关状态扫描，不能关闭规则掩盖问题；自动通过不证明读屏或完整 WCAG 验收。截图需要与实际设计比较才是高保真证据，截图文件存在只说明已采集。

## 与现有测试分工

| 层 | 核心证据 |
|---|---|
| Vitest + Vue Test Utils | 实际挂载/卸载、props/emits、独立状态、错误与竞态；await DOM 更新和真实 Promise 队列 |
| MSW / 本地 HTTP | 真实生成客户端、transport 与 service 边界，参数/包体/错误/取消 |
| Playwright + axe | 真实浏览器行为、布局、键盘与自动可识别可访问性问题 |
| 设计 review / 人工辅助技术 | 设计一致性、任务可用性与自动工具未覆盖的访问体验 |

参考：[Vue 测试](https://vuejs.org/guide/scaling-up/testing.html)、[Vue ESLint](https://github.com/vuejs/eslint-config-typescript)、[MSW 3 变更](https://mswjs.io/docs/migrations/2.x-to-3.x)、[MSW Vite](https://mswjs.io/guides/integrations/vite)、[Playwright](https://playwright.dev/docs/best-practices)、[axe 集成与限制](https://playwright.dev/docs/accessibility-testing)。维护时核对安装版本与类型；不维护旧配置兼容路线。
