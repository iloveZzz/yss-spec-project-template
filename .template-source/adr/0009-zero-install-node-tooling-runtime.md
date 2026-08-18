# ADR-0009: 模板实例零安装 Node 工具链

## 状态

已被 ADR-0011 取代

## 背景

模板发布门禁和技能供应链原先依赖 Ruby。模板实例由 `create-yss-spec` 的快照创建或同步，且每次 init、attach、sync 完成后立即运行三个门禁；若门禁再临时联网安装依赖，会改变失败回滚面并破坏离线可验证性。

## 决策

活跃模板治理脚本统一使用 Node `>=22 <27`：Node 22、24 是阻断验证矩阵，Node 26 仅观察。维护侧在 `.template-source/tooling/node/` 使用精确版本的 pnpm lockfile；实例分发 `scripts/lib/*.mjs` 和 `scripts/vendor/*.mjs`，不分发 `node_modules`、`package.json` 或 pnpm lockfile，也不得在实例门禁中执行安装或构建。

YAML 使用 `yaml@2.9.0`，解析时固定 `maxAliasCount: 0`；XML 使用 `fast-xml-parser@5.11.0`，拒绝 DOCTYPE、关闭实体处理和自动类型转换，并以结构遍历替代当前固定的 XPath 用例。维护侧以 `esbuild@0.28.2` 分别构建 YAML、XML ESM bundle，提交 metafile、输入 integrity、许可证、输出 SHA-256；不压缩、无 source map、目标 `node22`。Python JSON Schema 校验本轮保留。

公开脚本的参数、默认值、退出码和受管产物保持兼容。迁移批次必须以同 fixture 对 Ruby oracle 和 Node candidate 比较退出码、stdout/stderr、生成清单、字节、SHA-256、文件 mode、symlink 和 Git 状态；候选 `verify-template` 不得自证。模板源禁止新增活跃 Ruby shebang、Ruby 调用或 Ruby 源码；已生成的项目实例对遗留 `.rb` 仅按同步的 `remove-report` 报告，不静默删除用户文件。

## 后果

模板维护者必须先执行：

```bash
pnpm --dir .template-source/tooling/node install --frozen-lockfile
pnpm --dir .template-source/tooling/node build:vendor
pnpm --dir .template-source/tooling/node check:vendor
```

新模板实例只需要满足 Node 版本并直接运行既有 `scripts/sync-skills --check`、`scripts/update-skill-lock --check`、`scripts/verify-template`。跨仓完成仍要求固定模板 commit 下的 CLI init、attach、sync、失败回滚、`npm test` 和 `npm pack --dry-run`；在该证据缺失时只能声明模板仓局部完成，不能声明生态可发布。
