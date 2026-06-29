---
toc: content
---

# Card 卡片

基于 `ant-design-vue` 的 `Card` 组件封装，专注于单个卡片功能，不包含布局逻辑。完全保留 Ant Design Card 的所有功能，同时提供更灵活的样式控制能力。

## 何时使用

- 需要将信息分组、分块展示，承载列表、表单、统计、图表等内容
- 需要灵活的样式定制，不受组件内部强制样式限制
- 希望业务层完全控制布局和样式，使用现代 CSS 布局方案（Grid/Flexbox）
- 保持与 Ant Design 生态完全兼容的同时，获得更好的定制性

## 代码演示

### 基础样式与定制

<code id="demo-card-basic" src="./demos/card/basic/index.vue" title="基础样式和灵活定制"></code>

### 标题与额外内容

<code id="demo-card-header-extra" src="./demos/card/header-extra/index.vue" title="标题插槽和额外操作"></code>

### 封面卡片

<code id="demo-card-cover" src="./demos/card/cover/index.vue" title="封面和操作区域"></code>

### Meta 信息展示

<code id="demo-card-meta" src="./demos/card/meta/index.vue"></code>

### 加载中状态

<code id="demo-card-loading" src="./demos/card/loading/index.vue" title="加载状态"></code>

### 自适应布局示例

<code id="demo-card-flexible-layout" src="./demos/card/flexible-layout/index.vue" title="自适应网格布局"></code>

### 监控仪表盘示例

<code id="demo-card-layout-metrics" src="./demos/card/layout-metrics/index.vue" title="仪表盘布局示例"></code>

## API

### YCard Props

完全兼容 `ant-design-vue` Card 的所有 Props，并额外提供以下扩展属性：

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| padding | `number \| string` | - | 内容区内边距，支持数字（px）或字符串（如 '16px', '8px 16px'）。会合并到 `bodyStyle.padding`，显式传入的 `bodyStyle.padding` 优先级更高。 |
| className | `string \| string[]` | - | 自定义卡片类名，可以是字符串或字符串数组，用于业务层样式定制。 |
| customStyle | `CSSProperties` | - | 自定义卡片样式对象，用于业务层直接设置样式，避免类名污染。 |
| metaTitle | `string` | - | Meta 标题，若提供任一 Meta 相关内容，将在内容区顶部渲染 Meta 信息。 |
| metaDescription | `string` | - | Meta 描述。 |

> **重要说明**: 组件不包含任何布局逻辑，所有布局由业务层通过 CSS Grid、Flexbox 等现代布局方案控制。


### Slots

| 插槽名 | 说明 |
| --- | --- |
| default | 卡片内容 |
| title | 标题插槽（对应 antd `#title`） |
| extra | 右上角额外内容（对应 antd `#extra`） |
| cover | 封面区域（对应 antd `#cover`） |
| actions | 底部操作区（对应 antd `#actions`） |
| tabBarExtraContent | Tabs 额外内容（当使用带 Tabs 的卡片时） |
| meta | Meta 整块内容插槽（若提供，将优先渲染此插槽） |
| meta-avatar | Meta 头像插槽（未提供 `meta` 时生效） |
| meta-title | Meta 标题插槽（未提供 `meta` 时生效） |
| meta-description | Meta 描述插槽（未提供 `meta` 时生效） |

### 设计理念

**灵活性优先**: y-card 专注于卡片功能本身，不强制任何布局样式，让业务层拥有完全的控制权。

**现代化布局**: 推荐使用 CSS Grid 和 Flexbox 等现代布局方案，而不是传统的栅格系统。

**样式可控**: 通过 `className` 和 `customStyle` 提供灵活的样式定制方式。

**完全兼容**: 保持与 Ant Design Card 的完全兼容，所有原有功能都可正常使用。

## 布局最佳实践

### 响应式布局指南

#### 1. 自适应网格布局（推荐）
```css
.cards-container {
  display: grid;
  /* 自动适应：最小宽度 280px，自动调整列数 */
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 24px;
}

/* 响应式优化 */
@media (max-width: 768px) {
  .cards-container {
    grid-template-columns: 1fr;
    gap: 16px;
  }
}
```

#### 2. 固定列数布局
```css
/* 4 列布局，适合大屏展示 */
.cards-grid-4 {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 24px;
}

/* 响应式断点 */
@media (max-width: 1400px) {
  .cards-grid-4 { grid-template-columns: repeat(3, 1fr); }
}
@media (max-width: 1024px) {
  .cards-grid-4 { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 768px) {
  .cards-grid-4 { grid-template-columns: 1fr; }
}
```

#### 3. Flexbox 布局
```css
.cards-flex {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}

.cards-flex .y-card {
  flex: 1 1 280px; /* 弹性增长，最小宽度 280px */
  max-width: 400px; /* 防止在大屏幕上过宽 */
}
```

### 布局选择建议

| 场景 | 推荐方案 | 说明 |
|------|----------|------|
| **仪表盘/数据展示** | 自适应网格 | 内容重要性相等，需要充分利用空间 |
| **产品列表** | 固定列数网格 | 统一展示效果，控制每行显示数量 |
| **信息卡片** | Flexbox | 内容长度不一，需要灵活排列 |
| **移动端优先** | 单列 + 响应式 | 优先保证移动端体验 |

### 关键设计原则

1. **最小宽度保护**: 确保卡片最小宽度 280px，保证内容可读性
2. **合理间距**: 使用主题变量设置间距，保持视觉一致性
3. **响应式优先**: 从移动端开始设计，逐步增强桌面端体验
4. **内容适配**: 卡片内部内容要能够适应宽度变化
5. **性能考虑**: 避免过度复杂的布局计算，优先使用原生 CSS 特性


