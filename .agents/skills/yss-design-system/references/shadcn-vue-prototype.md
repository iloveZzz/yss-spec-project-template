# 新项目 Vue 高保真原型

用于用户需要新项目高保真浏览器页面。后台工作台缺少项目设计基线时参考 [高保真主题起点](high-fidelity-default-theme.md)。先依据任务决定页面、内容、状态与视觉方向；风格、颜色、排版、密度可调整。低保真不需要该工具链，用户要求其他格式时遵循用户要求。

## 固定来源与独立使用

- 组件仓库 `https://github.com/unovue/shadcn-vue`，固定提交 `67c9a3926dc0a854507b325c6337ff2210d16379`；逐文件路径、来源及 SHA-256 见 [清单](../assets/prototype/registry-manifest.json)。更新组件时同步来源清单。按需获取，清单之外的组件或依赖不得猜测来源。
- 使用 [package.json](../assets/prototype/package.json) 与 [pnpm-lock.yaml](../assets/prototype/pnpm-lock.yaml)：Node `^20.19.0 || >=22.12.0`、pnpm `10.32.1`。组件源码及 `node_modules` 不随技能分发。[上游许可](../assets/prototype/SHADCN-LICENSE.txt)随原型交付保留。
- 优先使用本技能精选指导；宿主支持且官方 shadcn-vue Skill 可用时，可针对组件 API、组合和主题按需协作，不要求安装。指导参考上游 Skill 提交 `d9aec43ae5eb258d62d532cc788c0f693c07bd5b`；它与组件提交不同，不能假设版本兼容。人工审查后更新固定版本，不能静默使用 `@latest` 或可变默认注册表。

## 准备流程

新建原型执行以下流程；用户明确要求迭代已有原型时，先读取其依赖、锁、组件及目标范围，按授权局部修改，不重新初始化、静默重装或覆盖用户文件。目标非空且无修改授权时保护原状。

1. 新建时在用户约定位置创建新的空原型目录；存在任何用户文件时停止，另选新目录，不覆盖、不静默升级。复制本技能 `assets/prototype/package.json`、`pnpm-lock.yaml`、[Vite 配置](../assets/prototype/vite.config.ts) 和许可证到新目录。命令在该原型目录执行，不在技能或生产目录安装。
2. 根据页面需要查清清单中组件的文件及依赖，例如 `ui/button/`、`ui/card/` 下必要文件。将每个 `source_url` 的 `https://github.com/unovue/shadcn-vue/blob/` 前缀替换为 `https://raw.githubusercontent.com/unovue/shadcn-vue/`，保留提交及路径；下载至原型目录外的新临时文件。不得使用可变 registry 或凭空补充未知文件。
3. 创建 `src/lib/utils.ts`，以 `clsx` 和 `tailwind-merge` 实现 `cn(...inputs) = twMerge(clsx(inputs))`；创建 `index.html`、`src/main.ts`、`src/App.vue` 和 `src/style.css`；入口导入 CSS 和 App。CSS 使用 `@import "tailwindcss";` 和 `@import "tw-animate-css";`，以支持固定组件中的动画工具类，并依据原型实际组件需要提供语义变量与 `@theme inline` 映射。动画可按设计意图调整或关闭，尊重用户的减少动态效果偏好。
4. 使用 pnpm 10.32.1 在原型目录执行 `pnpm install --frozen-lockfile`，再执行 `pnpm exec vite --host 127.0.0.1`。本机无对应版本时先在隔离工具环境准备，不修改用户全局配置。浏览器实际打开页面后才声称已渲染；需要交互时实际操作要验证的路径。

原型默认模拟数据，不连接真实接口。记录组件来源与摘要、实际包及锁文件、许可证、运行方式、实际检查和未验证范围。网络、组件、依赖或浏览器不可用时保留已有设计成果，说明具体缺口；按用户需要交付可审阅的降级成果，列出未取得的组件和未验证的交互，不声称原型已运行或使用未取得组件。

## 按需扩充清单

当前清单涵盖 Switch、Accordion、Radio Group、Slider、Progress、Avatar、Collapsible、Scroll Area 等常用控件及既有组件；只承诺清单中可核验的文件。需要清单以外的组件时，当前设计记录缺口，不从未经登记来源猜测或直接执行代码。维护者可在明确更新任务中，从已固定的上游提交取得所需组件及其跨组件依赖，核对上游许可与版本，计算每个源码文件的 SHA-256，登记路径、来源及摘要。同步受影响的技能副本；是否构建或运行按当前任务需要选择。不要仅因为上游新增文件就自动更新固定清单。

## 使用组件与主题

用户和设计方案决定颜色、密度、排版与范围；组件 API 和嵌套以实际固定组件版本为准。按钮、输入、对话框等先检查其源文件和所需组件，再组合；表单按任务需要表达标签、错误和状态，静态展示不强制引入完整表单库。图标以实际锁定依赖的 API 为准；不要假设所有上游风格使用相同图标规则。

定义语义角色如 background、foreground、primary、border，再按设计意图调节变量和组件；避免把默认配色或固定 preset 当作唯一风格。不能确定组件或库版本时标为未知并停止猜测。组件自身支持焦点或键盘不证明整个页面已经通过无障碍检查。
