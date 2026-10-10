# Spec基线

Spec 记录用户问题、解决方案、用户故事、关键决策、验收标准和测试 seam，是可审查的产品研发规格。它为设计、契约和切片提供需求基线，进入实现还需当前合同与就绪核验。

## 正式生命周期位置

正式新功能和较大变更先进入 Plan；合格日常任务的需求与验收保存在同一 Ticket/PR，不因此生成正式 Spec 阶段资产。`work-unit.spec-synthesis` 消费已确认的 Plan 记录和测试 seam，产出 Spec、产品总体设计、功能架构及业务 Ticket 草案集合；草案进入 `ready-for-human`，下游推进仍需 `gate.spec-baseline-approved`。

`gate.spec-baseline-approved` 处理新功能、行为变化或范围扩大进入基线的批准。已授权范围内细化可复用当前有效授权；实质变化需要重新决定。模板源仓库只维护这些可复用规则，`template-source` 不生成具体产品的 Spec、原型、OpenAPI 或垂直切片 Ticket。

## 正文与稳定引用

现行 Spec 模板声明 `content_profile: plan-spec-v1`，默认 `stage: open`、`status: ready-for-human`、`owner: ai`。Spec 综合同时起草业务 Ticket 集，Design 校准同一组 ID；Spec 只引用集合路径，避免相互摘要循环。功能父 Ticket 汇总阶段资产与阻塞。

功能需求写主体、触发条件、可观察结果及例外，并关联来源和验收 ID。验收覆盖成功、拒绝、边界、状态变化和恢复；FR/NFR/AC 在同一功能内保持稳定，重排不重新编号，删除后不复用。来源引用项目根相对路径与已有 ID；没有 ID 时用准确章节名。

非功能需求记录适用条件、目标、单位、验证方式和依据；未确认的目标保留为未决项，没有适用约束时写带原因的 `not-applicable`。测试决策说明主要公开 seam、相似测试和适用的单元、契约、组件或 E2E 验证。

起草前读取根目录唯一的 `CONTEXT.md`，使用已确认的中文术语。稳定业务词汇变化先回写词汇表；未决项保留责任人、解决时点和接收方，不能因补了验收示例而变成已确认行为。

## 设计与实现交接

只有存在产品设计影响时，才强制低保真页面草图、状态矩阵、H1/H2 原型交付物与用户确认；否则记录原因。OpenAPI Draft 在 Freeze 前用于评审与架构反审，不作为稳定实现或客户端生成输入。

已有冻结基线的高风险行为变化见 [[SpecDelta]]。设计校准见 [[产品设计影响与原型]]，API 交接见 [[OpenAPI契约]]；冻结范围进入 [[垂直切片Ticket]] 与 [[切片实现合同]]，仍按 [[产品研发生命周期]] 的当前门禁推进。

## 来源

- `.template-spec/templates/spec-template.md`：1–7、13–19、33–39、41–49、51–59、61–77、97–105、125–131 行。
- `CONTEXT.md`：8–14、44 行。
- `AGENTS.md`：5–7、11–19、34–38 行。
- `.template-spec/process/lifecycle-registry.yaml`：185–191、463–468 行。
- `.agents/skills/yss-product-lifecycle/references/orchestration-contract.yaml`：205–226 行。
