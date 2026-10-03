# 写入事务

init / refresh / rebuild / ingest 使用同一 `plan → apply → verify → finalize` 流程。migrate、feedback 也走此流程。计划和候选草稿放在已授权的工作目录；尚未确认 ingest 时只展示候选，不写 wiki 或 raw。不要把授权字段当作向用户索取重复确认的理由：已确认的一组来源与页面范围可复用。新增页面、冲突处置、人工正文改变超出既有范围时先展示差异，取得真实决定。脚本验证写清单，不能证明字段背后的人类授权。

## 计划请求

Agent 先读 live 输入，准备候选文章、raw、索引和 manifest 元数据，逐条检查关键断言。原文件保持不动。传入 request JSON：

```json
{
  "operation": "refresh",
  "authorization": {"confirmed": true, "paths": ["raw/guide.md", "wiki/术语.md", ".wiki-manifest.json", "wiki/log.md"]},
  "writes": [{"path": "raw/guide.md", "content": "完整候选内容"}, {"path": "wiki/术语.md", "content": "完整候选文章"}],
  "compilations": [{
    "articleId": "术语",
    "consumed": {"guide": {"effectiveDigest": "实际读取版本的 SHA256", "rawDigest": "候选 raw 的 SHA256", "extractorVersion": "identity-v1"}},
    "evidence": [{"sourceId": "guide", "inputPath": "docs/guide.md", "startLine": 1, "endLine": 3, "excerptDigest": "选中行的 SHA256", "claim": "文章中的实际断言", "risk": "general"}]
  }]
}
```

示例中的摘要占位符必须替换。`manifest` 可选：init 必须给 [schema](schema.md) v2 草稿；其他模式仅为添加已确认来源、文章或调整导航依赖等元数据提供。已有 articleDigest/compiledFrom/verification 不可手工推进，只由 compilations 更新。原来未核验的外源可摄取但须保留 unverified，不能编造本地 livePath 或 online 核验证据。

source 的 document/code-surface extractorVersion 为 identity-v1；derived 为 `kind:version:`，prose-note 最后再拼 rules 和 inputDigests JSON 的 SHA256。可用 inventory hash observations.version 取得当前版本；新增 raw 尚未落盘时计算候选 raw 摘要。consumed 必须绑定实际读过的输入；计划重算观察值并检查二者一致，不能“随手 hash”充当阅读或语义核验。

```bash
node <skill-root>/scripts/transaction.mjs plan --wiki <root> --repo <repo> --request <request.json> > <plan.json>
node <skill-root>/scripts/transaction.mjs apply --wiki <root> --repo <repo> --plan <plan.json>
```

plan 不写 wiki；返回 sources/articles/protected/conflicts、完整 writes `{path,before,after,content,original}`、inputs 摘要和计划 digest。检查准确范围后应用。source 删除只留 tombstone 与快照，不能删 source 或 article 记录。未被编译的文章保持旧 watermark；更新 raw 不会清除它们的 stale。human-owned 自动正文修改拒绝；已显式授权链接修复时传 `linkRepairs: [articleId]`，脚本严格比较 wikilink 外所有字节，不能夹带正文变更。

apply 先核验全部输入摘要，变化即 PLAN_STALE，必须重新计划。只写计划内文件；内部 `.wiki-staging/<id>/` 保存候选与完成收据，`.wiki-transaction.json` 是恢复记录，`.wiki-lock` 是事务锁，`.wiki-runner-lock` 防止并发恢复。`template-source` 的 journal、staging、锁和备份由项目 `scripts/lib/maintenance-storage.mjs` 解析到仓外 `maintenance:wiki/<wiki-id>/`；其它 wiki 沿用同一 wiki-root。这些内部文件纳入写操作授权；不分发或公开其中的来源原文/备份。共享 index/log/manifest 由主控生成。manifest、日志最后发布；未完成期间查询拒绝读取混合版本。

## 恢复和取消

```bash
node <skill-root>/scripts/transaction.mjs resume --wiki <root> --repo <repo>
node <skill-root>/scripts/transaction.mjs abort --wiki <root> --repo <repo>
```

resume 只补未完成步骤、验证 staging、检查来源是否仍为原计划版本。abort 先检查全部目标，再仅恢复该事务改动；目标被人工修改时停止，绝不覆盖。真实进程崩溃若留下 runner lock，禁止自动抢占：先核实原进程已停止，展示锁和 journal，由用户明确选择清除该残留执行锁后再 resume/abort。事务锁本身由恢复流程管理，不手删以绕过冲突。

相同计划重放复用完成收据，不重复追加日志。aborted 计划是终态，重新执行用新计划 ID。保留内部 journal/staging/收据用于追溯。模板源仓内 `log.md` 只保存最新运行入口，不追加历史；详细计划、旧日志与原字节保存在仓外事务包中。最终做结构 lint + status + advise，明确剩余 freshness，结构维护完成不等于所有知识 current。

## 人工反馈

`feedback.mjs --wiki <root> --request <feedback.json>` 预览，`--apply` 应用。request 需要 confirmed:true、id、articleId、targetDigest、locator.quote、issue，可加 status。accepted/partial resolution 需要 transactionId/beforeDigest/afterDigest/note，对应实际文章修改且已核验；rejected/deferred 用 resolution.note 记录理由。反馈的重新定位与修复分开，反馈自身不修改文章。
