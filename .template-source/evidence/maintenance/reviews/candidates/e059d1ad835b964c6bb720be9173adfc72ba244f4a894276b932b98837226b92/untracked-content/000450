---
name: yss-antd-design
description: Use when 原型设计或高保真构建需要查询 Ant Design v6 设计语言、组件 API/demo/token/semantic，或落盘 AntD CLI 证据。不用于前端代码落地（改用 yss-ui）、Vue 生产 API、生命周期批准、安装官方 antd skill，或替代 yss-prototype-stage。
---

# YSS Ant Design 事实

只服务原型设计与高保真构建。把官方 `@ant-design/cli`、`design.md`、MCP 与 LLMs.txt 收成可追溯的事实引擎。阶段合同仍是 `yss-prototype-stage`。前端代码落地一律改用 `yss-ui`，不要继续调用本技能。

## 何时使用

- 已进入 `yss-prototype-stage` 的高保真产出前后，需要 Ant Design v6 组件 / token / demo / semantic / 上游 `design.md` 事实。
- 需要写入 `prototype-evidence.yaml` 的 AntD 段。

不要用本技能：前端实现、Vue / Ant Design Vue 生产代码、批准门禁、生成页面流、安装官方 `antd` skill，或运行 `antd setup`。进入实现切片后停用本技能，改走 `yss-ui`。

## 步骤

1. 检测 CLI：优先已安装的 `antd`，否则用 `npx -y @ant-design/cli`。记录实际 CLI 版本。不要在模板源执行 `npm install -g`。
2. 读项目 `docs/design/design.md` 与 `docs/design/tokens/*`。
3. 选定 `<target_antd_version>`（项目已选的 v6；未选则先查再记录，不得依赖空仓库自动检测）。此后每次知识查询都传同一版本。
4. 设置 `ANTD_NO_AUTO_REPORT=1`。一律 `--format json`，对外说明用 `--lang zh`。
5. 查询官方 `design.md`，再按选用组件跑 `info` / `demo` / `token` / `semantic`。命令矩阵见 `references/cli-matrix.md`。
6. 把 JSON 路径写入证据清单。字段与 lint 适用范围见 `references/evidence.md`。
7. 上游默认与项目 token 冲突时，以项目覆盖为准，并标记 `project_override_reviewed`。

## 硬规则

- 禁止凭记忆写 Ant Design v6 API。
- 禁止 `antd setup`、`npx skills add ant-design/ant-design-cli`，以及把官方 `skills/antd` 拷进 `.agents/skills`。
- 禁止把官方 `design.md` 的默认色、圆角、间距写回项目实现或覆盖项目 token。
- 禁止在前端代码落地、垂直切片实现或 `yss-ui` 任务中调用本技能。
- 禁止把 React props / demo / hook 当作 `yss-ui` 或 Ant Design Vue API。
- MCP 与 `llms-full.txt` 不是门禁证据。边界见 `references/boundaries.md`。
