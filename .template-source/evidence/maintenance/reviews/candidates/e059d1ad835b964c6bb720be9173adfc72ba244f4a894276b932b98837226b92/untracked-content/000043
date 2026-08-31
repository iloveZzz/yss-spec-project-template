# AntD 事实证据

目标文件：`docs/.scratch/<feature>/verification/prototype-evidence.yaml`，字段以 `docs/design/templates/prototype-evidence-template.yaml` 为准。本文件只说明如何填 AntD 段。

## 必填

- `antd.cli_command`：实际调用的可执行文件，`antd` 或 `npx -y @ant-design/cli`。
- `antd.cli_version`：本轮 `antd -V` 或等价输出，禁止写死模板默认值。
- `antd.target_antd_version`：本轮全部知识查询使用的同一 v6 版本。
- `antd.queries.design_md`：`antd design.md ... --format json` 的落盘路径。
- `antd.queries.components[]`：每个选用组件的 `info_ref` / `demo_ref` / `token_ref` / `semantic_ref`。
- `design_baseline.project_design_ref`：`docs/design/design.md`。
- `design_baseline.project_override_reviewed`：上游默认与项目 token 已对照。

JSON 输出存为相邻文件，证据清单只引用路径。不要把整份 `llms-full.txt` 或 MCP 对话贴进清单。

## lint

`antd lint` 只对可解析的 React/TSX 源码有规则命中。HTML 原型会出现空 issues（假绿）或 `skippedFiles` / `parse-error` / `partial: true`。

| 产物 | `lint_applicable` | 做法 |
|---|---|---|
| `docs/.scratch/<feature>/design/prototypes/index.html` | `not-applicable` | 写 `lint_reason: html-prototype`；`lint_ref` 可空；`lint_passed` 保持 `false`，不得改成 `true` |
| React/TSX 原型源 | `true` | 对变更文件跑 `antd lint --format json`，保存输出；无 issue 才把 `lint_passed` 设为 `true` |

浏览器验证仍由 `yss-prototype-stage` 采集，不在本技能宣布 `gate.prototype-verified` 通过。
