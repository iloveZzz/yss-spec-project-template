---
trigger: always_on
---

# YSS UI 实现入口

仅在生产前端或 YSS UI 实现影响命中时使用本入口。先按当前 Slice Implementation Contract 与 `docs/agents/yss-skill-registry.yaml` 选择最小技能集，再进入 `.agents/skills/yss-ui/SKILL.md`；完整业务页面使用 `.agents/skills/yss-ui-business-page-generation/SKILL.md`，并按任务触发读取其引用的 canonical `SKILL.md`。原型阶段使用 `yss-prototype-stage`，不得调用生产实现技能 `yss-ui`。

YTable 使用真实 API：不得臆造 `request`、`search-params` 或 `actionConfig.actions`；主操作必须放入 `#toolbar-right`，只有确实需要列设置时才使用 `toolbar-config.custom`。其余组件、表单、主题、API 与导出细则以下沉技能为准。
