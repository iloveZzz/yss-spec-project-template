---
toc: content
---

# Y-Tree 树组件

基于 `ant-design-vue@^4` 的 `Tree` 封装，完整透传 API/插槽，并补充企业常用能力：搜索、节点文本溢出 Tooltip（支持延迟）、节点更多（下拉动作）。

## 代码演示

### 左侧树 + 搜索 + 更多
<code id="demo-tree-basic-left" src="./demos/tree/basic-left/index.vue" title="左侧树 + 搜索输入 + 节点更多下拉"></code>

### 自定义搜索区（刷新/新增）
<code id="demo-tree-search-toolbar" src="./demos/tree/search-toolbar/index.vue" title="自定义搜索区域（刷新树/新增文件）"></code>

### 左侧树 + 可拖拽/折叠布局
<code id="demo-tree-split-pane" src="./demos/split-pane/tree-table/index.vue" title="左侧树可拖拽/折叠 + 右侧工具栏与表格示意"></code>

### 资源列表（分类着色）
<code id="demo-tree-resource-list" src="./demos/tree/resource-list/index.vue" title="资源列表分组展示"></code>

### 数据来源分组（计数/图标）
<code id="demo-tree-datasource-group" src="./demos/tree/datasource-group/index.vue" title="数据来源分组样式"></code>

### 自定义展开/收起图标（兼容 antdv #switcherIcon）
<code id="demo-tree-slot-switcher-icon" src="./demos/tree/slot-switcher-icon/index.vue" ></code>

### 显示节点图标（兼容 antdv #icon 需 :show-icon=true）
<code id="demo-tree-slot-icon" src="./demos/tree/slot-icon/index.vue" ></code>

### 多选（复选框）开启 checkable，受控 checkedKeys
<code id="demo-tree-multi-checkable" src="./demos/tree/multi-checkable/index.vue"></code>

### 多选（高亮选中）开启 multiple，受控 selectedKeys
<code id="demo-tree-multiple-select" src="./demos/tree/multiple-select/index.vue"></code>

## API

### Props

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| treeData | `any[]` | `[]` | 同 antdv Tree 数据 |
| fieldNames | `{ title?: string; key?: string; children?: string }` | `{ title:'title', key:'key', children:'children' }` | 同 antdv `fieldNames` |
| filterable | `boolean` | `true` | 开启内置搜索输入；为 `false` 时默认搜索框不展示（但依然可通过插槽自定义） |
| searchValue | `string` | `''` | 受控搜索值（`v-model:searchValue`） |
| searchProps | `Record<string, any>` | `{}` | 内置搜索框属性透传（如 `placeholder`、`size`、`allowClear` 等） |
| ellipsisTooltip | `boolean` | `true` | 超出省略展示 Tooltip |
| tooltipDelay | `number` | `500` | Tooltip 延迟（毫秒） |
| showActions | `boolean` | `true` | 是否显示"更多"按钮 |
| getNodeActions | `(node)=>YTreeActionItem[]` | `() => []` | 返回当前节点的下拉动作列表 |
| actionTrigger | `'hover' \| 'click' \| 'contextmenu' \| Array<...>` | `'click'` | 节点"更多"下拉触发方式 |
| selectOnActionClick | `boolean` | `true` | 点击"更多"按钮时是否自动选中当前节点 |
| selectable | `boolean` | `true` | 节点可选中 |
| blockNode | `boolean` | `true` | 节点内容占满整行，利于省略与操作对齐 |
| selectedKeys | `(string \| number)[]` | - | 受控选中节点（`v-model:selectedKeys`），不传时使用内部状态 |
| loading | `boolean` | `false` | 是否显示加载中状态 |
| loadingTip | `string` | `'加载中...'` | 加载中的提示文案 |

### Slots

| 插槽 | 参数 | 说明 |
| --- | --- | --- |
| header-left | - | 搜索区域左侧内容 |
| search | - | 自定义搜索区域，覆盖内置搜索输入 |
| header-right | - | 搜索区域右侧内容 |
| node-prefix | `{ node }` | 节点标题前缀内容 |
| node-title | `{ node, text }` | 自定义节点标题内容 |
| node-suffix | `{ node }` | 节点标题后缀内容 |
| title | 同 antdv | 透传 antdv `Tree` 的 `#title` |
| switcherIcon | 同 antdv | 透传 antdv `Tree` 的 `#switcherIcon` |
| icon | 同 antdv | 透传 antdv `Tree` 的 `#icon`（需 `:show-icon="true"`） |

### 事件

| 事件名 | 回调参数 | 说明 |
| --- | --- | --- |
| action | `{ key, node }` | 点击节点"更多"菜单项时触发 |
| update:searchValue | `string` | 搜索框输入变化（受控） |
| update:selectedKeys | `(string \| number)[]` | 选中节点变化（受控） |
| select | `selectedKeys, { node, selected }` | 节点被选中时触发（与 antdv Tree 一致） |

### YTreeActionItem 类型

```ts
interface YTreeActionItem {
  key: string;       // 操作项唯一标识
  label: string;     // 操作项显示文本
  icon?: VNodeChild; // 操作项图标
  disabled?: boolean;// 是否禁用
  danger?: boolean;  // 是否为危险操作（红色显示）
}
```

### 行为说明

- **更多图标显示**：默认仅在行 hover 时显示"更多"图标；点击后打开下拉菜单。
- **点击更多自动选中**：默认启用（`selectOnActionClick: true`），点击其他节点的"更多"按钮会自动选中该节点；如需保持原有选中状态，可设置 `:select-on-action-click="false"`。
- **触发方式**：默认点击触发；可通过 `:action-trigger="['hover']"` 改为 hover 触发，或组合使用。
- **文本省略**：当开启 `ellipsisTooltip=true` 时，悬浮在被省略的文本上显示完整内容 Tooltip。
- **受控/非受控模式**：`selectedKeys` 支持 `v-model:selectedKeys` 受控模式；不传时使用组件内部状态。
