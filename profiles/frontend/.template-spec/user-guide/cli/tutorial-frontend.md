# Frontend 接入与设计还原

Frontend 用于 Vue 应用工程；Spec 负责业务规格与产品设计，Backend 负责服务端。用户可直接给出明确研发需求，不要求阶段审批或完整流程资产。

先读 `yss version` 与 `yss init --help`。frontend 从 CLI 3.2.0 开始支持，3.1.4 及以前不支持；所用程序应在帮助中列出 frontend 并内嵌对应 Bundle，再执行：

```text
yss init --root <新目录> --profile frontend --installation project
yss attach --root <已有前端工程> --profile frontend --installation skills
yss skills list --root <受管目录>
yss skills ensure yss-design-system --root <受管目录>
yss sync --root <受管目录> --dry-run
yss sync --root <受管目录>
```

`init` 只用于新目录或空目录；`attach` 保护既有文件，冲突时不覆盖。`sync` 不改变 Profile，需要另一类 Profile 时另建明确目标；不要改收据绕过保护。两种安装都提供 13 项默认技能，可选库共 17 项；`skills` 仅装技能、宿主入口及所需参考，`project` 另装项目资料。安装不会创建应用源码、安装依赖或启动服务。

工程入口为 `yss-frontend-application`。提供或定位本次采用的规格、原型、交互说明、设计规范与版本；工作树未提交内容也属于选定输入时，保留实际文件与差异。先读应用 `package.json`、锁文件、入口和项目约定，再按受影响范围实施。

Vue 逻辑使用 `vue-best-practices`，独立状态或可复用接口使用 `create-adaptable-composable`；纯文案与样式不因此引入 composable。设计、原型复核、逻辑原型和词汇维护可分别补装 `yss-design-system`、`prototype-review`、`prototype`、`domain-modeling`。不一次加载全部技能，不把可选设计方法变成开发前置。

已有设计的完成依据是适用工程检查、相同视口/数据/主题/状态下的浏览器对比、关键交互验证。只有构建或旧截图通过不能证明已还原；真实接口缺失时明确“前端已还原（模拟运行，待联调）”，缺少浏览器验证时明确“源码已实现，相关还原验证未完成”。

本 Profile 不分发 SCRM 业务素材、原版 shadcn 自动 CLI、前端生成脚本或测试套件。新建工程使用轻量 `yss-frontend-scaffold-generator`；已有工程与只读 review 直接使用应用技能。

## 新建最小工程

CLI 3.3.0 新增 `scaffold frontend`。Profile 支持不等于生成命令支持，先核对实际帮助；旧 CLI 不识别时按授权升级，不回退旧 Node 生成器。

```sh
yss scaffold frontend --help
yss scaffold catalog --json
yss scaffold frontend --project-name my-frontend --output-dir /absolute/output --dry-run
yss scaffold frontend --project-name my-frontend --output-dir /absolute/output
yss attach --root /absolute/output/my-frontend --profile frontend --installation skills
```

输出父目录必须存在，目标目录必须不存在（包括空目录）。预览零写入，生成只复制内嵌静态资源并修改 package.name，不安装依赖或启动应用。生成收据 `.yss/scaffold.json` 不授予 sync 源码管理权。

最小工程包含 Vue 3、VueUse、TypeScript、Vite、Tailwind、Button/Input 和 ESLint；Node/pnpm 要求以 catalog/package.json 为准。安装前检查父 workspace 范围，随后按 README 冻结安装、lint、typecheck、build、dev 并验证入口。请求/useRequest/Axios/Orval 按任务接入，业务页面交应用技能实现。

attach skills 保留既有源码、package/lock、README/DESIGN 和 .gitignore。新建缺失 .gitignore 记为 user-owned；旧 managed 收据不自动迁移，本地修改/删除后 sync 保留现状，doctor 返回实际差异。不要覆盖来强行通过接入。
