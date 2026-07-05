# create-yss-spec

用于初始化 `yss-spec-project-template` 模板实例仓库的 npm CLI。

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
- `--dry-run`
- 非空目录默认拒绝，`--force` 覆盖
- `--git-init`
- `--issue-tracker github|gitlab`
- `--no-example-docs`

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
