# 高保真原型与 Ant Design v6 / Ant Design Vue 版本及技能链路审计

> 调研日期：2026-09-01
> 仓库身份：`template-source`
> 工作单元：`work-unit.template-maintenance-research`
> 范围：只读审计本地规范、技能和一手官方资料；不修改技能、规范、注册表或脚本。

## 1. 结论摘要

当前高保真原型不是由单个技能“一步生成”，而是一条分层链路：YSS 生命周期与项目设计系统先约束范围和规范，低保真原型经独立评审后，Codex Product Design 先确认 brief、生成并选择视觉目标，再把图像转成可交互 React/Vite 原型，随后由 Design QA、AntD CLI 事实证据、浏览器验证和用户确认闭环。

总体判断：**架构方向正确，但执行合同尚未完全闭合，建议增强。**

- 正确之处：生命周期、项目 Token、上游 Ant Design v6 事实、视觉产出、独立低保真评审、浏览器验证和生产 Vue API 已经分层；`yss-antd-design` 明确禁止把 React props/hook 复制到 Vue；`docs/design/design.md` 的主体与当前官方 `DESIGN.md` 在中后台定位、系统字体、14px 正文、4px 网格、6px 默认控件圆角、8px 容器圆角和三层表面模型上高度一致。当前工作树又把高保真原型明确为项目紧凑规格（28px 控件与更紧凑的 padding/gap），这是项目覆盖，不是官方默认值。
- 关键事实：截至 2026-09-01，本轮 `npm view` 与官方包元数据表明 React `antd` 最新正式版为 `6.6.2`，`@ant-design/cli` 为 `6.6.2`；`ant-design-vue` 最新正式版仍为 `4.2.6`。因此“默认 antdv6”只能解释为**原型使用 React Ant Design v6 的视觉与组件事实**，不能解释为“Ant Design Vue 6 正式版”或 Vue 生产 API 版本。
- 主要缺口：Product Design 自带启动模板只有 React 19 + Vite，没有 `antd`；其预检强制 `npm install`，与仓库“前端优先 pnpm”不一致；YSS 原型合同没有把“安装并锁定目标 `antd@6.x`、注入项目主题、将输出落到合同路径”写成显式适配步骤。
- 规范漂移：`prototype-evidence-template.yaml` 把官方默认描述成 `#1677ff / Inter / 8px`，但当前官方 v6 `DESIGN.md` 使用系统字体和 6px 默认控件圆角；`docs/design/design.md` 末尾引用的 `antdv6-design.md` 在仓库中不存在。
- 无障碍缺口：现有规范主要停留在“可见焦点 + 对比度复核”。按 WCAG 2.2 公式计算，白字在项目主色 `#3371ff` 上约为 `4.245:1`，低于普通小文本 AA 的 `4.5:1`；hover 色 `#4096ff` 上约为 `2.990:1`。当前证据模板没有键盘、语义/标签、目标尺寸、缩放、减少动效及自动化 a11y 结果字段，不能形成可复验证据闭环。

## 2. 一手版本事实：必须区分三种对象

### 2.1 React Ant Design v6

本轮执行：

```text
npm view antd version dist-tags --json
version = 6.6.2
dist-tags.latest = 6.6.2
```

官方 `antd@6.6.2` 包声明自己是 React 组件实现，并要求 `react >= 18.0.0`、`react-dom >= 18.0.0`：[antd 6.6.2 package.json](https://raw.githubusercontent.com/ant-design/ant-design/6.6.2/package.json)。官方 v5→v6 迁移文档同样明确 v6 是 React 技术升级、需要 React 18+、现代浏览器和默认 CSS variables：[Ant Design v6 migration](https://ant.design/docs/react/migration-v6/)。

当前官方 `DESIGN.md` 自述其描述的是 **Ant Design v6 默认 Light 主题**，不是 Vue 组件 API，也不是项目覆盖：[Ant Design DESIGN.md](https://raw.githubusercontent.com/ant-design/ant-design/master/DESIGN.md)。

### 2.2 Ant Design CLI

本轮执行：

```text
npm view @ant-design/cli version dist-tags --json
version = 6.6.2
dist-tags.latest = 6.6.2
```

CLI 的官方定位是查询 React `antd` 组件、demo、token、semantic 和面向 AI 设计工具的 `design.md`；`design.md` 命令是 v6 特性：[Ant Design CLI](https://ant.design/docs/react/cli/)、[design.md 指南](https://ant.design/docs/react/design-md-cn/)、[@ant-design/cli 6.6.2 package.json](https://raw.githubusercontent.com/ant-design/ant-design-cli/v6.6.2/package.json)。

因此本仓库把 CLI 限定为“原型事实引擎”，不把它当生命周期入口或 Vue API 文档，是正确边界。

### 2.3 双轨版本边界（本报告采用的明确口径）

本轮执行：

```text
npm view ant-design-vue version dist-tags --json
version = 4.2.6
dist-tags.latest = 4.2.6
```

官方 `ant-design-vue@4.2.6` 包元数据明确名称、版本和 Vue 实现身份，并声明 peer dependency `vue >= 3.2.0`：[Ant Design Vue 4.2.6 package.json](https://raw.githubusercontent.com/vueComponent/ant-design-vue/4.2.6/package.json)。官方 Releases 当前把 `4.2.6` 标为 Latest：[Ant Design Vue Releases](https://github.com/vueComponent/ant-design-vue/releases)。npm 的公开版本页也将 `4.2.6` 标为 `latest`，未显示 v5/v6 正式版：[ant-design-vue npm versions](https://www.npmjs.com/package/ant-design-vue?activeTab=versions)。

本报告采用用户确认的正式口径：**生产运行时组件/API 是 Vue 3 + Ant Design Vue 4.x + YSS UI；主题样式标准是 React Ant Design v6 的 `design.md` / semantic token，再叠加 `docs/design/design.md` 与项目 Token 覆盖。两条版本线服务不同职责，版本号不同本身不是冲突。**

审计要点不是要求 Ant Design Vue 追平 React Ant Design 的 major，而是验证：v6 的视觉角色、状态、层级和 Token 是否被可靠映射到 Vue/YSS 实现，同时禁止把 React hooks、props、JSX、事件模型和静态 API 用法误抄到生产代码。

为避免责任边界丢失，推荐在稳定合同中固定使用：

- `React Ant Design v6 prototype baseline`：原型的视觉、Token、组件与 CLI 事实。
- `Ant Design Vue 4.x production API`：Vue 生产实现的真实依赖/API；具体 patch/minor 由实现仓 lockfile 决定。
- “默认 antdv6”可以表示默认主题样式基线，但机器字段应拆成 `design_standard: ant-design-v6` 与 `runtime_component_library: ant-design-vue-4.x`，生产依赖版本仍由 lockfile 记录。

## 3. 高保真原型实际生成链路

### 3.1 YSS 阶段链路

本地规范定义的主链路如下：

1. `yss-product-lifecycle` 判定是否存在产品设计影响。
2. `yss-design-system` 读取 `docs/design/design.md` 与 `docs/design/tokens/*`，建立项目覆盖。
3. 形成交互说明、低保真页面/流程和状态矩阵。
4. `prototype-review` 作为独立低保真评审；未通过不得生成高保真。
5. `yss-prototype-stage` 调用 `product-design:index` 产出 `docs/.scratch/<feature>/design/prototypes/index.html`。
6. `yss-antd-design` 用固定目标 React `antd@6.x` 和 `@ant-design/cli --format json` 查询 `design.md`、组件 `info/demo/token/semantic` 并写证据。
7. 浏览器至少验证非空渲染、主流程、一个失败/权限/冲突状态、桌面与窄屏、console error。
8. Design QA 比较视觉目标与同视口/同状态渲染，P0/P1/P2 清零后才通过。
9. 用户确认后才允许回填 Spec、分析 API 影响或进入 Router readiness。

该顺序的治理意图清晰：**原型不是生产代码、CLI 不是批准者、截图不是验证、用户确认不是实现授权。**

### 3.2 Product Design 内部生成链路

`product-design:index` 本身只路由，不直接生成页面。对没有现成视觉目标的新页面，实际流程是：

1. `user-context` 预检已保存的设计系统、截图、Token、组件参考。
2. `get-context` 确认产品目标、视觉来源和交互级别。
3. `ideate` 将设计语言与 Token 写入 ImageGen prompt，生成恰好 3 个独立视觉方案。
4. 用户选择方案；所选图像成为唯一 visual target。
5. `prototype` 路由到 `image-to-code`。
6. `image-to-code` 从选定图像测量布局、准备真实素材/图标、用本地 starter 构建交互前端。
7. starter 当前是 React `19.2.0` + Vite `6.4.2`，没有 `antd` 依赖；预检要求 `npm install`。
8. 启动本地应用并截图，`design-qa` 对视觉目标与渲染结果做同视口/同状态对比，修复 P0/P1/P2 直至 `passed`。

这解释了“高保真”从何而来：**视觉由 ImageGen 方案提供，代码由 `image-to-code` 还原，Ant Design/YSS 一致性依赖外围阶段合同和后置 QA，而不是 Product Design starter 自带。**

## 4. 技能职责与冲突审计

| 技能/资产 | 正确职责 | 冲突或缺口 | 结论 |
|---|---|---|---|
| `yss-design-system` | 项目视觉真相、Token、组件语义、响应式与设计审查 | 主体明确；但部分项目派生色并非由 `#3371ff` 连贯推导，需要声明为受控 design-system extension | 可用，需增强 Token 派生证据 |
| `prototype-review` | 高保真前独立审查页面、流程、状态、权限、数据和 API implication | 与 Product Design 不冲突；它补足后者偏视觉、缺业务合同的问题 | 互补 |
| `yss-prototype-stage` | 阶段顺序、资产路径、CLI/浏览器/确认证据 | 步骤列表把 AntD 证据放在 HTML 之后，但其他模板又要求产出前查询；缺显式“pre-build facts”节点 | 轻度顺序歧义 |
| `yss-antd-design` | React AntD v6 官方视觉、Token、组件语义事实与 JSON 证据 | 明确不负责 Vue API，边界正确；但现有证据不能证明 v6 视觉语义已映射到原型，更不能单独证明后续 Vue/YSS 映射 | 互补，需增加语义映射清单验收 |
| `product-design:index` | Codex 视觉工作流路由 | 不感知 YSS 生命周期、资产路径、AntD CLI 和 evidence schema | 需要 YSS adapter 包裹 |
| `get-context` | brief 门禁，允许 full 或 mostly-static | `image-to-code` 又强制所有可见控件完整交互，静态选项被下游覆盖 | 明确合同冲突 |
| `ideate` | 生成 3 个独立视觉方向并等待选择 | 通用 prompt 允许最多两种字体、Google Fonts；若未把项目系统字体和 Token 作为硬约束，可能先生成漂移视觉，再由 QA 返工 | 可控但偏后置治理 |
| `image-to-code` | 从视觉目标构建可交互 React 原型 | starter 无 `antd`；强制 npm；QA 写仓库根 `design-qa.md`；未认识 YSS scratch 路径与证据模板 | 主要适配缺口 |
| `design-qa` | 同视口/同状态视觉比对，P0/P1/P2 阻断 | 通用 a11y rubric 较完整，但 `design-qa.md` 固定项目根；YSS evidence 未引用其路径和 a11y 明细 | 需要路径和 evidence 适配 |

### 4.1 技术栈冲突

- Product Design starter 的 `package.json` 只有 React/Vite，**没有 `antd`**。因此“经 `product-design:index` 生成”不等于“实际使用 Ant Design v6 组件”。目前只能靠 Agent 额外安装和实现，合同未强制。
- starter 预检明确要求 `npm install`；仓库规则规定前端优先 `pnpm`。原型虽不是生产实现，但仍是前端工程资产，未记录例外时构成工具链漂移。
- YSS 合同默认引用 `.../prototypes/index.html`；Vite 源项目也有根 `index.html`，但真正构建产物通常在 `dist/index.html`。当前未声明合同引用的是“源码入口”还是“可独立打开的最终 HTML”，也未要求保存 `package.json`、lockfile、源码目录和构建命令。

### 4.2 交互强度冲突

`get-context` 允许用户选“Static / mostly-static”，但 `image-to-code` 明确要求所有可见控件和状态均可交互、不得交付静态站点。两者不可同时满足。YSS 原型阶段更合理的语义是“合同覆盖的主流程与关键状态必须可操作，非范围控件不得伪装为可用”，不应把所有屏幕控件一律做成完整产品。

### 4.3 视口冲突

- Product Design `ideate` 默认桌面图为 `1440×1024`、平板为 `834×1194`。
- `docs/design/design.md` 的验收矩阵使用 desktop `1440×900`、tablet portrait `820×1180`，另有 laptop、wide desktop 等视口。
- Design QA 又要求源图和实现同视口比较。

如果不在 ideation 前统一视口，生成图、视觉 QA 和项目响应式验收会使用不同尺寸，产生无意义裁剪或漏测。应由 YSS adapter 把项目验收视口传给 `ideate`，至少统一 `390×844` 与 `1440×900`，再按影响追加其他断点。

### 4.4 证据路径冲突

Product Design 要求把 `design-qa.md` 写在项目根；YSS 将原型和证据放在 `docs/.scratch/<feature>/...`。多功能并行时根文件会互相覆盖，也无法稳定映射到 feature。应将 QA 路径适配为 `docs/.scratch/<feature>/verification/design-qa.md`，并由 `prototype-evidence.yaml` 显式引用。

## 5. 对 `docs/design/design.md` 的符合性判断

### 5.1 符合项

当前官方 `DESIGN.md` 的关键默认值和原则包括：系统字体、14px body、400/600 字重、4px 网格、32px 控件、6px 默认控件圆角、8px 容器圆角、三层表面、单一主操作、少装饰、明确状态、Token/algorithm/component override 优先。来源：[Ant Design DESIGN.md](https://raw.githubusercontent.com/ant-design/ant-design/master/DESIGN.md)、[Customize Theme](https://ant.design/docs/react/customize-theme/)。

本地 `docs/design/design.md` 在上述结构上基本符合，并且明确把项目差异作为覆盖，而不是冒充官方默认：

- 主色 `#3371ff`、错误色 `#f5222d`、页面背景 `#f0f2f5` 是项目裁定。
- 系统字体、14px 正文、4px 网格、基础 32px 控件和 6/8px 圆角与官方当前基线一致；当前高保真原型默认叠加的 28px 紧凑控件、Card padding/gap 则是明确的项目密度覆盖。
- 状态矩阵、窄屏替代形态、表格横向滚动边界和中后台低装饰倾向比官方 `DESIGN.md` 更适合 YSS 场景。
- 主题优先级“官方默认 → 项目覆盖 → 功能语义映射”是正确的分层。

因此，**只要生成流程确实加载项目 Token，并记录与官方默认差异，高保真原型可以符合 `docs/design/design.md`；但当前 Product Design 通用 starter 本身不能证明符合。**

### 5.2 已确认漂移和风险

#### A. 证据模板错误描述当前官方默认

`docs/design/templates/prototype-evidence-template.yaml` 写道“与官方 `#1677ff / Inter / 8px` 的差异必须记录”。当前官方 v6 `DESIGN.md` 的字体是系统栈，默认控件圆角是 6px，只有 Card/Modal 等表面是 8px。该说明会让 Agent 把本来一致的项目值误报为 override。

建议改为只列真实差异：`#3371ff` vs `#1677ff`、`#f5222d` vs `#ff4d4f`、`#f0f2f5` vs `#f5f5f5`，以及项目标题字号/显式 hover-active 等覆盖；系统字体与 6px 不应列为差异。

#### B. 不可解析的来源引用

`docs/design/design.md` 末节称“根据 `antdv6-design.md` 提炼”，但仓库中没有该文件。虽然正文前面已引用 `https://ant.design/design.md`，该文件名仍造成来源不可追溯和“antd-vue-v6”歧义。建议直接改为官方 URL、CLI JSON 证据或固定版本的官方 `DESIGN.md` commit/ref。

#### C. Token 派生关系存在 design-system extension 风险

官方建议优先修改 Seed Token，并通过 algorithm 派生 Map Token，以保持梯度关系：[Customize Theme](https://ant.design/docs/react/customize-theme/)。本地 `tokens.default.json` 将 `colorPrimary` 设为 `#3371ff`，但 `colorPrimaryBg/#d6e4ff`、`Border/#85a5ff` 等来自另一套蓝谱，hover/active 又固定为官方 `#4096ff/#0958d9`。这是明确裁定的项目覆盖，但不是从 seed 连贯派生的纯算法结果。

它可以存在，但应按官方定义视为**设计系统扩展**并补证据：每个状态色的用途、对比度、暗色/紧凑派生和视觉回归。否则 `theme.json` 中声明 `algorithm: "default"` 会让消费者误以为这些值是默认算法自然产物。

#### D. `theme.json` 不是可直接执行的完整 ThemeConfig

官方 `theme.algorithm` 接受算法函数或函数数组，而本地 JSON 使用字符串 `"default"`；`layoutHeaderHeight`、`layoutSiderBackground` 等也属于项目扩展字段。它适合作为可序列化设计配置，但“React 项目可直接参考”应明确需要 adapter 将字符串映射为 `theme.defaultAlgorithm`，并把项目扩展 Token 映射到 CSS variables/布局实现，不能把 JSON 原样当作运行时 ThemeConfig。

## 6. 响应式、组件和无障碍差距

### 6.1 响应式

本地规范的断点 `576/768/992/1200/1600` 与 Ant Design 官方 Grid 的核心断点一致；当前 React Ant Design 6 还增加了 `xxxl ≥ 1920`：[Ant Design Grid](https://ant.design/components/grid/)。本地已有 `1920×1080` 验收视口，但 `tokens.default.json` 未提供 `screenXXXL`，不是立即错误，却应在使用 v6 `xxxl` API 时显式决定是否采纳。

当前真正缺口不是断点数量，而是证据模板只预留一个 desktop 与一个 narrow-mobile，无法证明 `docs/design/design.md` 的 tablet、laptop、wide desktop 及表格替代形态。建议按影响面生成动态 viewport 列表，而不是要求所有页面机械跑九个尺寸。

### 6.2 组件与版本

- `yss-antd-design` 能证明 Agent 查询过 React `antd@6.x`，但不能证明原型实际依赖或使用该版本。
- 建议 evidence 增加 `prototype_stack`、`package_manager`、`lockfile_ref`、`actual_antd_version`、`component_manifest[]`、`theme_adapter_ref` 和 `build_command/result`。
- 每个组件应同时记录“v6 视觉/semantic role”“项目 Token 覆盖”“原型 React AntD 组件”“生产映射目标（YSS / Ant Design Vue / not-applicable）”以及“禁止迁移的 React-only API”。映射的是视觉语义、状态与验收行为，不是 React API 表面形状。
- 不应在模板中固定 `6.6.2`；实例应从自身合同选定目标 v6，并在所有 CLI 查询、依赖和 lockfile 中保持一致。

现有 `prototype-evidence.yaml` 只有 AntD 查询引用，没有 v6→项目→Vue/YSS 的机器可读 mapping，因此目前只能证明“查过官方资料”，不能证明“视觉语义迁移完成且未误抄 React API”。建议增加：

```yaml
visual_semantic_mapping:
  design_standard: ant-design-v6
  project_design_ref: docs/design/design.md
  runtime_component_library: ant-design-vue-4.x
  runtime_version_source: implementation-lockfile
  components:
    - semantic_role: <role>
      antd_v6_component: <React component used by prototype>
      project_token_refs: []
      yss_or_antdv_target: <YSS/AntDV component>
      state_mapping: []
      react_only_api_not_copied: true
      verification_ref: <screenshot/test/review evidence>
```

### 6.3 无障碍

WCAG 2.2 AA 对普通文本要求至少 `4.5:1`，大文本为 `3:1`：[WCAG 2.2 Contrast Minimum](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)。目标尺寸最低为 `24×24 CSS px` 或满足规定间距例外：[WCAG 2.2 Target Size Minimum](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)。WCAG 2.2 还要求文本可放大到 200% 而不丢失内容/功能：[WCAG 2.2](https://www.w3.org/TR/WCAG22/)。

按 WCAG 相对亮度公式对本地关键色计算：

| 前景 / 背景 | 对比度 | 普通 14px 文本 AA |
|---|---:|---|
| `#ffffff` / `#3371ff` | `4.245:1` | 不通过 |
| `#ffffff` / `#4096ff`（hover） | `2.990:1` | 不通过 |
| `#ffffff` / `#0958d9`（active） | `6.159:1` | 通过 |
| `#ffffff` / `#f5222d` | `4.078:1` | 不通过 |
| `#8c8c8c` / `#ffffff` | `3.363:1` | 普通文本不通过 |

官方 v6 `DESIGN.md` 自身也明确警告白字/默认 primary 的部分组合低于 `4.5:1`，并建议通过 Seed 或 Component Token 调深，而不是页面特例色：[Ant Design DESIGN.md](https://raw.githubusercontent.com/ant-design/ant-design/master/DESIGN.md)。

这不意味着必须立即替换品牌主色，但意味着不能只写“复核 contrast”后默认通过。至少要：

1. 明确目标合规级别和适用组件；主按钮可通过更深填充、深色文本方案或组件级 Token 解决。
2. 把默认、hover、active、disabled、focus 的实际前景/背景组合纳入自动或可重复对比度检查。
3. 浏览器证据增加键盘可达性、焦点顺序/可见焦点、语义元素与 label/alt、Dialog 焦点管理、200% zoom、`prefers-reduced-motion`、移动端目标尺寸。
4. 对 Ant Design Vue 不把“组件库声称支持”当作页面合规证明；真实 DOM 和交互仍须验证。其 `4.2.6` release 甚至包含 Modal `aria-hidden` 修复，说明可访问性行为受具体版本影响：[Ant Design Vue 4.2.6 release](https://github.com/vueComponent/ant-design-vue/releases/tag/4.2.6)。

## 7. 优化建议与优先级

### P0：固化双轨版本边界与迁移证据

1. 在稳定资产和 evidence 中同时记录 `design_standard: ant-design-v6` 与 `runtime_component_library: ant-design-vue-4.x`；明确前者管主题视觉语义，后者管 Vue 组件/API，版本差异不是 finding。
2. 增加 v6 semantic role → 项目 Token → YSS/Ant Design Vue 组件与状态的映射证据，并显式确认 React-only API 未复制。
3. 修正 `prototype-evidence-template.yaml` 的 `Inter / 8px` 错误差异描述，移除或替换不可解析的 `antdv6-design.md` 引用。

### P1：增加 YSS → Product Design adapter 合同

在不修改上游 Product Design skill 正文的前提下，由 `yss-prototype-stage` 增加一份显式 adapter：

- destination 固定为 `docs/.scratch/<feature>/design/prototypes/`；
- package manager 使用 `pnpm`，若 starter 只能 npm 则记录受控例外；
- 加入并锁定与 CLI 目标一致的 `antd@<target-v6>`；
- 将 `docs/design/tokens/theme.json` 经 adapter 转成可执行 ThemeConfig；
- 生成 `component_manifest` 和项目 Token 注入证明；
- 将 Design QA 报告写入 feature 级 verification 目录；
- 明确源码入口、build 输出和可访问 URL 各自的证据字段。

### P1：统一视觉目标与验收视口

在调用 `ideate` 前，把当前功能选择的项目视口传入 ImageGen。默认建议：desktop `1440×900`、mobile `390×844`；按影响追加 tablet/laptop/wide。Design QA 和浏览器验证必须使用相同尺寸和状态。

### P1：补齐无障碍证据合同

在 `prototype-evidence.yaml` 增加 `accessibility_verification`：

- `contrast_results_ref`
- `keyboard_navigation_result`
- `focus_visible_and_order_result`
- `semantic_label_dialog_result`
- `zoom_200_result`
- `reduced_motion_result`
- `target_size_result`
- `automated_scan_tool/version/result/ref`（工具不可用时写明人工替代和缺口）

### P2：收紧 Token 派生与暗色/紧凑证据

1. 明确哪些值是 seed、algorithm 派生、显式 map override、component override 或 YSS 自定义布局 Token。
2. 为 `#3371ff` 固定 hover/active 蓝谱建立 ADR 级别以下的设计说明和视觉/对比度测试；若改回算法派生，则同步更新项目覆盖声明。
3. 暗色已知未按新 seed 完整重派生，应继续保持 fail-closed；紧凑模式也应加入关键表格/表单截图和目标尺寸检查。

### P2：解决交互级别语义冲突

将 “Static” 改成更精确的两档合同：

- `reviewable-flow`：合同内主路径和指定关键状态可操作，非范围控件明确禁用/标注，不伪装完整功能。
- `full-prototype`：所有可见范围内控件按 brief 可操作。

这比上游 `mostly-static` 与 `image-to-code` 的“全部交互”矛盾更适合生命周期原型。

## 8. 建议目标链路

```text
yss-product-lifecycle
  -> yss-design-system（项目 Token / viewport / a11y 目标）
  -> interaction spec + state matrix + low-fi
  -> prototype-review（独立）
  -> yss-antd-design pre-build facts（固定 React antd v6）
  -> YSS Product Design adapter
       -> get-context
       -> ideate（三图，使用项目 Token 与项目 viewport）
       -> 用户选择 visual target
       -> image-to-code（React/Vite + 锁定 antd v6 + pnpm）
       -> design-qa（feature 级报告）
  -> AntD post-build manifest / lint（按产物类型）
  -> browser + accessibility verification
  -> prototype-evidence.yaml
  -> user confirmation
  -> Spec / API impact / Router
  -> 生产实现：Vue + YSS UI + 实际 ant-design-vue 4.x lockfile
```

## 9. 最终裁决

- **高保真原型怎么生成：** ImageGen 先生成三种视觉方向并由用户选定，`image-to-code` 再基于选定图像生成 React/Vite 可交互原型；YSS 技能负责前置业务评审、项目设计系统、AntD v6 事实和后置证据。
- **用了哪些技能：** 核心是 `yss-design-system`、`prototype-review`、`yss-prototype-stage`、`yss-antd-design`、`product-design:index`，后者内部继续路由 `user-context`、`get-context`、`ideate`、`prototype`、`image-to-code`、`design-qa`。
- **是否冲突：** 有可修复冲突，主要集中在 starter 不含 `antd`、npm/pnpm、静态/全交互、视口、QA 路径和证据顺序；生命周期职责本身没有根本冲突。
- **版本边界是否冲突：** 不冲突。Ant Design v6 是主题样式/视觉语义标准，Ant Design Vue 4.x + YSS UI 是生产运行时组件/API；真正缺口是尚无足够证据证明二者完成了受控语义映射且没有误抄 React API。
- **是否符合 `design.md`：** 项目规范主体符合并正确覆盖官方默认；但“实际生成结果是否符合”目前不能只凭技能被调用证明，必须补依赖、Token 注入、组件 manifest、同视口 QA 和无障碍证据。
- **是否需要优化增强：** 需要。建议按 P0/P1 先修版本命名、错误来源描述、YSS Product Design adapter 和 a11y evidence，再做 Token 派生与交互档位优化。

## 10. 来源索引（一手资料）

- [Ant Design v6 DESIGN.md](https://raw.githubusercontent.com/ant-design/ant-design/master/DESIGN.md)
- [Ant Design 6.6.2 package.json](https://raw.githubusercontent.com/ant-design/ant-design/6.6.2/package.json)
- [Ant Design v6 migration](https://ant.design/docs/react/migration-v6/)
- [Ant Design Customize Theme](https://ant.design/docs/react/customize-theme/)
- [Ant Design Grid](https://ant.design/components/grid/)
- [Ant Design CLI](https://ant.design/docs/react/cli/)
- [Ant Design design.md 指南](https://ant.design/docs/react/design-md-cn/)
- [@ant-design/cli 6.6.2 package.json](https://raw.githubusercontent.com/ant-design/ant-design-cli/v6.6.2/package.json)
- [Ant Design Vue 4.2.6 package.json](https://raw.githubusercontent.com/vueComponent/ant-design-vue/4.2.6/package.json)
- [Ant Design Vue Releases](https://github.com/vueComponent/ant-design-vue/releases)
- [ant-design-vue npm versions](https://www.npmjs.com/package/ant-design-vue?activeTab=versions)
- [WCAG 2.2](https://www.w3.org/TR/WCAG22/)
- [WCAG 2.2 Contrast Minimum](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)
- [WCAG 2.2 Target Size Minimum](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)
