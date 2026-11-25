# 按场景启用的前端能力

需求确实涉及以下职责时才读取相关行和官方资料。先查已有实现与锁文件；引入一种能力不表示整套生态都要安装。不为每个页面加载所有技能或创建空目录。

| 触发场景 | 优先能力 | 工程边界 |
|---|---|---|
| 多页面、深链、导航守卫 | Vue Router；可用的 vue-router-best-practices | 刷新/参数变化/前进后退验证；导航隐藏不是后端授权 |
| 跨页面共享且需统一生命周期的状态 | Pinia；可用的 vue-pinia-best-practices | 明确所有者、退出/切租户清理；不复制请求数据成为第二来源 |
| 排序、选择、列显隐等多种表格行为 | TanStack Vue Table + 包内官方 skills | UI 使用 shadcn-vue/设计 tokens；列配置就近放 schemas，状态放 hook；服务端分页/筛选不能再对单页数据伪装全量处理 |
| 测得的大列表/行列渲染瓶颈 | TanStack Vue Virtual | 先明确数据量与瓶颈；验证稳定 key、动态测量、滚动、焦点和可访问性，不承诺自动具备表格键盘语义 |
| 简单表单、局部字段和提交 | 现有约定或 Vue 局部状态 | 复用 shadcn-vue 控件，按需处理校验、提交和错误反馈 |
| 动态字段、字段数组、Schema 驱动或复杂校验与提交 | 先复用工程表单栈。需选型时按需求评估 vee-validate、FormKit 等方案 | 由同一种机制管理表单值、校验与提交，字段组件沿用项目主题，依赖按任务采用 |
| 共享组件需要独立状态目录和反复 review | Storybook Vue + Vite | 复用原 tokens、组件和场景；不为少量一次性页面新增第二套应用平台 |
| 构建、测试配置或故障诊断 | Vite/Vitest 官方资料；可用的专题技能或 vue-debug-guides | 查实际版本/API后使用；不默认套入 antfu 全部个人偏好或 pnpm 12 配置 |

TanStack Table 官方 skills 随已安装包分发时，按实际包的 skills 入口读取，不额外安装 Intent CLI 才能工作；不假设不同大版本 API 一致。官网当前 Table 9 示例使用 useTable/tableFeatures，应用必须绑定实际选定版本。Table 不要求同时引入 Query/Form/Store 的全部生态。

工程已用或本次明确选定 FormKit 时，按技能名查阅 `formkit`，先核对 Vue 或 Nuxt、锁文件和配置。按已有数据结构选择 FormKit 的 `group`、`list` 或 Schema，界面沿用本地 shadcn-vue 组件和主题。工程若已用 vee-validate 等方案，先判断当前任务能否在原有栈完成。[FormKit Vue 文档](https://formkit.com/inputs/form.vue.md)

表单规则和网络 DTO 运行时验证不是同一层。只有确有复杂验证需求时才评估 Zod 或 Valibot 等一种方案；不能为了 TypeScript DTO 已生成就宣称输入可信，也不能因为目录叫 schemas 就安装运行时库。

TanStack Query 暂不默认引入：它会与现有 useRequest 职责重叠。将来确有跨组件服务端缓存等需求时，先设计替换与迁移边界，不能在同一请求上叠加管理器。

依据：[Vue Router](https://router.vuejs.org/guide/)、[Pinia](https://pinia.vuejs.org/core-concepts/)、[Table Vue](https://tanstack.com/table/latest/docs/framework/vue/quick-start)、[Table 官方技能](https://tanstack.com/table/latest/docs/agent-skills)、[Vue Virtual](https://tanstack.com/virtual/latest/docs/framework/vue/vue-virtual)、[VeeValidate](https://vee-validate.logaretm.com/v5/)、[Storybook Vue/Vite](https://storybook.js.org/docs/get-started/frameworks/vue3-vite)。可选工具未预装，其文档能力不是当前项目已验证的事实。
