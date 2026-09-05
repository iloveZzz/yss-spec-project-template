---
name: yss-antdv-next-design
description: Use when the default H2 Vue prototype needs versioned Antdv Next component facts or a fact-pack refresh. Not for H1, production frontend implementation, lifecycle approval, or replacing yss-prototype-stage.
---

# YSS Antdv Next Provider

作为 H2 `flow-review` 的默认组件事实 Provider，为 `vue-antdv-next` 原型提供 Vue-native API、SFC demo、token 与 semantic facts。阶段合同、Vue/Vite starter 和页面流仍由 `yss-prototype-stage` 持有，项目视觉与 Token 仍由 `yss-design-system` 持有。本技能不生成页面、不批准门禁，也不代表生产 YSS UI 已迁移到 Antdv Next。

## 适用条件

- 原型已进入 `yss-prototype-stage`，档位为 H2，默认或显式选择组件基座 `vue-antdv-next`。
- 需要创建或增量刷新 `docs/design/facts/antdv-next/<exact-version>/manifest.json`。
- 目标库版本、CLI 版本、组件集合或项目 Token digest 变化，已有 fact pack 不再 fresh。

H1、React AntD 兼容原型、生产前端实现、组件库迁移、门禁批准和页面流生成均不适用。显式选择 `react-antd-6` 时使用 `yss-antd-design`；生产落地仍进入 `yss-ui`。

## 执行

1. 按 `DESIGN.md`（规范 Token / 组件变体）→ `docs/design/design.md`（治理解释）→ `docs/design/tokens/*`（派生快照）的顺序读取项目基线；三者任一 digest 变化都使旧 fact pack 失效。
2. 选择精确的 `antdv-next` 与 `@antdv-next/cli` 版本；禁止 dist-tag、caret、tilde 或空版本。当前受支持组合见 `references/cli-matrix.md`。
3. 优先复用 fresh fact pack；否则运行 `scripts/collect-antdv-next-facts.mjs`。采集器只调用允许的只读查询，并先执行 exact-version resolution probe。
4. resolution probe 的 `from` 或 `to` 与请求版本不一致时立即失败；不得继续采集或把同 minor / major 回退写成精确事实。
5. 使用 `scripts/validate-fact-pack.mjs <manifest>` 复核文件摘要、Vue SFC demo、组件覆盖和项目 Token baseline。
6. 在原型证据中只引用 manifest 与实际采用的组件。上游默认和项目 Token 冲突时，以项目为准并记录人工 override review。

标准采集示例：

```bash
node .agents/skills/yss-antdv-next-design/scripts/collect-antdv-next-facts.mjs \
  --project-root . \
  --output docs/design/facts/antdv-next/1.5.2 \
  --library-version 1.5.2 \
  --cli-version 0.0.0-beta.5 \
  --component Button --component Form --component Table \
  --component Modal --component Select --component DatePicker
```

## 硬规则

- 只允许 `list`、`info`、`demo`、`token`、`semantic`、`changelog`、`design.md` 与读取单组件官方 Markdown；允许面见 `references/cli-matrix.md`。
- 禁止 `antdv setup`、`antdv init`、`antdv upgrade`、`antdv migrate`、`antdv check`、当前占位的 `antdv lint`，以及 `bug` / `bug-cli`。
- 禁止 `npx skills add antdv-next/cli`、`npx skills add antdv-next/skills`，也不得把官方 Skill 复制进任何 Agent root。
- 禁止把 MCP 对话、`llms-full.txt`、CLI 自报的未解析版本或静态 `design.md` 当作 exact component API 证据。
- 禁止让上游 `design.md` 覆盖项目 `DESIGN.md`、`docs/design/design.md` 或项目 Token；manifest 必须直接记录根 `DESIGN.md` path 与 digest。
- 禁止把原型事实包当作生产兼容性、可复用代码、`gate.prototype-verified` 或组件库迁移完成证据。

事实包合同见 `references/fact-pack.md`，阶段及生产边界见 `references/boundaries.md`。
