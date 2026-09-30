# React 原型库退役与 Vue 统一交付

已按用户最新要求移除当前 React 作者库、组件源码与构建入口。新高保真统一 shadcn-vue + Vue 3，原生 HTML 仍为轻量路线。五类页面模式与 24 组组件展示均已使用 Vue；旧批准资产不改写，仅显式 legacy 只读兼容。

[打开当前 Vue 样例](index.html) · [六页完整模式](patterns/index.html) · [查询外观对照](comparisons/list-detail/index.html) · [表单外观对照](comparisons/multi-step/index.html)

## 实施结果

- 删除 `assets/shadcn-authoring/`、React `assets/business-patterns/` 和 `build-shadcn-prototype.mjs`，不再分发 React / react-dom / radix-ui / lucide-react 作者依赖。旧源码仅存在于历史证据和本轮变更前备份，不属于有效 Skill 或新 CLI 快照。
- 保留 Vue 固定 revision `67c9a3926dc0a854507b325c6337ff2210d16379`，24 组、150 个原始文件，MIT；本轮不升级依赖或修改上游组件。
- 查询、表单、审批、冲突恢复、分析、组件状态展示均由 Vue 构建。`export-business-patterns.mjs` 保留框架中立命令名，代理到 Vue 导出器。现有配置 schema、原子落盘、非空拒绝、H1/H2 不变。
- 保留示例原有状态与规则，包括跨页选择、返回保留、首次失败与重试、部分失败、放弃确认、服务端完整替换及再次保存。组件选择不新增业务行为。
- 新增 React 当前校验拒绝和封存拒绝；历史包 `validate-project --allow-legacy` 仍核验原摘要。Evidence v4、Visual Baseline v1、比较 v2 不改 schema。
- Vue Button 默认不输出 data-variant，原主题因此未覆盖 hover/active。已在本地映射层匹配实际 DOM，使用 DESIGN 对应 Token；原始失败与修复验证分别保留。Token CSS 与开工字节相同。
- 两 profile 通过三方增量同步，保留目标独有编排文本，锁、投影与三 CLI 工作树快照更新。CAS 校验拒绝未登记覆盖；根专属教学文档未硬塞入不含该文档的 profile。

## 已执行检查

| 检查 | 结果 / 证据 |
|---|---|
| Vue 来源、闭包、多文件与拒绝边界 | 24 组实际编译；原型单元 14 项通过、0 跳过（含注册入口重复载入），[日志](evidence/unit.log) |
| 原型合同与兼容 | 合同场景和既有比较测试通过，[日志](evidence/contract.log) |
| 当前离线包 | 六模式、四外观包均校验当前 DESIGN/Token；两比较包摘要通过，[记录](evidence/current-packages.json) |
| 五模式、全状态、低保真兼容 | Chromium / WebKit，1440×900 / 390×844，104 条分项记录通过，[记录](evidence/patterns.json) |
| 组件交互与无障碍 | 六组检查通过：字段关联、菜单、Select、禁用项、Sheet/Dialog 焦点返回、Tooltip 可见内容与描述关联、重复重置及跨页选择，[记录](evidence/components.json) |
| 紧凑与舒适主题 | 13 组计算样式检查通过，包括控件高度、正文、内边距、hover/active、错误和焦点，[记录](evidence/compact.json) |
| 实际浏览器 200% 缩放 | 六个 Vue 页面关键操作通过，使用 tabs.setZoom/getZoom，[记录](evidence/zoom.json) |
| 原生与 Vue 编辑恢复 | 两引擎各四条桌面/窄屏工作台记录和 H1 离线校验通过，[Chromium](evidence/workbench-chromium.json) / [WebKit](evidence/workbench-webkit.json) |
| 查询与表单外观回归 | 18 组主浏览器、8 组 Select、16 组场景、4 组视觉、4 组 Vue runtime 检查通过；分别见 evidence/browser.json、select-vue.json、states.json、visual-checks.json、vue-runtime.json |
| 历史 React | 四份原包正常路径及重新封存被拒绝，显式 legacy 只读仍通过，[记录](evidence/legacy.json) |
| 同步分发 | 两 profile 零差异；三 CLI 18 项实际字节一致，9 项 React 退役路径不存在，[记录](evidence/cli-artifacts.json) |

这些是按检查目的统计的记录，存在场景重叠；不宣称同等数量的独立业务流程或完整 WCAG 认证。维护者目视查看了当前窄屏恢复页面与查询下拉截图，视觉收益仍待用户确认。轻玻璃仍为局部可选研究外观，未改成正式默认。

Reka Tooltip 将被描述文字放在 aria-describedby 引用节点，可见浮层使用 data-slot；验证改为真实 Tab 导航、可见浮层、描述关联与 Escape，不以查不到默认 role 结果判定功能失效。示例不依赖 Tooltip 提供关键操作说明。

## 最终状态与边界

本轮 scoped 工程检查已闭合，已冻结源码与证据。`verify-template-fast --concurrency 1` 的最终输出全部置于仓库外，避免自写日志产生输入漂移。当前适用验证的实际状态、失败与未执行项，以 [最终报告](/tmp/yss-react-retirement-verification-20260930/report.json) 和 [终态摘要](/tmp/yss-react-retirement-final-summary.json) 为准。

既有全仓工作树包含验证框架改动，fast 可能升级 release；当前来源锁为 working-tree，已知 committed 门禁需另获 Git 授权后固定来源与重新验证，不能通过改写 source_state 绕过。在该门禁未闭合前不声明 implementation-ready、可合并或可发布。没有提交、推送、发布、插件安装或新增真实 Agent 试点。
