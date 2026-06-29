# YssFormily 示例索引

这个文件不重复解释 Formily 概念，只负责把常见场景映射到仓库里的权威文档和 demo。

## 先看哪里

1. 组件总文档  
   [`${base_project}/.trae/skills/yss-ui/assets/docs/components/formily.md`](${base_project}/.trae/skills/yss-ui/assets/docs/components/formily.md)
2. 对应 demo  
   `${base_project}/.trae/skills/yss-ui/assets/demos/formily/*.vue`

## 场景到 demo 的映射

| 场景               | 先看 demo                                                                                               | 备注                     |
| ------------------ | ------------------------------------------------------------------------------------------------------- | ------------------------ |
| 基础 schema 表单   | [`basic.vue`](${base_project}/.trae/skills/yss-ui/assets/demos/formily/basic.vue)                       | 最小可用骨架             |
| 标签布局/对齐      | [`align.vue`](${base_project}/.trae/skills/yss-ui/assets/demos/formily/align.vue)                       | `FormLayout` 用法        |
| 栅格布局           | [`grid.vue`](${base_project}/.trae/skills/yss-ui/assets/demos/formily/grid.vue)                         | `FormGrid` 与 `gridSpan` |
| 动态显隐           | [`dynamic.vue`](${base_project}/.trae/skills/yss-ui/assets/demos/formily/dynamic.vue)                   | `x-visible`              |
| 动态禁用           | [`disabled.vue`](${base_project}/.trae/skills/yss-ui/assets/demos/formily/disabled.vue)                 | `x-disabled`             |
| 标签提示           | [`label-tip.vue`](${base_project}/.trae/skills/yss-ui/assets/demos/formily/label-tip.vue)               | `tooltip`                |
| 自定义插槽         | [`slot.vue`](${base_project}/.trae/skills/yss-ui/assets/demos/formily/slot.vue)                         | `Slot` 组件              |
| 分组               | [`group.vue`](${base_project}/.trae/skills/yss-ui/assets/demos/formily/group.vue)                       | `GroupHeader` 与详情插槽 |
| 折叠表单           | [`collapse.vue`](${base_project}/.trae/skills/yss-ui/assets/demos/formily/collapse.vue)                 | 分区折叠                 |
| 普通联动           | [`linkage.vue`](${base_project}/.trae/skills/yss-ui/assets/demos/formily/linkage.vue)                   | 字段依赖                 |
| 新增/编辑/查看三态 | [`modes.vue`](${base_project}/.trae/skills/yss-ui/assets/demos/formily/modes.vue)                       | `mode` 与详情视图        |
| 远程字典翻译       | [`remote-enum.vue`](${base_project}/.trae/skills/yss-ui/assets/demos/formily/remote-enum.vue)           | 远程选项与展示           |
| 自定义业务组件     | [`custom-component.vue`](${base_project}/.trae/skills/yss-ui/assets/demos/formily/custom-component.vue) | `components` 扩展        |
| 行内事件           | [`events-inline.vue`](${base_project}/.trae/skills/yss-ui/assets/demos/formily/events-inline.vue)       | 轻量处理                 |
| scope 事件         | [`events-scope.vue`](${base_project}/.trae/skills/yss-ui/assets/demos/formily/events-scope.vue)         | 可复用逻辑               |
| effects            | [`effects.vue`](${base_project}/.trae/skills/yss-ui/assets/demos/formily/effects.vue)                   | 表单级副作用             |
| 异步校验           | [`async-validate.vue`](${base_project}/.trae/skills/yss-ui/assets/demos/formily/async-validate.vue)     | 优先配合 `scope`         |
| 多依赖联动         | [`linkage-multi.vue`](${base_project}/.trae/skills/yss-ui/assets/demos/formily/linkage-multi.vue)       | `scope + effects`        |
| 提交失败兜底       | [`submit-failed.vue`](${base_project}/.trae/skills/yss-ui/assets/demos/formily/submit-failed.vue)       | 统一失败提示             |
| 帮助文案/插槽混合  | [`helper-slot.vue`](${base_project}/.trae/skills/yss-ui/assets/demos/formily/helper-slot.vue)           | 说明区与自定义块         |
| 分步表单           | [`steps.vue`](${base_project}/.trae/skills/yss-ui/assets/demos/formily/steps.vue)                       | `FormStep`               |
| 动态数组           | [`dynamic-array.vue`](${base_project}/.trae/skills/yss-ui/assets/demos/formily/dynamic-array.vue)       | `ArrayItems`             |

## 推荐查找顺序

### 做新表单

1. 看 [`basic.vue`](${base_project}/.trae/skills/yss-ui/assets/demos/formily/basic.vue)
2. 看 [`grid.vue`](${base_project}/.trae/skills/yss-ui/assets/demos/formily/grid.vue)
3. 需要模式切换时看 [`modes.vue`](${base_project}/.trae/skills/yss-ui/assets/demos/formily/modes.vue)

### 做联动

1. 简单显隐先看 [`dynamic.vue`](${base_project}/.trae/skills/yss-ui/assets/demos/formily/dynamic.vue)
2. 禁用先看 [`disabled.vue`](${base_project}/.trae/skills/yss-ui/assets/demos/formily/disabled.vue)
3. 多字段或表单级联动看 [`linkage-multi.vue`](${base_project}/.trae/skills/yss-ui/assets/demos/formily/linkage-multi.vue) 和 [`effects.vue`](${base_project}/.trae/skills/yss-ui/assets/demos/formily/effects.vue)

### 做复杂字段

1. 先看 [`slot.vue`](${base_project}/.trae/skills/yss-ui/assets/demos/formily/slot.vue)
2. 再看 [`custom-component.vue`](${base_project}/.trae/skills/yss-ui/assets/demos/formily/custom-component.vue)
3. 有查看态时补看 [`group.vue`](${base_project}/.trae/skills/yss-ui/assets/demos/formily/group.vue) 或 [`modes.vue`](${base_project}/.trae/skills/yss-ui/assets/demos/formily/modes.vue)

## 实操提醒

- 编辑态自定义渲染优先 `Slot`
- 查看态自定义渲染固定走 `#detail-<path>`
- 详情列数先确认 `responsive` 是否开启
- 事件名以底层 Ant Design Vue 组件为准
- 如果只是不确定写法，不要猜，直接打开对应 demo
