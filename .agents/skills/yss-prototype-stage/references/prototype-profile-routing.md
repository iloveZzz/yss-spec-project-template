# 原型档位路由与 Designer Skills 适配

本合同是 `artifact.prototype-deliverable` 的档位选择单一入口。生命周期只依赖 `prototype_profile` 和统一证据，不感知渲染器内部结构。

## 选择算法

先读取已批准 Spec、交互说明、低保真、状态矩阵和独立 `prototype-review`。按下列确定性规则选择，最高命中档位优先；无命中或证据不充分时使用 H2。人工可以直接升级，降级必须写明已关闭的触发风险与证据。

| 档位 | 名称 | 命中条件 | 默认适配器 |
|---|---|---|---|
| H1 | `visual-review` | 仅需确认布局、密度、层级、文案或少量关键交互；不涉及多页面导航、复杂联动、权限、恢复、冲突或真实组件差异 | 语义 HTML + 项目 Token CSS + 最小 JavaScript；可使用设计工具导出，但必须有浏览器可复验入口 |
| H2 | `flow-review` | 多页面/路由、复杂表单联动、权限体验、失败恢复、并发冲突或需要可操作主流程测试 | HTML/CSS/JavaScript 可操作流程；默认离线资源包，保持同等流程和异常验收 |

真实 YSS/AntDV 组件行为、lockfile、props、slots、events 或 Storybook 状态不是第三种原型档位。它们属于前端实现计划、已批准切片的生产实现与实现还原验证。原型中发现的相关不确定性写入 `implementation_handoff`，不得为解决它调用 `yss-ui` 或把实现仓组件代码引入原型。

## 共同资产

- `decision_to_inform`：本轮原型要支持的具体决策。
- `risk_assumptions` 与 `trigger_results`：机器可读档位来源。
- Spec、交互说明、状态矩阵、设计系统与低保真评审引用。
- 浏览器入口、产物 digest、desktop/narrow 非空渲染、console 结果，以及由 `case_id` 定位的 Visual Baseline Bundle。
- 统一 Design QA 六轴：visual、layout、interaction、content、accessibility、cross-platform。
- 独立原型评审引用、用户确认、blockers 和 gaps。
- `implementation_handoff`：只记录生产组件假设、待验证事项和目标阶段，不提前执行生产组件核验。

机器优先采集版本、digest、视口、截图、console 与扫描结果；人只填写决策、风险解释、允许差异和用户确认。PNG 基准图统一使用 sRGB、DPR 1，关闭动画并隐藏光标；长页面使用固定滚动分段，full-page 只可作总览。每张图不超过 5 MiB，整包不超过 100 MiB。不得把同一事实复制到多个段落。

`visual-baseline.yaml` 是模型与实现验证的唯一图片索引。每个 case 必须绑定 route、page、state、viewport、theme、locale、data scenario、PNG digest、语义引用和允许差异；至少覆盖 1440x900 与 390x844。原型用户确认时冻结版本，后续变更创建新版本并使依赖的实现计划与 Slice Contract `stale`，禁止覆盖旧版本。

## 档位证据

### H1

- 浏览器不依赖 Node/runtime build；原型目录不得伪造 `package.json`、lockfile 或 AntD 查询段。
- 至少验证一个或少量关键交互，以及基础键盘、焦点和对比度。
- 200% zoom 与 reduced motion 只在影响面命中时要求；视觉回归和真实组件 story 不强制。

### H2

- 主流程与关键 failure / no-permission / conflict 状态可操作。
- 验证键盘、焦点、对比度、200% zoom、reduced motion；按风险决定视觉回归。
- 默认 `component_basis=html-css-js`、`runtime_build_required=false`、`prototype_library_facts.applicable=false`，不创建 package、lockfile 或空事实包。
- 场景使用现有 `case_id/data_scenario` 对应状态矩阵；固定初始输入与结果，提供切换、深链接和重置，验证失败后的输入保留、重试、权限边界及冲突恢复。
- `offline-html-v1` 交付包记录所有本地资源及摘要；断开网络后通过 `file://` 从独立目录复验，保存 console、资源、交互和截图结果。静态扫描不能替代浏览器行为证明。

### 实现阶段交接

- 若原型结论依赖真实 YSS/AntDV 组件能力，在 `implementation_handoff.production_component_assumptions` 中记录假设，在 `verification_targets` 中写明待验证行为。
- 实现合同编译器 将这些事项编入 `frontend_implementation_plan`；真实组件事实在实现准备或进入已批准切片后由 `yss-ui` 基于目标 lockfile 核验，最终写入 `frontend_implementation_verification`。
- 原型门禁只证明设计决策、流程与状态可验证，不得声称已证明生产组件兼容性。

## 条件 ideation

新视觉方向、信息架构不确定或存在多个合理布局时比较三个候选方案，由用户选择后构建。可用低保真、HTML 或按需 `product-design:ideate`；不把 ImageGen 当作所有原型的前置依赖。已批准模式或当前设计规范足以约束页面时，记录 `not-applicable`、来源与理由。

`source_visual.kind=design-system` 引用 `DESIGN.md`，走规范直出和 `design-contract` QA；`visual-reference` 引用独立视觉稿，走 `visual-comparison` QA。两者都要求统一六轴 QA 和用户确认；首版截图只在确认后成为后续回归基线。

## 上游融合记录

- 来源：`https://github.com/Owl-Listener/designer-skills`
- 检查 revision：`20e34c4a587e5eb09fcdf8351fa97b3ad761b31e`
- 许可证：MIT
- 采用：`prototype-strategy` → 本档位算法；`state-machine` → 现有状态矩阵；`design-qa-checklist` → 统一六轴 QA；`handoff-spec` → 交互说明、状态矩阵、前端实现计划与 Slice 合同。
- 不采用：上游 107 skills / 32 commands 的整包安装、第二套生命周期与第二份 handoff 资产。
- 更新：仅人工 diff 新 revision；YSS `CONTEXT.md`、生命周期注册表、设计系统与本合同冲突时始终以 YSS SSOT 为准。
- `taste-skill` revision `ccbc15639c97057cbfcf32ecebc38ef716e4bb37` 本轮不集成；未来只能作为 H1/H2 可选视觉 lens，不能覆盖 dashboard、data table 或 multi-step flow 的主合同。

## 迁移

- 新证据只生成 schema v4、Visual Baseline schema v1 与 `artifact.prototype-deliverable`。
- prototype evidence schema v1/v2/v3 和 `artifact.high-fidelity-html-prototype` 只读兼容；已经关闭的历史证据保持有效，不补造图片。
- 在途 UI 证据必须迁移到 v4 并产生 Visual Baseline 后才能关闭 `check.prototype-verified`；非 UI 功能不生成空包。

### HTML 路线迁移

两个原型组件 Provider 已从当前技能与生成路线退役。历史 Vue/React 原型、fact pack 与批准证据保留原字节；`--allow-legacy` 只读校验不代表通过当前门禁。在途原型继续演进时生成新的 HTML 工作版本、补离线与场景证据并重新确认，禁止覆盖旧版本。

采纳的外部方法与适用边界见 [HTML 原型实践](html-prototype-practices.md)；不安装上游整包或引入第二套状态、QA、交接体系。

真实组件确有评审价值时，H2 可条件使用 `react-antd-prebuilt`，仍交付离线 HTML 资源包；启用条件、版本与验证见 [AntD 集成](antd-integration.md)。
