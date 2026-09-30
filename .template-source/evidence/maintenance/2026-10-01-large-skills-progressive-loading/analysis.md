# 大型 Skill 渐进式载入优化

本轮扫描综合模板 `.agents/skills` 下 77 个共享 Skill，选取入口超过 7,000 Unicode 字符的 14 个进行结构优化。该阈值只是本轮优先级启发式，不是 OpenAI 规范或新增门禁。入口总量由 122,860 降至 61,920 字符（减少 49.6%）；不把字符数等同于 tokenizer token 数、总任务成本或运行速度。

## 依据与范围

2026-10-01 读取的 [OpenAI Skills 文档](https://learn.chatgpt.com/docs/build-skills) 说明：先发现 name/description，选中 Skill 后加载入口；references/scripts/assets 承载可选内容。[OpenAI 官方作者指导](https://developers.openai.com/blog/rethinking-skills-and-prompts-for-gpt-6-astra) 建议多工作流入口保持精简，根据任务选择支撑文档，避免无条件预读。本轮将这些原则用于当前模板，未引入某个模型专属流程。

当前仓库身份为 template-source。维护强度为 L2（template-structure/local-rule/non-core-validator）；未改变生命周期批准、Ticket 状态、脚手架生成语义或发布语义。CONTEXT 的产品工作单元对账 not-applicable：本轮只调整模板 Skill 的读取结构，没有引入业务术语或产品资产。代码 behavior-tdd not-applicable：本轮不改运行时代码，使用迁移前结构反例、原文保留检查、维护者自检与 fast 适用验证。

## 发现与处理

1. 大入口常由代码示例、多个条件分支和输出模板造成，行数不能代表上下文大小。表格与 Hook 的示例、工作树 fallback、诊断的复现构造、地图创建/推进已拆成可独立读取的引用。
2. code-review、OpenAPI 和合同编译器的批准及阻断条件仍在入口；语义检查提纲、输出格式、历史收敛协议、脚手架细则按阶段读取。没有把所有内容移走后再要求全读。
3. 新增 36 个引用文件，入口均给出读取条件；修正搬迁后的相对链接、章节定位和命令执行目录。保留 frontmatter 及显式/隐式调用策略。
4. setup-matt-pocock-skills 原摘要称 GitHub 默认，与其详细规则及仓库 tracker 合同冲突；摘要统一为既有 Local Markdown 默认，GitHub/GitLab 仍需明确选择。
5. 前端 OpenAPI 的只读边界与前后端 compiler 专属内容保持；通过已登记 patch 重建适配。maintaining-skills 增补体量评估、条件路由、路径与分发核验指导，不引入统一长度上限。

## 入口统计

| Skill | 修改前字符 | 修改后字符 | 减少 |
|---|---:|---:|---:|
| `wayfinder` | 12,029 | 3,519 | 70.7% |
| `archify` | 11,848 | 5,712 | 51.8% |
| `code-review` | 11,164 | 6,701 | 40.0% |
| `ytable-usage` | 9,281 | 3,965 | 57.3% |
| `diagnosing-bugs` | 9,171 | 2,844 | 69.0% |
| `yss-openapi-draft-review` | 8,907 | 4,481 | 49.7% |
| `using-git-worktrees` | 7,996 | 3,781 | 52.7% |
| `yss-ddd-scaffold-generator` | 7,750 | 5,324 | 31.3% |
| `setup-matt-pocock-skills` | 7,668 | 2,712 | 64.6% |
| `yss-openapi-governance` | 7,627 | 3,885 | 49.1% |
| `yss-ui-business-page-generation` | 7,617 | 6,286 | 17.5% |
| `yedit-table-usage` | 7,395 | 3,010 | 59.3% |
| `yss-hook` | 7,318 | 3,581 | 51.1% |
| `yss-implementation-contract-compiler` | 7,089 | 6,119 | 13.7% |

## 自检与证据限制

`verify.py` 检查 frontmatter 摘要、36 个入口路由与引用可达性，以及迁移前正文每个非空行是否仍保留。链接搬迁、原有错误默认值、改成可定位引用的章节文字属于显式例外，已由维护者逐项检查；该检查不声称理解模型行为。`entry-baseline.json` 是本轮不可执行的历史证据，当前事实仍以 canonical Skill 为准。

反例：旧入口没有这些条件引用，检查非零退出；迁移后同一检查通过。对权限的自检覆盖：显式 wayfinder 不授权远程发布/提交；Reviewer 不实现；编译器不批准/设置 ready-for-agent；前端不批准后端 Freeze；DDD 仍要求当前批准合同、已验证平台和 initialize-only；Archify 在 YSS 中仍禁上游自动更新并使用安全 wrapper。

入口节省不等于完整工作流必然更省：例如首次搭建完整远程表格仍需加载代码示例，累计文本可能接近原入口；受益主要是无需这些分支的任务。本轮未执行真实模型 A/B、跨平台 Agent 评测或耗时/token 对比，因此不声明选择准确率或执行效率提升。已有其他改动和大资源目录未因体积被删除。其余 63 个入口未逐条改写，不能据此声称整个目录已获 OpenAI 官方认证。

## 分发与交付边界

通过仓库脚本同步共享投影、skills-lock、三个 Agent profile 与四个 CLI 快照。分发来源为 working-tree；这是本地模板维护证据，不是固定提交发布证据。无 Git 提交、推送、npm 发布或已有产品实例迁移。

完整工作区包含本轮之前的大量改动，默认 fast 计划因此升级到 release。本轮用显式 changed-file 选择本轮影响，保留 limited 标记；不把该结果等同于整个脏工作区或 main 的完整验收。

OpenAPI 场景校验已随文档搬迁调整：必须同时存在入口链接和引用中的原负向字段/省略保留规则，未删除原断言。

## 本轮验证结果

| 验证 | 实际结果与范围 |
|---|---|
| 迁移前结构反例 | exit 1，72 个缺失路由/引用诊断，符合预期 |
| 迁移后结构检查 | exit 0；14 个入口、36 个新引用，frontmatter、原文保留和链接检查通过 |
| 同步与分发 | 根投影/锁、3 个 Agent profile、4 个 CLI 快照同步；4 个 CLI 真实生成并逐字节核对合计 144 个受影响文件 |
| 生成实例检查 | 投影/锁检查通过；profile registry 检查通过，综合模板按选装范围核验；前后端 6 项 OpenAPI 场景命令通过 |
| fast 适用验证 | 等价外部副本串行运行：30 项计划命令及 1 项 diff 后检查通过；tooling 中 184 个测试通过；input_drift=false |
| 工作区保护 | 初始 17,030 个父仓文件基线未发现本轮范围外的既有源文件变更；副本比对 25,380 项文件及 Git 状态记录一致 |

第一次 fast 发现 OpenAPI 校验调用方仍读旧路径，修正入口路由与引用断言后重跑。第二次 30 项检查通过，但 `.codegraph/codegraph.db-wal` 在执行期间变化导致总报告 input_drift=true；该失败完整保留在 `fast-live-drift/`，未计为通过。最终将工作区连同 Git 元数据和全部受管理/非忽略源文件复制到仓库外，只排除 CodeGraph 运行时索引缓存，保留 4 个受管理的 `.codegraph/.gitignore`，核对一致后重跑；没有修改主工作区的 CodeGraph 配置，也没有绕过漂移校验。

`fast-frozen-copy/report.json` 是本轮有效的限定范围验证；`verification-command-frozen.json` 保存准确 argv，报告中的临时绝对日志路径可对应本目录归档的同名 logs 文件。`frozen-input-equivalence.json` 保存完整比对结论与清单摘要，`verified-source-manifest.json` 保存本轮相关源文件摘要。外部完整清单位于 `/private/tmp/yss-large-skills-20261001/`，不是发布归档。

自检结论为 `implementation-ready`；没有产生审查候选、独立审查批准、可合并或可发布结论。副本通过不表示整个共享脏工作区的全量 release 验证已通过。这里的通过是机械结构、同步与命令证据；真实 Agent 的路由和按需读取效果仍需另行测量。
