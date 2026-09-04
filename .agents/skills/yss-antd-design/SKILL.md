---
name: yss-antd-design
description: Use when an H2 React/AntD prototype needs versioned Ant Design v6 facts or an incremental fact-pack refresh. Not for H1, frontend implementation, lifecycle approval, or replacing yss-prototype-stage.
---

# YSS Ant Design 事实

只服务 H2 `flow-review` 中实际采用 React AntD 的原型，把官方 `@ant-design/cli` 与 `design.md` 收成可追溯的条件事实源。阶段合同仍是 `yss-prototype-stage`。H1 不适用；前端代码落地一律改用 `yss-ui`。

## 何时使用

- 已进入 `yss-prototype-stage` 且档位为 H2、实际采用 React AntD，需要组件 / token / demo / semantic 事实。
- 现有 fact pack 不满足精确版本、组件覆盖、项目 Token digest 与无新 API 疑问四项 freshness 条件，需要增量补齐。

不要用本技能：H1、H2 非 AntD 原型、前端实现、Vue / Ant Design Vue 生产代码、批准门禁、生成页面流、安装官方 `antd` skill，或运行 `antd setup`。

## 步骤

1. 先检查 `docs/design/facts/antd/<exact-version>/manifest.json`。fresh 时直接引用；不 fresh 才检测 CLI，优先已安装的 `antd`，否则用 `npx -y @ant-design/cli`。记录实际 CLI 版本，不执行全局安装。
2. 读项目 `docs/design/design.md` 与 `docs/design/tokens/*`。
3. 选定 `<target_antd_version>`（项目已选的 v6；未选则先查再记录，不得依赖空仓库自动检测）。此后每次知识查询都传同一版本。
4. 设置 `ANTD_NO_AUTO_REPORT=1`。一律 `--format json`，对外说明用 `--lang zh`。
5. 查询官方 `design.md`，再按选用组件跑 `info` / `demo` / `token` / `semantic`。命令矩阵见 `references/cli-matrix.md`。
6. 把 fact-pack manifest 或增量 JSON 路径写入证据清单。字段与 lint 适用范围见 `references/evidence.md`。
7. 上游默认与项目 token 冲突时，以项目覆盖为准，并标记 `project_override_reviewed`。

## 硬规则

- 禁止凭记忆写 Ant Design v6 API。
- 禁止 `antd setup`、`npx skills add ant-design/ant-design-cli`，以及把官方 `skills/antd` 拷进 `.agents/skills`。
- 禁止把官方 `design.md` 的默认色、圆角、间距写回项目实现或覆盖项目 token。
- 禁止在前端代码落地、垂直切片实现或 `yss-ui` 任务中调用本技能。
- 禁止把 React props / demo / hook 当作 `yss-ui` 或 Ant Design Vue API。
- 禁止为 H1 伪造 AntD 字段，或用 React CLI 证据宣称生产 YSS/AntDV 组件已经验证。
- MCP 与 `llms-full.txt` 不是门禁证据。边界见 `references/boundaries.md`。
