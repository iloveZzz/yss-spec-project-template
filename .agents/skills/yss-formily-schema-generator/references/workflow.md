# YssFormily Schema Conversion Workflow

This reference is for converting text, images, and Figma designs into YssFormily artifacts.

## 1. Normalize the request

Classify the target form first:

| Form type | Signals |
| --- | --- |
| 查询表单 | 筛选、搜索、重置、查询、导出 |
| 新增表单 | 新建、创建、录入、保存 |
| 编辑表单 | 编辑、更新、修改 |
| 详情表单 | 查看、详情、只读、描述列表 |
| 复合表单 | 同页同时支持新增/编辑/查看 |

Then decide the expected output:

- schema only
- schema + render snippet
- schema + data model + scope/effects plan

## 2. Extract a field table

Before writing schema, create a mental table with:

| Item | Meaning |
| --- | --- |
| key | stable field name |
| title | display label |
| type | business data type |
| component | YssFormily component |
| required | whether mandatory |
| group | section placement |
| span | layout width |
| enum source | static or remote |
| linkage | depends on or affects other fields |
| custom render | slot/detail slot needed or not |

If a field key is not explicit, generate a stable domain name.
Avoid UI-only names such as `input1`, `selectA`, `fieldLeft`.

## 3. Component mapping heuristics

Use these defaults:

| Input clue | Preferred YssFormily component |
| --- | --- |
| 单行文本 | `Input` |
| 多行说明 | `Input.TextArea` |
| 单选下拉 | `Select` |
| 单选按钮 | `Radio.Group` |
| 开关 | `Switch` |
| 日期 | `DatePicker` |
| 日期区间 | `DatePicker.RangePicker` |
| 数值 | `InputNumber` |
| 多选标签 | `Select` with multiple mode |
| 文件上传 | `Upload` |
| 可重复行 | `ArrayItems` |

If the UI is clearly custom:

- use `Slot` for edit mode
- use `detail-*` slot for detail mode

Typical custom cases:

- SQL editor
- code editor
- rich text
- complex helper panel
- embedded table or tree selector

## 4. Layout mapping heuristics

Convert visual grouping to YssFormily structure:

- page-level layout -> `FormLayout`
- grid rows and columns -> `FormGrid`
- section title -> `GroupHeader`
- footer actions -> `AutoButtonGroup`

Use `gridSpan` when:

- field is visually full width
- long text area spans across columns
- custom editor needs horizontal space

Conservative defaults:

- ordinary field: `gridSpan: 1`
- medium-wide field: `gridSpan: 2`
- editor-like block: `gridSpan: 3` if page is wide enough

## 5. Validation extraction

Confidence levels:

- high confidence:
  required star, obvious numeric/date constraints, explicit helper text
- medium confidence:
  common business conventions such as name required, code length hint
- low confidence:
  hidden uniqueness checks, server-side validation, cross-form constraints

Only encode low-confidence validation if the user explicitly described it.

## 6. Linkage extraction

Map visible interactions into one of these:

| Situation | Mechanism |
| --- | --- |
| 简单显隐 | `x-visible` |
| 简单禁用 | `x-disabled` |
| 单字段依赖更新 | `x-reactions` |
| 调接口更新选项 | `scope` handler |
| 多字段协同或提交兜底 | `effects` |

Examples:

- “选择数据源类型后才显示 JDBC 配置” -> `x-visible`
- “切换开关后禁用描述字段” -> `x-disabled`
- “选择省份后重置城市并更新选项” -> `x-reactions`
- “输入编码后查重” -> `scope` or async validator
- “提交失败统一 toast” -> `effects`

## 7. Output template

Preferred answer skeleton:

```md
理解

假设

字段模型

```ts
// schema
...
```

```ts
// initial model shape
...
```

```vue
<!-- optional render snippet -->
...
```
```

## 8. Schema skeleton

Use this as the default starting point:

```ts
const schema: ISchema = {
  type: 'object',
  properties: {
    layout: {
      type: 'void',
      'x-component': 'FormLayout',
      'x-component-props': {
        layout: 'horizontal',
        labelWidth: 120,
      },
      properties: {
        grid: {
          type: 'void',
          'x-component': 'FormGrid',
          properties: {},
        },
      },
    },
  },
};
```

## 9. Query form special handling

When the form is clearly a search form:

- keep fields compact
- avoid excessive required rules
- place actions in `AutoButtonGroup`
- include `Submit` and `Reset`
- prefer light linkage over complex `effects`

Typical query output includes:

- schema
- initial filter model
- submit/reset handlers through `scope`

## 10. Detail form special handling

If the target is read-only or mixed add/edit/detail:

- plan `mode`
- check whether detail mode needs custom slots
- do not generate editable controls only
- leverage default descriptions rendering when enough

Use custom detail slots only when:

- value needs rich formatting
- arrays should render tags
- code or rich text should render in a viewer

## 11. Figma-specific notes

When converting from Figma:

- extract semantic labels, not layer IDs
- ignore purely decorative layers
- map helper text and required marks into schema rules
- convert footer buttons into action area, not ordinary fields
- infer full-width editors from large framed regions

Do not preserve design-only names such as:

- `Frame 123`
- `Input / Default`
- `Group 14`

Translate them into domain names and stable field keys.

## 12. Image-specific notes

When converting from screenshots:

- distinguish placeholder text from actual label text
- watch for tabs or segmented controls that imply conditional sections
- identify whether a box is a custom editor or just a textarea
- keep uncertain parts in assumptions

If confidence is low, generate a clean schema baseline instead of fake precision.
