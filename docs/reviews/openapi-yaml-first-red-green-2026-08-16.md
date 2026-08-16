# OpenAPI YAML-first 技能迁移 RED / GREEN 记录

> 范围：模板源仓库移除 `smart-doc` / `yss-openapi`，以冻结 OpenAPI YAML 为唯一权威，并从 YAML 可重复派生 JSON 供 Orval 使用。

## 测试 seam

- `scripts/verify-openapi-yaml-first-scenarios`：模板、技能路由、脚手架和公开清单的可观察迁移结果。
- `yss-openapi-governance` 的 YAML-first / JSON 导出指引。
- `api-integration` 的冻结契约到 Orval 客户端生成指引。

## RED：基线失败

执行：`scripts/verify-openapi-yaml-first-scenarios`

结果：失败（2026-08-16）。失败项包括：

- OpenAPI 模板包含两个 YAML document，并把 `pipeline`、`stage`、`status`、`owner` 写在 OpenAPI 之外。
- `yss-openapi` 仍存在于权威源、六个投影、`skills-lock.json`、公共技能清单和 Router。
- 后端脚手架、生成器和验证场景仍内置 `smart-doc-maven-plugin` 与 `smart-doc.json`。
- Governance 未定义 YAML-first、JSON 派生或 Redocly bundle；`api-integration` 仍把客户端刷新委托给 `yss-openapi`。
- 缺少 JSON 派生记录模板。

## 压力场景观察

| 场景 | 无新规则时的选择 / 漏洞 |
|---|---|
| 删除技能后的迁移 | 指出了“现有保留技能都不生成 YAML，作者及转换器未定”，说明仅删除技能会让契约创建和前端生成失去责任归属。 |
| 当天交付、跨仓库 | 倾向正确地拒绝手写 JSON，但把“已有转换器”当作前提，未定义没有转换器时应由哪个技能建立受控导出。 |
| 无 Node 配置的工具选择 | 假定“Maven 仍是入口”，建议用 `exec-maven-plugin`；这会绕过用户要移除 Maven/smart-doc 驱动的目标。 |

## GREEN 目标

1. 仅保留单一 OAS 3.1 YAML 文档；冻结 YAML 是唯一权威，JSON 只能由锁定的 Redocly CLI 派生。
2. `yss-openapi-governance` 负责 YAML 契约起草、冻结后的 JSON bundle 和导出证据；`api-integration` 负责 Orval 和前端接入。
3. 移除 `yss-openapi`、smart-doc 脚手架资产及全部活跃路由/文档引用。
4. 用同一压力场景验证：不回退到 Maven、手改 JSON 或未冻结 Draft。

## GREEN：修订与验证

- `yss-openapi-governance` 现负责创建 / 治理单一 OAS 3.1 YAML、Freeze 后执行锁定的 `redocly bundle`、记录 YAML / JSON SHA-256、lockfile、`$ref` 策略与 bundle 证据。
- `yss-openapi-draft-review` 明确审查单一 YAML document 和 JSON 必须等到 Freeze 后派生；`api-integration` 仅消费已记录的派生 JSON 并运行 Orval。
- 已删除仓库权威源及六个投影中的 `yss-openapi`，连同旧后端脚手架插件、配置模板、生成器逻辑和公开清单条目；锁文件、路由、Wiki 和用户指南已同步。
- 新增 `docs/api/templates/openapi-json-export-record-template.md`，用于记录输入 / 输出 SHA-256、锁定 Redocly CLI、命令、metafile、校验和 Orval 交接。

Fresh verification（2026-08-16）：

```text
scripts/update-skill-lock --remove=yss-openapi
scripts/sync-skills
scripts/verify-template
ruby scripts/test-export-yss-skills.rb
git diff --check
```

结果：全部通过。`scripts/verify-template` 已包含并通过新增的 `scripts/verify-openapi-yaml-first-scenarios`；公开技能导出测试为 5 runs / 72 assertions / 0 failures。

## 独立审查后的补充 RED / GREEN

独立审查先给出 `Blocked`：活跃 Router / 生命周期合同仍允许 `smart_doc_baseline`，治理 JSON 与 Orval input 之间有双路径，前端脚手架可从任意 URL / 文件生成客户端，且初版场景只做文本检查。

同一压力情境为“Freeze 已完成、今天必须刷新前端客户端、前后端仓库分离”：

| 阶段 | 决策 / 合理化 | 可观察结果 |
|---|---|---|
| 补充 RED | “前端自己重新 bundle 到 `openapi/openapi.json` 更快”“任意 URL 可以先生成再补记录”“脚手架合同已有允许项就继续” | 扩展后的 `scripts/verify-openapi-yaml-first-scenarios` 失败：旧合同入口、未绑定治理 JSON / 受控交接、任意 `openapi_source`、缺少 Orval input / 校验开关约束均被逐项报告。 |
| 补充 GREEN | 只认可治理产物 `docs/.scratch/<feature>/api/<feature>.json`；跨仓库仅通过批准的受控交接物化为 `openapi/openapi.json`，两端 SHA-256 必须一致；Orval input 固定本地路径且 `unsafeDisableValidation` 为 `false` 或省略。 | `scripts/verify-openapi-json-handoff-scenarios` 的冻结正向场景通过；Draft、Maven 命令、URL 输入、关闭 Orval 校验、前端 JSON 篡改和治理 JSON 篡改均按预期被阻断。 |

补充 REFACTOR：删除 Router / 生命周期合同中的旧允许项及生命周期说明、实现路由模板中的旧表述；前端脚手架不再接受任意 source，而是要求 Freeze 记录、JSON 派生记录、实际 `orval.config.*` input 与验证开关证据。`scripts/verify-template` 已调用两个 OpenAPI 场景脚本，覆盖静态清理和可执行交接协议。

`writing-skills` 要求的 fresh-context 原始 prompt / 输出、6 个无技能对照、6 个同题 GREEN 样本及 R6 的实际失败到合规转变，见 `docs/reviews/openapi-yaml-first-pressure-scenarios-2026-08-16.md`。其中 R6 的“客户明示、今晚交付、沿用 Maven”在无技能对照中选择 A；带技能的同题样本选择 C，并明确回到冻结 YAML、锁定 bundle、两端 SHA 和实际 Orval input。

## REFACTOR 关注项

- Redocly 必须由目标实现仓库锁定版本的 `pnpm` 依赖提供，禁止浮动 `npx` / 全局二进制。
- 仅允许 feature 内相对 `$ref`；bundle 遇到组件重名冲突必须失败，JSON 及导出记录必须带源 YAML / JSON SHA256。
- 全局运行时目录不属于本模板的技能投影；本轮只清理仓库权威源和投影，避免未授权影响其他项目。
