---
name: microapp-commit
description: Guide AI to generate Conventional Commits messages specifically for micro-frontend application repos. Use this skill when the user asks to commit code, generate commit messages, or analyze changes in a micro-application project (NOT the YSS UI component library repo) (examples include "微应用提交代码", "commit 微应用的改动", "提交业务代码"). Capabilities include analyzing git diffs, determining commit type, auto-detecting scope from file paths, and handling mixed changes. NOTE - for the YSS UI component library repo itself, use commit-linting instead.
---

# 微应用提交规范 Skill

## 📋 目标

帮助 AI 为微应用项目生成符合 **Conventional Commits** 规范的 Git 提交信息，支持智能分析变更内容并处理复杂提交场景。

## 🔍 规范格式

```
<type>(<scope>): [模块名] <中文简短描述>

- <中文详细描述 1>
- <中文详细描述 2>
```

- **type**: 变更类型（必选）
- **scope**: 影响范围（必选，见下方 Scope 列表）
- **[模块名]**: 具体模块标识（可选，推荐使用）
- **subject**: 简短描述（必选，**必须使用中文**）
- **body**: 详细描述（可选，建议使用列表形式列出具体变更点，**必须使用中文**）

## 🎯 Type 选择指南

| Type | 说明 | 适用场景 | 示例 |
|------|------|----------|------|
| **feat** | 新功能 | 新增页面、组件、API 方法 | `feat(views): [UserManage] 新增用户列表页面` |
| **fix** | 修复 Bug | 修复逻辑错误、接口问题 | `fix(api): [AuthService] 修复 token 刷新失败` |
| **docs** | 文档变更 | README、注释更新 | `docs: 更新部署文档` |
| **style** | 代码格式 | 格式化、空格、分号等 | `style(views): 格式化代码` |
| **refactor** | 代码重构 | 优化结构，不改变功能 | `refactor(hooks): 重构 useRequest 逻辑` |
| **perf** | 性能优化 | 提升性能的代码修改 | `perf(views): 优化列表渲染性能` |
| **test** | 测试相关 | 添加或修改测试用例 | `test(utils): 添加日期格式化测试` |
| **chore** | 杂项 | 构建工具、依赖更新 | `chore(deps): 升级 vite 版本` |
| **build** | 构建系统 | 修改构建配置 | `build: 调整 vite 打包配置` |
| **ci** | CI 配置 | GitLab CI、Docker 配置 | `ci: 优化构建流水线` |

## 📂 Scope 选择指南

根据变更文件所在目录选择 scope：

| Scope | 对应目录 | 说明 |
|-------|----------|------|
| `views` | `src/views/` | 页面视图组件 |
| `api` | `src/api/` | API 接口层 |
| `components` | `src/components/` | 公共组件 |
| `hooks` | `src/hooks/` | 自定义 Hooks |
| `utils` | `src/utils/` | 工具函数 |
| `styles` | `src/styles/` | 全局样式 |
| `store` | `src/store/` | Pinia 状态管理 |
| `router` | `src/router/` | 路由配置 |
| `config` | `src/config/` | 项目配置 |
| `layout` | `src/layout/` | 布局组件 |
| `plugins` | `src/plugins/` | 插件配置 |
| `types` | `src/types/` | TypeScript 类型定义 |
| `deps` | `package.json` | 依赖更新 |
| `ci` | `.gitlab-ci.yml` | CI/CD 配置 |

> **详细映射规则参见**：[references/scope-mapping.md](references/scope-mapping.md)

## 🔀 变更分析决策树

使用以下决策流程判断 type：

```
1. 是否新增了功能或页面？
   ├── 是 → feat
   └── 否 → 继续

2. 是否修复了已有功能的问题？
   ├── 是 → fix
   └── 否 → 继续

3. 代码行为是否改变？
   ├── 是 → refactor（优化结构）或 perf（性能优化）
   └── 否 → 继续

4. 是否只改变了代码格式？
   ├── 是 → style
   └── 否 → 继续

5. 是否只改变了文档/注释？
   ├── 是 → docs
   └── 否 → chore / build / ci
```

## 🎭 复杂场景处理

### 场景 1：一次变更包含多种操作（新增 + 修改 + 删除）

**判断依据**：这些变更是否服务于**同一个业务目标**

| 情况 | 策略 |
|------|------|
| 同一功能：新增组件 + 修改路由 + 删除旧组件 | ✅ **单次提交**：<br>`feat(views): [UserManage] 新增用户管理模块`<br><br>`- 新增用户列表页`<br>`- 配置相关路由`<br>`- 移除旧版组件` |
| 无关功能：新增页面 + 修复另一个 Bug | ❌ **拆分提交**：先 `feat` 后 `fix` |

### 场景 2：功能开发 + 样式修改

| 情况 | 策略 |
|------|------|
| 样式是功能的一部分 | ✅ 归入 `feat`：`feat(views): [Profile] 新增用户头像样式` |
| 独立的样式优化 | 🔀 拆分 `style`：`style(views): [Profile] 优化头像布局` |

### 场景 3：重构 + Bug 修复

| 情况 | 策略 |
|------|------|
| 重构过程中发现并修复的小 Bug | ✅ 归入 `refactor` |
| 重大 Bug 修复 | 🔀 拆分为两个提交 |

### 场景 4：跨多个目录的变更

**优先级**：按主要变更目录选择 scope

```
示例：新增用户管理页面，涉及：
- src/views/UserManage/index.vue（主要）
- src/api/user.ts（API 支持）
- src/router/index.ts（路由配置）

推荐：
feat(views): [UserManage] 新增用户管理页面

- 完成页面 UI 开发
- 集成相关 API
- 注册路由配置
```

## ✅ 生成提交信息检查清单

生成提交信息后自动检查：

- [ ] **Type 正确**：是否准确反映变更性质
- [ ] **Scope 准确**：是否匹配主要变更目录
- [ ] **语言规范**：Subject 和 Body 必须使用**中文**
- [ ] **模块清晰**：是否标注了具体模块名
- [ ] **描述简洁**：首行不超过 72 字符
- [ ] **格式规范**：冒号后有空格，方括号格式正确，Body 使用列表形式

## 🚨 常见错误

### ❌ 错误 1：混合不相关变更

```
feat: 新增用户页面并修复登录问题
```

✅ **正确做法**：拆分为两个提交
```
feat(views): [UserManage] 新增用户管理页面
fix(views): [Login] 修复登录状态检测逻辑
```

### ❌ 错误 2：Scope 使用功能名而非目录名

```
feat(user): 新增用户列表
```

✅ **正确做法**：
```
feat(views): [User] 新增用户列表页面
```

### ❌ 错误 3：描述过于模糊

```
fix(api): 修复问题
```

✅ **正确做法**：
```
fix(api): [OrderService] 修复订单金额计算精度丢失
```

## 💡 最佳实践

1. **原子化提交**：每个提交只包含一个独立的功能或修复
2. **强制中文**：所有描述必须使用中文
3. **模块名必须标注**：在 Subject 开头用 `[模块名]` 标识
4. **Scope 必须匹配目录**：禁止使用业务功能名作为 Scope
5. **详细描述**：对于复杂变更，**必须**使用 Body 列表详细说明变更点

## 📝 提交信息生成流程

1. **分析变更**：执行 `git status` 和 `git diff --stat` 查看变更
2. **识别类型**：使用决策树判断 type
3. **确定范围**：根据主要变更文件确定 scope
4. **生成信息**：按格式生成提交信息（确保使用中文）
5. **复核检查**：使用检查清单验证

---

**最后更新**: 2026-02-04
