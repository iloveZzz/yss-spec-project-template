---
name: component-development
description: 在 yss-ui 组件库源码中新建、修改或重构 Vue3 组件，覆盖真实 API 设计、TypeScript 类型、hooks 拆分、主题 Token、导出、文档 Demo 与验证。
---

# YSS UI 组件开发

## 触发条件

- 在 `packages/components/src` 新增或修改组件。
- 调整 Props、Emits、Slots、Expose 方法或类型导出。
- 重构超过 150 行或具有多个独立职责的组件。

## 不适用场景

- 只在业务微应用中组装现有组件：使用 `../yss-ui-business-page-generation/SKILL.md`。
- 只编写文档 Demo：使用 `../documentation/SKILL.md`。
- 只修改 changelog 或执行发版。

## 硬约束（禁止/必须）

- 修改前必须先读相邻组件、真实类型定义、导出入口、对应文档与最新 `llms-full.txt`，禁止编造 API。
- 源码目录必须使用小写或 kebab-case，例如 `edit-table`、`condition-builder`。
- Vue SFC 必须使用 `<script setup lang="ts">`，并按 script、template、style 顺序组织。
- 组件超过 150 行或包含多职责时，必须拆分 `index.vue`、`types.ts`、`constant.ts`、`hooks/`、`style.less`；不得为达到行数做无意义拆分。
- 所有新增的导出函数、hook、接口、类型与常量必须有中文 JSDoc，禁止只用行注释代替。
- 必须使用 ES Modules 与 ES6+，避免 Vue 2 API、`var`、CommonJS 和不必要的 `any`。
- 样式必须抽离到 `style.less`，由 scoped style 引入；颜色必须遵循 `../theme-token-usage/SKILL.md`。
- 必须在 `packages/components/src/index.ts` 同步运行时导出与 type-only 导出，并检查 `docs-entry.ts` 是否需要文档站专用导出。
- 修改 API 时必须同步文档 API 表、Demo、类型与 changelog。

## 标准代码骨架

```text
packages/components/src/example-component/
├── index.vue
├── types.ts
├── constant.ts
├── hooks/
│   └── useExampleState.ts
└── style.less
```

```vue
<script setup lang="ts">
import type { ExampleProps } from './types';
import { useExampleState } from './hooks/useExampleState';

defineOptions({ name: 'YExample' });

const props = withDefaults(defineProps<ExampleProps>(), {
  disabled: false,
});

const { displayValue } = useExampleState(props);
</script>

<template>
  <div class="y-example">{{ displayValue }}</div>
</template>

<style scoped lang="less">
@import './style.less';
</style>
```

## 交付检查清单

- [ ] API 与类型来自真实源码和最新文档，无虚构属性。
- [ ] 主组件职责单一，复杂状态、副作用和常量已正确拆分。
- [ ] Props、Emits、Slots、Expose 和公共方法类型完整。
- [ ] 新增符号有中文 JSDoc，无无用 import 和隐式 `any`。
- [ ] 样式抽离且支持主题切换，无业务硬编码品牌色。
- [ ] 入口导出、文档、Demo 和 changelog 已同步。
- [ ] 已运行针对性测试、`pnpm type-check` 与相关 lint。

## 失败兜底策略

- 文档与源码冲突时，以当前真实类型和实现为运行事实，同时修正文档并说明差异。
- 找不到可复用模式时，先选择职责最接近的已有组件，不自创全新目录规则。
- 全量 type-check 被无关历史问题阻断时，先运行定向测试并明确列出剩余阻断，不隐藏失败。
