# shadcn 原型路线维护自检

用户明确选择原版 shadcn/ui，允许原型使用 React。此次属于 L3 generation-semantics / aggregate-behavior-change；仅调整原型作者路线与相应模板、验证及分发。生产 Vue/YSS 技术栈、根 DESIGN.md、Prototype Evidence v4、Visual Baseline v1 保持原合同。模板源无产品生命周期资产，Context reconciliation 记 not-applicable：未新增业务术语或产品需求。

- 基线：编辑前登记根与五个关联子模块的 HEAD、未提交改动，备份相关源文件；`preservation.json` 验证已捕获的范围外根文件无变化。以前的 12 次 Agent 试点、研究及批准证据未改写。
- 组件：采用官方 shadcn/ui 固定 revision 的七个源码组件，文件摘要、MIT 许可、精确依赖及 pnpm 锁可追溯。源码未套用生产 YSS API。`theme.css` 映射已有 Token；真实浏览器检查控件高度 32px、主色、输入背景与文本颜色。
- 边界：高保真主要路线支持 H1/H2，轻量原生路线保留；接收方无需工具链。React AntD 的构建器、采集器、目录及作者模板已移除；既有测试文件名保留为兼容入口，内容改为检查退役边界并执行 shadcn 来源测试。通用验证配置最终无修改，检查没有被跳过。
- 离线：相对资源与普通 script、IIFE；不依赖服务器、CDN、localStorage 或跨页面 DOM。对已编译依赖的静态检查有边界，以断网 `file://` 浏览器证据补充。新 workbench 支持固定场景、非法 hash 报错、恢复输入、重置、焦点返回和弹窗 Tab 约束。
- 兼容：旧 AntD 真实产物当前校验与封存被拒绝，显式 `allowLegacy` 只读校验通过。新 shadcn 进入原有比较工具后同场景切换、输入重置和深链接通过。三份 CLI 产物均实际生成并验证 shadcn 原型；spec 最小安装需先执行 `assets ensure stage.product-design --apply`。
- 工程失败记录：首次构建修复 JSX 闭合、路径规范化与缺失许可证文本；npm 的 react-remove-scroll-bar 2.3.8 未携带许可且 gitHead 无法定位，从同一官方仓库固定 revision 获取 MIT 文本并登记来源限制。最初更名测试入口导致验证策略自动升级 release，保留失败报告；最终复用兼容测试入口且还原通用验证配置。独立验证目录首次缺 create-yss-spec 生成快照，已补齐。没有提交以满足 release 检查。
- 质量结论：这些证据验证生成、交互、迁移保护和分发，不证明 shadcn 普遍提升视觉质量或节省 Token；未增加 Agent 试点次数。视觉收益仍待用户评审。

最终 fresh fast：17 项通过，238972 ms，input_drift=false；最终范围文件与独立验证目录逐项摘要一致。迁移的未定制 design/spec fixture 成功清理旧入口并获得新构建器；刻意仅修改 canonical、造成投影漂移的 fixture 被阻断并回滚，用户修改保留，不自动修复此类冲突。详见 migration*.json。
