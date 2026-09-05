# Fact Pack 合同

标准位置是 `docs/design/facts/antdv-next/<exact-version>/manifest.json`。历史 P0 参考包保留在 `.template-source/evidence/maintenance/antdv-next-p0-facts/<exact-version>/manifest.json`。采集器拒绝覆盖已有目录；需要刷新时创建新版本目录或由维护者先明确处理旧产物。

## Manifest 最小语义

- `schema_version: 1`
- `provider_id: vue-antdv-next`
- `maturity: supported`；历史 P0 `draft` manifest 只读兼容
- `collection_profile`: `selected-components` 或 `p0-reference`
- `library`: 固定 `antdv-next` 的 requested/resolved version、npm integrity 与 tarball。
- `cli`: 固定 `@antdv-next/cli` 的精确版本、npm integrity、tarball、help banner digest 与采集时 dist-tags。
- `resolution_probe`: `changelog <v> <v>` 的相邻 JSON、digest、`from`、`to` 与 `exact_match: true`。
- `design_baseline`: 静态 `design.md` 的相邻 JSON、digest 与声明版本；它不计入 exact API freshness。
- `project_baseline`: 根 `DESIGN.md`、项目 `docs/design/design.md` 和 Token 文件的项目相对路径与 digest；`canonical_design.ref` 必须精确为 `DESIGN.md`。
- `components[]`: 每个组件的 `info`、`demo`、`token`、`semantic` 文件和 digest。

`p0-reference` 必须恰好覆盖 `Button`、`Form`、`Table`、`Modal`、`Select`、`DatePicker`。普通项目事实包只采集原型实际选用的组件，不为了看起来完整而复制全库。

## Freshness

以下任一变化都会使事实包失效：

- 请求或解析的组件库版本变化；
- CLI 包版本或 integrity 变化；
- 采用的组件集合新增 API 疑问或覆盖不足；
- 根 `DESIGN.md`、项目治理文档或 Token digest 变化；
- resolution probe 不再 exact；
- manifest 引用文件缺失、越界、成为 symlink 或 digest 不匹配。

执行：

```bash
node .agents/skills/yss-antdv-next-design/scripts/validate-fact-pack.mjs \
  docs/design/facts/antdv-next/<exact-version>/manifest.json
```

校验通过只说明事实包结构、摘要、组件形状和 exact snapshot 可复验；不证明视觉、交互、无障碍、构建或生产兼容性。
