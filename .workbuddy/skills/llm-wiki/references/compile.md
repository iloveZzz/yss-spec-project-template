# 编译模式

Manifest 合同见 [schema](schema.md)，唯一写入入口见 [transactions](transactions.md)。先取得实际输入，再记录候选消费版本和逐条来源证据；hash 是只读观察工具，**不再用于写 manifest 或结束编译**。

## init

1. 已存在 index 或 manifest 时不能覆盖。根据用户语境选择 refresh/rebuild，选择不清楚才询问。
2. 根据 [discover](discover.md) 确定 wiki 路径、语料范围、coverage、语言；已明确的信息直接复用，不机械重复问。
3. documents 复制完整文档为候选 raw；code-surface 不复制代码；derived 按抽取规则准备候选 raw。生成 v2 manifest 草稿，articleDigest=null、compiledFrom={}、verification=null。
4. 依据 [writing](writing.md) 准备文章、分类索引和 CLAUDE.md；记录实际已读输入的 consumed 与核验证据。init 只写用户已选的输出目录。
5. 统一 plan/apply，完成结构 lint、status、advise。对关键事实逐条核验，一般事实抽查最多 5 篇变更页；新文章没有有效证据时保留 unverified 并报告，不能宣布当前可信。

## refresh

1. 无 manifest 时不得猜 sourceIds。先重建映射或 rebuild；v1 先展示迁移预览，经明确选择后迁移。
2. `inventory.mjs status --wiki <root> --repo <repo>` 给出来源与文章状态；`--candidate` 仅列 Agent 已发现路径，不扫描仓库。
3. 影响范围由有效摘要和显式 dependsOnArticles 闭包决定，普通 wikilink 不级联。document/code-surface 比较完整内容；derived 比较抽取结果。仅锁文件 hash/元数据变化且技能名抽取未变时，不重写文章。
4. 只准备受影响、已授权且非人工正文的候选。未命中文章字节保持不变；missing 来源保留最后快照和 deletion 记录，不静默删除引用页。
5. 新来源分为 New/Update/Disputed/No material。既有授权覆盖的一组来源可批量处理；新增页或冲突处置超范围时展示具体差异后取得决定。Disputed 保存双方引用、说明和 status=stale。
6. 统一 plan/apply，再结构 lint、status、advise。即使仅更新 raw，也不得为遗漏文章补编译记录。维护完成时列出剩余 stale/missing/unverified 和原因。

## rebuild

根据 discover 重新核验语料覆盖，保留稳定 ID、人工正文和有效历史。按统一事务全量准备非人工文章；无需重写且未受影响的内容可保持原字节。归档用 archived，保留可解析页面和引用，不删除 wiki 目录。rebuild 也不能免除实际来源证据和编译校验。

## 抽取

- `extract.mjs skill-names --in <lock> --out <staging-file>`：有序技能名，无路径/hash/锁元数据。
- `extract.mjs heading-list --in <repo-relative-file> --out <staging-file>`：确定性标题、行号、输入名，跳过代码围栏。
- 多输入按 extract.inputs 顺序拼接每个输出；命令从 repo-root 运行以保持输入名稳定。
- prose-note 由 Agent 按已记录 rules 生成，绑定全部输入摘要和规则版本；不假定相同输入总能产生相同文字。原始 source 不得为适配摘要而删字段。

抽取输出先写候选目录，不能直接覆盖真实 wiki raw。scripts/extract.mjs 只处理单个显式文件，不运行资料夹带的脚本或命令。
