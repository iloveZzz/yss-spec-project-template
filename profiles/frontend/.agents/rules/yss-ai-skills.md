---
trigger: always_on
---

# YSS UI 实现入口

仅在生产前端或 YSS UI 实现影响命中时使用本入口。先消费当前 Slice Implementation Contract，并按 `.template-spec/agents/yss-skill-registry.yaml` 选择最小技能集；进入 `.agents/skills/yss-ui/SKILL.md` 后，以 `.agents/skills/yss-page-module-development/SKILL.md` 路由页面任务并按触发读取 canonical `SKILL.md`。原型阶段使用 `yss-prototype-stage`，不得调用生产实现技能 `yss-ui`。

YTable 使用真实 API：不得臆造 `request`、`search-params` 或 `actionConfig.actions`；主操作必须放入 `#toolbar-right`，只有确实需要列设置时才使用 `toolbar-config.custom`。其余组件、表单、主题、API 与导出细则以下沉技能为准。
