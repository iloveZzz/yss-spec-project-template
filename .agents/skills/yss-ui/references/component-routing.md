# YSS UI 组件路由表

本文件是 YSS Wrapper 与 Ant Design Vue / VXE 组件选型的权威映射。`required` 表示生产页面必须优先使用 YSS；`fallback` 表示当前无独立 YSS 封装，可直接使用项目安装版本的 AntDV；`specialized` 表示必须加载专项 skill。

| 场景 | YSS 组件 | 底层能力 | 策略 | 关键差异 / 路由 |
|---|---|---|---|---|
| 普通按钮、权限按钮 | `YButton` | AntDV Button | required | 权限、主题和统一动作语义；不得直接导入 Button |
| 卡片 | `YCard` | AntDV Card | required | YSS 布局与间距扩展 |
| 数据表格 | `YTable` | VXE Table + AntDV Pagination | specialized | 使用 `ytable-usage`；远程分页交给 `page-list-module`，高度交给 `yss-use-table-height` |
| 编辑表格 | `YEditTable` | VXE Table | specialized | 使用 `yedit-table-usage`，不要把编辑与普通展示表格混为一套 API |
| 树 | `YTree` | AntDV Tree | specialized | 使用 `ytree-usage`；高度交给 `yss-use-tree-height` |
| Schema 表单 | `YFormily` | Formily + AntDV | specialized | `YFormily` 为 canonical；`YssFormily` 仅为历史兼容名；加载 `yss-formily` |
| 分栏布局 | `YSplitPane` | YSS layout | required | 页面骨架使用 `page-skeleton`；组件边界见 `specialized-components.md` |
| 文件导入 | `YFileImport` | Upload/业务适配 | required | 两步导入边界见 `specialized-components.md` |
| 条件构建 | `YConditionBuilder` | YSS domain component | required | 标准模型与校验边界见 `specialized-components.md` |
| 月历 | `YMonthCalendar` | YSS domain component | required | 日期、月份、高度与事件边界见 `specialized-components.md` |
| Cron | `YCron` | YSS domain component | required | 七段表达式边界见 `specialized-components.md` |
| 图表 | `YssEcharts` | ECharts | required | 主题、更新和尺寸边界见 `specialized-components.md` |
| 编辑器 | `YMonaco` / `YMonacoDiff` | Monaco | required | 按需加载和尺寸治理见 `specialized-components.md` |
| Sheet | `YSheet` | Univer | required | Facade、释放和依赖边界见 `specialized-components.md` |
| 输入、选择、日期 | 无独立通用 Wrapper | AntDV Input/Select/DatePicker 等 | fallback | 读取实际 AntDV 版本；服从 theme/locale/popup 规则 |
| 浮层反馈 | 无统一 Wrapper | Modal/Drawer/Popover/Tooltip/Alert | fallback | 服从容器、焦点、销毁、z-index 规则 |
| 服务式反馈 | 无统一 Wrapper | message/notification | fallback | 检查 App/ConfigProvider 上下文 |
| 布局与导航 | 按项目现状 | AntDV Layout/Grid/Menu/Tabs 等 | fallback | 不复制 React Ant Design v6 API |

## 受控回退

YSS `required` wrapper 缺少必要能力时，记录组件、能力缺口、依赖版本、替代方案、主题/locale/浮层影响和验证证据。没有记录不得回退。

## 更新规则

新增或变更 YSS Wrapper 时同步：本表、组件 docs、至少一个已验证 demo、三个索引、兼容矩阵和验证脚本。
