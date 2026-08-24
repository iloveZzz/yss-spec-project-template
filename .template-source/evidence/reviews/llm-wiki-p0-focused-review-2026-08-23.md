# llm-wiki P0 L2 聚焦独立审查

- 日期：2026-08-23
- 审查者：非实施者（focused-independent）
- 仓库身份：`template-source`
- 固定点：`HEAD`
- 候选：工作区本轮 P0 文件（不以 compile.md / schema.md / writing.md / wiki 文章的未提交解耦改动为漏做）
- 强度：L2（`local-rule` + `non-core-validator`）；本报告不宣布可发布

## 范围

只审用户指定的 P0 候选：

| 文件 | 角色 |
|---|---|
| `.agents/skills/llm-wiki/SKILL.md` | 入口指针，Mode 表仍为四种编译模式 |
| `.agents/skills/llm-wiki/references/query.md` | Query 算法（新建） |
| `.agents/skills/llm-wiki/references/lint.md` | Manifest 闭合检查说明 |
| `.agents/skills/llm-wiki/scripts/lint-wikilinks.mjs` | 确定性闭合检查 |
| `.agents/skills/llm-wiki/scripts/lint-wikilinks.test.mjs` | 新失败类测试 |
| `docs/reviews/llm-wiki-p0-manifest-closure-counterexample-2026-08-23.txt` | L2 修改前反例 |
| `docs/reviews/llm-wiki-p0-fresh-verification-2026-08-23.txt` | 本轮 fresh verification |
| `docs/reviews/llm-wiki-p0-l2-checkpoint-2026-08-23.yaml` | L2 checkpoint 合同 |

未把 `compile.md` / `schema.md` / `writing.md` / `wiki/**` 的解耦改动计为 P0 漏做；它们与 P0 无冲突（compile 未增加第五种模式）。未改技能实现或测试。未跑 `verify-template`，不宣布可合并或可发布。

## Standards

对照 `maintaining-skills` 中会改变结果的标准，以及「实施者不得自标独立审查」。

- **SKILL.md 保持短、细节进 references、确定性检查进 scripts：** 成立。`SKILL.md` 只增加 query 指针与「Query is not a mode」；算法在 `references/query.md`；闭合检查在 `lint-wikilinks.mjs`，`lint.md` 只列脚本规则。
- **未把项目规则写进通用 skill：** 本轮 P0 新增正文（query 步骤、manifest 闭合）是通用 wiki 契约，不含 YSS 门禁、`pnpm` / `./mvnw`、生命周期注册表等本仓规则。fresh verification 里的本仓问答应属于证据，不在 skill 正文。
- **实施者自标 `focused-independent-review`：** **硬违规。** `docs/reviews/llm-wiki-p0-l2-checkpoint-2026-08-23.yaml` 在本报告创建前已写入：

  ```yaml
  - kind: focused-independent-review
    command: docs/reviews/llm-wiki-p0-focused-review-2026-08-23.md
    result: pass
  ```

  当时该路径不存在。L2 要求「一名非实施者执行 focused-independent」；实施者预填 `pass` 把未发生的独立审查写成已通过证据。`harness-process-tailoring.md` 允许结论内联 checkpoint，但不允许实施者代替独立审查者给出 pass。

未发现本轮把 wiki lint 挂进 `scripts/verify-template`（`scripts/` 无 `lint-wikilinks` / `llm-wiki` 引用）。

## Spec

对照用户确认的 P0 两条。

### 1. Query 步骤

`references/query.md` 落地了全部规定步骤，且明确「Query is not a compile mode / 只读不写」：

1. 无 `wiki/index.md` → 说明应 `init`，停止。
2. 有 manifest → 先 `inventory.mjs drift`；`changed` / `missing` 非空则声明过期、询问是否 `refresh`，不把过期页当地前事实。对 `inventory.mjs` 现有「有漂移则退出 1」的消费说明不是 P1 的退出码改动。
3. 用问题专有名词匹配 `index.md` 的 `##` 分类与 `[[wikilink]]`，`N = min(8, 命中数)`。
4. 每条论断回读该页 `## 来源` 的 live 路径；冲突引用 live 并记录 wiki 漂移；query 期间不改写 wiki。
5. 零命中：声明未覆盖、列出候选分类、不发明页。

`SKILL.md` 的 Mode 表仍是 `init` / `refresh` / `rebuild` / `lint` 四行，正文写「Query is not a mode」。没有第五种编译模式。

未缺规定步骤。入口有一处不阻塞的顺序缝：`SKILL.md` Steps 3–4 仍无条件写「Run lint. Append `log.md`.」，未对 query 短路。`query.md` 已禁止经 lint / `CREATE` / `REFRESH` / `REBUILD` 收尾，因此不构成缺步骤，但可能让只跟 `SKILL.md` 的 Agent 在答问后写 `log.md`。

### 2. Manifest 闭合 lint + 测试

脚本在已有 wikilink / H1 / 孤儿 / `## 来源` / hash 检查之外，补了 P0 要求的闭合规则：

| Spec | 实现 |
|---|---|
| 每个非基础设施 `wiki/*.md` 必须在 `articles[]` | `UNLISTED ARTICLE`（按 `wiki/<basename>.md`） |
| `articles[].id` 等于 `file` 的 basename | `MANIFEST ID MISMATCH` |
| 每个 `sourceIds[]` 存在于 `sources[].id` | `UNKNOWN SOURCE ID` |
| `profile === "documents"` 禁止 `kind: code-surface` | `PROFILE KIND` |
| `document\|derived` 必须有 `rawPath`；`code-surface` 必须 `rawPath == null` | `RAW PATH REQUIRED` / `RAW PATH FORBIDDEN` |
| 可选：`rawPath` 指向的文件必须存在 | 已做成强制：`RAW MISSING`（允许的加严，不是语义解析） |
| 不在 lint 里解析文章语义 | 未解析正文 |
| 不把 wiki lint 挂进 `verify-template` | 未挂入 |

没有少做规定检查。没有把 P1/P2（derived 配方、discover 勾选表、CLAUDE 模板语言、drift 退出码、脚本相对路径）做进本轮。

测试覆盖了新失败类：

- 闭合通过：`closed manifest passes listing, id, sourceIds, profile, and rawPath checks`
- 开放失败：同一用例断言 `UNLISTED ARTICLE`、`MANIFEST ID MISMATCH`、`UNKNOWN SOURCE ID`、`PROFILE KIND`、`RAW PATH REQUIRED`、`RAW PATH FORBIDDEN`
- 可选存在性：`document rawPath must exist on disk` → `RAW MISSING`

`kind: derived` 与 `document` 走同一分支，没有单独失败用例；不构成缺检查。

反例文件记录修改前 `ok: true`、上述闭合问题全部放行，符合 L2「修改前可失败的最小反例」。fresh verification 记录 `node --test` 8/8、`lint-wikilinks wiki` 退出 0、本仓三条 query 手工对照（含零命中）。审查者按合同读文件，未复跑这些命令。

## 结论

**fail**

### 必须修复的硬违规

1. 实施者在 `docs/reviews/llm-wiki-p0-l2-checkpoint-2026-08-23.yaml` 将 `focused-independent-review` 自标 `pass`，且当时指向的本报告尚不存在。须由非实施者结论回写该条证据；实施者不得改写本报告正文或把本审查改回 `pass`。在 checkpoint 纠正前，本轮 L2 审查未通过。

P0 两条算法与 lint 本身未发现必须返工的实现缺口。

### 建议项

1. `SKILL.md` Steps 在加载 `query.md` 后应显式停止，不要落到「Run lint. Append `log.md`.」。
2. `description` 可补「answer from an existing wiki」，便于发现；不要把 query 写进 Mode 表。
3. 可为 `kind: derived` 缺 `rawPath` 补一条单测（与 `document` 同分支，非阻塞）。
4. checkpoint 的 `changed_assets` 混入了 `skills-lock.json` 与 `wiki/.wiki-manifest.json`；那些不是本轮 P0 应审面，回写时宜与解耦改动分开记账。
