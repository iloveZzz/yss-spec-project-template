---
title: Formily 表单
nav: 组件
group:
  title: 表单
  order: 2
toc: content
---

## 入门与学习路径

- 基础概念：理解 JSON Schema 与 UI Schema 的区别，熟悉 `x-component`、`x-decorator`、`x-component-props`、`x-visible`、`x-disabled`、`x-reactions`。
- 表达式与联动：掌握 `'{{ }}'` 表达式，使用 `x-reactions` 实现显隐/禁用/赋值。
- 事件与副作用：区分组件事件（`x-component-props`）、`x-reactions` 和表单级 `effects` 的使用场景。
- 扩展与定制：通过 `components` 注册自定义组件、`scope` 注入工具方法。
- 实战与优化：模式/只读、性能与可维护性。

## 官方文档速查

- **表单 Form** (核心 API): [https://core.formilyjs.org/zh-CN/api/models/form](https://core.formilyjs.org/zh-CN/api/models/form)
- **Schema 属性** (`x-component`, `x-decorator`, `x-visible`, `x-reactions` 等): [https://vue.formilyjs.org/api/shared/schema.html#属性](https://vue.formilyjs.org/api/shared/schema.html#属性)

## 事件写法速查

| 场景 | 建议写法 | 说明 |
| --- | --- | --- |
| 输入即触发 | `x-component-props.onUpdate:value` | 更贴近 v-model 行为 |
| 选择/失焦触发 | `x-component-props.onChange` 或 `@change` | 以底层 antdv 组件事件为准 |
| 跨字段操作（就近） | `scope` 注入函数，在 `x-component-props` 中引用 | 复用/可测试 |
| 跨字段联动 | `x-reactions` | 结构化依赖，更直观 |
| 表单级行为 | `createForm({ effects })` + `onFieldValueChange`/`onFormSubmit` | 处理埋点/异步/复杂逻辑 |
| 提交回调 | `Submit.x-component-props.onSubmit` | 校验通过后拿到 `values` |

> 注意：事件名以底层组件为准（此处是 Ant Design Vue 生态）。输入类优先监听 `onUpdate:value`，选择类常用 `onChange`/`@change`。

## 基础使用（JSON Schema）

<code src="./demos/formily/basic.vue"></code>

## 对齐方式

<code src="./demos/formily/align.vue"></code>

## 栅格布局

<code src="./demos/formily/grid.vue"></code>

## 动态显隐

<code src="./demos/formily/dynamic.vue"></code>

## 动态禁用

<code src="./demos/formily/disabled.vue"></code>

## 标签提示

<code src="./demos/formily/label-tip.vue"></code>

## 自定义插槽

<code src="./demos/formily/slot.vue"></code>

## 分组

<code src="./demos/formily/group.vue" title="查看模式描述列表插槽"></code>

## 折叠面板表单
<code src="./demos/formily/collapse.vue" ></code>

## 联动

<code src="./demos/formily/linkage.vue"></code>

## 模式（新增/编辑/查看）

<code src="./demos/formily/modes.vue"></code>

## 远程字典翻译（接口返回）

<code src="./demos/formily/remote-enum.vue"></code>

## 自定义组件（新增/编辑/查看）

<code src="./demos/formily/custom-component.vue"></code>

## 事件（行内函数）

<code src="./demos/formily/events-inline.vue"></code>

## 事件（作用域方法）
<code src="./demos/formily/events-scope.vue"></code>

## Effects（表单级副作用）

<code src="./demos/formily/effects.vue"></code>

## 异步校验（作用域方法优先）

<code src="./demos/formily/async-validate.vue"></code>

## 多依赖联动（scope + effects）

<code src="./demos/formily/linkage-multi.vue"></code>

## 提交失败提示（effects 统一兜底）

<code src="./demos/formily/submit-failed.vue"></code>

## 帮助文案与自定义插槽

<code src="./demos/formily/helper-slot.vue"></code>

## 分步表单（FormStep）

<code src="./demos/formily/steps.vue"></code>

## 动态表单（ArrayItems）

<code src="./demos/formily/dynamic-array.vue"></code>

## API

### YssFormily Props

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `schema` | `Record<string, any>` | - | JSON Schema 描述（使用 `x-component`/`x-decorator` 语法） |
| `v-model` | `Record<string, any>` | - | 双向绑定表单值（推荐） |
| `initial-values` | `Record<string, any>` | `{}` | 初始表单值（仅初始化时一次性生效，若使用了 v-model 则优先取 v-model） |
| `form` | `Form` | - | 传入已有的 Formily 实例（不传则内部创建） |
| `components` | `Record<string, any>` | - | 扩展或覆盖内置组件（会与内置合并） |
| `scope` | `Record<string, any>` | - | 表达式作用域（可在 `{{ }}` 中使用） |
| `readPretty` | `boolean` | `false` | 只读查看态开关（通常由 `mode=2` 自动开启） |
| `mode` | `0 \| 1 \| 2` | `0` | 表单模式：0-新增 1-编辑 2-查看（查看强制只读） |
| `detail-options` | `Record<string, any>` | - | 描述列表参数，详见下方说明 |
| `grid-defaults` | `Record<string, any>` | `{ maxColumns:3, minColumns:1, columnGap:16, rowGap:0, minWidth:260 }` | 实例级默认栅格；schema 上的 `x-component-props` 会覆盖它 |

### 插槽说明

YssFormily 支持以下插槽：

#### 1. 默认插槽

用于在表单底部追加额外内容（如自定义按钮组）。

**使用示例**：
```
<YssFormily :schema="schema">
  <!-- 表单底部追加内容 -->
  <div style="margin-top: 16px; text-align: center">
    <a-button @click="handleCancel">取消</a-button>
  </div>
</YssFormily>
```

#### 2. 详情视图字段插槽

**适用场景**：仅在 `mode=2`（查看模式）且 `detailAs="descriptions"` 时生效。

**命名规则**：`#detail-<path>`，将字段路径中的 `.` 替换为 `-`。

**作用域参数**：
- `value` - 当前字段的值
- `item` - 字段的 schema 配置
- `values` - 整个表单的值对象

**使用示例**：
```
<YssFormily :schema="schema" :mode="2">
  <!-- 简单路径：email -->
  <template #detail-email="{ value }">
    <a-tag v-for="(v, i) in value" :key="i" color="blue">{{ v }}</a-tag>
  </template>
  
  <!-- 嵌套路径：user.email（路径中的点替换为横线） -->
  <template #detail-user-email="{ value }">
    <a :href="`mailto:${value}`">{{ value }}</a>
  </template>
</YssFormily>
```

**说明**：
- 未提供插槽时，自动回退到默认显示规则（字典翻译、日期格式化等）
- 更多示例见"分组"演示

#### 3. Schema 中的 Slot 组件

**适用场景**：在 schema 中引用父组件的具名插槽，实现灵活的自定义内容插入。

**使用方式**：在 schema 中使用 `x-component: 'Slot'`，并通过 `x-component-props.name` 指定插槽名称。

**使用示例**：
```
<YssFormily :schema="schema">
  <template #customHint>
    <a-alert message="这是自定义提示内容" type="info" show-icon />
  </template>
</YssFormily>
```

```typescript
// schema 定义
{
  type: 'object',
  properties: {
    hint: {
      type: 'void',
      'x-component': 'Slot',
      'x-component-props': {
        name: 'customHint'  // 对应父组件的 #customHint 插槽
      }
    },
    name: {
      type: 'string',
      title: '姓名',
      'x-decorator': 'FormItem',
      'x-component': 'Input'
    }
  }
}
```

**说明**：
- Slot 组件允许在 schema 的任意位置插入父组件传递的插槽内容
- 更多示例见"自定义插槽"演示

#### 4. 编辑 + 查看模式组合使用

**适用场景**：同一字段在编辑模式和查看模式下都需要自定义渲染（如 SQL 代码、富文本等）。

**原理**：
- **编辑模式**：通过 schema 中的 `x-component: 'Slot'` 引用 `#<slotName>` 插槽
- **查看模式**：通过 `#detail-<path>` 插槽自定义渲染

**使用示例**：

```
<YFormily
  v-model="formData"
  :schema="schema"
  :mode="mode"
  :detail-options="{ columns: 1 }"
>
  <!-- 编辑/新增模式下的自定义 SQL 插槽 -->
  <template #sql="{ value, onChange }">
    <YMonaco
      :value="value"
      language="sql"
      :height="300"
      @change="onChange"
    />
  </template>

  <!-- 查看模式下的自定义 SQL 插槽（注意命名规则：detail-<字段名>） -->
  <template #detail-sql="{ value }">
    <YMonaco
      :value="value"
      language="sql"
      :height="300"
      :read-only="true"
    />
  </template>
</YFormily>
```

```typescript
// schema 定义
const schema = {
  type: 'object',
  properties: {
    sql: {
      type: 'string',
      title: 'SQL代码',
      'x-decorator': 'FormItem',
      'x-decorator-props': { gridSpan: 2 },
      'x-component': 'Slot',
      'x-component-props': {
        name: 'sql',
      }
    }
  }
};
```

**命名规则对照表**：

| 字段路径 | 编辑模式插槽名 | 查看模式插槽名 |
| --- | --- | --- |
| `sql` | `#sql` | `#detail-sql` |
| `user.email` | `#userEmail` | `#detail-user-email` |
| `config.database.host` | `#dbHost` | `#detail-config-database-host` |

> [!TIP]
> 编辑模式插槽名由 `x-component-props.name` 自定义，查看模式插槽名固定为 `detail-<路径>`（点替换为横线）。

### 暴露方法

通过 `ref` 获取组件实例后可调用：

| 方法 | 签名 | 说明 |
| --- | --- | --- |
| `form` | `ComputedRef<Form>` | 内部表单实例 |
| `getValues` | `() => Record<string, any>` | 读取当前值（浅拷贝） |
| `setValues` | `(values: Record<string, any>) => void` | 批量设置值 |
| `submit` | `() => Promise<any>` | 触发提交（校验通过后返回） |
| `setFieldState` | `(...args:any[]) => void` | 低层能力，透传到 `form.setFieldState` |

### 内置组件（可在 `schema.x-component` 中直接使用）

- `FormItem`、`FormLayout`、`FormGrid`（已内置默认响应式）  
- `FormButtonGroup`、`Submit`、`Reset`  
- `Input`、`Select`、`DatePicker`、`Radio`、`Switch`  
- 适配层：`GroupHeader`、`AutoButtonGroup`（右对齐按钮组）

### 详情视图（Descriptions）

- 当 `mode=2` 时，表单以 `Descriptions` 风格展示字段。
- 默认规则：
  - `enum` 显示 label；`DatePicker` 显示 `YYYY-MM-DD`；`Switch/boolean` 显示“是/否”。
  - 数组以 `、` 拼接；空值显示 `-`（可用 `detailOptions.hideEmpty` 隐藏该项）。
  - `x-decorator-props.gridSpan` 影响列跨距；可用字段级 `x-preview-format` 覆盖默认渲染，或用 `detail` 插槽自定义展示。

#### detail-options 配置项

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `columns` | `number` | `3` | 固定列数（仅当 `responsive=false` 时生效） |
| `bordered` | `boolean` | `true` | 是否显示边框 |
| `hideEmpty` | `boolean` | `false` | 是否隐藏空值字段 |
| `emptyPlaceholder` | `string` | `'-'` | 空值占位符 |
| `labelWidth` | `number` | `120` | 标签宽度（px） |
| `responsive` | `boolean` | `true` | 是否根据容器宽度自适应列数（**默认开启**） |
| `maxColumns` | `number` | `3` | 响应式模式下的**最大列数** |
| `minColumns` | `number` | `1` | 响应式模式下的最小列数 |
| `minWidth` | `number` | `260` | 每列最小宽度（px），决定响应式断点 |

> [!IMPORTANT]
> **响应式模式下 `columns` 会被忽略！** 默认开启 `responsive: true`，此时列数由 `maxColumns`、`minColumns` 和 `minWidth` 动态计算得出。如需固定 2 列，请设置 `maxColumns: 2` 或关闭响应式 `responsive: false`。

#### 字段级自定义插槽（仅 `mode=2` 生效）

- 插槽命名：`#detail-<path>`（将路径中的 `.` 替换为 `-`），如 `user.email` ⇒ `#detail-user-email`。
- 插槽入参：`{ value, item, values }`。
- 未提供插槽时，自动回退到默认显示规则。
- 示例（更多见“分组”示例中的 `分组demo`）：

```typescript

<YssFormily :schema="schema" :mode="2">
  <template #detail-email="{ value }">
    <Tag v-for="(v, i) in value" :key="i" color="blue">{{ v }}</Tag>
  </template>
  <template #detail-user-email="{ value }">{{ value }}</template>
</YssFormily>

```

### Schema 约定与技巧

- **布局**：在任意层使用
  - `FormLayout`：`{ layout: 'horizontal' | 'vertical', labelAlign?: 'left' | 'right', labelWidth?: number, size?: 'small' | 'middle' | 'large' }`
  - `FormGrid`：默认已开启 3列→2列→1列 的响应式；可在 `x-component-props` 局部覆盖
    - 可用项：`maxColumns`、`minColumns`、`minWidth`、`columnGap`、`rowGap`
- **栅格占位**：给字段的 `x-decorator-props` 设置 `gridSpan` 控制跨列数（如 `gridSpan: 2`）
- **分组标题**：使用 `GroupHeader` 作为分组行。默认独占一行（`fullSpan: true`），如需参与栅格与其它字段并列，设置 `x-component-props: { fullSpan: false }`；可通过 `description` 传分组说明文案
- **按钮组对齐**：使用 `x-component: 'AutoButtonGroup'`，并给外层字段加 `x-decorator: 'FormItem'` 以参与对齐/栅格
- **标签提示**：给 `FormItem` 的 `x-decorator-props` 传入 `tooltip`，图标将自动与 label 垂直居中

> 若希望全局调整默认栅格，可在使用处传入 `<YssFormily :gridDefaults="{ minWidth: 300 }" />`；局部覆盖时，在具体 `FormGrid` 的 `x-component-props` 再写即可