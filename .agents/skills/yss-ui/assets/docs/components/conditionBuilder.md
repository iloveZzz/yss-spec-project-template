---
toc: content
---

### Y-ConditionBuilder 条件构造器

基于 Vue3 与 TypeScript 的表达式构造组件，支持嵌套 AND/OR、联动选项、BETWEEN、多种输入形态与远程数据源。

## 代码演示

### 1. 基础用法（固定选项，无联动）
<code id="demo-cb-basic" src="./demos/condition-builder/basic/index.vue"></code>

### 2. 固定选项 + 联动（字段 → 操作符/值）
<code id="demo-cb-linked" src="./demos/condition-builder/linked/index.vue"></code>

### 3. 服务端返回（自定义联动逻辑）
<code id="demo-cb-remote" src="./demos/condition-builder/remote/index.vue"></code>

### 4. 嵌套 + BETWEEN 特性
<code id="demo-cb-nesting-between" src="./demos/condition-builder/nesting-between/index.vue"></code>

### 5. 表单校验（严格模式）
<code id="demo-cb-validation" src="./demos/condition-builder/validation/index.vue"></code>

### 6. 非严格模式（允许空值）
<code id="demo-cb-validation-custom" src="./demos/condition-builder/validation-custom/index.vue"></code>

## 使用说明

- 默认提供 `field/operator/value` 三段；操作符内置 `none/single/between/multiple` 四类输入语义。
- 通过 `operator-options` 传入静态操作符；或通过 `get-operators(field)` 动态拉取。
- 通过 `load-fields(q)` 与 `load-values({ q, field, operator })` 实现本地/远程搜索。
- 事件：`update:modelValue`、`change`、`blur`；实例方法见类型定义。

## API

### Props

| 参数 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| v-model | 绑定的条件组数据 | `ConditionGroup` | - |
| max-depth | 最大嵌套深度 | `number` | `3` |
| load-fields | 加载字段选项的方法，支持搜索 | `(q: string) => Promise<OptionItem[]>` | - |
| load-values | 加载值选项的方法，支持搜索 | `(params: { q: string, field: string, operator: string }) => Promise<OptionItem[]>` | - |
| operator-options | 静态操作符选项列表 | `OperatorOption[]` | `DEFAULT_OPERATOR_OPTIONS` |
| get-operators | 动态获取操作符选项的方法 | `(field: string) => Promise<OperatorOption[]>` | - |
| and-text | "且" 逻辑关系的显示文本 | `string` | `'且'` |
| or-text | "或" 逻辑关系的显示文本 | `string` | `'或'` |
| disabled | 是否禁用（只读模式） | `boolean` | `false` |
| strict-mode | 是否开启严格校验模式（false允许空值） | `boolean` | `true` |

### Events

| 事件名 | 说明 | 回调参数 |
| --- | --- | --- |
| update:modelValue | 数据更新时触发 | `(value: ConditionGroup) => void` |
| change | 数据变化时触发 | `(value: ConditionGroup) => void` |
| validate | 每次数据变化时自动触发，返回当前验证状态 | `(valid: boolean) => void` |
| blur | 条件失去焦点时触发 | `(value: ConditionGroup) => void` |

### Methods

| 方法名 | 说明 | 参数 | 返回值 |
| --- | --- | --- | --- |
| validate | 校验所有条件是否完整填写（字段、操作符、值） | - | `boolean` |

### Types

#### ConditionGroup

```typescript
interface ConditionGroup {
  id: string;
  type: 'GROUP';
  logicalOp: 'AND' | 'OR';
  children: (ConditionGroup | ConditionLeaf)[];
  linkedFromLeafId?: string; // 关联的父级叶子节点ID
}
```

#### ConditionLeaf

```typescript
interface ConditionLeaf {
  id: string;
  type: 'LEAF';
  field: string;
  operator: string;
  value: any;
  betweenValue1?: any;
  betweenValue2?: any;
}
```

#### OptionItem

```typescript
interface OptionItem {
  label: string;
  value: string | number;
  [key: string]: any;
}
```

#### OperatorOption

```typescript
interface OperatorOption {
  label: string;
  value: string;
  kind?: 'single' | 'multiple' | 'between' | 'none'; // 输入框类型
}
```
