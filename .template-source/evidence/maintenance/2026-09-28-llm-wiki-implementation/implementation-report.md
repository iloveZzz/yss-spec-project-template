# llm-wiki 可信度与效率改进实施记录

日期：2026-09-28。范围：用户确认的 P0/P1 五批计划，模板维护 L3。canonical 位于 `.agents/skills/llm-wiki`，名称、文章 ID 和 Markdown 结构保留。尚未达到用户要求的 `implementation-ready`：真实 Agent 配对评测因运行时拒绝模型而未完成，不能宣称提效已验证。最终仓库门禁 94 项全部通过（fast 自动升级为 release 检查），实际退出码为 0；这不代表固定提交发布验证或真实 Agent 评测已完成。详见 verification-summary.json。

## 已实现

| 批次 | 交付与证据 |
|---|---|
| A 基线与合同 | baseline/ 固定原技能及原始测试；18/18 通过。研究七个反例拆为 12 个测试，旧实现 12/12 准确失败。agent-scenarios.json 与 eval-freeze.json 在实现前固定 10 场景、输入、必需来源、写范围、断言、模型及预算。 |
| B 编译可信度 | core.mjs 统一 manifest/frontmatter/路径校验；sources.mjs 分离 original/effective/raw 摘要、compiledFrom、文章摘要和行级证据。hash 改为只读。所有权取 OR，冲突明确报告；删除保留快照与记录，外源快照完整性不冒充在线当前性。 |
| C 查询与增量 | query.mjs 提供索引、别名、摘要及有界正文检索；最多 8 候选、累计 256 KiB/64 文件读取；来源缓存去重，元数据也计入预算。一般解释仅复用核验绑定匹配的文章，关键/未知事实回源。derived 比较抽取结果，多输入与 prose 规则绑定，显式文章依赖取闭包并拒绝环。 |
| D 批处理与反馈 | transaction.mjs 统一计划、应用、校验、最终发布；摘要绑定、双层锁、staging/journal、幂等收据、显式 resume/abort、人工改动保护。查询前后复核发布边界。feedback.mjs 管理五态反馈、版本重新定位、关联修改和验证证据。 |
| E 验证与分发 | 最终 70 项确定性测试通过；三个 Agent Profile 的 canonical 消费副本、平台投影和锁同步；四个本地 CLI 快照逐文件核对 canonical 30 个文件均匹配。真实 Agent 评测未完成，详见下文。 |

测试证据：baseline-unit-tests.txt、baseline-regressions.txt、unit-tests.txt。新核心测试为 scripts/regressions.test.mjs 与 scripts/v2.test.mjs，覆盖正常路径、拒绝路径及恢复路径，不依赖模型自述。

## 兼容性与使用

- 新建使用 manifest v2；v1 可读但缺编译证明的文章不能当作 current。迁移默认只预览，`--apply` 显式写入并保留 v1 原件；不会补造历史核验。
- `inventory hash` 名称保留，写入副作用移除；全部活跃技能调用说明已更新。status/drift 原数组字段保留并增加文章状态、原因和事务状态。
- lint 默认包含当前性；`--structure-only` 用于结构维护验收。结构检查成功不代表全库已刷新。
- 每个写计划有准确清单和输入摘要，apply 前重新核验。raw-only 更新、遗漏文章、变更正文或证据失效不能推进旧文章 watermark。
- 人工正文不自动重写；可对未变化的人工作品更新核验证据，显式授权的链接修复比较其余全部字节。现有授权范围可以复用，不机械重复询问。
- 源资料一律当不可信数据。脚本不会执行资料中的命令，也不会由查询触发 ingest/feedback/事务恢复。
- CLI 返回有效状态报告为 0，lint 校验失败为 1，执行错误为 2。迁移成功并不等于内容已刷新。

实际入口与 JSON 请求例子见技能 references/schema.md、references/transactions.md；查询核验规则见 references/query.md。

## 存量保护

现有 `.template-source/wiki` 的迁移仅在临时隔离副本执行：23 篇文章、200 条链接的结构检查通过，保留 v1 可恢复原件；迁移后继续如实报告 stale/unverified。real-wiki-copy-migration.json 记录结果，distribution-content-check.json 证明真实 wiki 全部字节与实施前相同。

初始研究目录完整保留。三个 Profile 原先为干净工作树；迭代更新时，只对本轮工具生成且与前一同步回执摘要完全匹配的文件做定向回退，再使用仓库同步工具重新生成。未使用 reset/clean/force，也未改来源 provenance。相关回执、恢复前副本和摘要检查均保留。

实施阶段未提交、推送、发布、升级全局安装或批量迁移存量 wiki。用户随后追加“授权提交git”，本地 Git 检查点收录本轮改动，六个子项目提交及授权边界见 git-checkpoint.json；主仓提交可通过该文件的 Git 历史定位。推送、发布、全局安装和存量迁移仍未执行。

提交期间，另一项工作推进了三个专业 CLI 的生命周期快照，形成并行提交。此次合并保留双方历史，并从新提交的 Agent 源重新生成三个专业 CLI 快照，使用同步工具的 `YSS_TEMPLATE_BASELINE_SNAPSHOT` 绑定并行提交的原始快照，保留退役文件和迁移基线。逐项对照确认当前文件内容只有 llm-wiki 及 skills-lock.json 与该并行快照不同。三个专业 CLI 的最终快照为 `sourceState=committed`；legacy create-yss-spec 的本地快照仍为工作树来源。此前 WORKTREE 验证日志作为历史证据保留，提交阶段验证见 git-checkpoint.json。这些本地检查不代替完整固定提交发布集成，也不关闭真实 Agent 评测缺口。

## 真实 Agent 评测：未完成

- 预定 10 个场景 × 基线/候选各 1 次，上限 20 次启动，禁止自动扩充和重试。
- 实际启动 1 次，完成 0 个 turn。首个 baseline/query-general 在工具执行前被服务端拒绝：当前 CLI + ChatGPT 账号不支持所选 `gpt-6-sol`。trace.jsonl、stderr.log、run-config.json 和 summary.json 已保留。
- 所选模型虽出现在本地模型缓存，缓存不证明该 CLI/账号组合可执行。此次选择没有得到运行时预检证明；这个准备缺口已记录，不能转算成技能回归。
- 基线剩余 9 场景与候选 10 场景均未启动。未自动换模型或重试。candidate/ 保存最终待评测技能字节，不是独立审查候选。
- 正确性、来源支持、input/output token、读取量、工具次数、耗时、人工往返的真实配对比较全部未知；没有把缺失用量当作 0，也没有按字节估算 token。
- 确定性可信度修复已得到测试支持；真实 Agent 语义正确性和提效结论尚未验证。需实际可用运行时，并明确重新安排失败后的配对预算；不得静默扩到 21 次。

权威执行记录：agent-evaluation-report.json。没有完整配对数据时，不报告节省比例或统计显著性。

## 维护者自检与边界

自检重点为：hash 无写入、文章编译证明不被来源观察覆盖、外源在线未知不归 unchanged、人工所有权取 OR、删除不丢快照、依赖闭包、计划输入漂移、并发锁、各阶段中断、重复计划/反馈、恢复时人工改动、查询前后字节一致与发布版本一致。

自检发现并修复的关键问题：新写者已获取锁但旧 finalized journal 尚未替换时，读者可能误认为无事务；另一个窗口是查询过程中完成了新发布。现已分别在锁取得区间阻断，以及在回答前重验 manifest 与事务身份。对应两个独立回归保留在 v2.test.mjs。

结构/摘要脚本只证明字节与位置绑定，不证明自然语言断言的语义正确；后者需要编译 Agent 实际核验和真实评测。来源在本次读取之后仍可变化，回答应按已观察版本表述。真正进程崩溃留下 runner lock 时不自动抢锁，须检查原进程与 journal 后明确恢复。内部 staging/journal/收据保留，未实现自动回收策略；大 wiki 的元数据也可能耗尽查询预算，此时返回未覆盖而不是虚报可信答案。

此次实施没有引入向量库、专用 UI、自动发布或多模态解析。测试与资料在 `.template-source/evidence`，不成为实例业务资产。

## 验证环境与后续

首次 `scripts/verify-template-fast` 因冻结证据中文路径被未映射路径规则自动升级至 release，93 个检查中 92 个通过。唯一失败位于现有 template-ci 测试：全局 npm 12.1.0 的 `pack --json` 返回对象，测试消费者要求数组。已在临时包中复现，并对照 Node 24 随附 npm 11.19.0 的数组输出。未修改校验器或 npm 全局配置；最终门禁使用 Node 24 的 bin 目录优先执行，原失败完整保留。

仓库 checkpoint v2 没有可表达“目标 implementation-ready、仍等待真实评测”的执行中状态；needs-human 又专用于第二轮发布审查。因此本轮保留 L3 维护执行记录，不伪造完成态 checkpoint，也不为了通过校验修改治理 schema。待真实评测闭合后再生成符合权威合同的完成记录。
