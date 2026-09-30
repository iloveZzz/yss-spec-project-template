# shadcn-vue 高保真作者路线实施记录

> 后续范围已更新：用户要求移除 React 作者库，当前交付与最终验证见 [Vue 统一交付](../2026-09-30-react-prototype-retirement/report.md)。本文保留该次迁移过程记录，旧 React 作者支持结论已被替代。

已新增 Vue 3 + shadcn-vue 作者路线，并将当前查询与详情、分步表单迁移为 Vue。两类各提供标准精修和轻玻璃，共四份离线包。旧 React 作者路线与四份原始包保留。入口：[可运行样例](index.html)。

## 交付变化

| 范围 | 结果 |
|---|---|
| 组件来源 | shadcn-vue 固定 revision `67c9a3926dc0a854507b325c6337ff2210d16379`，24 组、150 个原始文件，MIT 许可；未修改上游源码 |
| 作者工具 | `build-shadcn-vue-prototype.mjs`、`export-vue-patterns.mjs`；Vue SFC 在作者侧编译，config schema 1、H1/H2、compact/comfortable、原子落盘与非空拒绝保持 |
| 页面 | Vue 查询：真实 Select、Checkbox、菜单、分页、详情 Sheet；Vue 表单：Field、InputGroup、Textarea、Alert、错误定位、返回保留与失败重试 |
| 来源校验 | 新 `vue-shadcn-prebuilt`，浏览器 runtime 为 Vue；记录固定依赖、编译器、锁、主题、作者文件、组件模块与摘要。Evidence v4 / Visual Baseline v1 / 比较 v2 不变 |
| 规范与 Skill | 根 DESIGN 更新新原型优先路线；三个现有技能增加按需配方。颜色、字号、尺寸、圆角 Token CSS 与开工前字节一致；生产合同不变 |
| 兼容 | React 构建器保留；原生轻量路线、旧比较与历史 AntD 只读行为继续验证。审批、冲突、分析和完整状态展示仍为 React，未宣称已迁移 |
| 同步 | 设计、前端 profile 保留编排差异；锁、投影与三份 CLI 工作树快照更新；当前仍是 working-tree 来源，不能称固定提交发布包 |

官方 [Blocks](https://shadcn-vue.com/blocks) 用于任务组合参考。[Select](https://shadcn-vue.com/docs/components/select) 是本轮产品下拉的组件路线；[Data Table](https://shadcn-vue.com/docs/components/data-table) 属于高阶组合，本轮未引入表格引擎、图表或 Sidebar。上游事实、固定版本与采用边界保存在 [来源记录](evidence/upstream-source.json)。

## 已执行工程检查

| 检查 | 结果与证据 |
|---|---|
| Vue 来源与构建闭包 | 24 组全部实际编译；精确版本、来源、许可与导入闭包检查通过 |
| 多文件与安全边界 | SFC、TS、JSON、CSS、图片、scoped CSS、只复制引用资源；缺失依赖、越界、符号链接、远程依赖、未登记组件拒绝；摘要漂移、非空拒绝和失败清理通过 |
| 现有单元与兼容测试 | `node --test .../tests/*.test.mjs` 共 18 项通过、0 跳过（Vue 与 React 锁定工具链均注入），见 [原始日志](evidence/prototype-tests.log)；日志中的负向报错是预期拒绝 |
| H1/H2 与历史证据 | 原型合同场景脚本通过；Vue H1 无配置 starter 和 H2 config 包通过，旧 React 四包保持原封存摘要；见 [包核验](evidence/final-packages.json) |
| 浏览器任务 | Chromium、WebKit × 1440×900 / 390×844 × 四页面；筛选、跨页选择、菜单、详情与焦点返回、表单错误和失败重试、重复重置、非法场景、离线独立复制、console 均通过，18 组，见 [浏览器记录](evidence/browser.json) |
| 下拉控件 | 两引擎、两视口、两外观的真实 Select、Arrow/Enter/Escape、选择反馈、页码重置、焦点返回、弹层边界及减少透明，8 组通过，见 [Select 记录](evidence/select-vue.json) |
| 全部已有场景 | 两页面所有场景、只读/空态/固定加载、系统减少透明和入口资源检查，16 组通过，见 [场景记录](evidence/states.json) |
| 缩放和对比度 | 隔离 Chromium 扩展调用真实 tabs.setZoom/getZoom=2，4 页面关键操作通过；16 个计算样式文本样本含黑白背景合成，最低 5.571:1，见 [视觉工程记录](evidence/visual-checks.json)。此抽样不等同于完整 WCAG 认证 |
| Vue 错误与浮层 | Select/Menu/Sheet 打开时切换场景清除 Teleport；Vue errorHandler 故障注入后不得发 ready；comfortable 两视口当前普通控件 Token，4 组通过，见 [Vue runtime](evidence/vue-runtime.json) |
| profile 与 CLI | 两 profile 一致性零差异、来源 hash 与技能治理通过；三 CLI 抽查构建器、Select 源码、registry、查询页面实际字节，共 12 项通过，见 [分发字节](evidence/cli-artifact-bytes.json) |

上述 50 组浏览器检查按目的统计，存在场景重叠，不宣称 50 个独立业务流程。场景初始化确认只证明初始化，行为断言另行执行。减少动效验证了实际计算样式。

## 同条件查看

查询桌面：[旧 React](../2026-09-30-prototype-glass-study/screenshots/select-glass-1440.png) / [新 Vue](screenshots/select-glass-1440.png)。表单窄屏：[旧 React](../2026-09-30-prototype-glass-study/screenshots/chromium-multi-step-glass-390.png) / [新 Vue](screenshots/chromium-multi-step-glass-390.png)。二者保持内容、场景、视口及 Token，框架迁移不重新定义业务规则。

视觉收益待当前用户确认；本轮没有启动 Agent 效果试点，不据工程通过推断设计提升或效率比例。

## 总体验证

首次 `verify-template-fast --concurrency 1` 因工作树已有验证框架改动升级到 release。102 条记录中 2 条命令失败，5 条后续检查未执行；另记录 input_drift=true，不能作为最终 Fresh Verification。新增失败是插件把 Vue 作者资产当 Node 脚本入口；现已修复为保留资产原字节、仅把作者构建 CLI 纳入 Node 模块闭包，7 项插件回归通过，见 [兼容修复](evidence/plugin-regression.log)。未安装或发布插件。

现存 `scripts/verify-strategic-handoff-tools-lock --require-committed` 仍要求已提交来源，而当前来源锁为 working-tree。没有擅自提交或改写为 committed，本轮不声明 implementation-ready 或可发布。解除条件是另获 Git 授权后固定正确来源、刷新锁及快照并重新完成当前适用验证。

最终复验在冻结源码和证据后执行，输出全部放在仓库外，避免自写日志导致输入漂移。实际终态、逐项失败与未执行记录见 [最终验证报告](/tmp/yss-vue-authoring-final-verification-20260930/report.json) 和 [终态摘要](/tmp/yss-vue-authoring-final-summary.json)；它们是本轮结论依据。首次报告只保留返工记录 [attempt 1](evidence/verification-attempt-1.json)。
