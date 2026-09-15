---
name: yss-formily
description: 路由 YSS UI 业务页面中的 YFormily 场景；当查询、编辑、详情、联动、分步表单或 schema 生成需求出现时，加载最小 Formily 专项 Skill。
---

# YFormily 场景路由

本技能只负责选择最小专项 Skill，不复制 Formily API、schema、代码骨架或页面编排规则。新代码 canonical 组件名是 `YFormily`；`YssFormily` 仅作为已确认导出的历史兼容名。

## 必选路由

任何 YFormily 使用都必须加载 `formily-foundation`，以确认公开 Props、schema 层级、提交、校验和错误处理边界。

## 条件路由

| 场景 | 追加 Skill |
|---|---|
| 字段显隐、值联动、异步 effects、跨字段副作用 | `formily-linkage-effects` |
| 新增、编辑、查看模式，详情插槽或 disabled 规则 | `formily-mode-slot-detail` |
| 分步录入、跨步骤校验、步骤状态 | `formily-step-flow` |
| Modal / Drawer 的打开、回填、保存、关闭和回退 | `page-form-module` |
| 从自然语言、截图或 Figma 生成 schema | `yss-formily-schema-generator` |

一个任务可以同时加载多个专项 Skill。`page-form-module` 只在页面容器生命周期命中时加载，不作为本技能的固定依赖。

## 边界

- 查询、列表、页面目录与弹窗编排不在本技能重复定义。
- 不根据旧 Demo 猜测 Props、实例方法或组件名。
- API 错误提示服从项目 mutator 与 `yss-api-integration`，不得在通用失败回调重复提示。
- 从截图或设计稿生成 schema 时，本技能只做路由；生成结果仍须按基础、联动、模式或分步专项校验。

## 输出

返回本次命中的专项 Skill、未命中项的理由，以及需要由目标工程版本或源码确认的组件事实。
