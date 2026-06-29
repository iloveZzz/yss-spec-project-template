---
toc: content
---

## Y-Monaco 代码编辑器

基于 `monaco-editor` 的 Vue3 组件封装，支持按需加载、只读置灰、应用内全屏、语言与主题切换等能力。

## 基础使用
<code src="./demos/monaco/basic.vue"></code>

## 只读（置灰）
<code src="./demos/monaco/readonly.vue"></code>

## 差异对比编辑器 (DiffEditor)
<code src="./demos/monaco/diff-basic.vue"></code>

## 应用内全屏（非浏览器全屏）
<code src="./demos/monaco/fullscreen.vue"></code>

## 可拖拽缩放
<code src="./demos/monaco/resizable.vue"></code>

## 语言与主题切换
<code src="./demos/monaco/switch-lang-theme.vue"></code>

## SQL 表/字段提示 + 格式化

在传入 `sqlSchema` 后，编辑器会根据表与列提供补全

```ts
// schema 示例
const sqlSchema = {
  schema: 'public',
  tables: [
    {
      name: 'users',
      columns: [
        { name: 'id', type: 'int' },
        { name: 'name', type: 'varchar' },
      ],
    },
    {
      name: 'orders',
      columns: [
        { name: 'order_id', type: 'int' },
        { name: 'user_id', type: 'int' },
      ],
    },
  ],
};
```

<code src="./demos/monaco/sql-schema.vue"></code>

## 日志查看器模式

启用 `logMode` 后，组件专为日志场景优化，支持增量追加、滚动触底加载、行数限制等功能，适用于实时日志流、服务日志监控等场景。

### 实时日志流
<code src="./demos/monaco/log-viewer.vue"></code>

### 历史日志加载
<code src="./demos/monaco/history-log-viewer.vue"></code>

## 与 Formily 结合
<code src="./demos/monaco/monaco.vue"></code>

## API

### YMonaco Props

#### 基础配置

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| modelValue | `string` | `''` | 编辑器内容（支持 v-model 双向绑定） |
| language | `string` | `'sql'` | 语法高亮语言，详见下方"语言支持" |
| theme | `string` | `'vs'` | 编辑器主题：`vs`（明亮）/ `vs-dark`（深色）/ `hc-black`（高对比度） |
| width | `number \| string` | `'100%'` | 编辑器宽度，支持数字（px）或 CSS 字符串 |
| height | `number \| string` | `300` | 编辑器高度，支持数字（px）或 CSS 字符串 |
| options | `Record<string, unknown>` | `{}` | Monaco Editor 原生配置选项（会与默认配置合并） |
| readonly | `boolean` | `false` | 是否只读（只读模式下内容置灰，无法编辑） |
| autoLayout | `boolean` | `true` | 是否自动布局（容器尺寸变化时自动调整编辑器） |
| showBorder | `boolean` | `true` | 是否显示组件边框 |
| nls | `boolean` | `false` | 是否启用中文本地化（按需加载 `monaco-editor-nls`） |

#### 全屏与缩放

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| fullscreenTarget | `string \| HTMLElement` | `document.documentElement` | 应用内全屏时的目标容器（选择器字符串或 DOM 元素），默认填充整个视口 |
| resizable | `boolean` | `true` | 是否启用容器拖拽缩放功能 |
| resizeDirections | `Array<'e' \| 's' \| 'se'>` | `['se','e','s']` | 允许的拖拽方向：`e`（右边）、`s`（下边）、`se`（右下角） |
| minWidth | `number` | `240` | 拖拽时的最小宽度（像素） |
| minHeight | `number` | `160` | 拖拽时的最小高度（像素） |
| maxWidth | `number` | `-` | 拖拽时的最大宽度（像素），不设置则不限制 |
| maxHeight | `number` | `-` | 拖拽时的最大高度（像素），不设置则不限制 |
| freeHeightResize | `boolean` | `true` | 高度拖拽是否不受父容器限制（true 时仅受 min/maxHeight 约束） |

#### SQL 模式

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| sqlSchema | `SqlSchema` | `-` | SQL 表/字段提示数据源，详见下方"SqlSchema 类型" |
| sqlSuggest | `boolean` | `true` | 是否启用 SQL 智能提示（表名、字段名补全） |

#### 日志查看器模式

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| logMode | `boolean` | `false` | 是否启用日志查看器模式（支持增量追加、滚动触底加载、行数限制） |
| maxLines | `number` | `10000` | 日志模式下的最大保留行数，超出时自动删除头部旧日志（建议 5000-20000） |
| scrollThreshold | `number` | `50` | 滚动触底检测阈值（行数），距底部小于此值时触发 `scroll-end` 事件 |
| autoScroll | `boolean` | `true` | 追加内容后是否自动滚动到底部（仅当用户在底部附近时生效） |

#### 工具栏配置

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| showToolbar | `boolean` | `true` | 是否显示悬浮工具栏 |
| toolbarOptions | `object` | `{ copy: true, fullscreen: true, download: false }` | 工具栏按钮开关：`copy` (复制), `fullscreen` (全屏), `download` (下载) |

---

### 插槽 (Slots)

| 插槽名 | 说明 | 参数 |
| --- | --- | --- |
| toolbar | 自定义工具栏的**全部内容**，这将完全替换默认的按钮。 | `{ editor, fullscreen, toggleFullscreen }` |
| toolbar-prefix | 在默认按钮（复制、全屏、下载）**之前**插入自定义内容，保留默认按钮。 | `{ editor, fullscreen, toggleFullscreen }` |
| toolbar-suffix | 在默认按钮（复制、全屏、下载）**之后**插入自定义内容，保留默认按钮。 | `{ editor, fullscreen, toggleFullscreen }` |

**示例**：

```html
<YMonaco>
  <!-- 前置按钮 -->
  <template #toolbar-prefix>
    <y-button>前置操作</y-button>
  </template>

  <!-- 默认按钮（复制/全屏）会自动显示在中间 -->

  <!-- 后置按钮 -->
  <template #toolbar-suffix>
    <y-button>后置操作</y-button>
  </template>
</YMonaco>
```

**完全自定义示例 (覆盖默认)**

```html
<YMonaco>
  <template #toolbar="{ editor, fullscreen, toggleFullscreen }">
    <y-button @click="myCustomAction(editor)">自定义按钮</y-button>
    <y-button @click="toggleFullscreen">
      {{ fullscreen ? '退出全屏' : '全屏' }}
    </y-button>
  </template>
</YMonaco>
```

---

### 语言支持（language 可选值）

Monaco Editor 支持丰富的编程语言语法高亮和智能提示：

#### 常用语言
- **Web 开发**：`javascript`、`typescript`、`html`、`css`、`scss`、`less`、`json`、`xml`、`markdown`
- **数据库**：`sql`、`mysql`、`pgsql`、`redis`、`graphql`
- **配置文件**：`yaml`、`ini`、`dockerfile`、`shell`、`bat`、`powershell`
- **后端语言**：`python`、`java`、`go`、`csharp`、`cpp`、`php`、`ruby`、`rust`、`scala`、`swift`、`kotlin`、`lua`

#### 增强功能
- **SQL**：内置表/字段智能提示、格式化兜底（右键菜单）
- **JSON**：内置格式化功能
- **JavaScript / TypeScript**：自动加载 Language Service，提供高级智能提示

#### 完整列表
所有语言与 Monaco 的 [basic-languages](https://github.com/microsoft/monaco-editor/tree/main/src/basic-languages) 同名即可按需加载。

---

### 事件

| 事件名 | 参数 | 说明 |
| --- | --- | --- |
| update:modelValue | `value: string` | 内容变化时触发（v-model 同步） |
| change | `value: string` | 内容变化时触发（与 update:modelValue 同时触发） |
| blur | `{ editor, monaco }` | 编辑器失焦时触发，返回编辑器实例和 Monaco API |
| selectedText | `(text: string, selection: any)` | 选中文本变化时触发，返回选中的文本和选区对象 |
| run | `{ sql: string; isAll: boolean }` | SQL 模式专用：右键菜单选择"运行 SQL"或按 Ctrl/Cmd+Enter 时触发 |
| scroll-end | `-` | 日志模式专用：滚动到底部时触发（可用于懒加载更多日志） |
| line-exceed | `lines: number` | 日志模式专用：日志行数超出 `maxLines` 限制时触发 |

---

### 实例方法（通过 ref 调用）

| 方法名 | 参数 | 返回值 | 说明 |
| --- | --- | --- | --- |
| getInstance | - | `editor \| null` | 获取 Monaco Editor 原生实例 |
| setValue | `value: string` | `void` | 设置编辑器内容（会触发 change 事件） |
| setLanguage | `lang: string` | `void` | 切换语法高亮语言 |
| setTheme | `theme: string` | `void` | 切换编辑器主题 |
| toggleReadonly | `readonly?: boolean` | `void` | 切换只读状态（不传参则反转当前状态） |
| toggleFullscreen | - | `void` | 切换应用内全屏（非浏览器全屏 API） |
| insertText | `text: string` | `void` | 在当前光标位置插入文本（使用 snippet 机制） |
| insertTextAtPosition | `text: string` | `void` | 在当前光标位置插入文本 |
| layout | - | `void` | 手动触发编辑器布局重计算（容器尺寸变化时） |
| appendContent | `text: string` | `void` | **日志模式专用**：在末尾追加内容（增量追加，性能优于 setValue） |
| clearContent | - | `void` | **日志模式专用**：清空编辑器内容 |
| scrollToBottom | - | `void` | **日志模式专用**：滚动到编辑器底部 |
| getLineCount | - | `number` | **日志模式专用**：获取当前总行数 |

---

### 类型定义

#### SqlSchema

用于 SQL 模式的表/字段智能提示：

```typescript
interface SqlSchema {
  schema?: string;  // 可选的 schema 名称（如 "public"）
  tables: Array<{
    name: string;  // 表名（可含 schema 前缀，如 "public.users"）
    columns: Array<{
      name: string;     // 字段名
      type?: string;    // 字段类型（可选）
      comment?: string; // 字段注释（可选）
    }>;
  }>;
}
```

**使用示例**：
```typescript
const sqlSchema = {
  schema: 'public',
  tables: [
    {
      name: 'users',
      columns: [
        { name: 'id', type: 'int', comment: '用户ID' },
        { name: 'name', type: 'varchar(100)' },
        { name: 'email', type: 'varchar(255)' },
      ],
    },
    {
      name: 'orders',
      columns: [
        { name: 'order_id', type: 'int' },
        { name: 'user_id', type: 'int' },
        { name: 'amount', type: 'decimal(10,2)' },
      ],
    },
  ],
};
```

---

## YMonacoDiff (差异对比编辑器)

### Diff Props

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| original | `string` | `''` | 原始内容（左侧显示） |
| value | `string` | `''` | 修改后内容（右侧显示，支持 v-model:value 双向绑定） |
| **其余属性** | - | - | 继承 `YMonaco` 的所有配置（除 `modelValue` 外） |

### Diff 事件

| 事件名 | 参数 | 说明 |
| --- | --- | --- |
| update:value | `value: string` | 修改后内容变化时触发（v-model:value 同步） |
| change | `value: string` | 修改后内容变化时触发 |

### Diff 实例方法

| 方法名 | 参数 | 返回值 | 说明 |
| --- | --- | --- | --- |
| getInstance | - | `diffEditor \| null` | 获取 Monaco DiffEditor 原生实例 |
| setOriginal | `value: string` | `void` | 设置原始内容（左侧） |
| setValue | `value: string` | `void` | 设置修改后内容（右侧） |
| setLanguage | `lang: string` | `void` | 切换两侧编辑器的语言 |
| setTheme | `theme: string` | `void` | 切换两侧编辑器的主题 |
| layout | - | `void` | 手动触发布局重计算 |

---

## 使用技巧

### 1. 日志查看器最佳实践

```
<template>
  <YMonaco
    ref="logViewer"
    log-mode
    :max-lines="5000"
    :auto-scroll="true"
    language="shell"
    theme="vs-dark"
    :readonly="true"
    @scroll-end="loadMoreLogs"
  />
</template>

<script setup>
const logViewer = ref();
const loadMoreLogs = async () => {
  const logs = await fetchLogsFromServer();
  logViewer.value.appendContent(logs.join('\n'));
};
</script>
```

### 2. SQL 编辑器配置

```
<YMonaco
  v-model="sqlCode"
  language="sql"
  :sql-schema="tableSchema"
  :options="{
    fontSize: 14,
    minimap: { enabled: false },
    formatOnPaste: true,
  }"
  @run="handleRunSql"
/>
```

### 3. 响应式布局

组件默认开启 `autoLayout`，容器尺寸变化时会自动重新布局。如需手动控制，可调用 `layout()` 方法。

### 4. 全屏模式

- **应用内全屏**：使用 `toggleFullscreen()` 方法，编辑器固定定位填充目标容器
- **非浏览器全屏**：不依赖 Fullscreen API，兼容性更好
- **自定义目标**：通过 `fullscreenTarget` 指定全屏区域

---

## 注意事项

1. **CSS 导入**：Monaco 编辑器的 CSS 需要在主项目中全局导入一次：
   ```ts
   import 'monaco-editor/min/vs/editor/editor.main.css';
   ```

2. **Worker 加载**：✅ 组件库已内置 Worker 本地加载支持，**无需任何配置**即可在内网环境使用。

3. **性能优化**：
   - 日志模式下建议使用 `appendContent` 而非 `setValue`
   - 启用 `autoLayout` 时避免频繁改变容器尺寸
   - 超大文件（>100MB）建议设置 `autoLayout: false` 并手动调用 `layout()`

4. **主题切换**：切换主题后会立即生效，无需重新创建编辑器实例

5. **只读模式**：只读模式下仍可通过 `setValue` 或 `appendContent` 方法修改内容