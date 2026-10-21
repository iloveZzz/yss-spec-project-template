# shadcn-vue 作者路线

新高保真优先 `vue-shadcn-prebuilt`：Vue 3 + shadcn-vue / Reka UI。H1/H2 仍表示验证深度，生产 Vue/YSS 技术栈和实现合同不变。React 作者路线已移除；[历史包](shadcn-integration.md)仅只读保留；原生 HTML 适合轻量修改与明确例外，不把原生 Select 的外观修饰称为组件接入。

## 固定来源与适用边界

`assets/shadcn-vue-authoring/registry-manifest.json` 登记官方仓库 `unovue/shadcn-vue`、固定 revision、27 组组件的原文件 URL / 摘要和 MIT 许可。Vue 组件由多个 `.vue` / `index.ts` 组成，不以文件个数或 CLI 版本冒充组件版本。工具链单独锁定 Vue、同版 compiler-sfc、Reka UI、图标及构建依赖；不运行 registry 自动探索或 latest 安装。

优先按 [组件配方](component-recipes.md) 选择。官方 [Blocks](https://shadcn-vue.com/blocks) 提供页面组合参考；不整包引入 Sidebar、图表或额外业务规则。Table 是基础表格，当前示例的筛选、分页、选择来自本地已知行为，不宣称引入 TanStack Data Table。未登记组件先明确任务与验证范围。

## 作者目录及构建

在独立工具目录复制本 Skill 的 `assets/shadcn-vue-authoring/package.json` 与 `pnpm-lock.yaml`，用 `pnpm install --frozen-lockfile --ignore-scripts` 物化依赖；不要在共享 Skill 内安装。已物化工具可断网重复构建。配置 schema 保持 1：

```json
{"schema_version":1,"title":"资料查询","entry":"entry.ts","scenarios":"scenarios.json","density":"compact"}
```

```sh
node .agents/skills/yss-prototype-stage/scripts/build-shadcn-vue-prototype.mjs \
  --project-root "$PROJECT_ROOT" --feature records-vue --profile H2 \
  --toolchain "$AUTHOR_TOOLS" --config "$AUTHOR_DIR/prototype.config.json"
```

入口可为 TS/JS，通过 `createApp` 挂载 `.vue` 页面；保留无 config 的查询 starter，以及 `--entry` 入口，两者互斥。CLI density 优先于 config；默认 compact，comfortable 可选。路径相对配置目录，不得越界或逃逸符号链接。支持本地 TS/JS、JSON、CSS、图片及 Vue SFC 的 script/script-setup、HTML template、普通/ scoped CSS；不执行外部块、自定义块、预处理器或 CSS module。依赖使用固定工具目录，组件别名为 `@/components/ui/<name>`；上游原始 registry 别名仅由构建器映射。

Vue 在作者侧编译，接收者只拿到普通 HTML、IIFE、本地样式、场景与资源，无运行时模板编译、网络请求或安装要求。构建记录实际作者资源、使用的组件文件、固定依赖、锁、源码与主题摘要；临时目录验证后原子落盘，失败清理，非空目标拒绝覆盖。代码静态限制不是任意不可信代码沙箱；运行原型时仍须浏览器断网与交互验证。

## 场景、组件与证据

新企业原型使用 [企业工作区](enterprise-workspace.md) 应用壳，单页入口兼容，多页使用 `mountWorkspace(definition)`。构建 schema 和密度优先级不变。workspace-standard.config.json 和 workspace-glass.config.json 提供同输入演练，组合场景通过 `compose-workspace-scenarios.mjs --check` 绑定原始输入。

用 `window.prototypeRuntime.initialize()` 获得当前场景的全新数据，根组件按 ticket 重建；Vue `nextTick` 后调用 `ready(ticket)`。Vue `app.config.errorHandler` 接入 `prototypeRuntime.showError`；错误调用 `fail` 并显示错误，未知 hash 不回退正常场景；每次切换清除草稿、菜单与 Teleport 浮层。初始化确认只证明声明的初始化完成，不代替行为断言。

- Vue Select 用 `v-model`、`update:modelValue` 和 `--reka-select-trigger-width`；不复制 React 事件及 Radix CSS 变量。
- Sheet/Dialog 关闭回到实际触发器，菜单转详情避免两个浮层抢焦点。
- Field 显式关联 label、说明、错误和首错焦点；InputGroup 的边框与焦点环由外层统一。
- 根 DESIGN 与本地 Token 角色决定主题；玻璃仅为已选示例外观，减少透明和减少动效均需计算样式验证。

`export-vue-patterns.mjs --project-root "$PROJECT_ROOT" --output "$OUTPUT" --toolchain "$AUTHOR_TOOLS"` 输出原五类页面模式、搜索/日期两个变体、工作区和组件状态展示。完整配置、页面及共同场景在 `assets/vue-business-patterns/`；查询、只读、空态、加载、表单失败重试可复现。审批、冲突恢复、分析和组件状态展示同样使用 Vue 组件；不再需要 React 工具链。

H2：`implementation.framework` / `component_basis` 为 `vue-shadcn-prebuilt`，`runtime_build_required=false`，`library_package=shadcn-vue`，来源 `source-snapshot`，填写固定 `registry_revision`、`build_provenance_ref`、组件覆盖、DESIGN / Token 摘要。H1 来源留在 adapter manifest。沿用 Prototype Evidence v4、Visual Baseline v1、比较 v2 和六轴 QA，不新增批准状态。

使用 `prototype-contract.mjs validate-project` 校验新包；有 `--project-root` 时核验当前规范，无参数则验证便携快照。旧 React 包仅通过显式 `--allow-legacy` 只读校验，不能重新封存；迁移创建新目录，禁止改写旧批准资产。

构建与实际浏览器验证统一走 [verify-prototype-design](prototype-verification.md)；缺工具或跳过不能报告通过。
