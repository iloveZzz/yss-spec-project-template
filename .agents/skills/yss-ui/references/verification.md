# YSS UI 分层验证

按影响面执行，未命中项记录 `not-applicable` 及原因。

```text
格式化
→ lint
→ type-check
→ 组件测试
→ 关键交互测试
→ 响应式检查
→ 主题、locale、popup 检查
→ 必要的 E2E / 视觉回归
```

优先使用前端工程已有 `pnpm` scripts，不自行发明命令。Fresh verification 记录命令、退出码、环境、证据文件和未覆盖风险。

最低人工检查：加载/空态/错误/权限、键盘和焦点、危险操作确认、窄屏布局、暗色/紧凑模式、浏览器 console warning。

生产 UI 行为发生变化时，两条路径均须在实际浏览器核验本轮适用状态与交互，记录当前候选的截图及 console 结果；类型检查或样例图不能替代实际浏览器证据。

交付路径沿用 `yss-ui` 消费的当前生命周期 `route`。`daily` 将 changed files、evidence files、actual verification、deferred seams、drift/new impacts 和独立审查记回同一 Ticket / PR，不另建正式执行结果或前端计划；`governed` 返回 YSS Skill Execution Result，并绑定当前 Slice 的实现计划和实现还原验证。两者均保留本轮实际适用 UI 检查、真实命令及退出码，必要证据缺失仍阻断交付。
