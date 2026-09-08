# Technical Design Contract v2

共同合同字段由 `technical-design-common.schema.json` 定义，完整 `technical-design.schema.json` 通过 `scripts/generate-schema.mjs` 合并专项 Schema 派生，使用 `--check` 检查同步，`design` 按 `architecture.family` 校验：`domain-driven` 沿用 DDD v1 内容结构，`layered-mvc` 使用 `yss-mvc-design/references/mvc-design.schema.json`。DDD 内层的 schema/version/status 是分支内容版本，status 必须与共同头一致；战略交接绑定只写共同头，避免双重维护。

## 共同头

- `schema_version: 2`、`technical_design_id: technical-design.<name>`、`version: vN`、`status`、`context_ref: CONTEXT.md`。
- `architecture`：`family`、`project_id`、`source_kind: scaffold-decision | existing-registration`、`decision_ref`、`decision_digest`。新项目引用正式且 current 的脚手架决定，所选项目必须已由用户确认；既有登记引用当前 `project_id` 和 `architecture_identity.architecture_family`，也可从登记的 `repositories` 数组按项目解析。架构来源变化须重新绑定和审查，不能改合同字段冒充用户改选。
- `inputs`：每行 `{kind, ref, version, digest}`，kind 为 context/spec/rules/scenarios/api/adr/engineering/strategic；至少包含根 CONTEXT.md 与 Spec。适用的工程/API 约束同样绑定。无 API 影响理由记录在需求或工程输入中。DDD 另须 strategic 输入，MVC 不要求。
- `source_items`：无战略包时从批准需求提取稳定规则和场景 `{source_id, kind: rule | scenario, critical, source_ref}`。source_ref 必须对应 inputs，不复制源正文成为第二事实源。
- `traceability`：逐项对应 source_items。沿用 `tactical_refs` 字段名以兼容承接协议，其值在新合同中可指向 MVC 用例、规则或 DDD 对象；其他字段与战略承接 rows 相同。implemented 仅表示设计承接已落实，不表示代码已实现。
- 有战略包时追加 `strategic_handoff`，按 `docs/process/strategic-handoff-package.md` 绑定导入收据、摘要、正式对账及 rows；本地补充规则仍可写 source_items / traceability，但不能重复维护包内来源。
- `evidence_refs`：现有审查证据的可读取路径。approved 状态必须有评审证据，真正批准仍由生命周期核验适用批准记录；本校验器不产生批准。
- `digest`：删除根 digest 后按键排序、数组保持顺序的 canonical JSON SHA-256，前缀 `sha256:`。来源文件的 digest 使用原始字节 SHA-256；这两种摘要不可混用。

所有仓内引用相对 `--root` 解析；不接受越界或符号链接。输入摘要不匹配、未知架构、悬空落点、缺少关键场景成功/失败测试均阻断。延期与冲突按已声明的切片依赖阻断，依赖未知时整体阻断。

## 设计与实现交接

```bash
node .agents/skills/yss-technical-design/scripts/validate-technical-design.mjs docs/design/technical-design.yaml --root <项目根>
node .agents/skills/yss-technical-design/scripts/validate-technical-design.mjs docs/design/technical-design.yaml --root <项目根> --slice <切片ID>
```

编译器输入与 resolution 使用 `technical_design: {ref, version, digest}`，digest 是已持久化整个合同的原始字节摘要，并绑定 `slice_id`。命中 `backend-technical-design-impact` 或已有领域/状态/一致性影响条件时必须提供；编译与 freshness 检查重新执行验证，并核对架构族。没有相关设计影响的编译继续消费原有最小合同。

schema v1 仅配合 `--legacy-ddd`（编译器绑定 `legacy_ddd: true`）读取为 DDD。旧 DDD 校验入口保留，不改变旧批准或历史文件。新写合同一律 v2；格式迁移不代表批准，架构、输入或设计变化走现有门禁重审。

## MVC 示例

可执行示例见 `../tests/fixtures.mjs` 的 `mvcFixture`：在临时项目绑定需求与现有登记，定义 server → service → repository、提交用例、规则、事务、存储映射和成功/失败 seam。它只用于模板验证，不生成产品实例 Spec。
