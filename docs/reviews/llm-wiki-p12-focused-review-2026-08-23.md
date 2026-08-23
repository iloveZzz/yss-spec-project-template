# llm-wiki P1/P2 L2 聚焦独立审查

- 日期：2026-08-23
- 审查者：非实施者（focused-independent）
- 仓库身份：`template-source`
- 固定点：`HEAD`
- 候选：工作区本轮 P1/P2 文件（不以 P0 / 解耦未提交改动为漏做，除非与本轮冲突）
- 强度：L2（`local-rule` + `non-core-validator`）；本报告不宣布可发布

## 范围

只审用户指定的 P1/P2 候选：

| 文件 | 角色 |
|---|---|
| `.agents/skills/llm-wiki/SKILL.md` | 相对 `scripts/` 路径、discover/query 指针 |
| `.agents/skills/llm-wiki/references/compile.md` | derived 配方、discover 引用、drift 退出码说明 |
| `.agents/skills/llm-wiki/references/discover.md` | 语料勾选表（新建） |
| `.agents/skills/llm-wiki/references/query.md` | drift 退出码消费说明（P0 文件，本轮改退出语义） |
| `.agents/skills/llm-wiki/references/lint.md` | 相对路径；derived `extract.kind` 检查 |
| `.agents/skills/llm-wiki/references/schema.md` | 宿主文档语言；derived 需 `extract` |
| `.agents/skills/llm-wiki/assets/CLAUDE.md.template` | 去掉写死「正文使用简体中文」 |
| `.agents/skills/llm-wiki/scripts/extract.mjs` | `skill-names` 可测小函数 + CLI |
| `.agents/skills/llm-wiki/scripts/extract.test.mjs` | 排序、不含 hash |
| `.agents/skills/llm-wiki/scripts/inventory.mjs` | drift 有 changed/missing 仍退出 0 |
| `.agents/skills/llm-wiki/scripts/inventory.test.mjs` | 源变化时 CLI 退出 0 |
| `.agents/skills/llm-wiki/scripts/lint-wikilinks.mjs` | derived 缺/未知 `extract.kind` 失败 |
| `.agents/skills/llm-wiki/scripts/lint-wikilinks.test.mjs` | 对应失败类 |
| `docs/reviews/llm-wiki-p12-counterexample-2026-08-23.txt` | L2 修改前反例 |
| `docs/reviews/llm-wiki-p12-fresh-verification-2026-08-23.txt` | 本轮 fresh verification |
| `docs/reviews/llm-wiki-p12-l2-checkpoint-2026-08-23.yaml` | L2 checkpoint 合同 |

未把 `wiki/**`、`skills-lock.json`、P0 query 算法本身、manifest 闭合 lint 计为本轮漏做；它们与 P1/P2 无冲突（query 已改为读 JSON 而不是把 drift 当失败；schema 去掉了外部 skill 点名）。未改技能实现或测试。未跑 `verify-template`，不宣布可合并或可发布。

## Standards

对照 `maintaining-skills` 中会改变结果的标准，以及「实施者不得自标独立审查」。

- **只记会改变结果的标准；细节进 references / scripts：** 成立。`SKILL.md` 只改脚本根、discover/query 指针和一句「不要写死 `.agents/skills/llm-wiki`」。derived 五条规则在 `compile.md`；勾选表在 `discover.md`；`skill-names` 在 `extract.mjs`；drift 退出码在 `inventory.mjs`。
- **项目规则不进通用 skill：** 本轮新增正文没有写入 `pnpm` / `./mvnw`、生命周期注册表、Ticket 五态或本仓门禁。`discover.md` 的默认包含列表（`docs/adr`、`docs/process`、`docs/agents`、`docs/templates`）是用户确认的 P1 勾选默认值，且写明「用户可用宿主单一事实来源表替换」；不是把 `AGENTS.md` 复制进通用 skill。`lint.md` 里「freeze / extra controllers」抽查句是既有 Agent 检查，不是本轮新项目规则。
- **实施者自标 `focused-independent-review`：** 未发生。`docs/reviews/llm-wiki-p12-l2-checkpoint-2026-08-23.yaml` 只有 `counterexample` 与 `fresh-verification`，`review_mode: focused-independent`，`escalation` 写明等待非实施者、不得预填 pass。与上一轮 P0 硬违规相反。
- **未做禁止项：** `scripts/` 无 `lint-wikilinks` / `llm-wiki` 引用，wiki lint 未挂进 `verify-template`。未硬化 wikilink 数量。`schema.md` 删除了 `understand-knowledge` 点名。未写通用提取器（`heading-list` / `prose-note` 仍是 Agent 配方）。

## Spec

对照用户确认的 P1（1–3）与 P2（4–5）。

### 1. derived 配方

`compile.md`「Derived extracts」落地了 5 条可复述规则（规格要求 3–5 条）：输入 `livePath`、只写 `rawPath`、稳定排序/章节序、禁止整文件拷贝且默认不含 hash/密钥、漂移重放不得手改 raw。三种 `extract.kind` 齐全：`skill-names` 走可测 `extractSkillNames()` + CLI；`heading-list` / `prose-note` 标明「本 skill 无脚本」。lint 对缺字段 / 未知 kind 失败，是对「derived 必须有 extract」的确定性闭合，不是超做图谱或通用提取器。

### 2. discover 勾选表

`references/discover.md` 默认先问 wiki 路径、语料根、`core|full`、正文语言；默认包含根权威、`docs/adr`、`docs/process`、`docs/agents`、`docs/templates`、用户点名的冻结契约；默认排除 `docs/reviews`、`docs/.scratch`、投影目录、`node_modules`、锁文件整本（锁只能作为 derived）。超过约 40 个 `document` 先列候选再停。正文写明发现由 Agent 做，不是扫描器。`SKILL.md` / `compile.md` init 与 rebuild 均指向该文件。

### 3. CLAUDE.md.template 语言

模板已改为「正文语言遵循宿主项目的文档语言规则」，不再写死「正文使用简体中文」。`schema.md` 与 `compile.md` init 提问同步。模板正文仍是中文起始稿；`compile.md` 要求按语料改写，不构成本项缺步骤。

### 4. drift 退出码

`inventory.mjs` 删除了 `changed` / `missing` 时 `exitCode = 1`；报告永远打印 JSON 后自然退出 0，脚本错误仍走 `catch` → 2。`hash` 在 missing 时仍退出 1，不在本条规格内。`compile.md` 与 `query.md` 已改成「读 JSON；exit 0 是常态」。技能目录内已无「drift≠0 当失败」的运行说明。测试 `drift CLI exits 0 when sources changed and prints JSON` 覆盖了反例 2。

### 5. 脚本相对路径

`SKILL.md` 与 `lint.md` 改为 `<skill-root>/scripts/...`，并写明不要写死 `.agents/skills/llm-wiki`。技能目录内仅这一处否定例句仍出现该绝对路径。

未缺规定步骤。未把图谱、外部 skill 点名、verify-template 挂接或 wikilink 数量硬化做进本轮。

反例文件记录修改前：derived 无 extract 仍 `lint.ok=true`；drift 有 `changed` 时 `status=1`。fresh verification 记录 `node --test` 13/13、wiki lint 0、drift 0、`extract.mjs` 重放一致。审查者按合同读文件，未复跑这些命令。

## 结论

**pass**

### 必须修复的硬违规

无。

### 建议项

1. `inventory.test.mjs` 只覆盖 `changed` 时退出 0；`missing` 与 `changed` 走同一 CLI 尾巴，可补一条 missing 用例，非阻塞。
2. `skill-names` 用无 locale 的 `localeCompare`；对本仓库 ASCII 技能名足够，跨环境若要更硬的稳定序可显式 `"en"`。
3. 本仓 `wiki/wiki/LLM Wiki.md` 仍未写 `extract` / discover / drift 退出语义；那是生成页，不是 skill 运行说明。下次 refresh 可对齐，不构成本轮漏做。

实施者可在本报告存在后把 `docs/reviews/llm-wiki-p12-l2-checkpoint-2026-08-23.yaml` 的 `focused-independent-review` 指到本文件并记 `result: pass`。实施者不得改写本报告正文或把本审查改回 `fail`。本报告不宣布可发布。
