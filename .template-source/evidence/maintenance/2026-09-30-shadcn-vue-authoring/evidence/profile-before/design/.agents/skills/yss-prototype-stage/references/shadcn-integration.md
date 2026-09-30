# shadcn/ui 原型组件与离线预构建

高保真原型主要使用原版 shadcn/ui + React，`component_basis=react-shadcn-prebuilt`；H1/H2 仍按要验证的风险选择。用户允许原型运行 React，不代表生产 Vue/YSS 技术栈发生变化。低保真、简单局部修改或现有原生页面可继续使用 `html-css-js`，记录复用理由即可，不为使用组件而重做已批准页面。

## 来源与适配

shadcn/ui 分发可修改的组件源码，不以 CLI 版本冒充组件版本。`assets/shadcn-authoring/registry-manifest.json` 保存固定官方 revision、文件 URL 与摘要，`ui/` 保留原始源码及 MIT 许可。当前固定 24 个组件及使用条件见 [组件配方](component-recipes.md)，源码清单以 registry manifest 为准；Table 是基础表格，不宣称自带筛选、分页或虚拟列表。业务行为由已评审的状态矩阵定义。

优先阅读采用组件的源码；新增组件先固定同一上游 revision，登记依赖、许可与摘要，并验证必要的交互。不要按当前官网或 `latest` 自动更新作者环境。工具版本和传递依赖由 `package.json`、`pnpm-lock.yaml` 固定，安装仅发生在独立作者目录。

根 `DESIGN.md` 仍为视觉权威。`assets/prototype-theme.css` 提供共享紧凑布局，`theme.css` 把 shadcn 语义变量映射到项目 Token，覆盖字体、配色、圆角、控件高度和页面密度。上游默认黑白主题、字体、色值不能覆盖项目规范。修改映射后重新构建并检查计算样式；不能只确认 class 名存在。

默认主题规则见 `yss-design-system/references/prototype-default-theme.md`。既有页面保持原密度时显式选择 comfortable 或沿用原主题；不得覆盖批准版本。adapter manifest 的 `visual_preset` 记录本次选择，旧包缺该字段仍只读兼容。

## 构建

```bash
mkdir -p docs/.scratch/<feature>/design/authoring
cp .agents/skills/yss-prototype-stage/assets/shadcn-authoring/{package.json,pnpm-lock.yaml} docs/.scratch/<feature>/design/authoring/
pnpm --dir docs/.scratch/<feature>/design/authoring install --frozen-lockfile
node .agents/skills/yss-prototype-stage/scripts/build-shadcn-prototype.mjs \
  --project-root <project-root> --feature <feature> --profile H2 \
  --toolchain <project-root>/docs/.scratch/<feature>/design/authoring
```

H1 使用 `--profile H1`。新业务使用 `--config <作者配置.json>`：schema_version=1，title、entry、scenarios 相对配置文件所在作者目录解析；可选 `density: compact|comfortable`，省略时新原型选择 compact；CLI `--density` 显式值优先。支持该目录内 TS/TSX/JS、JSON、CSS 和本地图片组成的实际依赖图。固定组件使用 `@/registry/new-york-v4/ui/<name>`；仅允许已登记工具依赖。`--entry <单文件.tsx>` 保留兼容，与 --config 互斥。starter 和[业务模式](business-patterns.md)只是示例，必须替换为当前需求和状态来源。越界、符号链接逃逸、远程资源和未登记依赖拒绝构建。原生轻量路线仍用 `prototype-contract.mjs prepare-static|prepare-flow --pattern workbench`。

产物位于 `docs/.scratch/<feature>/design/prototypes/`：普通 script 加载的 IIFE、已生成的 Tailwind CSS、本地 Token、场景、源码来源与许可证。React 在浏览器运行；接收者不需要 Node、组件安装、构建服务器或网络。先在 design/build 下完成临时构建、来源及离线校验，再原子落盘；失败清理临时目录。非空目录拒绝覆盖。新版本使用新工作目录，不覆盖批准快照。

## 证据与 QA

构建来源记录源码、组件 revision、依赖锁、主题映射摘要；不创建第二份批准状态。H2 的 `implementation.framework=react-shadcn-prebuilt`、`runtime_build_required=false`；`prototype_library_facts` 使用 `source=source-snapshot`、`library_package=shadcn/ui`、`registry_revision`、`manifest_ref/digest`、`components_covered`、`build_provenance_ref` 和现有 DESIGN/Token 摘要。不填写虚构的 shadcn 组件 semver。H1 只用已有 visual_review 证据，组件来源留在 adapter manifest，不额外增加门禁。

两条路线都执行 `seal-project` / `validate-project`、六轴 QA、Visual Baseline 和当前用户确认。复制到独立目录、断网以 `file://` 实测两种视口、场景重置/深链接、键盘、焦点、console 和资源加载。静态扫描不证明编译依赖完全无网络行为。

## React AntD 退役

停止生成 `react-antd-prebuilt`，移除作者模板、构建/采集脚本和组件目录。旧原型、fact pack、批准记录不改写；`validate-project --allow-legacy` / `validate-evidence --allow-legacy` 仅用于只读检查，不能封存新 AntD 版本或关闭当前门禁。在途修改生成新的 shadcn 或原生工作版本并重新确认。

项目设计 Token 的既有来源、生产 Ant Design Vue/YSS 组件与本次 React AntD 原型路线退役分开维护；本原型不调用 `yss-ui`，不证明生产组件兼容，也不将示例代码转入生产。

共同场景使用 JSON 与派生脚本，初始化协议见 [比较工具](comparison-tool.md)。`validate-project --project-root <项目根>` 额外检查当前 DESIGN/Token 摘要；省略该选项只证明便携包内部完整。历史批准包仍只读，现有生命周期漂移机制继续生效。
