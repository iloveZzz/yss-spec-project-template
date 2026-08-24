---
name: page-module-development
description: 作为兼容旧项目的 Vue3 YSS UI 页面模块开发入口，将 CRUD、列表、表单、详情和左树右表需求路由到 yss-ui-business-page-generation 及细分 skills；当用户使用“页面模块开发”等旧触发词时使用。
---

# 页面模块开发 Skill

此 skill 保留旧项目触发名。新页面开发以 `../yss-ui-business-page-generation/SKILL.md` 为主规则。

## 触发条件

- 用户使用旧说法要求“页面模块开发”“生成页面模块”“业务模块开发”。
- 需要生成 CRUD、列表、表单、详情、左树右表等 YSS UI 业务页面。
- 旧项目中仍引用 `page-module-development` skill 名称。

## 不适用场景

- 组件库内部组件开发：使用 `../component-development/SKILL.md`。
- 只处理提交、发版、文档，不生成业务页面代码。
- 仅修复某个局部表格或表单问题，可直接使用对应细分 skill。

## 硬约束（禁止/必须）

- 先读取 `../yss-ui-business-page-generation/SKILL.md`。
- 列表页继续读取 `../page-list-module/SKILL.md` 和 `../ytable-usage/SKILL.md`。
- 表单页继续读取 `../yss-formily/SKILL.md`。
- 接入后端时继续读取 `../api-integration/SKILL.md`，禁止重复错误 Toast 和 `if (res?.success)`。
- 左树右表继续读取 `../ytree-usage/SKILL.md`、`../use-tree-height/SKILL.md`、`../use-table-height/SKILL.md`。

## 标准代码骨架

```text
src/views/{module-name}/
├── index.vue
├── constant.ts
├── style.less
├── hooks/
├── type.ts       # 独立类型较多时增加
└── components/  # 存在多个私有视图时增加
```

## 交付检查清单

- [ ] 优先使用 `@yss-ui/components`、`@yss-ui/hooks`、`@yss-ui/utils`。
- [ ] 默认目录包含 `index.vue`、`constant.ts`、`hooks/`、`style.less`；仅在职责需要时增加 `type.ts` 和 `components/`。
- [ ] 主组件只做编排，业务逻辑进入 hooks。
- [ ] 主组件不超过 150 行，导出函数和 hooks 均有中文 JSDoc。
- [ ] 表格分页、表单查看态、高度 hook 都符合真实 API。

## 失败兜底策略

- 需求范围不清时，先按 `yss-ui-business-page-generation` 落地最小页面骨架。
- 表格、树、表单细节冲突时，以对应细分 skill 为准。
- 发现旧示例和源码 API 不一致时，以 `llms-full.txt` 和源码导出为准。
