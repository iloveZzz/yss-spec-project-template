# create-yss-spec 外部 CLI 实践指南

本文面向需要基于 YSS Spec Project Template 初始化或同步研发管理仓库的使用者。CLI 源码、测试、发布和开发记录的目标维护位置是独立项目 [iloveZzz/create-yss-spec](https://github.com/iloveZzz/create-yss-spec)；本模板仓库只记录用户使用方法和实践建议。

> 以下命令以独立 GitHub 仓库和 npm 包已完成初始化与发布为前提。首次使用前，先检查独立仓库 README 和 npm 包可用性。

## 适用范围

`create-yss-spec` 用于生成包含 Spec、架构、OpenAPI、Ticket 和 Agent 协作基线的模板实例仓库。它不负责生成前后端运行时工程，也不会代替你创建远程 Git 仓库、CI 或 Ticket Board。

## 快速开始

推荐使用 npm create 入口：

```bash
npm create yss-spec@latest
```

也可直接通过 npx 执行：

```bash
npx create-yss-spec@latest
```

首次使用建议先交互式执行，并在空的目标目录中生成项目。需要脚本化时，可显式传入项目信息：

```bash
npx create-yss-spec@latest \
  --project-name "Acme Spec Repo" \
  --business-domain "Investment Research" \
  --team-size "12" \
  --target-dir "./acme-spec-repo" \
  --issue-tracker github \
  --git-init
```

## 先预演再写入

在新环境、脚本或升级流程中，先使用 `--dry-run` 检查计划：

```bash
npx create-yss-spec@latest \
  --project-name "Preview Repo" \
  --business-domain "Data Platform" \
  --target-dir "./preview-repo" \
  --dry-run
```

`--force` 可能清理非空目标目录，只应在已确认目标和可恢复性后使用。具体参数、版本差异和安全语义以独立 CLI 仓库当前 README 与 `--help` 输出为准。

## 同步已有模板实例

对由 CLI 初始化、且根目录包含 `.yss-template.json` 的实例仓库，可先预演同步：

```bash
npx create-yss-spec@latest sync --dry-run
```

确认文件更新、本地改动跳过项和模板删除差异后，再执行：

```bash
npx create-yss-spec@latest sync
```

对早期手工创建、不含 `.yss-template.json` 的仓库，不要直接假定可被 `sync` 接管；先查看独立 CLI 项目当前支持范围。

## 生成后检查

初始化或同步后，至少完成以下检查：

1. 运行 `git status --short` 确认实际变更范围。
2. 检查 `AGENTS.md`、`CONTEXT.md`、`README.md` 和 `docs/` 目录是否符合项目信息。
3. 运行 `scripts/verify-template` 检查模板结构、Markdown 链接和 OpenAPI 样例。
4. 如果是同步，人工处理被跳过的本地修改和只报告、未自动删除的文件。
5. 审查通过后再创建 Git checkpoint，避免把无关脏文件混入提交。

## 问题定位边界

- CLI 安装、参数解析、初始化、同步、npm 发布或 CLI 测试问题：到 [create-yss-spec 独立仓库](https://github.com/iloveZzz/create-yss-spec) 追踪。
- 模板内容、流程文档、Agent skills 或 `scripts/verify-template` 问题：在本模板仓库追踪。

## 继续阅读

- [模板使用说明](./README.md)
- [产品全生命周期使用手册](./product-lifecycle-workflow.md)
- [产品研发全生命周期最佳实践](./product-rd-lifecycle-best-practices.md)
- [create-yss-spec GitHub 项目](https://github.com/iloveZzz/create-yss-spec)
