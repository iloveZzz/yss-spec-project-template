---
name: yss-skill-source-index-refresh
description: 前端 YSS UI 组件、Hook 或页面模块文档入口变化后，刷新已安装技能的文档入口索引；仅用于前端维护。
disable-model-invocation: true
---

# 前端技能文档索引刷新

仅维护已安装前端技能的 `references/frontend-docs.md`。映射与文档入口由 `scripts/refresh-yss-skill-index.mjs` 中的 `FRONTEND` / `URLS` 定义。

索引用于定位，不代替组件兼容核验。只读查阅或排障时使用现有索引；仅在文档入口变化且刷新范围明确后运行，不因每次调用自动刷新。

```bash
export YSS_SKILLS_ROOT="/path/to/.agents/skills"
node "$YSS_SKILLS_ROOT/yss-skill-source-index-refresh/scripts/refresh-yss-skill-index.mjs"
node --test "$YSS_SKILLS_ROOT/yss-skill-source-index-refresh/scripts/refresh-yss-skill-index.test.mjs"
```

- 只更新 `yss-ui`、`yss-hook`、`yss-ui-business-page-generation`、`ytable-usage`、`yedit-table-usage`、`ytree-usage` 中实际存在的技能，不生成缺失技能目录。
- 不查找或要求 Java 源仓，不读取 `YSS_SOURCE_ROOT`，不创建后端 `source-index.md`。
- 这是文档入口索引生成器，不下载文档，也不证明网页内容已更新或与当前组件版本匹配。实际实现仍需读取当前版本文档与组件证据。
- 在 canonical 技能根刷新后，使用本仓 `scripts/update-skill-lock`、`scripts/sync-skills` 和快速验证完成维护；不手改各运行时投影。
