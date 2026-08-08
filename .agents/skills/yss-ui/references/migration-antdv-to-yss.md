# AntDV 到 YSS Wrapper 迁移与 Demo 审计

## 迁移规则

1. 从 `component-routing.md` 判断目标是 required、fallback 或 specialized。
2. required 组件改用 YSS Wrapper，并运行对应 docs/demo 验证。
3. fallback 组件保留 AntDV 导入，记录无 Wrapper 或能力缺口。
4. 服务式 API 记录 App/ConfigProvider 上下文。
5. 未验证 Demo 标记 `pending-verification`，不得进入推荐索引。

## 2026-08-08 基线审计

基线发现 28 个 Demo 直接导入 `ant-design-vue`。

- 明确迁移：直接使用 AntDV `Button` 的 Cron、Card、Table Demo 改用 `YButton`。
- 合理 fallback：Input、Select、Checkbox、Radio、Collapse、Popover、Tooltip、Dropdown、Tag、Grid 等当前无独立通用 YSS Wrapper。
- 服务式 fallback：`message` 保留，但实现项目必须检查应用上下文。
- `RadioButton` / `RadioGroup` 不等同于独立 `Button`，不应被 Button 规则误判。

后续新增 Demo 若直接导入 YSS 已标记 required 的底层组件，模板验证必须失败。
