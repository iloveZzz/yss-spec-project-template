---
name: yss-skill-source-index-refresh
description: 后端组件源码或前端 YSS UI 文档变化后，刷新技能来源索引并核验平台线、组件摘要与引用。
disable-model-invocation: true
---

# 技能来源索引维护

由 Agent 直接阅读实际组件源码并更新相应技能的 references/source-index.md 与平台专页，不依赖刷新脚本或 freshness 门禁。

按 [源码定位](references/source-location.md) 找到正确的工程，区分 Boot 2 / javax 与 Boot 3 / jakarta。记录实际路径、版本、组件入口、配置键、公开签名与适用限制，不凭旧索引猜测不存在的能力。

仅更新用户要求或确实变化的组件。源码不可访问时保留现有信息并标明未知；不为读取资料要求干净工作树、摘要证明、平台批准或测试报告。

索引用于定位，具体实现仍阅读相关源码。更新 canonical 内容后同步受影响的平台副本。
