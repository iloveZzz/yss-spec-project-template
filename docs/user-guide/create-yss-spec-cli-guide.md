# create-yss-spec 使用手册

本文档面向需要初始化 `yss-spec-project-template` 模板实例仓库的内部开发者、Tech Lead、项目初始化负责人。

## 适用场景

当你需要基于当前模板源仓库快速生成一个新的研发管理仓库时，使用 `create-yss-spec`。

它适合做的事：

- 初始化新的 PRD / 架构 / OpenAPI / Issue 管理仓库
- 统一生成项目级文档骨架、Agent 协作约定和模板目录结构
- 通过参数渲染项目名称、业务领域、团队规模等元信息

它不负责做的事：

- 生成前端 / 后端运行时代码工程
- 自动安装依赖
- 自动创建远端 Git 仓库、CI 或 Issue Board
- 把已有项目升级到最新模板版本

## 快速开始

推荐入口：

```bash
npm create yss-spec@latest
```

兼容入口：

```bash
npx create-yss-spec@latest
```

运行后会按顺序询问：

1. `项目名称`
2. `业务领域`
3. `团队规模（可留空）`
4. `目标目录`

初始化完成后，CLI 会输出结果目录和下一步建议。

## 最常见用法

### 交互式初始化

```bash
npm create yss-spec@latest
```

适合第一次使用或希望手动确认输入内容的场景。

### 指定参数直接生成

```bash
npx create-yss-spec@latest \
  --project-name "Acme Spec Repo" \
  --business-domain "Investment Research" \
  --team-size "12" \
  --target-dir "./acme-spec-repo" \
  --issue-tracker github \
  --git-init
```

适合脚本化、重复初始化或在 CI / shell 脚本中调用的场景。

### 只预览，不真正写入

```bash
npx create-yss-spec@latest \
  --project-name "Preview Repo" \
  --business-domain "Data Platform" \
  --target-dir "./preview-repo" \
  --dry-run
```

`--dry-run` 只展示计划，不会创建目录，也不会删除已有文件。

## 参数说明

| 参数 | 含义 | 默认行为 |
|---|---|---|
| `--project-name` | 项目名称 | 不传则进入交互输入 |
| `--business-domain` | 业务领域 | 不传则进入交互输入 |
| `--team-size` | 团队规模 | 不传则进入交互输入，可留空 |
| `--target-dir` | 输出目录 | 不传则进入交互输入 |
| `--issue-tracker github\|gitlab` | 默认 issue tracker 偏好 | 默认 `github` |
| `--dry-run` | 只预览复制 / 渲染计划，不写入文件 | 默认关闭 |
| `--force` | 目标目录非空时允许清空后重新生成 | 默认关闭 |
| `--git-init` | 初始化完成后执行 `git init` | 默认关闭 |
| `--include-example-docs` | 显式保留示例文档 | 默认开启 |
| `--no-example-docs` | 不生成示例文档 | 默认关闭 |

## 输出内容说明

CLI 会根据模板清单把源仓库内容分成三类处理：

- `render`：需要写入项目变量的文件，例如 `AGENTS.md`、`README.md`
- `copy`：原样复制的模板资产
- `exclude`：不会进入实例仓库的维护性文件、本地配置和本需求自身的实现资产

生成结果通常包含：

- `AGENTS.md`
- `CONTEXT.md`
- `docs/requirements/`
- `docs/architecture/`
- `docs/api/`
- `docs/design/`
- `docs/testing/`
- 项目级 Agent skills 与流程文档

如果启用了 `--git-init`，目标目录下还会生成 `.git/`。

## 默认安全策略

为了避免误覆盖，CLI 采用默认安全策略：

- 目标目录非空时，默认直接失败
- 只有显式传入 `--force` 时，才允许清空目标目录后重新生成
- 目标目录不能位于模板源仓库内部
- `--dry-run` 没有副作用

## 示例结果

一次典型执行完成后，你会看到类似输出：

```text
初始化完成
输出目录：/path/to/your-project
下一步建议：
1. cd /path/to/your-project
2. 如需版本管理，可执行 git init
3. 检查 AGENTS.md、README 和 docs 目录是否符合预期
```

如果已经传了 `--git-init`，第二步会提示执行 `git status` 检查初始化结果。

## 常见问题

### 1. 提示“目标目录非空，当前主路径不支持覆盖已有内容”

说明目标目录里已经有文件。

处理方式：

- 改用新的空目录
- 或确认可以清空后，显式传入 `--force`

### 2. 提示“目标目录不能位于模板源仓库内部”

说明你把输出目录设到了当前模板仓库内部。这样会污染模板源仓库，CLI 会直接拒绝。

处理方式：

- 把 `--target-dir` 改成模板仓库外部目录

### 3. 我想在 shell 管道或脚本里调用

可以，CLI 已支持非 TTY 输入。建议优先显式传参；如果要走标准输入，请按交互顺序提供：

```bash
printf 'Acme Spec Repo\nInvestment Research\n12\n/tmp/acme-spec-repo\n' \
  | node packages/create-yss-spec/bin/create-yss-spec.js
```

### 4. 为什么没有自动安装依赖或创建远端仓库

这是设计上的非目标范围。当前 CLI 只负责初始化研发管理模板实例仓库，组织级权限操作和后续 bootstrap 仍由人工控制。

## 维护与验证

如果你在维护这个 CLI，本地验证命令是：

```bash
npm test
```

发布前可检查打包内容：

```bash
cd packages/create-yss-spec
npm pack --dry-run
```

## 继续阅读

- [模板使用说明](./README.md)
- [产品全生命周期使用手册](./product-lifecycle-workflow.md)
- [产品研发全生命周期最佳实践](./product-rd-lifecycle-best-practices.md)
- [实现路由记录](../implementation/yss-spec-cli-init-routing.md)
- [产品需求文档：yss-spec 模板初始化 CLI](../requirements/yss-spec-cli-init-prd.md)
