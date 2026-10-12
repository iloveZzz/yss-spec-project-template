# AR-11 进展（第 3 步：handoff、context）

状态：进行中。第一片（战略交接包校验）完成；其余入口与 AR-09 移交的删除清单未做。沿用口径：回放 → 薄壳/委托 → 最后统一删除；每片只在本机单平台验证，固定档攒几片再统一重建（维护者 2026-10-12 要求）。

## 1. 起点调研

- **context** 的 API 层早已迁移：`scripts/lib/native-context.mjs` 只是传输（定位 yss、拼 `context check` 参数、解码信封），语义归 yss。剩下的 Node 入口是 `verify-context-reconciliation` 与 `verify-strategic-context-import`。
- **handoff 的生产写入已经是 Go**：`scripts/fixtures/spec-baseline/package.mjs` 头注释写明「Synthetic protocol fixtures only. Production writes use native Go saved plans/transactions」；Node 的 `strategic-handoff.mjs`（618 行）里导出、导入、终结交付属于夹具与旧入口，校验类函数是 `sourceApproval`、`inspectSource`、`openBundle`、`openDelivery`。
- spec-baseline 场景（`scripts/fixtures/spec-baseline/scenarios.mjs`）早已有「Node 夹具生成包、native yss 校验」的对拍（`YSS_SPEC_BASELINE_NATIVE_CLI`），本机构建的 yss 下通过。

## 2. 第一片：战略交接包校验（`handoff verify --kind package`）

- 回放：`tests/go-validator-replay.test.mjs` 增 8 类：原包、载荷文件被改一个字节、清单列出的文件被删、包里多出清单没有的文件、清单 `bundle_digest` 被改、清单版本被改但摘要未更新、索引文件被改、缺清单。Node 的 `exportBundle` 生成包、`openBundle` 校验，对拍 yss 在真实 design 实例里的校验，结论全部一致；yss 对 ZIP 同样可校验。
- yss：`handoff verify --kind package` 在报告里返回 `coverage.handoff_package`（`bundle_id`、`version`、`bundle_digest`、`rules`、`scenarios`），能力令牌 `handoff.package-identity.v1`。
- Node：`scripts/strategic-handoff verify --bundle` 对**目录与 ZIP 包**委托给 yss，输出与旧实现同形；`delivery-record.json` 交付目录和旧版 yss 仍走进程内实现（缺令牌退回）。薄壳对根外的包先复制到根下临时目录再校验（目录也支持）。
- 验证：回放、`verify-strategic-handoff-package-scenarios`（16）、`verify-delivery-preflight-scenarios` 通过；在模板源仓根与 design 实例都可校验。

## 3. 待做

| 入口 | 现状 |
|---|---|
| `verify-strategic-handoff-consumption` ↔ `handoff verify --kind consumption` | 未量；Node 输出是 `result: blocked/…` 的报告，需对拍并对齐输出形态 |
| `spec-baseline verify`（`--bundle`、`--checkpoint`） | yss 有 `handoff verify --kind spec-baseline`（`--package`/`--file`），但输出字段（`baseline_id` 等）与 `--checkpoint` 绑定模式需对齐 |
| `verify-context-reconciliation` | yss 有 `context-reconciliation` 语义校验但未公开成命令，需决定公开方式 |
| `verify-strategic-context-import` | 需对拍 |
| `strategic-handoff.mjs` 的 `sourceApproval`（约占 approval/user-decision 进程内回退的 47%）、`user-decision-reuse`（约 20%） | 它们是 AR-09 删除清单的前置，需随 consumption 对拍一起迁 |
| AR-09 移交的删除（approval/user-decision 的 Node 实现与删除规则） | 以上迁完后一次性删除 |
