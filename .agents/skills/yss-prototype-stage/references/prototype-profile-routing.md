# 原型档位路由与 Designer Skills 适配

本合同是 `artifact.prototype-deliverable` 的档位选择单一入口。生命周期只依赖 `prototype_profile` 和统一证据，不感知渲染器内部结构。

## 选择算法

先读取已批准 Spec、交互说明、低保真、状态矩阵和独立 `prototype-review`。按下列确定性规则选择，最高命中档位优先；无命中或证据不充分时使用 H2。人工可以直接升级，降级必须写明已关闭的触发风险与证据。

| 档位 | 名称 | 命中条件 | 默认适配器 |
|---|---|---|---|
| H1 | `visual-review` | 仅需确认布局、密度、层级、文案或少量关键交互；不涉及多页面导航、复杂联动、权限、恢复、冲突或真实组件差异 | 语义 HTML + 项目 Token CSS + 最小 JavaScript；可使用设计工具导出，但必须有浏览器可复验入口 |
| H2 | `flow-review` | 多页面/路由、复杂表单联动、权限体验、失败恢复、并发冲突或需要可操作主流程测试 | 可运行前端原型；Vue 3/Vite + Antdv Next 是受支持默认，React/Vite + Ant Design v6 为显式兼容路线 |

真实 YSS/AntDV 组件行为、lockfile、props、slots、events 或 Storybook 状态不是第三种原型档位。它们属于前端实现计划、已批准切片的生产实现与实现还原验证。原型中发现的相关不确定性写入 `implementation_handoff`，不得为解决它调用 `yss-ui` 或把实现仓组件代码引入原型。

## 共同资产

- `decision_to_inform`：本轮原型要支持的具体决策。
- `risk_assumptions` 与 `trigger_results`：机器可读档位来源。
- Spec、交互说明、状态矩阵、设计系统与低保真评审引用。
- 浏览器入口、产物 digest、desktop/narrow 非空渲染、console 结果。
- 统一 Design QA 六轴：visual、layout、interaction、content、accessibility、cross-platform。
- 独立原型评审引用、用户确认、blockers 和 gaps。
- `implementation_handoff`：只记录生产组件假设、待验证事项和目标阶段，不提前执行生产组件核验。

机器优先采集版本、digest、视口、截图、console 与扫描结果；人只填写决策、风险解释、允许差异和用户确认。不得把同一事实复制到多个段落。

## 档位证据

### H1

- 浏览器不依赖 Node/runtime build；原型目录不得伪造 `package.json`、lockfile 或 AntD 查询段。
- 至少验证一个或少量关键交互，以及基础键盘、焦点和对比度。
- 200% zoom 与 reduced motion 只在影响面命中时要求；视觉回归和真实组件 story 不强制。

### H2

- 主流程与关键 failure / no-permission / conflict 状态可操作。
- 验证键盘、焦点、对比度、200% zoom、reduced motion；按风险决定视觉回归。
- 默认使用 `vue-antdv-next` 并记录 package 与精确版本；显式兼容路线记录 `react-antd-6`。fact pack 只有在 provider、版本、组件集合和项目 Token baseline digest 全部匹配且没有新 API 疑问时才可复用，否则只补增量查询。
- 使用其他基座时记录 `component_basis`，不创建空 Antdv Next 或 AntD 字段。

### 实现阶段交接

- 若原型结论依赖真实 YSS/AntDV 组件能力，在 `implementation_handoff.production_component_assumptions` 中记录假设，在 `verification_targets` 中写明待验证行为。
- 实现合同编译器 将这些事项编入 `frontend_implementation_plan`；真实组件事实在实现准备或进入已批准切片后由 `yss-ui` 基于目标 lockfile 核验，最终写入 `frontend_implementation_verification`。
- 原型门禁只证明设计决策、流程与状态可验证，不得声称已证明生产组件兼容性。

## 条件 ideation

新视觉方向、信息架构不确定或存在两个以上合理布局时，`product-design:ideate` 的三方案比较为 mandatory。沿用已批准模式且 source visual 可定位时记录 `not-applicable`、复用来源和理由，不制造三份无意义变体。

## 上游融合记录

- 来源：`https://github.com/Owl-Listener/designer-skills`
- 检查 revision：`20e34c4a587e5eb09fcdf8351fa97b3ad761b31e`
- 许可证：MIT
- 采用：`prototype-strategy` → 本档位算法；`state-machine` → 现有状态矩阵；`design-qa-checklist` → 统一六轴 QA；`handoff-spec` → 交互说明、状态矩阵、前端实现计划与 Slice 合同。
- 不采用：上游 107 skills / 32 commands 的整包安装、第二套生命周期与第二份 handoff 资产。
- 更新：仅人工 diff 新 revision；YSS `CONTEXT.md`、生命周期注册表、设计系统与本合同冲突时始终以 YSS SSOT 为准。
- `taste-skill` revision `ccbc15639c97057cbfcf32ecebc38ef716e4bb37` 本轮不集成；未来只能作为 H1/H2 可选视觉 lens，不能覆盖 dashboard、data table 或 multi-step flow 的主合同。

## 迁移

- 新证据只生成 schema v3 与 `artifact.prototype-deliverable`。
- schema v1/v2 和 `artifact.high-fidelity-html-prototype` 只读兼容；已经关闭的历史证据保持有效，不回写。
- 在途 v2 证据必须迁移到 v3 后才能关闭 `gate.prototype-verified`；回滚时停止生成 v3、恢复 v2 生成器，但不删除已产生证据。
