# 产品原型与说明

## 从产品问题选择表达

完整有 UI 的 Spec 必须有高保真原型及交互说明；按产品风险选择覆盖范围与必要状态，不降低完整交付的高保真要求。先列目标角色、入口、任务、输入、主要动作、结果、取消/返回及关键异常，引用同一份业务规则和验收条件。

- 内容与阅读层级：线框用于探索布局、文案与状态呈现，完整纯展示需求交付高保真静态稿，标明没有实现的操作。
- 操作与状态变化：用可操作原型串起核心闭环及影响判断的失败/恢复路径，不能只交截图或假按钮。
- 无 UI 或规则不确定：使用 `.agents/skills/prototype/LOGIC.md` 的业务逻辑/状态原型；不为此虚构产品页面，有 UI 时的规则试验不替代完整产品原型。
- 产品 UI 的低保真草稿和完善版：均按 [Vue 准备](shadcn-vue-prototype.md) 使用 Vue + shadcn-vue，在同一页面和场景上完善视觉与内容。原型技术只服务表达，不产生生产技术选型。

不要求每页全部状态或多个视觉方向。先做能检验主要任务的最小完整表达，再按发现补充。含糊的权限、撤回、并发、部分成功和恢复规则先分析/澄清，不能由示例代码暗定。

## 内容、场景和资产

使用代表性内容，覆盖关键长字段、空值和数据量；真实资料脱敏。每个场景有明确初始条件、动作与可观察结果；模拟范围在页面或说明中可见。初始状态可重置，失败保留必要输入，未知场景明确报错。不要用按钮出现、初始化确认或资源加载成功证明业务行为正确。

现有作者资产是可复制的材料，不是全部可直接双击的成品。只在新的原型目录组装：

- `assets/prototype/` 是现行 Vite 依赖、锁、配置及扩展组件来源清单。
- `assets/shadcn-vue-authoring/` 保存固定组件快照与许可；按 [Vue 准备](shadcn-vue-prototype.md) 核对摘要后使用，不运行不存在的自定义构建器。
- `assets/vue-business-patterns/` 是 [业务模式](business-patterns.md) 的 Vue 入口、页面、主题及场景；配置文件只说明示例的入口与数据，不是 CLI 命令。
- 低保真演练使用 `assets/vue-business-patterns/approval-draft-{single,batch,queue}.config.json`，共用 ApprovalDraft.vue 和场景数据；见 [演练说明](low-fidelity-exercise.md)。不另建独立原生 HTML 路线。
- 使用场景运行器时复制 `assets/scenario-runtime.js`，按“场景数据 → 运行器 → 业务入口”的顺序加载。为所选入口对应的场景 JSON 生成 `window.prototypeScenarioContract = {scenarios, data_digests}`；`scenarios` 每项含 `id`、`label`、`state_ref`、`initial_data`，`data_digests[id]` 为该初始数据规范化 JSON 的 SHA-256。Vue 工作区的场景选择器直接读取合同中的 `scenarios`，无需另建 `window.prototypeScenarios`。先 `initialize()` 取得新副本，首次渲染完成后 `ready(ticket)`，异常 `fail`/`showError`。未知 hash 不回退正常场景。
- 候选比较需要时见 [比较资源](comparison-tool.md)；比较页本身不证明候选行为。浏览器和临时文件保护见 [资源使用](resource-lifecycle.md)。

实际打开可操作原型后，检查选择器列出的场景与合同一致，再切换代表场景、执行主要动作及失败重试、重置并核对初始数据和选择状态；访问未知场景 hash 应显示入口错误，不能静默进入正常场景。构建成功不能替代这些操作。

这些材料只模拟本地业务，不连真实接口或存储，不承诺原型可直接进入生产。编号、金额、唯一性校验、错误反馈和模拟请求可以表达业务；不能把演示数据结构或请求升级为物理库表、生产 API 契约或技术选型。

主题装配必须包含真正的 Token 定义（当前模板为 `.template-spec/design/tokens/variables.css`，已有项目使用其实际 Token）、`assets/prototype-theme.css` 的布局规则和 `assets/shadcn-vue-authoring/theme.css` 的语义映射。`prototype-theme.css` 只消费变量，不能作为完整 Token 定义。变量放在文档根或其他覆盖 Teleport 弹层的全局范围，检查缺失变量、计算样式和加载顺序；构建通过不等于样式正确。

## 原型及交互说明

沿用现有设计或 Spec 文档，不强制多份文件或额外交接包。至少说明：

1. 目的、角色、页面/状态范围，以及对应规则和验收条件。
2. 产物位置、查看/运行方式、代表输入与可操作路径。
3. 正常结果、关键异常、取消/返回/重置；只展示的区域明确标注。
4. 数据和服务的模拟边界、已确认决定、仍影响交付的缺口。
5. 实际执行的检查与观察，未执行及工具限制；待研发承担的技术设计与实现。

按 `.agents/skills/prototype-review/references/review-method.md` 复核。运行环境不可用时继续完成可审阅内容，如实保留交互未验证项；若完整交付依赖该项，不能称完整交付已经完成。
