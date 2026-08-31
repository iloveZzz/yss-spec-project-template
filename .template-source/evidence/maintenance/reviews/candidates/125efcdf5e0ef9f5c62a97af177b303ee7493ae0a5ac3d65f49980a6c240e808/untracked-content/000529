# Design QA 项目主题对照

本文件给 Codex `$design-qa` 使用。官方 `design-qa` skill 仍负责截图对比流程和 `final result: passed|blocked`；本文件只提供项目视觉真相，不改上游插件正文。

## Source visual truth

- 规范：`docs/design/design.md`
- Token：`docs/design/tokens/theme.json`、`docs/design/tokens/tokens.default.json`、`docs/design/tokens/variables.css`
- 实现截图：当前原型或页面在同一 viewport / 主题 / 状态下的渲染

官方 `https://ant.design/design.md` 只是上游默认。项目覆盖与官方不同时，以项目覆盖为准。

## 必查 fidelity surface（项目覆盖）

### Colors and visual tokens

| 角色 | 必须对照 | 记为 P1 token drift |
| --- | --- | --- |
| 主色 | `#3371ff` | `#1677ff` 或 `#3177ff` 当默认主色 |
| 主色 hover / active | `#4096ff` / `#0958d9` | 用算法重算替代 `:root` 显式值且未记录 |
| 错误色 | `#f5222d` | 官方 `#ff4d4f` 当默认错误色 |
| 成功 / 警告 | `#52c41a` / `#faad14` | 改成非功能色装饰 |
| 页面背景 | `#f0f2f5` | `#f5f5f5` 或其它灰底当默认 layout |
| 容器 / 浮层 | `#ffffff` | 用卡片阴影堆叠替代表面层级 |
| 主文本 / 次文本 | `rgba(0, 0, 0, 0.88)` / `rgba(0, 0, 0, 0.65)` | `#2e2e2e` / `#646464` 当默认文本 |
| 边框 / 分割线 | `#d9d9d9` / `#f0f0f0` | `#dbdbdb` / `#f1f1f1` 当默认边框 |
| 运行时变量 | `--primary-color` 指向 `--brand-color-primary` | 页面另写一套 Less 色值 |

`blue` 预设色板里的 `#1677ff` 不是品牌主色，不要据此判定主色漂移。

### Fonts and typography

| 角色 | 必须对照 | 记为 P1 token drift |
| --- | --- | --- |
| 默认正文字号 | 14px | 16px 营销字号当正文 |
| 默认控件高度 | 32px | 明显偏离 32px 且未走 compact algorithm |
| 字体栈 | 系统栈（`-apple-system, BlinkMacSystemFont, "Segoe UI", ...`） | 强制 `Inter` 或其它未登记品牌字体 |
| 字重 | 400 / 600 | 用 700+ 表达选中或激活 |

### Spacing and layout rhythm

| 角色 | 必须对照 | 记为 P1 token drift |
| --- | --- | --- |
| 圆角 | 小控件 4px、默认 6px、容器 8px | 历史品牌 8px / 10px，或 Less 前半 4px 当全局默认 |
| 间距网格 | 4 / 8 / 12 / 16 / 20 / 24 / 32 / 48 | 任意 magic number 撑开中后台密度 |
| 顶栏 / 侧栏 | 顶栏 64px，深色侧栏 `#001529` | 未说明就改成营销式顶栏 |

### Image quality and copy

沿用官方 `design-qa` 规则。本主题不引入插画、logo 或营销文案；出现这类素材时按官方 rubric 记 finding，并同时记为偏离中后台定位。

## 判定

- 仍用官方 `#1677ff`、强制 `Inter` 或 8px 品牌圆角作为默认主题：P1。
- 只改局部组件、且 `prototype-evidence.yaml` 的 `theme_override` 已记录：按官方 severity 评估，不自动升 P1。
- 暗色模式：本轮未重派生完整暗色色板；暗色对照前若缺少新的 algorithm 派生证据，`final result: blocked`，写明 blocker。

## 报告要求

`design-qa.md` 必须写明：

- source visual truth path：`docs/design/design.md` 与对应 token 文件
- 已按本清单核对 Colors/tokens 与 Fonts/typography
- 与官方默认的差异是否被接受为项目覆盖
