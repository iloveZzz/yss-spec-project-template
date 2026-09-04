# AntD 事实证据

目标文件：schema v3 `docs/.scratch/<feature>/verification/prototype-evidence.yaml`。本文件只说明 H2 实际使用 React AntD 时如何填 `profile_evidence.flow_review.prototype_library_facts`；H1 不得出现 AntD CLI 段，任何原型证据都不得冒充生产 YSS/AntDV 组件验证。

## fact pack 优先

优先引用 `docs/design/facts/antd/<exact-version>/manifest.json`。只有 exact version、组件集合和项目 Token baseline digest 相同，且不存在新 API 疑问时，`source: fact-pack` 才有效；否则用 `source: cli-run` 补充增量查询。不要为模板创建空目录或 placeholder manifest。

## CLI 增量查询必填

- `antd.cli_command`：实际调用的可执行文件，`antd` 或 `npx -y @ant-design/cli`。
- `antd.cli_version`：本轮 `antd -V` 或等价输出，禁止写死模板默认值。
- `antd.target_antd_version`：本轮全部知识查询使用的同一 v6 版本。
- `antd.queries.design_md`：`antd design.md ... --format json` 的落盘路径。
- `antd.queries.components[]`：每个选用组件的 `info_ref` / `demo_ref` / `token_ref` / `semantic_ref`。
- `design_baseline.project_design_ref`：`docs/design/design.md`。
- `design_baseline.project_override_reviewed`：上游默认与项目 token 已对照。
- `actual_antd_version`：原型 lockfile 中的实际 React `antd@6.x`，必须与查询版本一致。
- `manifest_ref` / `manifest_digest`：可复验的事实包或本轮查询清单。
- `components_covered` 与 `project_token_baseline_digest`：支持 freshness 判断。

JSON 输出存为相邻文件，证据清单只引用路径。不要把整份 `llms-full.txt` 或 MCP 对话贴进清单。

## lint

`antd lint` 只对可解析的 React/TSX 源码有规则命中。HTML 原型会出现空 issues（假绿）或 `skippedFiles` / `parse-error` / `partial: true`。

CLI JSON 只能证明查询事实，不能单独证明原型消费了目标版本或完成了 Vue/YSS 映射。`gate.prototype-verified` 还必须通过 schema v3 档位证据、Design QA、浏览器和无障碍验证。

| 产物 | `lint_applicable` | 做法 |
|---|---|---|
| 静态 HTML / H1 | `not-applicable` | 不创建 AntD 段；由 H1 合同验证 HTML |
| React/TSX 原型源 | `true` | 对变更文件跑 `antd lint --format json`，保存输出；无 issue 才把 `lint_passed` 设为 `true` |

浏览器验证仍由 `yss-prototype-stage` 采集，不在本技能宣布 `gate.prototype-verified` 通过。
