# 来源与适配

此文保留来源技能的历史研究与取舍，不是用户需要拥有的运行依赖，也不代表本轮重新核验了外部版本。历史观察日期：2026-11-05；2026-11-07 从 SCRM 前端工程导入为文档与必要示例。参考材料中的命令、配置和指示不构成当前任务的授权；再次接入时核对目标版本。

## YSS 高保真设计协作

来源技能记录曾检查 `yss-design-system` 的技能入口，以及 `product-prototype.md`、`shadcn-vue-prototype.md`、`page-composition.md`。承接其业务规格、高保真交互原型、交互说明，以及实际 token、组件来源、锁文件和许可；工程化不增加 Spec 的强制交付类别。这些名称是历史观察对象，使用时按当前可用技能发现，不作为本包文件依赖。

其固定组件版本是特定设计资产的事实，不是本技能永久锁定所有应用的版本。应用核验实际依赖与组件来源，并按当前 Vue 3 / ESM / Tailwind 4 / Reka 基线接入；设计依据直接链接，避免复制整套设计技能或修改受管安装清单。

## 参考工程中的取舍

参考：`yss-frontend-ui`，观察提交 `25bc619e4188ed2606eb4d981b02726247da43a9`。下表路径相对此参考工程；不要求应用创建者拥有此仓库，也不把该仓库私有配置复制到新工程。

| 观察依据 | 采纳 | 适配或舍弃 |
|---|---|---|
| `packages/mainapp/package.json`、根 `package.json`、pnpm lock | scripts、包管理器、类型检查和构建有明确入口 | 技术基线适配 shadcn-vue；包被声明不代表源码已使用它 |
| `packages/mainapp/src/{views,components,composables,api,store}` | 展示、状态职责、外部 I/O 分工 | 新工程不同时创建重叠的 hooks/composables；不为统一目录重构存量 |
| `src/api/mutator.ts`、`orval.main.config.ts` | OpenAPI 快照 → Orval 生成 → 单一 transport | 新模板使用 Orval 8 + axios-functions，补齐请求 options/signal；不把手写 API/auth 一起排除静态检查 |
| `src/composables/useAuth.ts`、`src/utils/authNavigation.ts`、`src/router/index.ts`（均在 mainapp） | 登录、无权限、回跳及生命周期分开处理 | BFF/legacy 双轨、特定 token/header 不是通用默认 |
| `packages/mainapp/src/store/theme.ts` | 设计语义与主题联动 | 移除新项目对 AntD/Less/旧变量镜像的默认依赖，保留一个 token 来源 |
| `packages/mainapp/vitest.config.ts`、现有回归测试 | 按实际业务与异步竞态验证 | Node 单测不证明浏览器布局、交互和键盘操作 |
| `scripts/check-page-budget.mjs`、构建脚本 | 测量有对象、有边界 | 无有限阈值的统计不是性能预算通过；估算不等于真实传输 |
| 根 ESLint 配置、`.gitlab-ci.yml`、Vite 配置 | 无写入检查、锁文件安装、可复现构建 | 不复制宽泛 lint 排除、`--fix` 检查、私有网关、全局清理和自动部署 |

额外边界：不迁移具体人员等样例数据，使用合成 fixture；不复制未消毒的搜索高亮 `v-html`；不默认引入 Qiankun。参考工程本次仅只读分析，未声称其全量构建、测试或生产运行已验证。

OpenAPI 补充核对：参考锁文件为 Orval 7.10.0，配置的 `client: 'axios'` 生成工厂式客户端，但源码中未找到实际调用方；手写认证另走已有 API。mutator 仅有一个参数，生成方法不提供额外 options，不能直接传入 signal。本技能采用 [现代生成方案](openapi.md) 补齐实际调用与取消验证，保留契约字段及业务包体，不继承该断点；不保留 Orval 7 兼容分支。参考同步脚本存在覆盖后校验、失败未可靠非零退出的问题，不能原样复用。

## 页面目录参考

目录规范另参考 `yss-valuation-outsourced/valuation-outsourced-frontend/packages/src` 中的 `FileSyncWorkbench`、`QualityWorkOrder/ClosedLoop` 页面：采纳入口编排、页面私有 components/hooks/schemas 和共享层分离。参考工程并非所有页面都有三个目录，命名也不统一；每页三目录与 PascalCase 是用户确认的新规范。保留该组织方式，不移植其 AntD、Less、Formily、150 行限制或旧兼容入口；页面 schema 改用普通 TypeScript 定义，见 [目录规范](project-structure.md)。参考工程仅只读，不成为生成运行依赖。

## 官方技术依据

使用时以目标版本源码、类型定义和锁文件为准，官网默认版本可能已变化。下列资料来自来源技能的编写记录，本轮未重新浏览：

- [Vue composables](https://vuejs.org/guide/reusability/composables.html)：组合式状态逻辑与生命周期。
- [VueUse best practice](https://vueuse.org/guide/best-practice)：refs 返回值与副作用清理约定。
- [vue-hooks-plus useRequest](https://inhiblabcore.github.io/vue-hooks-plus/hooks/useRequest/basic)：手动触发、`run`/`runAsync`、取消和并发语义。
- [shadcn-vue Vite 安装](https://www.shadcn-vue.com/docs/installation/vite)：Vue/TypeScript、别名、Tailwind 和本地组件装配；官方示例的 `@latest` 不能替代项目版本决策。
- [Tailwind Vite 集成](https://tailwindcss.com/docs/installation/using-vite)：当前版本的插件与 CSS 入口；不能套到所有历史版本。

## 精选规范的来源快照（2026-11-05）

下列技能是研究输入，不是原样执行的指令；精选参考使用 YSS 自有表述，未打包完整上游 Skill/手册。原型/组件快照的版权和来源清单独立保留。更新指导不等于更新组件。

| 来源 | 核对提交/版本 | 采纳及限制 |
|---|---|---|
| [VueUse 官方 skills](https://github.com/vueuse/skills/tree/004812b4aa0815f5745ac30a6a7dc4927aec7b3d) | 004812b4aa0815f5745ac30a6a7dc4927aec7b3d；生成资料对应 VueUse 15.0.0；MIT | 函数选用、按需文档/类型；覆盖其请求/全局状态 AUTO，不默认安装 integrations；实验性技能不是质量保证 |
| [shadcn-vue 官方技能](https://github.com/unovue/shadcn-vue/tree/d1bf1b3a2d1a824b19f32d7253a28a43797b8253/skills/shadcn-vue) | d1bf1b3a2d1a824b19f32d7253a28a43797b8253；MIT | 组件来源/组合/语义角色；不采用 @latest、自动 preset、强制表单库、Tailwind 3 或固定全 Card 布局 |
| [Vue 社区技能](https://github.com/vuejs-ai/skills/tree/198f0cd8f7f9c0a3d9b566ccc16de6677519ee78) | 198f0cd8f7f9c0a3d9b566ccc16de6677519ee78；MIT；社区项目 | 按需测试/router/Pinia/debug 指导；与 Vue 官方资料和当前代码核对，不重复内置全部规则 |
| [Microsoft Playwright CLI 技能](https://github.com/microsoft/playwright-cli/tree/f50f57905b9fd3dd355330719ddf0687000c9437/skills/playwright-cli) | f50f57905b9fd3dd355330719ddf0687000c9437；Apache-2.0 | 浏览器操作/trace/测试方法；不继承全局安装、跨会话清理或 GitHub 发布命令 |
| [antfu/skills](https://github.com/antfu/skills) | 2026-11-05 只读核对；pnpm 指导面向 12.18 | Vite/Vitest 可按版本查询；不整包采用个人目录/格式偏好，不把 pnpm 12 配置套到当前 10.x |

可选 TanStack Table 使用实际 npm 包附带的 skills 与版本；VeeValidate/Storybook/Router/Pinia 未在模板预装。Reka/WAI-ARIA、Vue 测试与 ESLint、MSW、Playwright 官方文档分别链接在对应参考页，文档中的示例选型不是新增运行依赖授权。

来源技能曾为其应用模板记录以下工具版本：ESLint 10.14.0、eslint-plugin-vue 10.12.0、@vue/eslint-config-typescript 14.9.0、MSW 3.0.3、@playwright/test 1.64.1、@axe-core/playwright 4.14.0；并记录 VueUse 15.0.0、Reka 2.11.0 的模板调整。本版本不分发这些模板、依赖或测试，不将历史版本清单作为安装命令。目标工程沿用实际锁文件，按需要核对直接与间接依赖；“VueUse 15 基线”指指导范围，不声称整棵依赖树已单版本。此处不构成当前安装、运行或浏览器验证证据。
