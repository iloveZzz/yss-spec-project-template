# 微应用目录与 Scope 映射

本文档定义了微应用项目（vue3-template）的目录结构与 Git 提交 Scope 的映射关系。

## 核心目录结构

```
packages/src/
├── api/           → scope: api
├── components/    → scope: components
├── config/        → scope: config
├── hooks/         → scope: hooks
├── layout/        → scope: layout
├── plugins/       → scope: plugins
├── router/        → scope: router
├── store/         → scope: store
├── styles/        → scope: styles
├── types/         → scope: types
├── utils/         → scope: utils
└── views/         → scope: views
```

## 详细映射规则

### `views` - 页面视图

**路径**：`src/views/**`

**说明**：所有业务页面组件，包括列表页、详情页、表单页等。

**示例**：
```bash
feat(views): [UserManage] 新增用户管理页面
fix(views): [Dashboard] 修复图表数据加载异常
refactor(views): [OrderList] 重构订单列表查询逻辑
```

---

### `api` - API 接口层

**路径**：`src/api/**`

**说明**：API 请求封装、接口定义、响应处理。

**示例**：
```bash
feat(api): [UserService] 新增批量删除接口
fix(api): [AuthService] 修复 token 刷新逻辑
```

---

### `components` - 公共组件

**路径**：`src/components/**`

**说明**：跨页面复用的公共 UI 组件。

**示例**：
```bash
feat(components): [SearchForm] 新增通用搜索表单组件
fix(components): [Pagination] 修复分页器跳转问题
```

---

### `hooks` - 自定义 Hooks

**路径**：`src/hooks/**`

**说明**：Vue 3 Composition API 封装的 Hooks。

**示例**：
```bash
feat(hooks): [useRequest] 新增请求缓存功能
refactor(hooks): [useTable] 优化表格数据管理逻辑
```

---

### `utils` - 工具函数

**路径**：`src/utils/**`

**说明**：通用工具函数、辅助方法。

**示例**：
```bash
feat(utils): [date] 新增日期范围格式化方法
fix(utils): [number] 修复金额格式化精度问题
```

---

### `store` - 状态管理

**路径**：`src/store/**`

**说明**：Pinia 状态管理模块。

**示例**：
```bash
feat(store): [user] 新增用户权限状态管理
fix(store): [app] 修复主题切换状态丢失
```

---

### `router` - 路由配置

**路径**：`src/router/**`

**说明**：Vue Router 路由配置。

**示例**：
```bash
feat(router): 新增订单管理路由配置
fix(router): 修复路由守卫权限判断
```

---

### `styles` - 全局样式

**路径**：`src/styles/**`

**说明**：全局 CSS/Less 样式文件。

**示例**：
```bash
feat(styles): 新增暗色主题变量
style(styles): 优化全局按钮样式
```

---

### `config` - 项目配置

**路径**：`src/config/**`

**说明**：项目配置常量、环境配置。

**示例**：
```bash
feat(config): 新增微应用注册配置
chore(config): 更新 API 基础路径
```

---

### `layout` - 布局组件

**路径**：`src/layout/**`

**说明**：页面布局组件（Header、Sidebar、Footer 等）。

**示例**：
```bash
feat(layout): 新增面包屑导航组件
fix(layout): 修复侧边栏收起动画
```

---

### `plugins` - 插件配置

**路径**：`src/plugins/**`

**说明**：第三方插件初始化配置。

**示例**：
```bash
feat(plugins): 新增 dayjs 国际化配置
chore(plugins): 更新 axios 拦截器配置
```

---

### `types` - 类型定义

**路径**：`src/types/**`

**说明**：TypeScript 类型定义文件。

**示例**：
```bash
feat(types): 新增用户模块类型定义
refactor(types): 重构响应数据类型结构
```

---

## 根目录文件 Scope

| 文件 | Scope | 示例 |
|------|-------|------|
| `package.json` | deps | `chore(deps): 升级 ant-design-vue 版本` |
| `.commitlintrc.cjs` | chore | `chore: 更新提交规范配置` |
| `.gitlab-ci.yml` | ci | `ci: 优化构建流水线配置` |
| `vite.config.ts` | build | `build: 调整 vite 打包配置` |
| `tsconfig.json` | build | `build: 更新 TypeScript 编译配置` |
| `.eslintrc.cjs` | chore | `chore: 更新 ESLint 规则` |
| `Dockerfile` | ci | `ci: 优化 Docker 镜像构建` |
