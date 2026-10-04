---
name: formily-step-flow
description: 指导 YSS UI 分步表单与流程录入；当需要 Ant Design Vue Steps、多 YFormily 独立校验、跨步数据保留、确认预览或最终聚合提交时使用。
---

# YFormily 分步流程

## 触发条件

- 需求是分步表单（Step Form）或流程化录入。
- 每一步需要独立校验与前进/后退控制。
- 需要跨步数据聚合、确认预览和最终提交编排。

## 不适用场景

- 普通单页表单：使用 `../formily-foundation/SKILL.md`。
- 仅字段联动：使用 `../formily-linkage-effects/SKILL.md`。
- 仅查看态插槽：使用 `../formily-mode-slot-detail/SKILL.md`。

## 文档检索

1. 当前会话可用 yss-ui MCP 时，先用 `get_component_docs` 查询 `YFormily` 的 `submit()`、`mode`、`v-model` 和回填边界，再用 `get_demo` 获取 `formily/steps` 官方 Demo；`Steps` 的属性以当前 `ant-design-vue` 依赖和类型为准。
2. MCP 查询未命中时先用 `search_docs/list_components` 校正名称；MCP 不可用、调用失败或校正后仍无结果时，才读取最新 `llms-full.txt`。若文档与当前项目依赖版本不一致，用当前源码和导出核验。

## 硬约束（禁止/必须）

- 默认方案使用 `ant-design-vue` 的 `Steps` + 多 schema / 多 `YFormily`；组件库没有 `YSteps`，禁止编造。
- 业务层禁止把 `@formily/antdv FormStep` 作为默认方案；只有维护旧代码或用户明确指定时才可使用。
- 每次前进前对当前 YFormily 实例执行 `submit()`；该方法校验成功后 resolve，失败时 reject，不返回布尔值，禁止写 `ok !== false`。
- 每步使用独立 `v-model` 数据，并以单一 `reactive` 对象聚合；`v-if` 卸载实例后仍由该数据源保留回填值。
- 确认步骤用前面步骤的聚合数据作为 `initial-values`/`v-model`，禁止绑定一个空的第三步对象导致详情无数据。
- 最终 API 提交只聚合业务步骤，禁止把纯确认步骤当作新数据源。
- Orval API 的网络错误及 `success === false` 业务错误已由 `mutator.ts` 统一 `message.error` 并 reject；最终提交的 `else`/`catch` 禁止重复提示，loading 放在 `finally` 恢复。

## 按需示例

首次组织分步实例、聚合数据和确认页，或排查步骤回填时，读取 [分步表单组合示例](references/step-flow-example.md)。按业务阶段拆 schema、Hook 与私有视图，不按固定行数拆分。

## 交付检查清单

- [ ] 使用 `ASteps + 多 YFormily`，组件来源明确且未编造 `YSteps`。
- [ ] 每步前进前 await 当前实例 `submit()`，校验 reject 时不会前进。
- [ ] 未使用 `ok !== false` 判断 `submit()` 结果。
- [ ] 步骤切换后数据可保留和回显，确认页直接读取前序聚合数据。
- [ ] 最终提交只聚合真实业务步骤，未把确认页空对象混入 payload。
- [ ] API 失败只由 `mutator.ts` 统一提示，业务 `else`/`catch` 未重复 `message.error`。
- [ ] 业务层未使用 `@formily/antdv FormStep` 作为默认实现。

## 失败兜底策略

- 下一步无校验时确认 ref 指向当前已挂载实例，并直接观察 `submit()` 是否 reject。
- 状态串联错误时先收敛为单一 `reactive` 数据源，再检查每步 `v-model` 路径。
- 确认页为空时检查是否错误绑定了独立 `step3`，应改为前序数据的 `computed` 聚合。
- API 调用 reject 时只在 `finally` 恢复 loading，不重复弹出错误提示。
- 步骤职责交叉或状态难以验证时，按业务阶段拆子组件和 `useStepXxx` hook。
