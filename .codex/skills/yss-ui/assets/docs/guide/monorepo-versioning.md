# Monorepo 版本管理说明

## ⚠️ 当前方案的限制

### 问题：所有包同步发版

当前我们使用 `standard-version` 配置了统一的版本管理，这导致：

```javascript
// .versionrc.js
bumpFiles: [
  { filename: 'package.json' },
  { filename: 'packages/components/package.json' },  // ← 所有包
  { filename: 'packages/hooks/package.json' },       // ← 都会同步
  { filename: 'packages/utils/package.json' },       // ← bump 版本
  { filename: 'packages/theme/package.json' },
]
```

**影响**：
- ✅ 优点：版本号统一管理，简单清晰
- ❌ 缺点：即使只修改了 `hooks`，`components`、`utils` 等所有包的版本号都会一起更新

### 示例

```bash
# 提交了一个 hooks 的新功能
git commit -m "feat(hooks): useFullscreen 新增功能"

# 执行发版后
pnpm release:minor

# 结果：所有包版本号都从 1.0.3 升级到 1.0.4
- @yss-ui/components: 1.0.3 → 1.0.4  (但实际没有修改)
- @yss-ui/hooks: 1.0.3 → 1.0.4       (实际修改的包)
- @yss-ui/utils: 1.0.3 → 1.0.4       (但实际没有修改)
```

---

## 💡 解决方案（可选）

如果需要独立管理各个包的版本号，有以下选择：

### 方案 1：使用 Lerna + Conventional Commits

```bash
# 安装 Lerna
pnpm add -D lerna

# 配置 lerna.json
{
  "version": "independent",  // 独立版本模式
  "command": {
    "version": {
      "conventionalCommits": true,
      "message": "chore(release): publish"
    }
  }
}

# 发版命令
lerna version --conventional-commits
```

**特点**：
- ✅ 只更新有变更的包
- ✅ 自动生成 CHANGELOG
- ✅ 支持独立版本号
- ❌ 配置相对复杂

### 方案 2：使用 Changeset

```bash
# 安装 Changeset
pnpm add -D @changesets/cli

# 初始化
pnpm changeset init

# 工作流
pnpm changeset       # 创建变更文件
pnpm changeset version  # 消费变更并 bump 版本
pnpm changeset publish  # 发布包
```

**特点**：
- ✅ 精确控制哪些包需要发版
- ✅ 支持独立版本号
- ✅ 社区广泛使用
- ❌ 需要手动创建 changeset 文件

### 方案 3：保持当前方案（推荐 ⭐）

如果你们的发版策略是：
- 各个包通常一起发版
- 版本号保持同步
- 简化管理流程

那么 **当前方案已经足够**，无需改动。

---

## 🔧 当前方案的使用建议

### 1. 版本号语义

即使所有包都同步 bump，但更新日志中会清晰标注哪个包有真实变更：

```markdown
## v1.0.4

### ✨ Features
- **[@yss-ui/hooks]** useFullscreen: 新增 Esc 键提示功能

### 🐞 Bug Fixes
(empty - components 和 utils 没有实际变更)
```

### 2. 发版时机

建议按照实际需求发版：
- **Patch** (1.0.0 → 1.0.1)：Bug 修复
- **Minor** (1.0.0 → 1.1.0)：新功能
- **Major** (1.0.0 → 2.0.0)：破坏性更新

### 3. npm 发布策略

如果发布到 npm，可以配置 Lerna 的 `--force-publish` 避免发布没有变更的包：

```bash
# 只发布有变更的包
lerna publish from-package --no-git-tag-version
```

---

## 📝 总结

| 方案 | 版本管理 | 复杂度 | 适用场景 |
|------|---------|--------|---------|
| **当前方案** (standard-version) | 统一版本号 | ⭐ 简单 | 各包同步发版 |
| **Lerna** | 独立版本号 | ⭐⭐⭐ 中等 | 需要独立管理版本 |
| **Changeset** | 独立版本号 | ⭐⭐⭐⭐ 复杂 | 精确控制发版范围 |

**建议**：
- 如果当前工作流没有问题，保持现状即可
- 如果需要独立版本管理，可以考虑引入 Changeset
- 定期检查发版日志，确保每次发版都有相应的代码变更
