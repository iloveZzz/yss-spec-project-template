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

完成后返回 YSS Skill Execution Result 所需 changed files、evidence files、actual verification、deferred seams、drift/new impacts。
