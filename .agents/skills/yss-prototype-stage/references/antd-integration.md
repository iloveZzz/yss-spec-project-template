# AntD 组件知识与条件预构建

默认用原生 HTML/CSS/JS；当复杂表格、树选择、日期范围等简化模拟会改变评审结论时，记录 `selection_reason` 并使用 `react-antd-prebuilt`。复杂组件的出现不是自动启用条件，先判断本次实际要验证的行为。两条路线都交付 `index.html` 与完整本地资源，接收者无需 Node。预构建仍在浏览器运行 React；不是零 JavaScript，也不是生产 YSS 组件证明。

## 组件选择

[全量组件索引](antd-component-catalog.json) 固定官方来源、版本、分类、废弃状态及链接：73 个基础目录条目（包含已废弃 List），6 个重型组件单列外部来源。Icon 属于 `@ant-design/icons`；目录条目不等于 `antd` 直接导出。默认排除废弃组件。实际使用前按锁定版本查询；不要把官网当前页自动当成项目版本。

首批选型覆盖 23 种语义：Layout、Menu、Breadcrumb、Tabs、Button、Typography、Form、Input、InputNumber、Select、Checkbox、Radio、Switch、Table、Pagination、Tag、Descriptions、Empty、Modal、Drawer、Alert、Spin、Message。组件知识可查不代表每种组件已有本地实现；可运行 starter 覆盖查询列表、详情、编辑弹窗、失败恢复。原生详情使用 dialog，AntD 详情使用 Drawer。其他变体按实际状态矩阵补充。

Table 首先限定分页、筛选、选择与操作；编辑、虚拟滚动、拖拽按需求验证，不从少量模拟数据推断性能。树控件明确勾选传导、禁用与异步加载；日期明确清空/非法输入/区间；Upload 只模拟交互，不把模拟成功标为服务端接收。ProTable 等重型组件只作为模式参考，另行评估依赖。

## 资料与版本

官方事实入口：[CLI](https://ant.design/docs/react/cli-cn/)、[LLMs/Markdown](https://ant.design/docs/react/llms-cn/)、组件源码。优先按组件查询，避免每次加载整个站点。

当前作者工具固定 AntD 6.6.4、React/ReactDOM 19.2.4、esbuild 0.28.2、CLI 6.6.4，由 `assets/antd-authoring/package.json` 和 `pnpm-lock.yaml` 持有版本。更新时重新生成目录/来源记录并运行脚本和浏览器验证，不自动追随 latest。

CLI 按 minor 快照选择，可能回退到更早 minor 或 major；`--version` 不是补丁版本精确性的证据。采集器记录 requested/resolved snapshot 及原始摘要；未命中同 minor 时明确拒绝，补固定源码证据。`design.md` 是 major 粒度的默认 light 参考，根 `DESIGN.md` 才是项目权威。`zeroRuntime` 只关闭运行时样式生成，不移除 React；本适配器保留常规 AntD 样式生成，并用已计算 Token 映射主题，不再执行 compact 算法。

## 作者侧工具（与交付包分离）

在独立作者目录安装依赖，禁止在 canonical Skill 或生成投影内安装，禁止把 `node_modules` 和 lockfile 放入原型交付目录。

```bash
mkdir -p docs/.scratch/<feature>/design/authoring
cp .agents/skills/yss-prototype-stage/assets/antd-authoring/{package.json,pnpm-lock.yaml} docs/.scratch/<feature>/design/authoring/
pnpm --dir docs/.scratch/<feature>/design/authoring install --frozen-lockfile
node .agents/skills/yss-prototype-stage/scripts/collect-antd-reference.mjs \
  --toolchain docs/.scratch/<feature>/design/authoring \
  --version 6.6.4 --output docs/.scratch/<feature>/design/antd-reference
```

采集器默认缓存上述 23 个组件，可用 `--components Table,Select,DatePicker` 按需指定。CLI 尚缺的条目（例如此版本的 Util）必须补读官方源码，不伪造 API。返回的 `runtime_compatibility_verified=false` 只能由实际原型验证补足，采集不是批准。

## 构建与验证

原生完整业务流程 starter：

```bash
node .agents/skills/yss-prototype-stage/scripts/prototype-contract.mjs prepare-flow \
  --project-root . --root docs/.scratch/<feature>/design/prototypes \
  --feature <feature> --pattern workbench
```

真实 AntD starter（初次可用默认示例；定制后 `--entry` 指向作者目录中的 JSX 源文件）：

```bash
node .agents/skills/yss-prototype-stage/scripts/build-antd-prototype.mjs \
  --project-root . --feature <feature> \
  --toolchain docs/.scratch/<feature>/design/authoring \
  --reason '<说明简化模拟如何影响本次评审结论>'
```

输出是 IIFE bundle、Token/CSS、作者 JSX、构建来源和第三方许可；`build-provenance.json` 绑定实际包版本、作者 lock、源码及主题摘要。已有目录拒绝覆盖。继续修改原型时选择新版本工作目录，避免重写冻结截图与用户确认。`--entry` 当前接受单个 JSX bundle，额外资源须先补明确的本地打包支持，不能静默漏交付。

两条路线统一 `seal-project` / `validate-project`、六轴 QA、Visual Baseline 和用户确认。`react-antd-prebuilt` 的 evidence 声明 `runtime_build_required=false`、`framework=react-antd-prebuilt`、`selection_reason`，组件事实仍绑定实际版本、组件集合、项目 DESIGN/Token digest 与来源 manifest；额外提供 `build_provenance_ref`。它不复用已退役 `react-antd-6` 路线。

将包复制到独立目录，用 `file://`、禁用网络，验证 desktop/narrow、查询、详情、保存/失败重试、空/加载/权限/冲突、场景重置、键盘焦点、实际 32px 默认控件与主色。静态扫描有边界：编译后的依赖不按网络关键词判断，必须以真实浏览器的请求、console、状态证据复验。若离线小样不通过，记录阻塞，不自动换成需要服务器的工程。

维护回归：`tests/run-scenarios.mjs`；配置 Playwright 和独立 `YSS_ANTD_TOOLCHAIN` 后运行 `tests/workbench-smoke.mjs`。模板示例与截图仅验证 starter，不代替具体产品独立评审和批准。
