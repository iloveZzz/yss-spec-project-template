---
title: 快速开始
description: YSS UI 快速开始指南
toc: content
---

# 快速开始

YSS UI 是一个基于 Vue 3、Ant Design Vue 与 VXE-Table 的企业级中后台组件库，专为微应用架构设计。

## 安装

### 环境要求

- Node.js >= 22.10.0（建议升级到 22.17.1，我们在该版本验证良好）
- Vue >= 3.0.0

### 包管理器

推荐使用 pnpm：

```bash
pnpm add @yss-ui/components
```

或者使用 npm：

```bash
npm install @yss-ui/components
```

## 全局引入（你的微应用当前方案）

在 main.ts 中：

```typescript
import { createApp } from 'vue'
import YSSUI from '@yss-ui/components'
import '@yss-ui/components/dist/style.css'
import App from './App.vue'

const app = createApp(App)
app.use(YSSUI)
app.mount('#app')
```

## 按需引入（适用于独立项目或极限体积优化）

为了减小包体积，推荐按需引入组件：

<code src="./main/Button.vue" ></code>

## 使用 Utils 和 Hooks（先保留）

```typescript
// 使用工具函数
import { formatMoney, validateEmail } from '@yss-ui/utils'

// 使用 Hooks
import { useTable, useForm } from '@yss-ui/hooks'
```

## TypeScript 支持

YSS UI 使用 TypeScript 开发，提供完整的类型定义：

```typescript
import type { ButtonProps, FormProps } from '@yss-ui/components'
```

## 配置

### 全局配置

```typescript
import { createApp } from 'vue'
import YssUI from '@yss-ui/components'

const app = createApp(App)

app.use(YssUI, {
  // 全局配置
  theme: {
    primaryColor: '#1890ff'
  }
})
```

### 主题定制

```typescript
import { colors, spacing, typography } from '@yss-ui/theme'

// 使用主题变量
const primaryColor = colors.primary[6]
const basePadding = spacing.md
```

## 最佳实践

### 1. 组件命名

统一使用 `y-` 前缀避免命名冲突：

<code src="./main/Button.vue" ></code>

### 2. 类型安全

充分利用 TypeScript 类型：

```typescript
import type { YTableProps } from '@yss-ui/components'

const tableProps: YTableProps = {
  data: [],
  columns: [],
  showPagination: true
}
```

### 3. 主题一致性（避免颜色硬编码）

使用主题变量保持设计一致性：

<code src="./main/ButtonTheme.vue" ></code>

## 下一步

- 查看 [组件文档](/components/table) 了解所有可用组件
- 查看 [工具函数](/utils) 了解实用工具
- 查看 [Hooks](/hooks) 了解可复用逻辑
 - 面向存量系统：查看 [JSP 项目接入（UMD + CDN/本地）](/guide/jsp)
