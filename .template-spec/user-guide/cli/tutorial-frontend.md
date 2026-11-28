# Frontend 接入与设计还原

Frontend 用于 Vue 应用工程。Spec 负责业务规格与产品设计，Backend 负责服务端。用户可直接给出明确研发需求，不要求阶段审批或完整流程资产。

本教程以 Rust CLI `3.8.0` 与内嵌 Template `5.8.0` 为操作基线。先读 `yss version` 与 `yss init --help`，核对实际版本及 Bundle。以下命令分别对应新方法目录、已有前端工程、补装和同步场景。

```text
yss init --root <新目录> --profile frontend --installation project
yss attach --root <已有前端工程> --profile frontend --installation skills
yss skills list --root <受管目录>
yss skills ensure yss-design-ui --root <受管目录>
yss sync --root <受管目录> --dry-run
yss sync --root <受管目录>
```

`init` 只用于新目录或空目录。`attach` 保护既有文件，冲突时不覆盖。`sync` 不改变 Profile，需要另一类 Profile 时另建明确目标。不要改收据绕过保护。上述 3.8.0 基线为默认 13 项、可用库 17 项；CLI 3.13.0 内嵌的 Template 5.13.0 包含共享 `implement`、`to-tickets` 和 `yss-help`，默认 16 项、可用库 20 项，需使用包含这些变化的 CLI Bundle，旧程序不会随文档更新。`skills` 仅装技能、宿主入口及所需参考，`project` 另装项目资料。安装不会创建应用源码、安装依赖或启动服务。

本版 Bundle 由 `implement` 统筹明确研发，`to-tickets` 按显式请求拆业务票或工程票，具体实现使用 `yss-frontend-application`。局部修改与只读 review 可直接使用应用技能，不要求先建票。提供或定位本次采用的规格、原型、交互说明、设计规范与版本。工作树未提交内容也属于选定输入时，保留实际文件与差异。先读应用 `package.json`、锁文件、入口和项目约定，再按受影响范围实施。

当前模板源码的 Frontend `project` 和 `skills` 两种模式均默认提供 21 项技能，可用库共 27 项。起草或修订 PR/MR 正文使用默认技能 `pr`，通过 PR/MR 交付选定材料使用 `yss-deliver-pr-mr`。用户明确要求复盘 Agent 会话时，可用 `yss skills ensure retro --root .` 补装 `retro`。

组件工程使用 `shadcn-vue`，以工程的 `components.json` 和本地导出为准。`vueuse-functions` 提供官方函数索引及离线参考，按项目版本选用组合式函数。Vue 3 状态与组件逻辑使用 `vue-best-practices`，需要可复用的组合式接口时使用 `create-adaptable-composable`。纯文案与样式不因此引入 composable。设计、原型复核、逻辑原型和词汇维护可分别补装 `yss-design-ui`、`prototype-review`、`yss-prototype-logic`、`domain-modeling`。需要由 A2UI 1.0 消息组合交互原型时，可按需选用 `yss-a2ui-prototype`。不一次加载全部技能，不把可选设计方法变成开发前置。

涉及 FormKit 表单、验证、Schema 或自定义输入时，使用两种模式均默认提供的 `formkit`。先读依赖锁及项目中的 FormKit 配置，按工程版本优先查 Vue 或 Nuxt 官方用法。表单视觉沿用项目已有的 shadcn-vue 组件和主题，FormKit npm 依赖按任务采用。

接续已完成的高保真原型时，读取已有 `prototype-review` 结论中实际验证的流程、视觉决定、演示与待验证范围。正式页面用目标工程的组件、主题、路由和服务重建。比如原型用计时器演示表格加载，工程使用 `yss-frontend-loading` 依据实际请求保留可见旧数据、保护关联动作并支持失败重试。仅模拟的状态和真实联调状态分别说明。

已有设计的完成依据是适用工程检查、相同视口/数据/主题/状态下的浏览器对比、关键交互验证。只有构建或旧截图通过不能证明已还原。真实接口缺失时明确“前端已还原（模拟运行，待联调）”，缺少浏览器验证时明确“源码已实现，相关还原验证未完成”。

本 Profile 不分发 SCRM 业务素材、原版 shadcn 自动 CLI、前端生成脚本或测试套件。新建工程使用轻量 `yss-frontend-scaffold-generator`。已有工程与只读 review 直接使用应用技能。

## 新建最小工程

CLI `3.8.0` 包含从 `3.3.0` 起提供的 scaffold frontend。先核对实际帮助和 catalog，再按本次目标生成。旧程序缺少命令时按安装授权升级。

```sh
yss scaffold frontend --help
yss scaffold catalog --json
yss scaffold frontend --project-name my-frontend --output-dir /absolute/output --dry-run
yss scaffold frontend --project-name my-frontend --output-dir /absolute/output
yss attach --root /absolute/output/my-frontend --profile frontend --installation skills
```

输出父目录必须存在，目标目录必须不存在（包括空目录）。预览零写入，生成只复制内嵌静态资源并修改 package.name，不安装依赖或启动应用。生成收据 `.yss/scaffold.json` 不授予 sync 源码管理权。

最小工程包含 Vue 3、VueUse、TypeScript、Vite、Tailwind、Button/Input 和 ESLint。Node/pnpm 要求以 catalog/package.json 为准。安装前检查父 workspace 范围，随后按 README 冻结安装、lint、typecheck、build、dev 并验证入口。请求/useRequest/Axios/Orval 按任务接入，业务页面交应用技能实现。

attach skills 保留既有源码、package/lock、README/DESIGN 和 .gitignore。新建缺失 .gitignore 记为 user-owned。旧 managed 收据不自动迁移，本地修改/删除后 sync 保留现状，doctor 返回实际差异。不要覆盖来强行通过接入。

## 连接产品 Home

Profile 表达仓库职责，project/skills 表达安装范围，scaffold 单独生成源码。新安装仍默认 project。用户只要源码时不额外 attach，明确需要项目技能时沿用同一已核验的 CLI 完成上述 skills 接入。CLI `3.6.0` 起在 scaffold 成功后返回独立 command.args。核对目标后沿用本次已核验的程序绝对路径执行参数数组。

生成成功后 attach 冲突，保留源码、生成收据和原入口，明确技能接入未完成，不删除工程或退回 project。若有上游 Home/规格且允许修改本仓，优先在已有 README 的规格来源区补充真实入口，再让 AGENTS 引用。已有等价导航继续使用，无上游不造关系。独立技能沿原来源更新，不因加入 Home 转成受管安装。
