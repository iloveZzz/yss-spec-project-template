# 初始化与存量接入

仅在创建应用、接入本技能技术栈或调整工具链时读取。先识别空目录与存量工程，版本与命令以目标项目和当次官方资料为准。

## 存量工程

- 先查看 Git 状态、入口、`package.json`、锁文件、Node/pnpm 版本约定、路由、HTTP 客户端、样式入口及现成组件。保留未提交改动，不通过重建目录、覆盖配置或更新锁文件消除问题。
- 实际 scripts 优先。参考工程 `yss-frontend-ui` 的 `lint` 带 `--fix`，另有 `lint:check`；不能把脚本名当成只读保证，也不能假定目标项目有相同脚本。
- VueUse、vue-hooks-plus、shadcn-vue 按任务所需接入。复用符合当前技术基线的能力；迁移时检查受影响调用方与行为，删除已被替代的实现、配置、导出和测试，不保留双栈兼容层。只处理本次范围。
- `components/ui` 或对应别名下已有组件时先读源码与用法。shadcn-vue 生成的本地源码可能经过业务定制，新增组件不等于允许覆盖旧组件。
- 新依赖前核对 `engines`、`peerDependencies`、现有 Vue/TypeScript/Vite/Tailwind 版本及锁文件解析结果；不要用强制忽略 peer 冲突掩盖不兼容。

## 空目录新建

- 确认目标路径及已有文件；空目录才走初始化。目录已有业务资产时按存量流程处理，脚手架提示覆盖不能视作授权。
- 优先使用项目已有且可运行的初始化方法。本版本不分发应用脚手架或 `yss-frontend-scaffold-generator`，不把该技能设为依赖。没有现成方法时，从官方 [create-vue](https://vuejs.org/guide/quick-start.html) 或 [create-vite](https://vite.dev/guide/) 核对候选精确版本、Node 要求与选项后初始化；已有目录不能因初始化提示而被覆盖。
- 不把 `@latest` 写成固定执行方案。实际执行记录选中的脚手架版本；生成后核对依赖、`packageManager` 与 `pnpm-lock.yaml`，用锁文件保证可复现。
- 采用 Vue 3 + TypeScript + ESM + Vite + pnpm；需要页面导航时加 Vue Router，需要跨页共享状态时加 Pinia。测试与质量工具沿用团队约定或本次行为需要，不勾选用不到的平台能力。
- 初始化完成先使入口运行，再接入所需组件和一个真实页面。不要一次创建空的权限、插件、微前端、代码生成或部署体系。

新工程与新增页面采用 [项目与页面目录规范](project-structure.md)。根组件为 `App.vue`，页面进入 `views/<可选业务分组>/<页面名>/index.vue`，每页必须保留 `components`、`hooks`、`schemas` 三目录。新工程统一使用 `hooks`，不创建并行的 `composables` 树；无内容目录以 `.gitkeep` 保留，不造无用逻辑。存量页面只有在明确迁移范围内才调整。

按实际文件检查目录、职责与调用方向；已有结构检查时复用，不要求新增脚本或修改构建前置。`schemas` 为普通 TypeScript 页面定义与校验，和 OpenAPI 生成 DTO 分开。

## shadcn-vue 接入

- 先核对 [Vite 安装说明](https://www.shadcn-vue.com/docs/installation/vite) 与本项目版本。CLI 的 `init`/`add` 会写文件，使用已核验的精确 CLI 版本，只生成所需组件并审阅差异。
- 有 `components.json` 时沿用其样式、CSS 入口、别名与组件输出目录，不重复初始化。没有时按当前目录布局建立；不要另造第二套 `cn` 工具或全局样式入口。
- TypeScript 实际参与检查的配置与 Vite 解析配置必须指向同一别名；存在 `tsconfig.app.json` 等引用配置时核对生效位置，不能只改根配置让编辑器通过。
- 使用 Tailwind 4 与 `@tailwindcss/vite`，按实际入口装配 CSS。迁移完成的范围删除不再消费的 Tailwind 3/PostCSS 配置，不保留两套样式管线。
- 组件原语使用 `reka-ui`，依据实际版本核对 props、事件和 CSS 变量。替换范围内移除 `radix-vue` 的导入、依赖和适配分支；不只改包名而留下旧调用。
- 全局样式只导入一次；将项目设计 token 映射到组件使用的语义变量，如 `background/foreground`、`primary/primary-foreground`、`border`、`ring`。保留变量的颜色格式，避免对完整颜色值重复套 `hsl()`。参考 [主题说明](https://www.shadcn-vue.com/docs/theming)。
- 主题变量作用域覆盖应用根与弹层挂载位置。Dialog、Popover 等 Teleport 到 `body` 后也应继承正确主题、字体和层级；仅放在页面局部容器或 scoped CSS 的 token 不足以保证这一点。
- 沿用产品设计的密度、尺寸与交互，组件默认样式只是起点。页面还原与业务状态见 [设计交接](design-handoff.md)，请求和表单见 [工程约定](engineering.md)。

## 当前版本的已知依赖问题

随附 vue-hooks-plus 补丁的 [MIT 许可证](../assets/patches/VUE-HOOKS-PLUS-LICENSE.txt) 与补丁一同保留；复制或分发补丁时保留原版权与许可。

- 来源维护记录指出 `vue-hooks-plus@2.4.3` 的 ESM 入口未设置 `throttleWait` 时仍创建 0ms timer，且未注册清理。本版本保留 [精确版本 ESM 补丁](../assets/patches/vue-hooks-plus@2.4.3.patch)，不分发回归测试；导入补丁不表示本轮重新验证过依赖。先核对锁定版本、原源码及已有补丁；匹配且当前任务需要时复制补丁到工程 `patches/`，合并到 `pnpm-workspace.yaml` 的 `patchedDependencies`，以 `vue-hooks-plus@2.4.3` 为键，值为实际相对补丁路径，再通过 `pnpm install` 更新锁。不能覆盖其他补丁或手改锁 hash。
- 使用目标工程现有测试能力核对实际 ESM 代码：无节流时不创建 timer、显式/响应式节流和卸载瞬间清理；不通过先推进 0ms 来掩盖残留。测试解析需与 Vite 的 ESM 入口一致，按项目 Vitest 版本核对内联和入口解析；没有执行时明确保留未验证项。
- 不为选中 hooks 的 ESM 入口而关闭其他依赖的浏览器映射。来源工程曾使用 `mainFields: ['module', 'browser']` 并内联 hooks 测试；不能直接套用到目标工程。单独 `['module']` 可能破坏 Axios 的 browser 映射，删除配置也可能让测试退回未打补丁的 CJS。按实际版本验证 hooks 生命周期和真正引用 HTTP 客户端的浏览器构建，不只看空入口构建。
- 此补丁只处理该精确版本的 timer 和动态切换，不维护 CJS/CDN 入口，也不改变上游取消 Promise 的全部语义。版本升级或源码不同后重新核对，不把补丁自动套到其他版本；官方已修复时移除本地补丁并重跑相关回归。
- 来源记录核对过 `reka-ui@2.11.0` 使用 `@floating-ui/vue@2.0.1` 并移除其 `vue-demi` 链；这是历史依赖观察。目标工程仍需核对实际锁文件与调用路径，优先使用符合当前基线的正式版本，验证安装与实际弹层，不以旧桥安装脚本许可或别名掩盖问题。

## 脚本与持续集成

以下是可采用的职责，不代表目标项目已经有同名脚本。先读取 `package.json`，新建时再按已安装工具定义：

| 职责 | 脚本约定建议 | 注意 |
| --- | --- | --- |
| 开发与构建 | `dev`、`build`、`preview` | 沿用实际 Vite/工作区入口；preview 不等于生产部署 |
| 目录结构 | 复用已有检查；没有时直接核对文件 | 不新增自定义检查脚本或构建门禁；不自动移动业务文件 |
| 类型检查 | `type-check` 或 `typecheck` | Vue 工程采用兼容版本的 vue-tsc，指向实际应用配置 |
| 只读静态检查 | `lint:check` | 检查实际命令不含 `--fix`；修复脚本单独命名 |
| 测试 | 已有 `test` 或对应脚本 | 非交互 CI 模式按所选工具实际参数，不虚构脚本存在 |
| OpenAPI 客户端 | `generate:api` | 使用 [OpenAPI 配置](openapi.md) 的真实脚本与本地契约，生成后检查差异和类型 |

- 项目已有或本次明确涉及 CI 时，按锁定的 Node/pnpm 版本执行 `pnpm install --frozen-lockfile`，再调用真实存在且适用的 lint、类型检查、测试与构建；不因加载本技能新建 CI。锁文件不一致时修复依赖声明与锁文件来源，不在 CI 悄悄解除冻结。见 [pnpm install](https://pnpm.io/cli/install)。
- 发现 Vue 2 桥接等过时依赖时先追踪真实依赖链，优先选已移除旧支持的正式版本。没有可用版本且当前范围必须移除时，用精确版本补丁修改实际源码/类型，并以包管理器支持的依赖覆盖同步依赖图；验证干净安装及所有实际消费者。不要仅用别名、允许安装脚本或隐藏警告伪装移除，也不盲目删除仍被其他能力使用的传递依赖。
- 新建非平凡业务逻辑保留一个能验证关键行为的测试；纯样式或文案修改不为凑流程新增测试。开发阶段按改动选择必要验证，具体见 [验证参考](verification.md)。
- 构建通过不代表接口联调、浏览器交互或发布成功；交付时说明实际执行结果与未覆盖范围。
- 提交、推送、MR、发布和部署分别遵循已有授权。Git remote 指向 GitLab 时使用项目配置的 `git`/`glab` 工作流，缺少 CLI 或权限时说明具体阻碍，不擅自切换平台。
