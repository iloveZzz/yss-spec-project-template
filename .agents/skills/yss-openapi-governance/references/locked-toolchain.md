# OpenAPI 锁定工具链

仅在入口所列条件命中时读取本文件。Markdown 链接相对本文件；行内 references/assets/schemas 路径相对 Skill 根目录。仓库脚本与 pnpm 命令从当前登记的项目根目录执行。

## 受控工具链

在持有冻结 YAML 与派生记录的项目工作区中，将 `@redocly/cli` 固定在 `devDependencies` 并提交对应的 pnpm lockfile。使用项目脚本或下列等价命令；不得使用浮动 `npx --yes`、全局安装或未记录版本的转换器。

```bash
pnpm exec redocly lint .work/<feature>/api/<feature>.yaml

pnpm exec redocly bundle \
  .work/<feature>/api/<feature>.yaml \
  --output .work/<feature>/api/<feature>.json \
  --ext json \
  --component-renaming-conflicts-severity=error \
  --metafile .work/<feature>/api/<feature>.bundle-metafile.json
```

默认 bundle 保留内部 `$ref`，不要为图省事加入 `--dereferenced`；递归模型或循环引用需要保留其可表示的 `$ref` 结构。若项目将命令包装为 `pnpm openapi:bundle`，该脚本必须实际执行上述 `redocly bundle` 语义，并在记录中写明脚本和已锁定的包版本。

`$ref` 默认只允许引用本 feature API 目录内的相对文件；禁止远程 URL、绝对路径以及越出该目录的路径遍历。需要共享组件或例外时，先在治理 / 架构记录中列出允许位置、所有者与 Freeze 影响，再执行 bundle。
