# Design QA 项目主题对照

本文件给 Codex `$design-qa` 使用。官方 `design-qa` skill 仍负责截图对比流程和 `final result: passed|blocked`；本文件只提供项目视觉真相，不改上游插件正文。

## Source visual truth

- 规范：根 `DESIGN.md`
- 治理说明：`docs/design/design.md`
- Token 投影：`docs/design/tokens/theme.json`、`docs/design/tokens/tokens.default.json`、`docs/design/tokens/variables.css`
- 实现截图：当前原型或页面在同一 viewport / 主题 / 状态下的渲染

官方 `https://ant.design/design.md` 只是上游默认。项目覆盖与官方不同时，以根 `DESIGN.md` 为准；本清单不复制规范值。

## 必查 fidelity surface（项目覆盖）

### Colors and visual tokens

| 角色 | 必须对照 | 记为 P1 Token drift |
| --- | --- | --- |
| 品牌 seed | `colors.primary` | 使用上游默认或历史值覆盖根规范 |
| 主控件 default / hover / active / disabled | `components.button-primary*` | 用品牌 seed 代替高对比组件变体 |
| 功能状态 | `colors.success*` / `warning*` / `error*` / `info-bg` | 改成非功能色装饰 |
| 页面 / 容器 / 浮层 | `colors.canvas-layout` / `surface*` | 用阴影或局部硬编码堆叠表面层级 |
| 主次文本 | `colors.text*` | 使用历史文本值或页面特例 |
| 运行时变量 | `docs/design/tokens/variables.css` 必须与根规范 digest 同步 | 页面另写一套 Less/CSS 色值 |

上游预设色板不是品牌 seed，不要据此判定规范漂移。

### Fonts and typography

| 角色 | 必须对照 | 记为 P1 token drift |
| --- | --- | --- |
| 正文与标题 | `typography.*` | 使用未登记的营销字号或字体 |
| 控件高度 | `components.button-*` / `input-*` | 用 seed 或页面硬编码替代组件变体 |
| 字体栈 | `typography.*.fontFamily` | 强制未登记品牌字体 |
| 字重 | `typography.*.fontWeight` | 用额外重粗表达选中或激活 |

### Spacing and layout rhythm

| 角色 | 必须对照 | 记为 P1 token drift |
| --- | --- | --- |
| 圆角 | `rounded.*` 与组件变体 | 页面级 magic number 或历史品牌圆角 |
| 间距 | `spacing.*` 与组件变体 padding | 未登记的中间值撑开中后台密度 |
| 布局 | `components.page-shell` 与治理说明 | 未说明就改成营销式布局 |

### Image quality and copy

沿用官方 `design-qa` 规则。本主题不引入插画、logo 或营销文案；出现这类素材时按官方 rubric 记 finding，并同时记为偏离中后台定位。

## 判定

- 使用上游默认、历史品牌值或未登记字体/圆角覆盖根 `DESIGN.md`：P1。
- 只改局部组件、且 `prototype-evidence.yaml` 的 `theme_override` 已记录：按官方 severity 评估，不自动升 P1。
- 暗色模式：本轮未重派生完整暗色色板；暗色对照前若缺少新的 algorithm 派生证据，`final result: blocked`，写明 blocker。

## 报告要求

`design-qa.md` 必须写明：

- source visual truth path：根 `DESIGN.md`、治理说明与对应 Token 投影文件
- 已按本清单核对 Colors/tokens 与 Fonts/typography
- 与官方默认的差异是否被接受为项目覆盖
