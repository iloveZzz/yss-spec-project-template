---
toc: content
---

# SplitPane 分割面板

可调节宽度的侧边栏分割布局组件，常用于左侧树/菜单、右侧内容的布局场景。

## 典型场景：Tree + Table

左侧资源树，右侧数据表格的经典后台管理布局。

<code src="./demos/split-pane/tree-table-layout/index.vue"></code>

## API

### Props

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| initialWidth | 初始左侧宽度（px） | `number` | `280` |
| leftWidth | 左侧宽度（受控），可使用 `v-model:leftWidth` | `number` | - |
| minWidth | 左侧最小宽度（px） | `number` | `200` |
| maxWidth | 左侧最大宽度（px） | `number` | `480` |
| collapsible | 是否可折叠 | `boolean` | `true` |
| collapsed | 折叠状态（受控），可使用 `v-model:collapsed` | `boolean` | `false` |
| gutterSize | 分割线宽度（px） | `number` | `6` |
| storageKey | 本地存储 key，用于持久化宽度 | `string` | - |

### Events

| 事件名 | 说明 | 回调参数 |
| --- | --- | --- |
| update:collapsed | 折叠状态改变时触发 | `(collapsed: boolean) => void` |
| update:leftWidth | 宽度改变时触发 | `(width: number) => void` |
| resize | 拖拽调整宽度时触发 | `({ width: number }) => void` |
| toggle | 点击折叠/展开时触发 | `(collapsed: boolean) => void` |

### Slots

| 插槽名 | 说明 |
| --- | --- |
| left | 左侧面板内容 |
| right | 右侧面板内容 |

