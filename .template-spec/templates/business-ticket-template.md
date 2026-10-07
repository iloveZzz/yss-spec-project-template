---
schema_version: 1
kind: business-ticket
id: BT-<stable-id>
version: v1
status: draft
spec:
  ref: .work/<feature>/spec.md
  version: v1
  digest: sha256:<raw-bytes>
requirement_refs: [FR-001]
acceptance_refs: [AC-001]
dependencies: []
source_refs: []
open_questions: []
---

# <用户行为与可验收结果>

## 业务结果

<哪个角色完成什么行为，获得什么可观察结果。>

## 范围

<业务边界、适用规则、成功与失败/恢复路径；source_refs 按需绑定规则、场景和设计，使用精确 ID 或标题。>

## 非目标

<明确不覆盖的业务范围。>

## 验收

<引用原始 AC 并解释本票交付的行为；不得在这里改变已批准规则。>

## 风险

<风险、约束与处置；未决项在 frontmatter.open_questions 登记责任人、解决时点和 blocking。>
