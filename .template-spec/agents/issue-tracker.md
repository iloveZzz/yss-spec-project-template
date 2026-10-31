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
