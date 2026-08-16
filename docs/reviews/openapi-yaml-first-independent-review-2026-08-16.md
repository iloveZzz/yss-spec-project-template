# OpenAPI YAML-first 独立审查（2026-08-16）

## 审查范围与基线

- 角色：独立审查者；未参与本轮实现。
- 基线：`HEAD`（当前为未提交工作树，审查对象为 `git diff HEAD`）。
- 范围：移除仓库内 `yss-openapi` / smart-doc，冻结 YAML 为唯一权威，以锁定 Redocly bundle 派生 JSON 后交给 Orval。
- 不在范围：`/Users/zhudaoming/.agents/skills/yss-openapi` 仍存在，但它是仓库外全局技能；本仓库不得删除或修改它。

## 已执行的只读检查

- `git diff HEAD`、`git diff --check`。
- `scripts/verify-openapi-yaml-first-scenarios`。
- `scripts/verify-yss-router-scenarios`、`scripts/verify-lifecycle-scenarios`。
- `scripts/sync-skills --check`、`scripts/update-skill-lock --check`。
- `ruby scripts/test-export-yss-skills.rb`（5 runs / 72 assertions / 0 failures）。
- `bash -n scripts/verify-template`，并静态审阅其调用链；为遵守审查可写范围，未执行会写入 Python bytecode 的完整 `scripts/verify-template`。
- `rg --hidden` 扫描旧 skill / smart-doc 变体及 YAML/JSON/Orval 路径；Redocly 官方 `bundle` 文档复核了本轮使用的 `--ext json` 与冲突错误选项。

以上可执行检查均通过，但不足以证明下列关键路径正确。

## Findings

### P1：仍存在可授权 smart-doc 的活跃合同入口

- `.agents/skills/yss-router/references/router-contract.yaml:94` 仍将 `smart_doc_baseline` 列入 `allowed_for`。
- `.agents/skills/yss-product-lifecycle/references/orchestration-contract.yaml:118` 保留同一允许项；`.agents/skills/yss-product-lifecycle/SKILL.md:65` 与 `docs/templates/implementation-routing-template.md:226` 仍宣称脚手架生成 Smart Doc。

这不是历史审计材料，而是 Router、生命周期和合同模板的活跃规则，仍可重新授权该 Maven 路径；`.codex` 投影也同步保留。新增 `scripts/verify-openapi-yaml-first-scenarios:53-58` 只检查 POM、配置文件和生成器，遗漏了上述入口。删除或改为中性机械配置后，应增加负向场景覆盖所有活跃路由和模板。

### P1：YAML → JSON → Orval 不是单一、可核验的链路

`yss-openapi-governance` 在 `.agents/skills/yss-openapi-governance/SKILL.md:40-45,69,107` 规定并记录 `docs/.scratch/<feature>/api/<feature>.json`；但 `yss-api-integration` 在 `.agents/skills/yss-api-integration/SKILL.md:24,37-50` 又重新 bundle 到固定 `openapi/openapi.json` 并让 Orval 使用。

两份 JSON 之间没有受控复制、最终 Orval `input` 记录、metafile 或逐段 SHA 校验。因此导出记录的 SHA 可以对应前者，而 Orval 实际消费后者；这不能证明 JSON 仅由冻结 YAML 派生。应选定唯一派生物，或定义 staging → SHA → 原子发布到实际 `orval.config.*` input 的交接，并记录最终路径和 SHA。

### P1：前端脚手架仍允许绕过冻结派生物

`.agents/skills/yss-frontend-scaffold-generator/SKILL.md:24,36,58` 允许 `openapi_source` 为任意文件、URL 或 Harness 路径，再配置 Orval；它没有要求 JSON 派生记录、锁定 Redocly、实际 `orval.config.*` input 或禁用 `unsafeDisableValidation`。这形成从 URL/任意文件直接生成客户端的回退口，尤其在跨仓库时无法追溯到 Freeze YAML。该 skill 和其路由/场景应绑定批准的跨仓库子合同及最终 JSON SHA。

### P1：新验证仅验证文字，未验证受控导出行为

`scripts/verify-openapi-yaml-first-scenarios:21-73` 只解析模板和检索字符串；不会校验 Freeze/导出记录、YAML SHA、Redocly bundle、JSON SHA、Orval 配置输入或 `unsafeDisableValidation`。因此它和完整的现有场景都在本审查中通过，却没有发现前述两个回退口。应以正反 fixture 或受控导出脚本验证：Draft 不可导出、手改 JSON/错误 SHA/非记录 input 必失败、冻结 YAML 才能生成并由 Orval 消费。

### P1：模板维护的 RED/GREEN 证据不足

`docs/reviews/openapi-yaml-first-red-green-2026-08-16.md:11-29` 记录的是静态失败摘要，`:38-55` 仅记录脚本成功；没有同一压力场景下“无技能”的逐字决策/合理化和“带技能”的合规结果。`AGENTS.md:47` 要求 skill/模板修改遵循 `writing-skills` 的 RED/GREEN/REFACTOR，`.agents/skills/writing-skills/SKILL.md:556` 要求保留压力场景及可审计的 rationale。应补同一压力场景，并让其覆盖 smart-doc 残留和双 JSON 交接。

### P2：无关的索引忽略规则被纳入工作树

`.ua/.understandignore:7,31,35-82` 将示例注释变为生效忽略规则，包含 `scripts/` 和全部测试模式，和本变更无关且会使分析索引漏掉本轮验证代码。所有权未确认；应从本轮 checkpoint 排除并由原所有者处理。

## 单向性、交接和清理结论

- **YAML/JSON 单向性：未通过。** YAML-first 规则本身已写入治理、Draft Review、Freeze/导出模板；但双输出路径和前端任意 source 使其无法被证明。
- **前端生成交接：未通过。** `api-integration` 要求记录，却没有以真实 Orval input 为唯一事实；前端脚手架仍可直接接 URL/任意文件。
- **旧 skill / 脚手架清理：部分通过。** 仓库内 `.agents/skills/yss-openapi`、六个投影、锁文件、公开清单、smart-doc POM、配置模板和生成器逻辑已清理；投影/锁与公开导出检查通过。活跃合同/模板中的 Smart Doc 入口仍未清理。
- **历史资料：非阻断。** `docs/reviews/openapi-skill-primary-source-research-2026-08-16.md:7` 已明确其为迁移前证据，不将其视为活跃回退口；建议保留该标识以免误用。

## 结论

**Blocked。** 在关闭所有 P1、补齐同一压力场景的 RED/GREEN 证据，并重新执行 fresh verification 前，不应宣称该模板已完成 YAML-first 迁移或不存在 smart-doc / JSON 输入回退口。

## 复审（修复后工作树，2026-08-16）

### 已执行的只读 / 临时目录验证

- `scripts/verify-openapi-yaml-first-scenarios`：通过。
- `scripts/verify-openapi-json-handoff-scenarios`：通过；正向 Freeze 交接及 Draft、Maven、URL、关闭 Orval 校验、前端 JSON 篡改、治理 JSON 篡改六类反例均实际执行。
- `scripts/verify-yss-router-scenarios`、`scripts/verify-lifecycle-scenarios`：通过。
- `scripts/sync-skills --check`、`scripts/update-skill-lock --check`：通过。
- `ruby scripts/test-export-yss-skills.rb`：5 runs / 72 assertions / 0 failures；`git diff --check` 与 `bash -n scripts/verify-template`：通过。
- 重新执行 `rg --hidden`：活跃资产不再含 Smart Doc / `smart_doc_baseline` / 已移除 `yss-openapi`；仅保留删除断言中的历史字符串。

### 先前 P1 复核

| 原 P1 | 复审结论 | 证据 |
|---|---|---|
| 活跃 smart-doc 入口 | 已关闭 | `.agents/skills/yss-router/references/router-contract.yaml:94`、`.agents/skills/yss-product-lifecycle/references/orchestration-contract.yaml:118`、`.agents/skills/yss-product-lifecycle/SKILL.md:65`、`docs/templates/implementation-routing-template.md:226` 均已去除旧项；`scripts/verify-openapi-yaml-first-scenarios:49-59` 覆盖。 |
| YAML/JSON/Orval 双路径 | 已关闭 | `.agents/skills/yss-openapi-governance/SKILL.md:68-77` 固定治理 JSON；`.agents/skills/yss-api-integration/SKILL.md:37-50` 要求同字节物化及 SHA；JSON 导出记录模板记录两端 SHA。 |
| 前端任意 source 回退 | 已关闭 | `.agents/skills/yss-frontend-scaffold-generator/SKILL.md:24-40,58-62` 禁止 URL、Draft、运行时和手工 JSON，并要求实际 `orval.config.*` 指向本地交接文件且 `unsafeDisableValidation` 为 `false` 或省略。 |
| 仅文本验证 | 已关闭（模板层） | `scripts/verify-openapi-json-handoff-scenarios:16-43,111-142` 验证路径、Freeze、SHA、Redocly 命令、Orval input / 校验开关及正反交接。脚本故意不在模板源仓库执行 Redocly；目标实现仓库仍须依技能要求以锁定依赖执行并留存记录。 |
| RED/GREEN 压力场景证据 | **仍为 P1** | `docs/reviews/openapi-yaml-first-red-green-2026-08-16.md:61-68` 现有的是汇总性的合理化和结果，未保存 `writing-skills` 所要求的“无该 skill 的 subagent”原始 prompt / 输出、逐字 rationale，以及同一场景“带 skill”的可审计输出（`.agents/skills/writing-skills/SKILL.md:558-569`）。 |

### 单向性与交接结论

链路现为：冻结 YAML → 治理 JSON `docs/.scratch/<feature>/api/<feature>.json` → SHA 一致的 `<frontend>/openapi/openapi.json` → 已核验的实际 `orval.config.*` input。交接契约和正反 fixture 已验证；模板内没有前述 JSON 回退口。

`.ua/.understandignore` 的无关变更仍是先前 P2，所有权未知，应继续排除在本轮 checkpoint 外；它不改变上述复审结论。仓库外的 `/Users/zhudaoming/.agents/skills/yss-openapi` 仍不属于本仓库删除范围。

### 复审结论

**仍 Blocked（仅剩 1 个 P1：可审计的 `writing-skills` RED/GREEN 子代理压力场景证据）。** 关闭该证据缺口后，可解除本报告的 Blocked；本次复审未发现其他 P1。

## 最终复审（压力场景证据补齐后，2026-08-16）

### `writing-skills` RED / GREEN 证据

- `docs/reviews/openapi-yaml-first-pressure-scenarios-2026-08-16.md:7-10` 明确记录了 fresh-context、无 skill 的 RED 对照、同题且完整读取三项相关 skill 的 GREEN，以及每题至少三类组合压力。
- R1–R6 均保留相同题干及 RED / GREEN 原始输出；R1–R5 的 RED 自然选择 C 被诚实地标为非失败样本，未被伪造为 RED failure。
- R6 在客户明示、截止时间和组织惯性下给出实际无技能失败：选择 A 并沿用 Maven smart-doc（该记录第 164-172 行）；同题 GREEN 选择 C，逐项回到 Freeze YAML、锁定 Redocly bundle、双端 SHA-256 和实际 `orval.config.*` 输入 / 校验开关（第 174-185 行）。
- 记录第 187-191 行说明该新合理化已落实为技能约束，并由 JSON handoff 负向场景重测。`docs/reviews/openapi-yaml-first-red-green-2026-08-16.md:70` 建立了 RED / GREEN 索引。

这满足 `writing-skills` 对无指导压力基线、逐字合理化、同场景 GREEN 和发现后 REFACTOR / retest 的要求；压力样本的执行时间或 agent run ID 可作为未来审计增强，但不是本次流程门禁的遗漏。

### Fresh 验证与 P1 回归

本复审重新执行并通过：

- `scripts/verify-template`（包含 YAML-first 与 JSON handoff 正、反场景）；
- `ruby scripts/test-export-yss-skills.rb`（5 runs / 72 assertions / 0 failures）；
- `git diff --check`、`scripts/sync-skills --check`、`scripts/update-skill-lock --check`；
- 活跃资产扫描。命中仅为删除断言，未发现可执行的 Smart Doc、`smart_doc_baseline` 或已移除 `yss-openapi` 入口。

先前四项实现 P1 仍保持关闭：冻结 YAML 唯一权威，Redocly 仅派生 `docs/.scratch/<feature>/api/<feature>.json`；批准的交接仅可将同字节内容物化为 `<frontend>/openapi/openapi.json` 并核验 SHA-256；实际 `orval.config.*` input 和 `unsafeDisableValidation` 约束已写入三个消费 skill，且 Draft、Maven、URL、关闭校验及两端 JSON 篡改均被 handoff 场景阻断。模板源仓库不含目标前端实现，真实 Redocly / Orval 仍须由未来目标实现仓库以锁定依赖执行并留存记录；这属于已明确的交接边界，不构成模板 P1。

### 最终结论

**解除 Blocked（模板范围内无 P1）。** YAML → canonical JSON → SHA 一致的前端 JSON → 已核验 Orval input 的单向链路、旧 skill / Smart Doc 清理和 `writing-skills` 压力证据均已满足本轮验收。

保留一个非阻断 P2：`.ua/.understandignore` 的无关变更应继续排除在本轮 checkpoint 外、交由原所有者处理。仓库外的 `/Users/zhudaoming/.agents/skills/yss-openapi` 不属于本仓库删除范围。
