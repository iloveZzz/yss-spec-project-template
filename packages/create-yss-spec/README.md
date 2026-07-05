# create-yss-spec

用于初始化和同步 `yss-spec-project-template` 模板实例仓库的 npm CLI。

## 用法

```bash
npm create yss-spec@latest
```

也可以使用 `npx`：

```bash
npx create-yss-spec@latest
```

## 当前支持

- 交互式收集 `projectName`、`businessDomain`、`targetDir`
- `--team-size`
- `--dry-run`
- 非空目录默认拒绝，`--force` 覆盖
- `--git-init`
- `--issue-tracker github|gitlab`
- `--include-example-docs`
- `--no-example-docs`
- `sync` 子命令
- 基于 `.yss-template.json` 的模板版本基线
- 已有模板实例仓库的受管模板资产同步

## 同步已有模板实例仓库

当项目仓库已经由 `create-yss-spec` 初始化，并且根目录存在 `.yss-template.json` 时，可以执行：

```bash
npx create-yss-spec@latest sync
```

只预演，不真实写入：

```bash
npx create-yss-spec@latest sync --dry-run
```

当前同步能力的边界：

- 只支持带模板元数据的模板实例仓库
- 默认只更新未被本地修改的受管模板文件
- 对本地已修改文件只提示和跳过，不自动覆盖
- 对模板已删除文件只报告，不自动删除

## 开发验证

在仓库根目录执行：

```bash
npm test
```

发布前可检查打包结果：

```bash
cd packages/create-yss-spec
npm pack --dry-run
```
