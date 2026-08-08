# YSS UI 发版工作流指南

## 📋 Commit Message 规范（必须遵守）

### 格式

```
<type>(<scope>): <subject>

[可选的 body]

[可选的 footer]
```

### Type 类型

| Type | Emoji | 说明 | 示例 |
|------|-------|------|------|
| `feat` | ✨ | 新功能 | `feat(@yss-ui/components): Table 新增远程筛选功能` |
| `fix` | 🐞 | Bug 修复 | `fix(@yss-ui/hooks): useFullscreen 修复 iOS 兼容性` |
| `docs` | 📝 | 文档更新 | `docs(components): 更新 Table 组件文档` |
| `style` | 💅 | 代码格式 | `style(@yss-ui/components): 统一组件代码缩进` |
| `refactor` | 🛠 | 重构 | `refactor(@yss-ui/hooks): 优化 useLoading 实现` |
| `perf` | ⚡ | 性能优化 | `perf(@yss-ui/utils): 优化 formatDate 性能` |
| `test` | ✅ | 测试 | `test(@yss-ui/components): 添加 Table 单元测试` |
| `build` | 📦 | 构建系统 | `build: 升级 vite 到 5.0` |
| `ci` | 🔧 | CI 配置 | `ci: 更新 GitLab CI 配置` |
| `chore` | 🔨 | 其他 | `chore: 更新依赖包` |

### Scope 范围

- `@yss-ui/components` 或 `components` - 组件库
- `@yss-ui/hooks` 或 `hooks` - Hooks 库
- `@yss-ui/utils` 或 `utils` - 工具库
- `@yss-ui/theme` 或 `theme` - 主题配置
- `docs` - 文档
- `scripts` - 脚本
- `config` - 配置文件
- `deps` - 依赖更新

### 示例

**✅ 正确示例**：

```bash
# 新功能
git commit -m "feat(@yss-ui/components): Table 支持虚拟滚动"
git commit -m "feat(@yss-ui/hooks): 新增 useDebounce Hook"

# Bug 修复
git commit -m "fix(@yss-ui/components): Table 修复空数据时的报错"
git commit -m "fix(@yss-ui/utils): formatDate 修复时区问题"

# 文档更新
git commit -m "docs(components): 更新 Table API 文档"
git commit -m "docs(hooks): 添加 useFullscreen 使用示例"

# 重构
git commit -m "refactor(@yss-ui/hooks): useLoading 采用模块化结构"

# 多行 commit message（使用编辑器）
```
feat(@yss-ui/components): Table 新增远程筛选功能

- 支持服务端分页
- 支持多字段筛选
- 新增 filterMethod 配置项

Closes #123
```
```

**❌ 错误示例**：

```bash
# 缺少 scope
git commit -m "feat: 添加新功能"

# type 错误
git commit -m "add: 新增功能"

# scope 不在枚举中
git commit -m "feat(table): 新增功能"

# 以句号结尾
git commit -m "feat(@yss-ui/components): 新增功能。"
```

---

## 🚀 发版流程

### 本地发版（推荐）

```bash
# 步骤 1: 确保本地代码最新
git pull origin main

# 步骤 2: 选择发版类型

# 发布补丁版本 (1.0.0 -> 1.0.1) - 修复 bug
pnpm release:patch

# 发布次版本 (1.0.0 -> 1.1.0) - 新增功能，向下兼容
pnpm release:minor

# 发布主版本 (1.0.0 -> 2.0.0) - 破坏性更新
pnpm release:major

# 首次发版（不改变版本号，只生成日志和 tag）
pnpm release:first

# 步骤 3: 脚本自动执行以下操作
# - 根据 commit 历史生成 docs/changelog.md
# - bump 所有 package.json 的版本号
# - 创建 git commit 和 tag
# - 等待你确认推送

# 步骤 4: 检查生成的日志
git diff HEAD~1 docs/changelog.md

# 步骤 5: 如果满意，推送到远程
git push --follow-tags origin main

# 步骤 6: 在 GitLab UI 点击「手动发版」按钮触发 CI/CD
```

### GitLab CI 自动发版

如果配置了 GitLab CI，可以自动化整个流程：

```yaml
# .gitlab-ci.yml 示例
release:
  stage: release
  only:
    - main
  when: manual
  script:
    - git config user.name "GitLab CI"
    - git config user.email "ci@gitlab.com"
    - pnpm release  # 自动检测版本类型
    - git push --follow-tags origin main
```

---

## 📝 更新日志管理

### 自动生成规则

standard-version 会根据 commit message 自动生成更新日志：

1. **Type 映射**：
   - `feat` → ✨ Features
   - `fix` → 🐞 Bug Fixes
   - `docs` → 📝 Documentation
   - `refactor` → 🛠 Refactoring
   - `style` → 💅 Style

2. **Scope 转换**：
   - `@yss-ui/components` → `[@yss-ui/components]`
   - `components` → `[@yss-ui/components]`
   - `@yss-ui/hooks` → `[@yss-ui/hooks]`
   - `hooks` → `[@yss-ui/hooks]`

3. **分包日志**：
   - 自动从综合日志提取各包的更新
   - 生成 `docs/changelog/{components,hooks,utils}.md`

### 手动调整日志

如果自动生成的日志需要调整：

```bash
# 1. 发版后手动编辑综合日志
vim docs/changelog.md

# 2. 手动更新分包日志
vim docs/changelog/hooks.md
vim docs/changelog/components.md
vim docs/changelog/utils.md

# 3. 修正 commit（如果还没推送）
git add docs/changelog*
git commit --amend --no-edit

# 4. 推送
git push --follow-tags origin main
```

---

## 🔧 常见问题

### Q: Commit message 格式错误怎么办？

A: Husky 的 commit-msg hook 会自动检查格式，不符合规范的 commit 会被拒绝：

```bash
$ git commit -m "add new feature"
⧗   input: add new feature
✖   subject may not be empty [subject-empty]
✖   type may not be empty [type-empty]
```

修正方式：
```bash
git commit -m "feat(@yss-ui/components): Table 新增远程筛选功能"
```

### Q: 如何撤销错误的发版？

A: 使用 Git 回退：

```bash
# 回退到上一个版本
git reset --hard HEAD~1

# 删除错误的 tag
git tag -d v1.0.1
git push origin :refs/tags/v1.0.1
```

### Q: 如何跳过某些 commit？

A: 在 commit message 中添加 `[skip ci]` 或使用 `chore` type：

```bash
git commit -m "chore: 更新 README (不会出现在 changelog 中)"
```

### Q: 如何添加 Breaking Changes？

A: 在 commit message 中添加 `BREAKING CHANGE:`：

```bash
git commit -m "feat(@yss-ui/components): 重构 Table API

BREAKING CHANGE: `columns` 属性不再支持字符串数组
"
```

---

## 📚 参考资源

- [Conventional Commits 规范](https://www.conventionalcommits.org/)
- [Semantic Versioning](https://semver.org/lang/zh-CN/)
- [standard-version 文档](https://github.com/conventional-changelog/standard-version)
- [commitlint 文档](https://commitlint.js.org/)
