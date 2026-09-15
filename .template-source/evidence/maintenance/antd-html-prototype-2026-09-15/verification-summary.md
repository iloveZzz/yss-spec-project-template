# HTML / AntD 原型技能维护验证

本轮已达到本地 `implementation-ready`。仍为 WORKTREE，未提交、推送或发布。研究、示例截图和测试是模板维护证据，不代替具体产品的评审与用户确认。

## 最终方案

- 根 `DESIGN.md` 为视觉事实源；低保真、状态矩阵、独立评审和 H1/H2 深度划分继续保留。
- 默认原生 HTML/CSS/JavaScript 离线包。简化控件会改变关键评审结论时，可记录理由选择 `react-antd-prebuilt`；作者侧使用固定依赖，接收者无需 Node，浏览器仍运行打包后的 React。
- 提供 73 项基础目录、6 项外部组件入口，默认按需采集 23 类常用组件。版本请求、实际 CLI 快照和缺失条目明确区分。
- 提供查询列表、详情、编辑、失败重试、权限和冲突恢复示例；统一项目 Token、离线检查、来源摘要、场景重置与六轴 QA。
- `yss-antd-design`、`yss-antdv-next-design` 已从当前技能、注册表、公开导出、锁和生成投影退役；历史证据保留。

## 实际验证

- [浏览器结果](workbench-result.json)：原生和真实 AntD 两条路线，在 Chrome 153.0.8010.37、DPR 1、1440×900 / 390×844、独立复制目录、`file://`、offline=true 下通过。覆盖主流程/异常、实际控件尺寸和颜色、Select/日期面板、键盘退出；测试拒绝 console warning/error、页面异常、失败资源和 HTTP 请求。
- [编辑器结果](editor-result.json)：默认编辑器 starter 同样通过两种视口的离线检查。
- 构建来源损坏、源码漂移、适配器类型不匹配和已占用输出目录均有拒绝验证；CLI 元数据测试覆盖精确版本、同 minor 非精确快照、缺失 minor、缺失组件和索引漂移。
- 根/设计/前端工具测试分别 64/33/33 项通过。设计、前端、后端薄 CLI 均通过 `verify-bundle` 与 `pnpm test`；`create-yss-spec` 的 `pnpm test:prepared` 183 项通过。
- 收尾仅修正旧路线说明；设计/前端快照随后重新同步并校验，`create-yss-spec` 重新同步并单独复验初始化和快照测试，43 项通过。对应记录为 `*-bundle-final.log` 与 `spec-doc-sync.log`。
- 维护者复查截图时发现并修正原生按钮实际高度与 AntD 明暗变量混用；回归已加入真实渲染值断言。原型与共享规范同步无漂移。恢复前备份中的后端/API 直接改动保持原字节，共享锁、配置和编译器适配补丁仅做本轮必要同步。

## 发布边界

[完整命令组结果](template-verification.json)：根、设计、前端分别 81/44/45 项通过，均仅 `verify-strategic-handoff-tools-lock --require-committed` 因 `working-tree` 来源返回 1。因此不能称完整 release 已通过；该运行器未进入成功后的语法和只读检查。本轮另行完成相关脚本语法检查、Git whitespace 检查、技能治理、投影、锁与跨模板同步检查。

[维护检查点](../antd-html-prototype-l3-checkpoint-2026-09-15.json) 记录 L3 自检和当前验证。正式发布需要用户授权 Git 交付后重新锁定固定来源、重建快照并运行完整发布检查。本轮没有新增审批门禁或以测试替代真实批准。
