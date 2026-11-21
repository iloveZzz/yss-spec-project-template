---
name: shadcn-vue
description: 在 Vue 工程中选用、添加、组合或审查 shadcn-vue 组件，定制表单、弹层与主题，排查组件注册表配置。
license: MIT
user-invocable: false
---

# shadcn-vue

shadcn-vue 将可维护的 Vue 组件源码放入应用。在 Frontend Profile 中，用本技能处理 UI 组件的选用、组合和更新，页面工程、设计还原、接口以及交互验证由 `yss-frontend-application` 衔接。使用简体中文。只读审查依据已有源码、配置和可用工具进行，安装 Profile 本身只分发技能。

## 识别项目与组件

1. 在目标应用包读取 `components.json`、package/lock、Vite 或框架别名、CSS 入口。检查 `style`、`iconLibrary`、UI 与 utils 别名，打开组件目录、导出、调用点和本地改动。多包工程以消费组件的包为起点。
2. 项目已有 CLI 时先查 `pnpm exec shadcn-vue --help`，按需要运行 `pnpm exec shadcn-vue info --json`。v2.9.0 返回 `project` 和 `config`。从 `config.resolvedPaths.ui` 的文件与导出确认已装组件，从样式、依赖和 import 核实 Reka 与图标库。CLI 或配置缺失时仍可从源码判断。现有工具、命令和示例见 [CLI 参考](./cli.md)。
3. 先复用项目已有组件、variants、图标与业务组合。发现候选组件时可用 `search @shadcn -q <关键词>`、`view @shadcn/<组件>` 查官方 registry，用 `docs <组件>` 取得官方文档 URL。官网示例用于选型，项目当前的 props、emits、slots 与样式决定接法。读取现有组件足以回答问题时直接使用本地资料。

## 组合与主题

| 需求 | 做法 |
| --- | --- |
| 表单与筛选 | 组合 Field/Label 与适用控件，关联标签、校验消息和禁用状态。按选择语义选 RadioGroup、Checkbox、Select 或 ToggleGroup。简单表单使用现有响应式状态，复杂表单按需协作项目已有表单库。[表单示例](./rules/forms.md) |
| 弹层、导航与反馈 | 依本地 API 组合触发器、内容及子项。Dialog、Sheet、Drawer 提供可访问名称，核实打开和关闭时的焦点、键盘路径和 Portal 主题。卡片按实际信息选区域，错误与空态保留可见反馈。[组合示例](./rules/composition.md) |
| 间距、颜色与尺寸 | 使用既有语义 tokens、variants、`cn()` 与布局间距，沿用设计的密度、字号和对比度。全局 CSS 变量会影响所有消费者。[样式示例](./rules/styling.md) · [主题与定制](./customization.md) |
| 图标 | 以项目的实际图标包和组件样式为准，新旧 style 对 `data-icon` 与图标尺寸的支持不同。图标按钮需要可访问名称。[图标示例](./rules/icons.md) |

## 引入缺失组件

在已有组件开发授权内，从任务选定的官方来源获取当前需要的组件及其依赖。先核对项目既有 revision、style 和本地定制，再核对候选源码、导入别名、依赖与 CSS。官方 CLI 的 `add <组件>` 会写入源码，也可能修改依赖和 CSS；可在临时工程取得并核对文件。CLI 版本与 registry 内容分别固定，如 CLI 无法定位项目采用的快照，可以从相应官方固定提交取得必要源码、核对摘要及许可证后适配。第三方 registry 按任务或项目已选来源使用。

命令示例假设 pnpm 项目已安装兼容 CLI。需要临时运行时，可按实际包管理器选择固定兼容版本，例如 `pnpm dlx shadcn-vue@2.9.0 --help`。新建 YSS 应用沿用 `yss-frontend-scaffold-generator`；已有应用缺少元数据时核对实际路径后按需补齐。MCP 接入方法按需查阅 [MCP 参考](./mcp.md)。

## Updating Components

有组件更新请求时，核对本地文件、调用方与目标版本。可用 `diff <组件>` 比较已安装组件和默认 registry，用 `view` 查看第三方条目。v2.9.0 的预览用独立的 `diff` 和 `view` 子命令；以实际版本的帮助为准。若目标是固定版本，直接比较对应的固定源码。

按文件合入改动并保留项目已有定制。涉及覆盖定制、变更全局主题或切换 preset 时，说明配置、CSS、依赖及组件的具体影响，沿用用户已选的处理方式。`apply` 可重写组件与主题，`init --force` 会更新配置及 CSS。合入后检查导出、别名、依赖、实际交互和受影响的项目检查。

本技能随附上游七份参考和 MIT 许可证。固定版本、skills.sh 安装摘要与本地适配见 [来源记录](./upstream.json)。
