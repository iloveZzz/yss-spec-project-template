---
title: Button 按钮
description: 基于 Ant Design Vue Button 封装的企业级按钮组件
toc: content
---

# Button 按钮

基于 Ant Design Vue `Button` 的企业级封装，统一主题与权限能力，提供一致的 API 与用法体验。

## 何时使用

- 标记并触发一个动作（或一组动作）。
- 需要统一主题色和交互规范。
- 需要简化权限控制（隐藏/禁用）。

## 代码演示

### 尺寸与块级

<code src="./demos/button/size.vue"></code>

### 加载/禁用/幽灵/危险

<code src="./demos/button/states.vue"></code>

### 权限按钮（localStorage）

统一用 `YButton` 传入 `permissionCode` 即可：

<code src="./demos/button/permission.vue"></code>

<code src="./demos/button/auth-basic.vue"></code>

### 权限下拉（localStorage）

<code src="./demos/button/auth-dropdown.vue"></code>

## API

### YButton Props

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| theme | `'primary' \| 'success' \| 'warning' \| 'danger'` | `'primary'` | 主题类名扩展，便于统一定制样式（不会改变 AntD 原始外观，需结合 CSS 变量使用）。 |
| type | `'default' \| 'primary' \| 'dashed' \| 'link' \| 'text'` | `'default'` | 同 AntD Button。 |
| size | `'small' \| 'middle' \| 'large'` | `'middle'` | 同 AntD Button。 |
| loading | `boolean \| { delay?: number }` | `false` | 同 AntD Button，支持延迟。 |
| disabled | `boolean` | `false` | 同 AntD Button。 |
| danger | `boolean` | `false` | 同 AntD Button。 |
| ghost | `boolean` | `false` | 同 AntD Button。 |
| shape | `'circle' \| 'round'` | `-` | 同 AntD Button。 |
| block | `boolean` | `false` | 同 AntD Button。 |
| htmlType | `'button' \| 'submit' \| 'reset'` | `'button'` | 同 AntD Button。 |
| href | `string` | `-` | 透传给 AntD，用作外链（渲染为 `<a>`）。 |
| target | `string` | `-` | 透传给 AntD，配合 `href` 使用。 |
| permissionCode | `string` | `-` | 按钮权限码；传入则启用权限逻辑。 |
| fallback | `'hide' \| 'disable'` | `'hide'` | 无权限时策略：隐藏或禁用。 |
| modifiers | `Array<'stop' \| 'prevent'>` | `[]` | 点击修饰：阻止冒泡/默认。 |

### YButton Events

| 事件名 | 回调参数 | 说明 |
| --- | --- | --- |
| click | `(e: MouseEvent)` | 点击事件（当 `disabled/loading` 时不会触发）。 |

### YButton Slots

| 插槽名 | 说明 |
| --- | --- |
| default | 按钮内容。 |
| icon | 图标插槽（已转发至 AntD `#icon`）。 |

### 与 Ant Design Vue 的对齐清单

- Props：已对齐 AntD Button 常用属性，并新增 `theme`。非声明式属性通过 `$attrs` 透传。
- Slots：支持默认插槽与 `#icon` 插槽（向下转发至 AntD）。
- Events：对齐 AntD 的 `click` 行为；`disabled/loading` 下不触发。
- 跳转能力：支持 `href/target` 透传，渲染为链接按钮。
