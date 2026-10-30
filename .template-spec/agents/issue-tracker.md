---
tracker:
  platform: local-markdown
  root: .work
---

# Spec Issue tracker

此处 frontmatter 是唯一平台配置。新 Spec 支持 local-markdown、github、gitlab 三种可替换主载体，不并行维护多个内容源。

- local-markdown：root 为工程内工作根，规格放在 `<root>/<feature>/spec.md`。
- github：repository 为明确的 `owner/repo`。
- gitlab：host 为明确的 HTTPS 实例地址，project 为完整项目路径。
- 远程实际需保存草稿、恢复记录或批准快照时配置 root；这些材料不是远程正文同步源。

已有明确选择优先，不从 Git remote 静默改 tracker。远程凭据来自实际工具配置，不写入此文件。

完整操作由 yss-product-lifecycle 的 `references/spec-tracker.md` 单一持有；已连接工具优先，必要时 gh/glab。本地直接创建/读取/更新，远程返回真实 Issue 定位，失败不改平台。旧阶段及业务票版本、父 Ticket、checkpoint、Slice 和独立交接包不是新 Spec 要求。

当前规格可用 Content: draft/reviewable 表达准备程度；真实审批、发布结果分别记录，不以平台 open/closed 或 ready-for-agent 推断实施资格。
