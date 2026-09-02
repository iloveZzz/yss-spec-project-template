---
name: documentation
description: 为 YSS UI 组件、Hooks 和工具函数新建或更新 Dumi 文档、Demo、API 表与导航；修改公共 API 或文档构建失败时使用。
---

# YSS UI 文档编写

## 触发条件

- 新增或修改 `docs/components`、`docs/hooks`、`docs/utils` 下的文档与 Demo。
- 组件 Props、Events、Slots、Expose 方法或类型已变更。
- Dumi 导航、Demo 编译或 `llms-full.txt` 内容与源码不一致。

## 不适用场景

- 只修改组件实现且不涉及公共 API：使用 `../component-development/SKILL.md`。
- 只更新版本日志：使用 `../changelog-generation/SKILL.md`。
- 业务微应用内的页面说明文档。

## 硬约束（禁止/必须）

- 必须先读真实源码、类型、已有测试、相邻文档和最新 `llms-full.txt`；禁止从记忆中编造 API。
- 文档 frontmatter 必须包含 `title`、`description`、`toc: content`，并保持当前 Dumi 路由结构。
- Demo 必须放在对应的子目录，并使用 kebab-case 文件名或项目已有的场景目录模式。
- Vue Demo 必须使用 `<script setup lang="ts">`，按 PascalCase 直接使用显式导入的组件；禁止强制创建无意义的 `AButton = Button` 别名。
- YSS UI 组件优先从 `@yss-ui/components` 导入；只在未封装能力或文档专门演示底层能力时使用 Ant Design Vue。
- API 表必须与真实类型和默认值一致；透传属性要明确标注，禁止把底层所有 API 当成已验证能力复制。
- Demo 中的导出函数、类型、方法与常量必须有中文 JSDoc；演示文案可用简短中文行注释。
- 修改导航前必须检查 `.dumirc.ts` 的实际 sidebar 结构，禁止重复链接。
- 组件 API 文档变更后必须重新生成并检查 `public/llms-full.txt`。

## 标准代码骨架

```markdown
---
title: Example 示例
description: 组件的用途与核心能力
toc: content
---

# Example 示例

## 代码演示

### 基础用法

<code src="./demos/example/basic.vue"></code>

## API

### YExample Props

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| value | 当前值 | `string` | `''` |
```

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { YButton } from '@yss-ui/components';

const count = ref(0);

/** 累加点击次数。 */
const handleClick = () => {
  count.value += 1;
};
</script>

<template>
  <YButton type="primary" @click="handleClick">点击次数：{{ count }}</YButton>
</template>
```

## 交付检查清单

- [ ] frontmatter、标题层级、Demo 路径和 sidebar 链接正确。
- [ ] API 表与当前类型、默认值、事件载荷和插槽上下文一致。
- [ ] Demo 只演示已存在能力，可独立编译且无无用导入。
- [ ] 已优先使用 YSS UI 封装组件，直接使用 Ant Design Vue 的地方有明确理由。
- [ ] 已运行文档构建或针对性 Demo 测试。
- [ ] 公共 API 变更已同步 changelog 和 `llms-full.txt`。

## 失败兜底策略

- 源码、类型与线上文档不一致时，以当前源码为运行事实，同时修复文档并标明未发布差异。
- Demo 构建失败时，先用最小 Demo 验证导入、类型和模板，再逐步恢复复杂场景。
- 重依赖组件导致文档构建问题时，检查 `packages/components/src/docs-entry.ts` 的现有异步导出模式，不在 Demo 中临时绕过。
