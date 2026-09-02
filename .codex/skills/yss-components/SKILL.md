---
name: "yss-components"
description: Use when YSS Vue 页面涉及布局、YTable、YEditTable、YFormily、YTree、ConditionBuilder、空态、弹窗或业务组件选型。
---

# YSS 页面组件开发标准

本技能用于统一 `views/**` 页面层的组件设计方式，参考 `QualityReportData` 页面沉淀标准，目标是提升一致性、可维护性与可复用性。

## 0. 权威资料与边界

- YSS UI 组件文档：`http://192.168.164.27:3200/components`（组件契约以该手册为准；本技能依据 2026-08-18 可见内容整理）
- 本地引用索引：`references/frontend-docs.md`

本技能只负责页面组件、布局和交互呈现规范。请求、分页参数、接口映射交给 `yss-hook` 或 `yss-api-integration`；新建或改造完整业务页面交给 `yss-ui-business-page-generation`，生命周期编排和旧触发词兼容交给 `yss-page-module-development`；表格/树高度细节交给 `yss-use-table-height` 或 `yss-use-tree-height`。

组件文档与当前项目的已验证用法冲突时，先检查当前项目代码和依赖版本，再决定是否迁移；不得把上游 Ant Design Vue、vxe-table、Univer 或 Monaco 的未验证 API 当作 YSS 顶层契约。

## 0.1 组件选型速查

| 场景 | 首选组件 | 关键边界 |
| --- | --- | --- |
| 常规动作、权限控制、操作下拉 | `YButton`、`AuthorityDropdown` | 用 `permissionCode` + `fallback` 控制隐藏/禁用；按需导入下拉必须使用 `AuthorityDropdown`，不使用仅全量注册的 `YDropdown` 别名。 |
| 信息分组、统计卡片 | `YCard` | 组件不处理卡片布局；使用 CSS Grid/Flex 排版，`padding` 与 `bodyStyle.padding` 同时提供时以后者为准。 |
| 左树右表、上下内容区 | `YSplitPane` | 轻内容使用默认实时拖拽；树、宽表、编辑器、图表等重内容使用 `resize-mode="deferred"` + `collapse-animation="transform"`。 |
| 树、目录、资源导航 | `YTree` | 受控选择使用 `v-model:selected-keys`；大量节点必须给 `height`，再按需设置 `virtual`，不能只靠 CSS 高度。 |
| 查询、编辑、详情表单 | `YFormily` | 新代码使用公开导出 `YFormily`；`YssFormily` 仅为历史兼容名。查询动作、展开状态和跨字段联动都以 schema / `scope` / `x-reactions` 表达。 |
| 常规展示、选择、分页、筛选、操作列 | `YTable` | 远程分页和远程筛选由 Hook 管理；多选必须声明业务 `row-config.keyField`，不能依赖内部 `_X_ROW_KEY`。 |
| 行内编辑、单元格校验、拖拽排序 | `YEditTable` | 只在确有编辑闭环时使用；保存前调用 `validate()`，以 `v-model:data` 与公开 `updateRow` 事件接回受控数据。 |
| 嵌套 AND/OR、字段-操作符-值联动 | `YConditionBuilder` | 保存和请求映射在 Hook；组件只维护 `ConditionGroup`。复杂筛选不是把字段硬编码回普通 `YFormily` 模板。 |
| 月视图、排班、日程状态 | `YMonthCalendar` | 是单日期选择与展示月份的独立状态，不是日期范围输入器；范围查询继续在 `YFormily` 的日期字段完成。 |
| SQL / JSON / 配置编辑、日志阅读 | `YMonaco` / `YMonacoDiff` | 容器变更后必要时调用 `layout()`；日志追加使用 `appendContent()`，不反复 `setValue()`。 |
| Cron 配置 | `YCron` | 输出为七段 `秒 分 时 天 月 周 年`；只使用其 `v-model`、`disabled`、`show-second`、`show-year` 公开契约。 |
| 类 Excel 协作编辑 | `YSheet` | 必须给明确高度；只通过 Facade API 更新工作簿，卸载后释放实例；评估 Univer/React/RxJS 的包体影响。 |
| 两步文件导入与失败结果下载 | `YFileImport` | 默认阻止 Upload 自动上传；在 `nextStep` / `finalImport` 事件中由业务实现校验、上传和结果回显。 |
| 图表 | `YssEcharts` | 先阅读当前版本组件页面与项目现有图表实践，再确定 option、数据更新和容器尺寸方案。 |

## 1. 触发场景

当需求涉及以下任一内容时，优先按本技能执行：

- 新建页面或重构页面结构
- 左树右表、左右分栏、主从布局
- YTable 列渲染、分页、空态
- YFormily（或历史代码中的 YssFormily）查询区与 schema 配置
- 页面级弹窗、详情抽屉、Header 信息区

## 2. 页面目录规范

单页面推荐结构：

```text
views/PageName/
  components/
    XxxBlock/
      index.vue
      style.less
      type.ts
      hooks/
  hooks/
    usePageTable.ts
  schemas/
    searchSchema.ts
  index.vue
  style.less
```

约束要求：

- `index.vue` 仅编排页面，不承载复杂数据转换
- `components/` 放展示型或区块型组件
- `hooks/` 放页面业务逻辑 Hook
- `schemas/` 放 YFormily 元数据定义

## 3. 页面骨架规范（YSplitPane + YTree）

页面容器使用 `YSplitPane`，并提供宽度边界与 `storage-key`。

```vue
<template>
  <div class="page-name">
    <YSplitPane
      :initial-width="280"
      :min-width="280"
      :max-width="480"
      collapsible
      storage-key="page-name-split"
    >
      <template #left>
        <div class="tree-panel"></div>
      </template>
      <template #right>
        <div class="content-panel"></div>
      </template>
    </YSplitPane>
  </div>
</template>
```

补充要求：

- 左侧区域承载目录、筛选树、统计导航
- 右侧区域按顺序组织 Header、查询区、数据区
- 右侧无选中对象时必须提供明确空态
- 尺寸需要受控时使用 `v-model:left-width`（纵向使用 `v-model:top-height`）；`storage-key` 仅保存用户尺寸，不替代页面状态。
- 左树使用业务主键配置 `field-names`，选中状态使用 `v-model:selected-keys`。树数据量大时传入明确 `height`，必要时启用虚拟滚动；搜索区通过 `#search`、`#header-left`、`#header-right` 扩展，不复制内置搜索逻辑。
- 节点“更多”操作使用 `get-node-actions` 和 `@action`；默认点击更多会选中该节点，若不应改变主内容选择，显式设置 `:select-on-action-click="false"`。
- 折叠树时默认保留内容状态（`destroy-on-collapse=false`）。只有确需释放重 DOM、且允许丢失树展开/勾选/滚动状态时才设为 `true`。

## 4. 查询区规范（YFormily）

查询表单必须采用 schema 驱动，页面中只负责绑定 `schema`、`scope`、初始值与插槽。

```vue
<YFormily
  ref="formRef"
  :schema="searchSchema"
  :model-value="initialValues"
  :scope="scope"
>
  <template #searchVal>
    <a-input-group compact>
      <a-select v-model:value="searchField" :options="tableFields" />
      <a-input v-model:value="searchVal" />
    </a-input-group>
  </template>
</YFormily>
```

schema 约束：

- 使用 `FormLayout + FormGrid + FormItem` 组织字段
- 按钮区使用 `AutoButtonGroup + Submit`
- 行为通过 `onSubmit: '{{ handleQuery }}'` 等 scope 方法绑定
- 新页面统一使用 `YFormily`；`YssFormily` 不作为新代码的组件名或类型来源。
- 查询表单需要折叠时启用 `collapsible`，并用 `v-model:expanded` 管理外部状态。使用 `#actions` 自定义操作区后，组件会把折叠入口置于其左侧；不要再手写第二套展开逻辑。
- 字段显隐、禁用、数据源联动使用 `x-reactions`；单字段输入优先监听底层组件的 `onUpdate:value`，选择/失焦事件以 Ant Design Vue 对应事件为准。复杂异步、副作用和跨页面可复用逻辑下沉到 Hook。
- 详情页使用 `mode="2"`，字段插槽固定为 `#detail-<path>`（路径中的 `.` 替换为 `-`）；不要为只读页另建一套模板。

## 5. 数据区规范（YTable）

表格统一使用 `YTable`，要求支持分页与插槽渲染。

```vue
<YTable
  :columns="columns"
  :data="tableData"
  :pageable="true"
  :pagination="pagination"
  :row-config="{ isCurrent: true, isHover: true, useKey: true }"
  @page-change="onPageChange"
  @size-change="onSizeChange"
>
  <template #quality_error_data="{ row }">
    <a-typography-text :content="row.quality_error_data" :ellipsis="true" copyable />
  </template>
</YTable>
```

列定义建议：

- 先固定序号列，再拼接动态列
- 列字段名与接口字段保持一致
- 长文本列优先 `showOverflow` 或省略显示
- 按业务主键设置 `:row-config="{ keyField: 'id', useKey: true }"`；涉及刷新、树表、勾选或批量操作时这是必需项。
- 分页数据来自服务端时在 `pagination` 中明确 `remote: true`，由 Hook 响应 `page-change` / `size-change` 后刷新数据和 `total`；不得让组件在远程数据上再次切片。
- 远程列筛选监听 `filter-change`，列上提供稳定的 `filters`，并设置 `filterMethod: () => true` 禁用 vxe-table 本地过滤；本地筛选才编写真实 `filterMethod`。
- 多选首列为 `type: 'checkbox'`，用 `v-model:selected-row-keys` 或 `v-model:selected-rows` 受控。批量动作放在 `#toolbar-right`，成功后重置选中键或调用 `clearSelection()`。
- 插槽统一使用 kebab-case：`#<field>-header`、`#<field>-filter`、`#expand-row`、`#group-header`、`#toolbar-left`、`#toolbar-right`。不要把 camelCase 旧兼容写法用于新模板。
- 最后一列宽度必须精确控制时设置 `:auto-flex-column="false"`；默认自动填满余宽。数据量达到组件阈值时让默认 `virtualXConfig` / `virtualYConfig` 生效，避免手动拼接分页假象。

### 5.1 可编辑表格的升级条件

只有同时满足“用户需要在行内编辑”和“编辑前校验、保存或取消回退”时，从 `YTable` 升级到 `YEditTable`：

- 列通过 `component`（可为纯函数）声明编辑器；按行差异由 `cellProps(ctx)` 决定，函数不得有副作用。
- 必填和自定义校验通过 `editRules` / `customRule` 声明，提交前调用 `tableRef.value.validate()`；校验失败不得发起保存请求。
- 以 `v-model:data` 接收完整数据，或在 Vue 模板监听公开 `updateRow` 事件的 kebab-case 写法 `@update-row` 接收单元格变更；保存失败由业务层回退受控数据或保持编辑态，不能假定组件自动持久化。
- 行级候选项优先级为“行对象 `rowOptionsFieldName`（默认 `options`）→ 列 `options` → `optionsMap[field]`”。字段联动、异步候选和清空关联值必须落在 Hook 的单一数据流中。
- 编辑表的表头筛选仍是 `filterable + filters + filterMethod`；编辑态 `filterOptions` 只过滤该行下拉候选，二者不可混用。

## 6. 交互状态规范

页面至少覆盖以下状态：

- `loading`：查询或刷新时显示 `a-spin`
- `empty`：无列或无数据时显示 `AEmpty`
- `selected`：依赖选中节点时，未选中显示引导空态
- `error`：请求失败提示 `message.error`

### 6.1 复杂条件、日历和导入的状态契约

#### `YConditionBuilder`

- 用于可嵌套的 AND/OR 条件树，根值必须是 `ConditionGroup`：`{ id, type: 'GROUP', logicalOp: 'AND' | 'OR', children }`；叶子是 `{ id, type: 'LEAF', field, operator, value, betweenValue1?, betweenValue2? }`。
- 静态操作符使用 `operator-options`；字段切换需改变操作符或值候选时使用 `get-operators(field)` 与 `load-values({ q, field, operator })`。远程字段搜索使用 `load-fields(q)`。
- 默认严格校验；提交前调用 `ref.validate()`。只有明确允许未完成草稿时才能关闭 `strict-mode`。
- 嵌套深度由 `max-depth` 限制（默认 3）。条件树到接口筛选 DSL 的序列化、恢复与错误兜底必须放在 `hooks/useXxx.ts`，保留组件内的标准模型。
- `readonly` 已废弃且不生效；展示态统一传 `disabled`。

#### `YMonthCalendar`

- `v-model` 管理一个选中 `Dayjs`，`v-model:month` 管理展示月份；两者不要混为一个日期范围字段。
- `valid-range` 限制可选范围，`disabled-date` 处理业务禁用日期。`validRange` 起止传反时组件会自动交换，但业务仍应在 Hook 中规范化输入。
- 需要连续假期/日程视觉时使用 `cell-layout="grid"` 和 `#date-cell` / `#date-cell-extra`；自定义单元格必须根据 `isToday`、`isSelected`、`isDisabled` 等上下文自行保留状态语义。
- 父容器高度确定且需要填满时才使用 `fill-height`；它要求父容器有明确高度。键盘、右键或双击动作接入 `select`、`cell-contextmenu`、`cell-dblclick`，不覆盖组件默认焦点行为。

#### `YFileImport`

- 以 `v-model` 管理弹窗显示；选择文件、`nextStep` 校验/预检、结果回显、`finalImport` 确认构成两步流程。事件会提供 `fileList`、`loadingName` 和 `close`。
- 默认 `beforeUpload` 始终返回 `false`，因此不能期待 `action` 自动上传。需要直传时只在 `upload-props.customRequest` 实现，文件类型规则由 `accept` 或 `file-type-list` 统一配置。
- `importResult` 用于展示成功、失败和总数；失败文件下载用 `exportErrorData` 事件。遮罩、居中等弹窗配置只放 `modal-props`，上传器配置只放 `upload-props`。

### 6.2 编辑器、Cron、Sheet 与图表

- `YMonaco` 默认 `auto-layout`；在分栏折叠、抽屉打开等容器尺寸变化后确认编辑器已布局。只读日志使用 `language="log"` 或 `"yss-log"`，并用 `appendContent()` 追加；超大内容避免频繁重设完整字符串。
- `YCron` 的业务值就是七段表达式。页面仅负责双向绑定和禁用态；Cron 到后端调度模型的转换、时区和生效校验属于接口/Hook 层。
- `YSheet` 的 `modelValue` 是工作簿数据；初始化后经 `getUniverAPI()` / `getWorkbook()` 的 Facade 修改并用 `save()` 取值，禁止直接改 `IWorkbookData`。必须设置容器高度；使用前确认 optionalDependencies 已被私服安装成功。
- `YssEcharts` 的 option、数据更新策略和容器尺寸以当前版本手册与项目既有实践为准；不得把原生 ECharts 初始化、实例销毁和 ResizeObserver 再复制进页面层。

## 7. 组件编码规范

- 使用 `<script setup lang="ts">`
- 使用 `defineOptions({ name: 'PageOrComponentName' })`
- 优先使用 `@yss-ui/components` 与 `ant-design-vue`
- 样式默认 `style.less`，并在组件中显式引入
- 页面脚本内保留编排逻辑，重逻辑下沉至 hooks

## 8. 页面开发检查清单

交付前自检：

- 布局是否符合“左导航、右内容”分区
- 查询区是否 schema 化且可扩展
- 表格分页、空态、加载态是否完整
- 插槽列是否处理长文本与复制/详情能力
- 页面状态切换是否可回退且无脏数据残留

## 9. 标准执行流程

处理页面搭建需求时，按以下顺序执行：

1. 先建立目录骨架（`components/hooks/schemas/index.vue/style.less`）
2. 再完成布局分区（左树右表或主从分区）
3. 再接入查询区（schema + scope + 插槽）
4. 最后接入数据区（YTable + 分页 + 空态 + 详情弹窗）

## 10. 输出内容模板

完成任务后，输出建议包含以下四段：

```markdown
### 组件结构

- 新增/调整了哪些页面区块

### 数据交互

- 查询、分页、空态如何衔接

### 关键规范

- 本次遵循了哪些 yss-components 规则

### 文件清单

- file path 1
- file path 2
```

## 11. 禁止项

- 不在 `index.vue` 写大段数据转换与请求编排
- 不绕过 YSS 组件直接引入其他重型 UI 表格方案
- 不把查询字段硬编码在模板中而跳过 schema
- 不省略空态、加载态与错误提示

## 12. 需求到实现示例

示例需求：

```text
基于 QualityReportData 新建一个质量明细页面，要求左侧树筛选、右侧查询+表格+详情弹窗。
```

推荐实现要点：

- 页面骨架复用 `YSplitPane`
- 左侧封装独立树组件并通过事件回传选中节点
- 查询条件全部放到 `schemas/searchSchema.ts`
- 表格使用 `YTable`，详情使用插槽 + 弹窗

## 13. 触发判定速查

满足任一条件即可触发本技能：

- 用户提到“页面搭建、页面重构、页面区块拆分”
- 用户提到“YTable、YEditTable、YFormily、YTree、YSplitPane、ConditionBuilder”
- 用户提到“左树右表、查询区、表格区、空态、详情弹窗”
- 用户要求“参考 QualityReportData 做一个新页面”

优先级建议：

- 页面结构与组件编排问题，优先 `yss-components`
- 请求与参数治理问题，优先 `yss-hook`

## 14. 典型请求示例

应触发示例：

- “帮我按 QualityReportData 的结构搭一个新页面，左侧树右侧表格。”
- “把这个页面查询区改成 YFormily schema 驱动。”
- “YTable 需要加分页和空态，顺便补一个详情弹窗。”

不应优先触发示例：

- “这个接口请求参数怎么合并分页参数？”（更适合 `yss-hook`）
- “useRequest 的 onSuccess 怎么做数据兜底？”（更适合 `yss-hook`）

## 15. useRequest 与组件层协作边界

本章节用于避免页面组件与 Hook 职责交叉。页面层允许使用 `useRequest`，但仅限轻量、一次性动作。

### 15.1 页面层允许使用 useRequest 的场景

- 导出下载、调试、校验、单次预览等动作型请求
- 与当前页面强绑定、复用价值低、参数简单的请求
- 不会引入分页治理和复杂数据映射的请求

推荐写法：

```typescript
const { run: runExport, loading: exportLoading } = useRequest(exportApi, {
  manual: true,
  onSuccess: (res) => {
    // 处理下载或成功提示
  },
  onError: () => {
    message.error("导出失败");
  },
});
```

### 15.2 页面层不应承载 useRequest 的场景

- 列表查询、分页查询、搜索联动请求
- 需要 `currentParams` 统一治理的请求
- 包含复杂数据转换、字段映射、树结构组装的请求

这类逻辑必须下沉到 `hooks/useXxx.ts`，由 `yss-hook` 规范约束。

### 15.3 组件与 Hook 的调用关系

- 组件层负责收集参数、触发动作、渲染状态
- Hook 层负责请求、数据转换、参数治理、异常兜底
- 组件层通过 `scope`、事件回调、方法调用接入 Hook，不复制 Hook 内逻辑

### 15.4 协作判定快表

- 若请求影响表格分页状态：放 Hook
- 若请求结果需要多处复用：放 Hook
- 若请求仅服务当前按钮动作：可留组件层
- 若请求需要导出复用筛选参数：放 Hook 并接入 `currentParams`

## 16. 冲突决策三步法（组件 or Hook）

当页面编排和请求逻辑同时出现时，按以下三步快速判定归属：

1. **先看是否影响分页或筛选参数状态**
   - 会影响 `page/pageSize/currentParams`：归 `yss-hook`
   - 不影响：进入第 2 步
2. **再看是否需要复用**
   - 多页面/多区块复用：归 `yss-hook`
   - 仅当前页面单点动作：进入第 3 步
3. **最后看是否为一次性动作请求**
   - 导出、调试、校验、单次预览：可留在 `yss-components`
   - 列表查询、联动筛选、结构转换：归 `yss-hook`

## 17. 二选一决策表

- **场景：左树右表页面搭建** → 使用 `yss-components`
- **场景：查询区改造为 schema 驱动** → 使用 `yss-components`
- **场景：分页参数与筛选参数统一治理** → 使用 `yss-hook`
- **场景：onSuccess/onError 数据兜底与映射** → 使用 `yss-hook`
- **场景：导出按钮单次请求且不参与分页状态** → 可在 `yss-components` 就地处理
- **场景：导出要复用 currentParams 并与列表一致** → 使用 `yss-hook`
