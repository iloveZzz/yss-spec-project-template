# YFormily Schema 转换工作流

从文字、图片或 Figma 转换表单时，按当前输入读取相关部分。先由 [YFormily 场景路由](../../yss-formily/SKILL.md)选择必要专项；精确 API、三层布局、提交和错误处理仍由已安装的 `formily-foundation` 决定，联动、详情与分步由实际命中的原专项决定。

公开技能包提供本工作流和所链接的公共路由、组件资料，不附带 `formily-foundation`、`formily-linkage-effects`、`formily-mode-slot-detail` 或 `formily-step-flow`。本地已安装时，原专项仍是对应规则的唯一所有者；公共路由和部分 Demo 不替代专项规范。必要专项缺失或不可读时，停止受影响的生产 schema / 渲染实现，报告缺失 Skill 与来源；从消费工程已登记的技能来源恢复，核验版本与项目基线一致并重新读取后再继续。

## 确认用途与字段模型

先确认目标是查询、新增、编辑、详情还是复合表单，以及输出是 schema、schema + 渲染示例，还是 schema + model + scope/effects 计划。

| 字段信息 | 要确认的含义 |
|---|---|
| key / title / type | 稳定业务字段名、显示标签与业务数据类型 |
| component / required | 控件和已确认的必填规则 |
| group / span | 分组位置与布局宽度 |
| enum source / linkage | 静态或远程来源、依赖及影响的字段 |
| custom render | 编辑 Slot 或 detail slot 的需要 |

没有显式 key 时建议稳定业务名称，不使用 `input1`、`selectA`、`fieldLeft`。建议不替代冻结 DTO 和统一业务词汇。

## 控件、分组与跨度

| 输入线索 | 默认建议 |
|---|---|
| 单行 / 多行文本 | `Input` / `Input.TextArea` |
| 单选下拉 / 单选按钮 | `Select` / `Radio.Group` |
| 开关 | `Switch` |
| 日期 / 日期区间 | `DatePicker` / `DatePicker.RangePicker` |
| 数值 | `InputNumber` |
| 多选标签 | `Select` 多选模式 |
| 上传 | `Upload` |
| 可重复行 | `ArrayItems` |

SQL、代码、富文本、复杂辅助区或嵌入表格 / 树选择器等自定义输入，编辑态用 `Slot`，查看态用 `detail-*` 插槽。实际是否可用仍核验目标版本与当前 schema 注册组件。

页面布局映射为 `FormLayout`、栅格为 `FormGrid`、分组标题为 `GroupHeader`。纯表单底部动作可用 `AutoButtonGroup`；业务列表查询区按下一节单独处理。横向表单显式设置 `labelWidth` 与 `labelAlign: 'right'`，栅格保持响应式。

普通字段可建议 `gridSpan: 1`，较宽字段为 `2`，宽屏编辑器可为 `3`；长文本、满宽字段和自定义编辑器的跨度必须与实际栅格列数及窄屏行为匹配，不能只复制示例数字。

```ts
const schema: ISchema = {
  type: 'object',
  properties: {
    layout: {
      type: 'void',
      'x-component': 'FormLayout',
      'x-component-props': { layout: 'horizontal', labelWidth: 120, labelAlign: 'right' },
      properties: {
        grid: {
          type: 'void',
          'x-component': 'FormGrid',
          'x-component-props': { maxColumns: 2, minColumns: 1, minWidth: 320 },
          properties: {},
        },
      },
    },
  },
};
```

示例数字仅为起点，不决定目标页面的字段、列数或业务规则。

## 查询与详情的分支

业务查询表单保持紧凑，保留已确认的必填规则，不因常见习惯新增必填。YFormily 渲染字段，外部 YButton 查询 / 重置由 Hook 的 `handleSearch/handleReset` 维护同一参数源、回第一页并执行请求。动作区按 [业务页面查询区规则](../../yss-ui-business-page-generation/SKILL.md)核对，基础表单约束仍由已加载的 `formily-foundation` 决定；不将 schema 内 `AutoButtonGroup + Submit/Reset` 当作 CRUD 查询区默认方案。

查询输出包含 schema、初始筛选 model 和查询 / 重置处理计划。单纯 Formily 表单提交仍可按基础规范使用 schema 内按钮组。

详情或新增 / 编辑 / 查看复合表单确认 mode，不只生成可编辑控件。默认描述列表足够时不另造渲染；富格式、数组标签、代码或富文本查看器需要自定义 detail slot 时，按 [模式与插槽路由](../../yss-formily/SKILL.md)加载已安装的 `formily-mode-slot-detail`，由原专项确定规范。

## 校验与联动的依据

| 线索 | 如何处理 |
|---|---|
| 明确必填标记、数值 / 日期约束或 helper 文本 | 对照需求确认含义后编码 |
| 常见业务习惯、名称必填或长度暗示 | 保留建议与待确认项，不仅凭习惯把规则写入 schema |
| 隐藏唯一性、服务端或跨表校验 | 只有用户 / 权威需求已明确描述时编码 |

| 当前任务 | 首选机制 |
|---|---|
| 简单显隐 / 禁用 | `x-visible` / `x-disabled` 表达式 |
| 单字段依赖更新 | `x-reactions` |
| 调接口更新选项或跨字段事件 | `scope` |
| 表单级多字段协同 | `effects` |

例如数据源类型控制 JDBC 配置显示、开关控制字段禁用、省份控制城市选项与失效旧值，都需要确认字段路径和实际依赖。编码查重仅在已确认需求存在时实现。客户端提交校验失败反馈使用 `onFormSubmitValidateFailed`；API reject 仍由 mutator 统一提示，不能把“提交失败统一 toast”机械映射到通用 effects 失败回调。复杂或异步联动按 [联动场景路由](../../yss-formily/SKILL.md)加载已安装的 `formily-linkage-effects`，由原专项处理初始化、合法回填、竞态和卸载。

## Figma 与图片检查

Figma 读取语义标签，不沿用 `Frame 123`、`Input / Default`、`Group 14` 等设计图层名；忽略纯装饰层，把 helper 与必填提示作为需核对的规则线索。底部按钮转成动作区，宽框编辑器结合实际空间安排满宽。

截图先区分 placeholder 与标签，识别 Tab / 分段控制是否意味着条件区，确认大框是自定义编辑器还是 textarea。图像理解是近似的，低置信度时输出可审阅骨架并记录不确定项，不制造精确业务规则。

## 输出与自检

按“简短理解 → 假设 → 字段模型 → schema → 按需 model / 渲染示例”组织。JSON / TS 标识保持原样，假设与已确认规则分开。检查字段稳定、分组有业务含义、必填 / 可选和只读 / 联动与输入一致，所需 API 与插槽来自当前版本。只剩真正阻断正确性的未决问题时交回所有者；文档输出不改变原合同状态或批准。
