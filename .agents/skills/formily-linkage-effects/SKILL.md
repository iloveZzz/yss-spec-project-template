---
name: formily-linkage-effects
description: 指导 YFormily 字段联动与表单级副作用；当实现动态显隐、禁用、级联选项、scope 事件、x-reactions、effects、异步联动或客户端校验失败兜底时使用。
---

# YFormily 联动与副作用

## 触发条件

- 需要字段联动（A 影响 B）、动态显隐/禁用、级联下拉。
- 需要 `scope`、`x-reactions` 或 `createForm + effects`。
- 需要处理异步选项竞态、旧值清理或 Formily 校验失败反馈。

## 不适用场景

- 纯基础字段与提交：使用 `../formily-foundation/SKILL.md`。
- 详情态渲染和 mode 切换：使用 `../formily-mode-slot-detail/SKILL.md`。
- 分步流程：使用 `../formily-step-flow/SKILL.md`。

## 文档检索

1. 当前会话可用 yss-ui MCP 时，先用 `get_component_docs` 查询 `YFormily` 的 `scope`/Schema/表单实例边界；实现字段联动、多字段反应或 effects 时，再用 `get_demo` 获取 `formily/linkage`、`formily/linkage-multi`、`formily/effects` 等官方 Demo。
2. MCP 查询未命中时先用 `search_docs/list_components` 校正名称；MCP 不可用、调用失败或校正后仍无结果时，才读取最新 `llms-full.txt`。若文档与当前项目依赖版本不一致，用当前源码和导出核验。

## 硬约束（禁止/必须）

- 按复杂度选择机制：表达式 < `x-reactions` < `scope` < `effects`，避免同一联动在多处重复实现。
- 仅显隐/禁用优先使用 `$values` 表达式；当前字段依赖其他字段时优先 `x-reactions`；跨字段事件用 `scope`；表单级监听才用 `effects`。
- `effects` 需要首屏即生效时，同时注册 `onFieldInit` 和 `onFieldValueChange`，禁止只监听变化导致初始状态错误。
- 修改其他字段状态时使用 `form.setFieldState`；级联选项变化后，只有旧值不在新选项中时才清空，避免初始化误删合法回填值。
- 异步联动必须处理空依赖、loading、请求竞态与卸载；旧请求不得覆盖新选择。
- 客户端校验提示使用 `onFormSubmitValidateFailed`。禁止在 `onFormSubmitFailed` 或 `Submit.onSubmitFailed` 中调用 `message.error`：Formily 会把 `onSubmit` 中的 API reject 也交给这些通用失败回调，导致与 `mutator.ts` 重复提示。
- Orval API 的网络/业务错误已由 `mutator.ts` 提示并 reject，业务 `else`/`catch` 禁止重复 `message.error`。
- 分步需求默认走 `formily-step-flow`，不在此 skill 中给 `FormStep` 默认方案。

## 按需示例

首次组织 `createForm + effects`、排查初始化联动或校验反馈时，读取 [联动与 effects 示例](references/linkage-example.md)。基础布局和提交仍按 `formily-foundation`。

## 交付检查清单

- [ ] 已说明为何选择表达式、`x-reactions`、`scope` 或 `effects`。
- [ ] 首屏需要联动时同时覆盖初始化与变更事件。
- [ ] 字段切换后旧值、选项和 loading 状态正确，异步请求有竞态保护。
- [ ] Formily 客户端校验提示集中在 `onFormSubmitValidateFailed`，未用通用 `onFormSubmitFailed`/`Submit.onSubmitFailed` 处理 API reject。
- [ ] API 错误只由 `mutator.ts` 提示，业务 `else`/`catch` 未重复 `message.error`。
- [ ] 无 DOM hack、无无意义 `setTimeout`，未把分步逻辑塞入本 skill。

## 失败兜底策略

- `x-reactions` 失效时先校验字段路径和实际 schema 层级，再决定是否升级为 `setFieldState`。
- 首屏状态错误时检查是否遗漏 `onFieldInit`；回填值丢失时检查是否无条件清空了级联字段。
- 异步结果乱序时使用请求序号或 `AbortController`，只接受最后一次请求结果。
- API 调用 reject 时只恢复 loading 或回滚局部状态，不重复弹出错误提示。
