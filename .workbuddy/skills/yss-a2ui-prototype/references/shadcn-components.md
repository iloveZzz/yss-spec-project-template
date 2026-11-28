# 在 A2UI 原型中使用 shadcn-vue

按 [shadcn-vue 官方组件目录](https://www.shadcn-vue.com/docs/components) 选组件组。固定快照覆盖 72 组，每组有一份可在本地 Vue 页面运行的 A2UI 场景。每个组的导出、依赖、来源及版本见[组件清单](../assets/shadcn/inventory.json)，具体的节点嵌套与初始数据见[场景示例](../assets/shadcn/examples.json)。

## 装配

先按[起步说明](authoring.md)准备 Vue 3 原型，包括主题、`@/lib/utils` 和 A2UI Core。以下命令从模板仓库根运行，将 `prototype` 换成实际原型目录。选择其中一种装配方式，输出目录须尚未存在。

```sh
# 业务原型，只取需要的组及其递归依赖
python3 .agents/skills/yss-a2ui-prototype/scripts/materialize_shadcn.py \
  --output prototype/src/shadcn dialog data-table date-picker

# 组件预览，取全部组件与 72 个可切换场景
python3 .agents/skills/yss-a2ui-prototype/scripts/materialize_shadcn.py \
  --output prototype/src/shadcn --examples all
```

装配器会打印所选组的包和验证过的版本，同时写入 `src/shadcn/dependencies.json`。在新原型根目录按该版本安装依赖，例如直接从清单传参给 pnpm。在已有项目中先对照现有依赖和锁文件，避免升级项目共用依赖。

```sh
node -e 'const d=require("./src/shadcn/dependencies.json");require("node:child_process").execFileSync("pnpm",["add","--save-exact",...Object.entries(d).map(([n,v])=>n+"@"+v)],{stdio:"inherit"})'
```

使用 `--examples` 时，预览入口为 `src/shadcn/Preview.vue`。在普通的 Vue 应用入口导入该组件、保留已有主题样式并挂载，即可从下拉菜单切换场景。只预览一组时可使用 `--examples date-picker`。业务原型沿用自己的宿主，按下节登记扩展即可。

## 编写消息

宿主将 `shadcnExtension` 传给 `usePrototypeSurface(surfaceId, onAction, shadcnExtension)`。同一画面使用 SCRM 业务组件时，再传入 `scrmExtension`。surface 继续使用官方 Basic Catalog ID，每个 shadcn 节点指定 `@catalogId: "urn:yss:a2ui:shadcn-vue:v1"`。例如，用以下创建消息展示一个可禁用的保存按钮，并把当前草稿编号回传给宿主。

```json
{
  "version": "1.0",
  "createSurface": {
    "surfaceId": "draft",
    "catalogId": "https://a2ui.org/specification/v1_0/catalogs/basic/catalog.json",
    "dataModel": { "draftId": "D-17", "saveOptions": { "disabled": false } },
    "components": [{
      "id": "root", "component": "UiButton", "@catalogId": "urn:yss:a2ui:shadcn-vue:v1",
      "text": "保存草稿", "options": { "@path": "/saveOptions" },
      "action": { "event": { "name": "saveDraft", "context": { "id": { "@path": "/draftId" } } } }
    }]
  }
}
```

| 要表达的内容 | 消息字段 |
| --- | --- |
| 标题、按钮文字、组合层级 | `text` 接受字符串或路径。`children` 按顺序列出默认插槽中的节点 ID。Dialog、Select、Tabs 等的触发器和内容按组件示例嵌套。 |
| 组件属性 | 用 `options: {"@path":"/props"}` 指向数据模型中的属性对象，如 `variant`、`disabled`、表格列及行。具体取值沿用对应的 Vue API。 |
| 输入、选项和弹层开关 | `model: {"@path":"/draft"}` 双向绑定，默认对应 `modelValue`。需要时用 `modelProp` 选择 `open`、`pressed`、`checked`、`page`、`expanded`、`collapsed`、`step` 或 `value`。 Calendar 和 Range Calendar 使用 `codec: "date"` 或 `"dateRange"` 转换 ISO 日期，组合组件 Date Picker 直接读写 ISO 字符串。 |
| 用户动作 | `action.event.name` 登记动作名，`context` 可带业务值或路径。默认监听点击，可用 `event` 选择 `select`、`submit`、`change`、`complete` 或 `close`；按该 Vue 组件实际发出的事件选用。 |

生成的 `catalog.json` 列出可用节点。命名遵循 `Ui` 加 Vue 导出名，例如 `UiDialogTrigger`、`UiTableCell`。Sonner 的 Toaster 使用 `UiSonner`，旧 Toast 的 Toaster 使用 `UiToaster`。需要具名插槽、作用域插槽、回调或组件构造器的设计，在受控 Vue 组件里封装这些行为，再向消息暴露业务数据。图表和通知分别附有 `UiBarChart`、`UiNotifyButton` 的可运行示例。

## 来源和复用边界

- 66 个独立组件组沿用模板设计技能的[固定源码版本](https://github.com/unovue/shadcn-vue/tree/67c9a3926dc0a854507b325c6337ff2210d16379/apps/v4/registry/new-york-v4/ui)。Code Block、Trace 来自[目录快照版本](https://github.com/unovue/shadcn-vue/tree/eba11c3b87259a46826c6372bb794ef7fcc98127/apps/v4/registry/new-york-v4/ui)。已弃用的 Toast 来自[官方旧版源码](https://github.com/unovue/shadcn-vue/tree/67c9a3926dc0a854507b325c6337ff2210d16379/deprecated/www/src/registry/new-york/ui/toast)。上游快照附 MIT 许可，生成目录保留 LICENSE。
- Data Table、Date Picker 和 Typography 采用本技能的 Vue 组合实现。示例分别提供表头排序、弹层选日、语义标题和正文；可按业务规格扩展分页、日期约束和排版变体。
- 全量生成 413 个可登记节点，含 7 个 SCRM UI 层补充导出和 2 个示例辅助组件。SCRM 补充的 CalendarRoot、CalendarNext、CalendarPrev、RangeCalendarRoot、PopoverClose、ToastPortal、ToastRoot 随对应组件组生成。业务表单分区等另见 [SCRM 组件扩展](scrm-components.md)。
- 装配时将上游组件之间的导入改成本地相对路径，统一旧版 Toast 图标包，并针对当前 Vue 类型定义调整 Toast 状态、Carousel 模板引用和 Native Select 更新事件。原始快照保存在带 SHA-256 校验的归档中。
