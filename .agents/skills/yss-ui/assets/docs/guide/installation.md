---
title: 安装
description: YSS UI 安装指南
---

# 安装

## 环境准备

使用 YSS UI 前，需要在本地依次安装 [Node.js](https://nodejs.org/zh-cn/) 和包管理器。

### Node.js

YSS UI 支持 Node.js 22.10.0 及以上版本（建议升级到 22.17.1，我们在该版本验证良好）。

```bash
# 检查 Node.js 版本
node --version

# 建议安装 LTS 22.17.1（可用 nvm / volta 管理）
```

### 包管理器

推荐使用 pnpm 作为包管理器：

```bash
# 安装 pnpm
npm install -g pnpm

# 检查版本
pnpm --version
```

## 安装组件库

### 使用 pnpm（推荐）

```bash
pnpm add @yss-ui/components
```

### 使用 npm

```bash
npm install @yss-ui/components
```

### 使用 yarn

```bash
yarn add @yss-ui/components
```

## 安装子包

根据需要安装相应的子包：

```bash
# 工具函数包
pnpm add @yss-ui/utils

# Hooks 包
pnpm add @yss-ui/hooks

# 主题包
pnpm add @yss-ui/theme
```

## CDN 引入（可选）

对于快速原型开发，可以通过 CDN 引入：

```html
<!-- 引入 Vue 3 -->
<script src="https://unpkg.com/vue@3/dist/vue.global.js"></script>

<!-- 引入 YSS UI -->
<script src="https://unpkg.com/@yss-ui/components/dist/index.umd.js"></script>
<link rel="stylesheet" href="https://unpkg.com/@yss-ui/components/dist/style.css">
```

## 版本信息

YSS UI 版本与依赖版本对应关系：

| YSS UI | Vue | Ant Design Vue | VXE-table |
|--------|-----|----------------|-----------|
| 1.x    | 3.3+ | 4.0+           | 4.5+      |

## 下一步

安装完成后，可以：

1. 查看 [快速开始](/guide) 了解基本用法
2. 查看 [组件文档](/components/table) 了解所有组件
3. 在项目中开始使用 YSS UI
