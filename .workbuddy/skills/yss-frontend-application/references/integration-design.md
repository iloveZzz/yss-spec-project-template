# 前端技能整合与分发边界

本页记录从 SCRM 前端技能适配到 YSS 共享技能库的取舍。三个前端技能的主源均位于根 `.agents/skills`；Frontend 按白名单默认分发，Spec 按需使用，Backend 不分发。仅在维护或追溯时读取；不是普通页面任务的固定流程。

## 职责

| 能力 | 本版本职责 | 边界 |
|---|---|---|
| yss-frontend-application | 将选定规格、高保真设计、原型和 OpenAPI 接入 Vue 3 工程 | 只读 review 不转实现；开发授权不包含提交、推送或部署 |
| vue-best-practices | Vue 响应性、组件数据流、生命周期与职责拆分 | 按受影响逻辑读取参考，纯文案/样式不触发 |
| create-adaptable-composable | 确有需要的响应式/普通输入接口 | Vue 3.3+；不为简单局部状态新增抽象 |
| yss-design-system 等可用协作技能 | 产品设计、交互说明及事实核对 | 按需发现；缺少辅助技能不自动安装或中断已能完成的工作 |

本版本保留 SKILL、references、agents 与必要示例：前端交接模板、OpenAPI 配置/transport、精确版本的 vue-hooks-plus 补丁。它不分发应用 starter、evals、测试用例或检查脚本，也不依赖未分发的脚手架技能。初始化沿用目标工程方法，必要时按 [工程准备](bootstrap.md) 核对官方初始化工具。

## 保留的工程与产品边界

- Vue 3、TypeScript、ESM、pnpm、Tailwind 4、本地 shadcn-vue 与 Reka；存量工程只在授权范围迁移，不覆盖定制组件和未提交文件。
- VueUse 提供通用交互能力；需要异步状态时由 useRequest 负责；Orval/Axios 负责生成客户端与 transport。同一请求不叠加状态、缓存或重试所有者。
- 按现有设计保留主题、布局、数据与交互；工程检查、同条件视觉对比、关键交互三类证据成立后才报告相应范围已还原。
- 模拟运行不等于真实 API、鉴权或持久化联调；取消结果处理不等于中止网络或撤销服务端写入，未知结果不能盲目重试。
- 页面普通 TypeScript schemas、hooks 与组件分别承担真实职责；复杂表单、表格和全局状态能力按需使用，不强制全量安装。
- 上游 AUTO、全任务必读、`@latest`、强制表单库或嵌入 CLI 不覆盖当前仓库约定与用户授权。

本轮维护只核对导入范围、文档引用与副本一致性，未运行应用、接口生成或浏览器验证。历史来源与版本观察见 [来源与适配](source-adaptation.md)，不能据此声明当前目标工程已验证。
