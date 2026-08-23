# 阿里 Open Code Review 与 YSS `code-review` 能力对比研究

> 日期：2026-08-23
>
> 研究性质：只读事实研究与集成分析，不作架构决策，不修改共享 skill、不安装 `ocr` CLI、不宣布模板可发布。
>
> 仓库身份：`repository_mode: template-source`（`yss-project.yaml`）。
>
> 存放位置：模板源治理区 `.template-source/evidence/maintenance/`。按 ADR-0008，研究记录不进入 `docs/` 分发面。

## 研究问题

阿里开源仓库 https://github.com/alibaba/open-code-review 当前提供什么审查能力；它与本仓库 `code-review` 技能的分析能力如何对照；优势与劣势是什么；是否建议整合，以及如果吸收，应以何种分层吸收，而不是互相覆盖。

## 来源范围

一手来源（2026-08-23 读取；OCR 源码快照 `66120291271b2e605e420e9f11fbd6448f06163f`，与 tag / GitHub Release `v1.9.10` 相同提交）：

| 来源 | 地址 / 对象 | 用途 |
|---|---|---|
| GitHub 仓库元数据 | `alibaba/open-code-review`（created 2026-05-18，stars 21206） | 身份、主题、描述 |
| 中英文 README | `/tmp/open-code-review/README.md`、`README.zh-CN.md` | 产品定位、安装、设计声明 |
| 官方文档源 | `pages/src/content/docs/zh/{architecture,review-rules,tools,mcp,cli-reference}.md` 与 integrations | 流水线、规则、工具、CI、Skill |
| Agent Skill | `skills/open-code-review/SKILL.md`、`skills/open-code-review-delegate/SKILL.md` | 宿主 Agent 如何调用 |
| 系统规则 | `internal/config/rules/system_rules.json`、`rule_docs/*.md` | 按语言审查清单 |
| 主循环 prompt | `internal/config/template/prompts/main_task_{system,user}.md`、`task_template.json` | 审查轴与约束 |
| 工具实现 | `internal/tool/code_comment.go`、`internal/mcp/provider.go` | 评论分类、MCP 角色 |
| GitHub Action | `action.yml` | CI 回贴行为 |
| ROADMAP / ASSURANCE_CASE | `ROADMAP.md`、`ASSURANCE_CASE.md` | 范围声明与安全模型 |
| npm 包 | `@alibaba-group/open-code-review@1.9.10`（https://www.npmjs.com/package/@alibaba-group/open-code-review） | 发布面版本 |
| 本仓库 `code-review` | `.agents/skills/code-review/SKILL.md` | 对照对象 |
| 生命周期合同 | `docs/process/lifecycle-registry.yaml`、`.agents/skills/yss-product-lifecycle/references/{orchestration.md,orchestration-contract.yaml,matt-yss-adapter.md}` | 唯一默认审查入口与输入契约 |
| 相邻技能 | `.agents/skills/alibaba-java-code-style/SKILL.md`、`skills-lock.json` 的 `code-review` 条目 | 规范输入 vs 通用审查 |

未作为事实来源：第三方博客、DeepWiki 解读、Trendshift 徽章、未复跑的 AACR-Bench 分数图。README 中的 Precision / F1 / Token 对比只作为**仓库自称**记录，不作为本研究独立验证的质量结论。

## 已确认事实

### 1. OCR 不是“一个 CR skill”，而是完整审查产品

`alibaba/open-code-review` 是阿里集团内部 AI 代码审查助手开源后的 CLI 产品，模块名为 `github.com/alibaba/open-code-review`，Go `1.25.5`，许可证 Apache-2.0，版权 2026 Alibaba（`README.zh-CN.md` 许可证节；`go.mod`；`LICENSE`）。GitHub 描述写明混合架构：确定性流水线 + LLM Agent，行级评论，内置多语言规则（NPE、线程安全、XSS、SQL 注入），兼容 OpenAI 与 Anthropic。

发布面：

- CLI 命令 `ocr`，npm 包 `@alibaba-group/open-code-review`，当前发布 **1.9.10**（Release `published_at` 2026-08-23）。仓库内 `package.json` 的 `version` 仍是占位 `0.0.0`，真实版本由 GitHub Release 二进制注入；本地 clone `git describe --tags --exact-match HEAD` 输出 `v1.9.10`。
- 两种 Agent Skill：`open-code-review`（OCR 自己调 LLM）与 `open-code-review-delegate`（宿主 Agent 调 LLM）。Skill frontmatter `metadata.version` 是清单版本 `1.0.0`，不是 CLI 版本。
- Claude Code / Codex / Cursor 插件（`plugins/open-code-review/`）。
- GitHub Action（`action.yml`），以及 GitLab / Bitbucket / GitFlic / Gerrit / Codeup 示例（`examples/`）。
- VS Code 扩展 `open-code-review-vscode` 0.1.2（`extensions/vscode/package.json`）。
- 本地会话查看器 `ocr viewer`。

它解决的是“对 Git diff 做低噪声、行级、可并发的缺陷发现”，不是 YSS 生命周期门禁。

### 2. 审查输入、模式与输出

三种 diff 模式（`pages/src/content/docs/zh/architecture.md` “diff provider”）：

| 模式 | 触发 | 范围 |
|---|---|---|
| Workspace | 无参数 `ocr review` | staged + unstaged + untracked |
| Commit | `--commit <sha>` | `git show <sha>`，等价 `<sha>^..<sha>` |
| Range | `--from a --to b` | `merge-base(a, b)..b` |

输出：结构化行级评论。字段包括 `path`、`content`、`start_line` / `end_line`（均为 0 表示定位失败）、`category`、`severity`、`suggestion_code`、`existing_code`、`thinking`（`skills/open-code-review/SKILL.md` “Output Format”；`internal/tool/code_comment.go`）。

分类枚举（`internal/tool/code_comment.go`）：

- `category`：`bug` / `security` / `performance` / `maintainability` / `test` / `style` / `documentation` / `other`
- `severity`：`critical` / `high` / `medium` / `low`

未知 category 归一为 `other`，未知 severity 归一为 `low`。

输出格式为 text / JSON / **SARIF 2.1.0**（`cmd/opencodereview/sarif.go`，供 GitHub Code Scanning；`--preview` 不支持 sarif）。

CI 默认把评论回贴到 PR，而不是把作业失败当作审查门禁。`action.yml` 的 `route_severity_below` / `route_categories` 明确 **fail-open：从不丢弃 finding**，只是把低优先级项从内联改到摘要。Action 只在 `ocr review` 非零退出时 fail job。CLI **不按评论严重度 fail**，也没有官方 `--fail-on high` 类 flag；规则文案里的 “blocking” 只是给模型的优先级提示。覆盖耗尽导致“什么都没审到”时才非零退出（`internal/agent/agent.go` `BudgetExceeded` 注释）。

额外命令：`ocr scan` 审整文件而非 diff（`scan_template.json` 默认按语言分批，`BATCH_SIZE=50`，另有 DEDUP / PROJECT_SUMMARY）；`ocr delegate preview` / `ocr delegate rule` 只做确定性工程，不调 LLM。

业务上下文入口是 `--background` / `--background-file`，注入 prompt 占位符 `{{requirement_background}}`。这是可选自然语言，不是 Spec / Ticket / 合同引用。

### 3. 分析流水线：确定性工程 × 每文件 Agent

高层流水线（架构文档）：bootstrap → git diff → 五重门过滤与按文件选规则 → 并发 sub-agent（默认 `--concurrency 8`）→ 行解析 / 重定位 / 评论过滤 → text 或 JSON。

每个通过过滤的文件最多两阶段：

1. **Plan**（变更行数 ≥ 50 才跑）：单次 LLM，无工具，产出清单。
2. **Main**：最多 30 轮工具循环，用 `code_comment` 发评论，用 `task_done` 结束。

内置六工具：`task_done`、`code_comment`、`file_read`、`file_read_diff`、`file_find`、`code_search`。后四个是只读上下文；`main_task_system.md` 硬约束：**不得对当前 diff 之外的文件发评论**。架构文档进一步写明“无跨文件推理”——每个文件独立对话。

后处理：

- 用 `existing_code` 在 diff 上滑动窗口匹配行号；失败则 `RE_LOCATION_TASK`；再失败则 `start_line=end_line=0`。
- `REVIEW_FILTER_TASK` 去掉可证明为错的评论。
- 记忆压缩在 `MAX_TOKENS=58888` 的 60% / 80% 阈值触发。

Skill 层还会**静默丢弃 low**，并在用户说“review and fix”时直接改代码（`skills/open-code-review/SKILL.md` Step 3–4）。ROADMAP “Not Planned” 却写“Automated code fixing without human review”不在规划内——skill 的自动修复与 ROADMAP 产品边界不一致。

### 4. 规则引擎是按路径的缺陷清单，不是仓库规范轴

四层优先级（`pages/src/content/docs/zh/review-rules.md`）：`--rule` → `<repo>/.opencodereview/rule.json` → `~/.opencodereview/rule.json` → 内嵌 `system_rules.json`。默认**首个匹配的用户规则替换系统规则**；`merge_system_rule: true` 才合并（`internal/config/rules/system_rules.go`）。

内嵌 `path_rule_map` 覆盖 Java、Go、TS/JS、Python、Kotlin、Rust、C/C++、PHP、MyBatis XML、Maven/Gradle/npm、GitHub Actions YAML、Terraform、Protobuf 等约 40 份 `rule_docs/*.md`，未匹配则 `default.md`。

Java 规则（`rule_docs/java.md`，全文约 42 行）关注：拼写、死代码、逻辑/边界/NPE、N+1、线程安全（含大量“不要报”的反例）。MyBatis 规则（`mapper_dao_xml.md`）关注 `${}` 拼接、缺 WHERE、缺分页。这是**缺陷启发式**，不是《阿里巴巴 Java 开发手册》P3C 规范全集。本仓库已有的 `alibaba-java-code-style` 才是手册蒸馏。

五重门默认**排除测试文件**（`internal/config/allowlist/default_exclude_patterns.json` 含 `**/*Test.java`、`**/src/test/java/**/*.java`、`**/*.test.{ts,tsx}`、`**/__tests__/**` 等）。要用 `include` 才能把测试重新纳入。对 YSS `behavior-tdd` 切片，这个默认会漏掉测试变更。

### 5. MCP、插件与“Skill”各自干什么

- **MCP**：OCR 是 **MCP 客户端**，把外部 server 的工具并入审查 agent（`pages/src/content/docs/zh/mcp.md`；`internal/mcp/provider.go` `RegisterAll`）。文档用例是拉 Jira/GitHub issue、内部规范、linter。ROADMAP “Current State” 写“MCP server — expose OpenCodeReview over MCP”，与源码/文档的客户端角色冲突；以源码为准。
- **`open-code-review` Skill**：检查 `ocr` 在 PATH、必要时 `npm i -g`、要求已配置 LLM、抽取 `--background`、跑 `ocr review --audience agent`、按严重度汇总、可自动修复。
- **`open-code-review-delegate` Skill**：`ocr` 只做 `preview`（文件清单 + merge_base）和 `rule`（按规则分组）；宿主 Agent 自己读 diff、自己审查、强制覆盖率（每个 preview 文件必须 `reviewed` 或带理由 `skipped`）。OCR 侧不需要 API Key。
- Claude/Codex/Cursor 插件都是上述 Skill / slash command 的包装，不是另一套审查语义。

### 6. README 有两处与源码不一致，分析时不能照抄营销句

1. **“智能文件打包”**：README.zh-CN 称会把 `message_en.properties` 与 `message_zh.properties` 打成同一审查单元。架构文档与 `internal/agent/` 实现是**每文件一个 sub-agent**。在源码中搜索 `bundle` / `message_en` 没有对应打包实现。关联文件只能经 `file_read_diff` 被当前文件的 agent 只读查看。
2. **ROADMAP 滞后**：`ROADMAP.md` 仍把 Delegate Mode 列为 H2 2026 规划，但 `skills/open-code-review-delegate/SKILL.md`、`pages/.../integrations/delegate.md` 与 `internal/delegate/` 已经存在。MCP 角色同样滞后。

### 7. 本仓库 `code-review` 的分析能力（对照对象）

来源：Matt Pocock `skills/engineering/code-review/SKILL.md`（`skills-lock.json`：`sourceRevision` `0ab1b63a…`），YSS 适配见生命周期编排，而不是再做一个通用审查 skill。

审查对象：相对固定点的**不可变候选**。两种模式：

- `committed`：`git diff <fixed-point>...HEAD`
- `worktree`：一次捕获 committed/staged/unstaged/untracked，按 `yss-worktree-candidate-v1` 长度前缀字节流算 SHA-256；两个 Reviewer 必须消费同一快照；摘要变化则 `blocked`

分析轴（`.agents/skills/code-review/SKILL.md`；`orchestration-contract.yaml.review_input.axes`）：

| 轴 | 问什么 | 如何跑 |
|---|---|---|
| Standards | 是否符合仓库文档规范 + Fowler smell baseline | 并行 sub-agent；文档规范可硬违规，smell 永远是判断 |
| Spec | 是否忠实实现 originating issue / Spec | 并行 sub-agent；缺 Spec 则跳过并声明 |
| UI fidelity | 仅 UI 影响：是否匹配确认原型与 `yss-design-system` / `yss-ui` | 前两轴之后单独一趟；type-check 或“已对齐”不算通过 |

聚合时**不合并、不重排**三轴。每轴报告限 400 词。修复会使候选失效，必须重新捕获并全量复审。

生命周期把它定为 `work-unit.code-review` 的唯一默认入口（`docs/process/lifecycle-registry.yaml`；`orchestration.md`）：

> `code-review` 是唯一默认代码审查 skill。GitLab、CI、Sonar、Alibaba Java 等治理事实作为仓库规则或专项检查输入，不再叠加第二个通用审查 skill。

调用前必须有 `review_mode`、`review_base_ref`、候选快照/digest、`spec_ref`（可空）、`ticket_ref`、Slice Implementation Contract、Build Architecture Checklist、YSS Execution Result。审查者必须独立于实现者。

`alibaba-java-code-style` 已是 specialist：只在 Java/JVM 实现或审查时作为 **Standards 输入**，不作为第二个通用 CR。

## 能力对照

| 维度 | 阿里 OCR | YSS `code-review` |
|---|---|---|
| 产品形态 | Go CLI + 规则引擎 + 专用工具循环；Skill 只是调用器 | 纯 Agent Skill；git + 并行 sub-agent |
| 审查问题 | “这段 diff 有没有 bug/安全/性能缺陷？” | “候选是否符合规范、Spec、（若有）UI 原型？” |
| 输入契约 | git refs / workspace；可选 `--background` | 不可变候选 digest + Spec/Ticket/合同 |
| 覆盖保证 | 五重门后每个文件一个 sub-agent；delegate 强制 checklist | 固定点非空即开审；无“每个文件必须标记 reviewed”清单 |
| 行级定位 | 工程模块：滑动窗口 + 重定位 + 过滤 | 靠模型引用 hunk；无独立定位器 |
| 规范来源 | 按 glob 的语言缺陷清单；可被项目 `rule.json` 替换 | 仓库文档规范 + Fowler smells；专项 skill 作输入 |
| Spec / 需求 | 可选背景文本；MCP 可拉 issue，但非必填 | Spec 轴正式存在；缺则显式 skip |
| UI | 无 | 条件第三轴 |
| 测试文件 | 默认排除 | 无默认排除；TDD 切片应审测试 |
| 跨文件 | 禁止对其他文件发评论 | Standards/Spec 可跨 hunk 看设计味道与需求遗漏 |
| 并发 | 每文件 goroutine，默认 8 | 两轴并行，不是每文件 |
| 独立审查者 | 无；skill 还可自动修复 | 硬约束；修复使 digest 失效 |
| CI | 回贴 PR 评论，fail-open | 生命周期门禁 + fresh verification，不是 PR bot |
| 自动修复 | Skill 支持；ROADMAP 又说不做 | 审查技能不改代码 |
| Token / 噪声 | 自称高精度、低召回、约 1/9 token（未独立复跑） | 通用 Agent，OCR README 点名的三类失败（漏文件、位置漂移、质量波动）正针对这类 Skill |

二者重叠区很小：都读 Git diff，都可看 untracked，都可以把“业务背景”喂给模型。重叠之外，OCR 是缺陷扫描仪，`code-review` 是生命周期符合性审查。

## 优势与劣势

### OCR 相对 `code-review` 的优势

1. **确定性覆盖**：文件筛选、规则匹配、并发分发不靠模型自觉。delegate 的 `coverage_rate` 直接打 OCR README 批评的“大 diff 偷懒漏文件”。
2. **行级工程**：定位、反思、过滤是独立模块，不把行号交给模型自由发挥。
3. **语言缺陷清单质量高且可预览**：`ocr rules check` / `ocr review --preview` 不花 token。Java NPE/线程安全、MyBatis `${}`、TS XSS/`innerHTML`/`eval` 比 Fowler smells 更贴缺陷。
4. **CI 与 IDE 产品化**：Action、内联评论、sticky summary、incremental 去重、session JSONL 回放。
5. **委托模式可复用宿主订阅**：不必再配一套 LLM Key。
6. **成本与噪声取向明确**：高精度、低召回是设计取舍，适合当预过滤器，不适合当唯一门禁。

### OCR 相对 YSS 流程的劣势

1. **没有 Spec / UI / 合同轴**，也不能替代独立 Reviewer。`--background` 不是 `spec_ref`。
2. **默认不审测试**，与 `behavior-tdd` 冲突。
3. **禁止跨文件 finding**，聚合根/API 契约/“实现了错误需求”这类问题会漏。
4. **Skill 会自动改代码**，破坏 `repair_invalidates_candidate` 与 Git 授权合同。
5. **默认排除 + 替换系统规则**，项目若提交 `.opencodereview/rule.json` 且未 `merge_system_rule`，可能丢掉 Java NPE 清单。
6. **额外运行时**：全局 `npm i -g`、独立 LLM 或委托、Git ≥ 2.41。模板源仓库没有运行时应用，也不应把 OCR 变成发布门禁。
7. **营销与 ROADMAP 不能当合同**：文件打包、MCP server、Delegate 规划状态均与源码不完全一致。

### `code-review` 相对 OCR 的优势

1. 三轴分离，避免“代码很干净但实现错了 / 实现对了但原型不对”被缺陷分淹没。
2. 不可变候选 + digest + 双 Reviewer 同源，比 OCR workspace 现场读工作树更严。OCR 的 `SealedInput` 只冻结 range/commit 的 SHA，不覆盖 worktree 字节。
3. 已嵌入 `work-unit.code-review`、Ticket 五态、fresh verification。
4. 仓库规范覆盖 smell、YSS 标准、Alibaba Java 专项，而不是再引入第二个通用审查入口。

### `code-review` 相对 OCR 的劣势

1. 纯语言驱动：大 diff 可能漏文件；行号漂移；两轴 400 词上限会压掉行级缺陷清单。
2. 没有按语言的确定性规则匹配，Java/MyBatis/前端安全清单要靠 Reviewer 自己去读 `alibaba-java-code-style` 等。
3. 没有 preview/filter 门，二进制、生成代码、lockfile 是否进入审查不统一。
4. 没有 CI 内联评论产品；生命周期审查证据在 Ticket/checkpoint，不自动出现在 GitHub review thread。
5. Fowler smells 对“NPE / SQL 注入 / XSS”覆盖弱，这些正是 OCR 规则强项。

## 是否建议整合

**不建议把 OCR 整合成第二个通用代码审查 skill，也不建议用它替换 `code-review`。**

权威依据已经存在，不必再发明政策：

- `orchestration.md`：唯一默认审查 skill；Alibaba Java / Sonar / CI 只能当规则或专项输入。
- `review_input.axes`：Standards / Spec / UI fidelity；修复必须重捕获候选。
- `alibaba-java-code-style` 已占据 Java 规范专项位。
- ADR-0008：研究与工具实验不进入 `docs/` 分发面，更不应把外部 CLI 写进根 `AGENTS.md`。

OCR 与 `code-review` 问的不是同一个问题。合并成一个 skill 会：

- 让缺陷分（bug/security）重排并掩盖 Spec/UI 失败；
- 引入自动修复，打穿独立审查与 digest；
- 默认丢掉测试文件；
- 让 Agent 在 `code-review` 与 `open-code-review` 两个“review code”入口之间掷硬币。

**建议的关系：OCR 可以成为可选的 Standards 轴工程输入 / CI 预过滤，不能成为生命周期审查入口。** 这与现有“Sonar / Alibaba Java 作为仓库规则输入”同一分层。

## 优化建议（分析结论，待人工取舍；本笔记不改 skill）

### A. 明确不整合

- 不把 `open-code-review` / `open-code-review-delegate` 写入 `skills-lock.json`。
- 不在根 `AGENTS.md` 增加 `/ocr` 或“先跑 OCR 再 code-review”。
- 不把 `ocr review` 的退出码当作 `work-unit.code-review` 通过条件。
- 不允许审查 skill 自动 `review and fix`。

### B. 若吸收，只吸收确定性工程，走 delegate 而不是 OCR 自管 LLM

唯一与现有合同相容的用法：

```text
work-unit.code-review
  ├─ 固定 candidate digest（不变）
  ├─ 可选：ocr delegate preview --format json
  │     → 文件清单 / merge_base / 排除原因  （Standards 覆盖证据）
  ├─ 可选：ocr delegate rule --format json <paths>
  │     → 语言缺陷清单，作为 Standards 源之一
  ├─ Standards sub-agent（仍并行，不与 Spec 混轴）
  ├─ Spec sub-agent
  └─ UI fidelity（若命中）
```

约束：

- 宿主仍是 `code-review`；OCR 不调 LLM、不发 PR 评论、不改文件。
- 必须关闭或覆盖默认测试排除（`include` 测试 glob），否则 TDD 切片假绿。
- 项目规则用 `merge_system_rule: true`，避免换掉 Java/MyBatis 系统清单。
- `--background` 若用，只能引用已固定的 Spec/Ticket 摘要，不能替代 `spec_ref`。
- Cloud / 无二进制环境：OCR 缺失时 `not-applicable`，不得阻断 code-review。

### C. 不装 OCR 也可从中抄进 `code-review` 的低风险改进

这些不引入外部运行时，适合后续 L2 维护（另开任务）：

1. **覆盖清单**：Standards 轴先列出候选中的每个路径，标记 reviewed/skipped+理由；大 diff 禁止“抽查几个文件”。对应 OCR delegate Step 4/6。
2. **预过滤门**：二进制、`vendor/`、`node_modules/`、lockfile、生成代码可跳过并记录原因；**不要**默认跳过 `src/test`。
3. **行级引用纪律**：finding 必须引用 hunk 或 `existing_code`；定位失败显式写“未锚定”，不要编行号。
4. **语言缺陷作为 Standards 输入指针**：Java 变更指向 `alibaba-java-code-style`；前端变更指向 `yss-ui` / XSS 相关规则。不要把 OCR `java.md` 复制进 skill 造成第二份规范。
5. **严重度不升格为跨轴排名**：若增加 `bug/security` 标签，只挂在 Standards 轴内，禁止拿它盖过 Spec/UI。
6. **禁止审查中修复**：与 OCR skill Step 4 相反，与 ROADMAP 和 YSS digest 合同一致。

### D. CI 预过滤（实现仓，不是模板源）

`project-instance` 的 GitHub/GitLab 实现仓可以把 OCR Action 当 **PR 噪声过滤器**（fail-open 回贴），与生命周期 `code-review` 并行、互不替代。模板源仓库没有运行时应用，不把 OCR 加进 `scripts/verify-template`。

需要时由实现仓自备 LLM secret；不要把 Key 写进 Harness 模板。

### E. 不要用 OCR 替换或合并 `alibaba-java-code-style`

OCR `java.md` 是短缺陷启发式；`alibaba-java-code-style` 是手册 1.4.0 的强制/推荐规则。二者互补：前者找 NPE/并发/SQL 注入，后者找命名、集合、线程池、分层。继续让后者作为 Java Standards 输入。

## 建议的目标分层

```text
yss-product-lifecycle
  └─ work-unit.code-review          # 唯一默认入口
       ├─ candidate digest           # YSS 合同，不动
       ├─ Standards
       │    ├─ 仓库 CODING_STANDARDS / smell baseline
       │    ├─ alibaba-java-code-style（Java 时）
       │    ├─ yss-* 工程规范（命中时）
       │    └─ 可选 OCR delegate 规则/覆盖清单（确定性输入）
       ├─ Spec                       # OCR 不进入此轴
       └─ UI fidelity（若 UI 影响）  # OCR 不进入此轴

实现仓 CI（可选，非门禁）
  └─ ocr review Action              # fail-open 内联评论
```

## 尚未确认项

- AACR-Bench 的 Precision / F1 / Token 图未在本环境复跑；Hugging Face 数据集 `Alibaba-Aone/aacr-bench` 未下载核验标注。
- Git tag `v1.9.10` 已确认指向源码 `6612029`；npm 安装器下载的平台二进制 checksum 未在本环境逐文件核对。
- `ocr scan` 全仓审计与 YSS 模板维护 L3 `formal-independent` 是否可叠加，未做试验。
- Cursor Cloud 是否允许 `npm i -g @alibaba-group/open-code-review` 以及 Git 是否 ≥ 2.41，未在本任务安装验证。
- OCR MCP 客户端拉 GitHub issue 后，能否稳定映射到 YSS `spec_ref`；文档只有“可拉 issue”的能力声明。
- README“文件打包”是否存在未入库分支或未开源内部实现。
- Delegate 在超大 PR 上宿主 Agent 是否仍会漏文件——OCR 只保证清单，不保证宿主执行。
- `action.yml` 在 GitHub `pull_request_target` 下的 secret 使用风险，未做安全复审（`ASSURANCE_CASE.md` 的威胁模型未覆盖 CI 配方）。

## 本轮一手验证

- 仓库身份：`yss-project.yaml` → `template-source`。
- OCR clone：`git -C /tmp/open-code-review rev-parse HEAD` → `66120291271b2e605e420e9f11fbd6448f06163f`；`git describe --tags --exact-match HEAD` → `v1.9.10`。
- GitHub API：`alibaba/open-code-review`，Go，stars 21206，created 2026-05-18；Release `v1.9.10` published 2026-08-23。
- npm：`@alibaba-group/open-code-review` 1.9.10。
- 未执行：`npm install -g`、`ocr review`、AACR-Bench、修改 `.agents/skills`。
