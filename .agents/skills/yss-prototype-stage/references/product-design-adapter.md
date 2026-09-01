# YSS Product Design Adapter

本合同把 Codex Product Design 的通用 React/Vite 产出接入 YSS 原型阶段。它不修改上游 Product Design skill，也不把 React API 带入 Vue 生产实现。

## 双轨版本

- `design_standard: ant-design-v6`：高保真原型的主题、视觉语义、标准组件和 CLI 事实。
- `runtime_component_library: ant-design-vue-4.x`：生产 Vue/YSS 组件 API；精确版本只从实现仓 lockfile 读取。
- 标准原型组件存在 Ant Design 实现时，React 原型必须精确锁定与 CLI 查询一致的 `antd@6.x`。YSS 专有布局可用适配 CSS，但仍消费项目 Token。
- 禁止把 React hook、props、JSX、静态 API 或事件模型作为 Vue/YSS 实现合同。

## 产出前适配

1. 目标目录固定为 `docs/.scratch/<feature>/design/prototypes/`。
2. Product Design 完成 `get-context`、三方案 `ideate` 和用户视觉选择后，进入 `image-to-code` 的 local preflight，只执行官方 bootstrap 创建空 starter；在安装依赖或编写 UI 前立即运行 adapter：

   ```bash
   node .agents/skills/yss-prototype-stage/scripts/prototype-contract.mjs prepare \
     --project-root <project-root> \
     --root <project-root>/docs/.scratch/<feature>/design/prototypes \
     --feature <feature> \
     --target-antd-version <exact-6.x-version> \
     --pnpm-version <actual-pnpm-version>
   ```

3. adapter 只做机械动作：精确写入 `antd` 版本、登记 pnpm、生成 `src/yss-theme.js` 和 `yss-prototype-adapter.json`。随后由 Product Design 将入口包在 `ConfigProvider theme={yssTheme}` 中，并优先使用标准 `antd` 组件。
4. 执行 `pnpm install`、`pnpm build`，保留 `pnpm-lock.yaml`、源码入口、构建入口、实际命令与退出码。禁止用 npm lockfile 代替受控例外记录。
5. 校验项目：

   ```bash
   node .agents/skills/yss-prototype-stage/scripts/prototype-contract.mjs validate-project \
     --root <project-root>/docs/.scratch/<feature>/design/prototypes \
     --target-antd-version <exact-6.x-version>
   ```

## 视觉与实现映射

每个关键组件在 `visual_semantic_mapping` 中记录四层映射：Ant Design v6 semantic role、项目 Token、React 原型组件、生产 YSS/Ant Design Vue 目标。映射的是视觉角色、状态和验收行为，不是 React API 表面形状。

至少覆盖主操作、表单输入、表格/列表、反馈、弹层和导航中本功能实际出现的类型。每项记录 `default/hover/active/disabled/loading/error` 等适用状态，并把 `react_only_api_not_copied` 设为 `true` 后才能通过。

## 视口、QA 与无障碍

- 默认视觉目标和同状态 QA 使用 desktop `1440x900`、mobile `390x844`；按影响追加 tablet/laptop/wide，不机械要求九个视口。
- Design QA 报告固定到 `docs/.scratch/<feature>/verification/design-qa.md`，不得写仓库根共享文件。
- 项目品牌 Seed `#3371ff` 保持不变；普通文本、按钮及状态组合不满足 WCAG 2.2 AA 时，通过组件 Token 调整实际填充或文字色，并保存对比度证据。
- 验证至少包含键盘、焦点、语义标签/Dialog、200% zoom、reduced motion、目标尺寸和自动化扫描；工具不可用时记录人工替代与未覆盖缺口，不得空填 passed。

## 交互档位

- `reviewable-flow`（默认）：合同内主路径和关键状态可操作；非范围控件禁用或明确标注，不伪装完整功能。
- `full-prototype`：brief 明确要求的全部可见范围控件可操作。

不得使用含义冲突的 `static` / `mostly-static` 作为 YSS 交付状态。
