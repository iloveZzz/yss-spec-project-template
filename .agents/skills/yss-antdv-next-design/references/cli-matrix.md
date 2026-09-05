# Antdv Next CLI 矩阵

本矩阵是 H2 默认 Provider 的受支持只读合同，不是对上游全部命令的认可。所有调用使用精确包版本 `npx -y @antdv-next/cli@<exact-cli-version>`，设置 `ANTDV_NO_AUTO_REPORT=1`，知识输出要求 `--format json`。目标组件库版本参数使用实际 CLI 支持的 `--ver`，不能照抄文档中的其他拼写。

## 当前受支持组合

| 项目 | 值 | 状态 |
|---|---|---|
| `antdv-next` | `1.5.2` | CLI beta.5 内置 exact snapshot，可用于受支持事实包 |
| `@antdv-next/cli` | `0.0.0-beta.5` | beta，只允许本矩阵中的只读查询 |
| `antdv-next@1.5.3` | 稳定库当前版本 | beta.5 会回退到 1.5.2，不得标成 exact 1.5.3 事实 |

该表只记录 2026-09-04 的 fresh verification。后续升级必须重新检查 npm integrity、CLI help、resolution probe 和实际输出，不能只修改版本号。

## 允许

| 命令 | 用途 | 证据限制 |
|---|---|---|
| `changelog <v> <v> --format json` | exact-version resolution probe | 必须先运行，`from`/`to` 都等于 `<v>` |
| `list --ver <v> --format json` | 组件存在性与目录 | 不能单独证明选用组件 API |
| `info <Component> --ver <v> --format json` | Props、Events、Slots、类型 | 输出必须和组件名一致 |
| `demo <Component> basic --ver <v> --format json` | 最小 Vue SFC 事实 | 必须含 `<template>`，显式 demo 名避免无效 JSON 列表输出 |
| `token <Component> --ver <v> --format json` | 组件 Token | 项目 Token 仍优先 |
| `semantic <Component> --ver <v> --format json` | Semantic DOM | 只支持原型中的语义映射 |
| `design.md --ver <v> --format json` | 上游默认设计基线 | 静态 alpha，不参与 exact API freshness |

`doc <Component>` 仅在上述最小事实不足时人工增量调用；不要把整份文档默认收进 fact pack。CLI 不可用时，可从 `https://antdv-next.com/llms.txt` 定位单组件官方 Markdown，记录降级原因、URL、观察日期和 digest。

## 禁止或不作为门禁

- 写操作或未完成能力：`setup`、`init`、`upgrade`、`migrate`、`check`、`lint`、`bug`、`bug-cli`。
- `doctor`、`usage`、`env`：只可用于目标仓诊断，不属于组件事实，不得关闭原型门禁。
- MCP：可用于交互检索，但没有相邻落盘文件和 digest 时不得进入 fact pack。
- 无显式版本的 `npx @antdv-next/cli`：npm `latest` 与 `beta` 当前不一致，禁止使用。
