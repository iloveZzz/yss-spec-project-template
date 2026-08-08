# YSS UI 技能治理验证记录

## 范围

本轮把 `yss-ui` 从组件与 Hook 细则合集调整为统一路由与交付门禁，补充 YSS Wrapper / Ant Design Vue 组件映射、版本兼容、主题与浮层、可访问性、验证和迁移治理。

## RED 基线

2026-08-08 修改前检查得到：

- `yss-ui` 与 `yss-components` 多处引用不存在的 `yss-hooks`，实际 skill 为 `yss-hook`。
- 缺少 `component-routing.md`、`antdv-compatibility.md`、`theme-locale-overlay.md`、`accessibility.md`、`verification.md` 和 `migration-antdv-to-yss.md`。
- 28 个 Demo 直接导入 `ant-design-vue`；其中 Cron、Card、Table 的 4 个 Demo 明确直接使用了已有 `YButton` 封装的底层 Button。
- `quick-recipes.md` 与索引混用 `YFormily` / `YssFormily`，缺少 canonical name。

## GREEN 修订

- `yss-ui/SKILL.md` 收敛为版本预检、组件路由、专项 skill 路由、横切门禁和交付验证入口。
- 新增六个治理参考，明确项目实际版本优先、Ant Design v6 原型与 Ant Design Vue 4.x 生产边界。
- `YssFormily` 作为新代码 canonical name，`YFormily` 只允许作为已确认导出的兼容别名。
- 修正 `yss-components` 的 Hook skill 路由。
- 明确 `YButton` Demo 迁移；其余 AntDV 导入按 fallback、服务式 API 或待验证分类。
- 新增 `scripts/verify-yss-ui-scenarios` 并接入 `scripts/verify-template`。

## REFACTOR 与 Fresh Verification

完成技能投影和 lock 更新后执行：

```bash
scripts/verify-yss-ui-scenarios
scripts/sync-skills --check
scripts/update-skill-lock --check
scripts/verify-template
git diff --check
```

最终结果、独立审查结论和受控例外在本轮完成后补充。

### 当前验证结果

- `scripts/verify-yss-ui-scenarios`：通过。
- `scripts/sync-skills --check`：通过。
- `scripts/update-skill-lock --check`：通过。
- `scripts/verify-template`：通过。
- 独立审查：环境阻塞。两次只读 Reviewer 调度分别因外部服务 `403 Forbidden: insufficient balance` 和无返回而终止；未产生审查结论、未修改工作区。必须由独立 Agent 或人工完成审查后，才能声称模板可发布。
