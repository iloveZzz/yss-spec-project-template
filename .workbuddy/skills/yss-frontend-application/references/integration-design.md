# 前端技能整合与分发边界

本页记录 YSS 前端工程技能的分工。共享源位于根 `.agents/skills`，Frontend 按白名单分发。各 Profile 的实际安装集合以对应的 Bundle 清单为准。

## 职责

| 能力 | 本版本职责 | 边界 |
|---|---|---|
| yss-frontend-scaffold-generator | 在不存在的新目录调用原生 CLI 生成最小 Vue 工程 | 不处理存量工程、只读 review 或仅技能安装；不隐式安装请求栈 |
| yss-frontend-application | 依据选定规格、设计与原型复核，在 Vue 3 工程落实已确认的体验、接口及异常恢复 | 沿用工程组件、主题和服务边界；任务授权决定是否写入 |
| yss-frontend-loading | 负责加载、刷新与异步操作反馈的状态、组件边界和回归 | 按受影响场景选用，局部纯静态修改照常使用应用技能 |
| shadcn-vue | UI 工程底座，识别项目配置，查找、组合和定制本地组件 | 工程技能补充设计还原、存量定制和兼容来源要求 |
| vue-best-practices | Vue 响应性、组件数据流、生命周期与职责拆分 | 按受影响逻辑读取参考，纯文案/样式不触发 |
| vueuse-functions | 按功能选择 VueUse hooks，例如防抖、倒计时、事件监听 | 按项目锁定版本确认 API 与作用域，沿用已有请求调度 |
| create-adaptable-composable | 确有需要的响应式/普通输入接口 | Vue 3.3+；不为简单局部状态新增抽象 |
| yss-design-ui、prototype-review 等可用协作技能 | 提供产品设计、交互说明和原型复核结论 | 按任务选用；应用技能可直接消费已有结论，随包取得复核接续参考 |

本版本保留 SKILL、references、agents 与必要示例：前端交接模板、OpenAPI 配置/transport、精确版本的 vue-hooks-plus 补丁。应用 starter 由 Frontend Bundle 提供，轻量 scaffold 技能调用原生 CLI；技能安装不复制资源。应用技能不携带 evals、测试用例或检查脚本，新工程与存量接入按 [工程准备](bootstrap.md) 分流。

## 保留的工程与产品边界

- Vue 3、TypeScript、ESM、pnpm、Tailwind 4、本地 shadcn-vue 与 Reka；存量工程只在授权范围迁移，不覆盖定制组件和未提交文件。
- VueUse 提供通用交互能力；需要异步状态时由 useRequest 负责；Orval/Axios 负责生成客户端与 transport。同一请求不叠加状态、缓存或重试所有者。
- 保留选定设计的关键视觉、布局和业务交互，以项目语义主题、组件和真实数据边界实现。工程检查、同条件视觉对比、关键交互三类证据成立后才报告相应范围已还原。
- 模拟运行不等于真实 API、鉴权或持久化联调；取消结果处理不等于中止网络或撤销服务端写入，未知结果不能盲目重试。
- 页面 schemas、hooks 与组件分别承担真实职责。表单渲染结构可按已选方案使用独立 JSON，其余定义按 [目录规范](project-structure.md) 组织。复杂表单、表格和全局状态能力按需使用。
- 上游 AUTO、全任务必读、`@latest`、强制表单库或嵌入 CLI 不覆盖当前仓库约定与用户授权。

最小 starter 首次整合时执行过冻结安装、lint、类型检查、构建和入口浏览器检查。当前任务的交付依据目标工程的实际结果。历史来源与版本观察见 [来源与适配](source-adaptation.md)。

## 工程与原型如何复用组件指导

设计与应用共用 `references/component-engineering.md` 的来源核对、设计适配和验证方法。设计技能可单独使用这个自包含参考。Frontend Profile 在此基础上分发 `shadcn-vue` 和 `vueuse-functions`，供组件工程和 Vue hooks 开发分别调用。MCP 按项目实际配置使用。
