# 校验

```bash
node <skill-root>/scripts/lint-wikilinks.mjs <wiki-root> --repo <repo-root>
node <skill-root>/scripts/lint-wikilinks.mjs <wiki-root> --repo <repo-root> --structure-only
node <skill-root>/scripts/advise.mjs <wiki-root> --repo <repo-root>
```

默认 lint 检查结构与当前性；--structure-only 用于维护验收，允许仍有 missing live/stale/unverified 内容，但不允许坏结构、缺失 raw、所有权冲突或未完成事务。通过退出 0，校验失败 1，执行错误 2。结构通过后必须另报 status，不得将其称为全库当前可信。

结构检查：已知 schema/枚举、唯一 ID/file、有效 sourceIds、来源闭包与无依赖环、raw 路径与抽取器、路径及 symlink 包含关系、H1 等于 ID、非空来源小节、索引闭合、wikilink 非跨路径且目标存在、人工所有权一致。v1 兼容读取，未核验状态不伪造为 current。

advise 为只读建议：oneWayLinks、missingTermPages、unreferencedRaws、suspects。suspects 对数字、日期、长引文做来源文字比对，不能证明语义支持。有效报告 0，执行错误 2；不自动修复，不提升建议为结构门禁。

编译 Agent 逐条核验关键断言，一般内容抽查 `min(5, changed pages)`；检查枚举、HTTP 状态、持久化与内存、硬编码与配置、冻结 API 与实际 controller 的差异。把证据写进 compilations 后才可推进 watermark。结构检查和 hash 不替代此步骤。

修复必须走事务：坏链接经授权修复；stale 来源刷新受影响文章；hash 只读，不能用于清除 stale。人工正文仅允许已明确授权的链接差异；建议未被选中时仅报告。
