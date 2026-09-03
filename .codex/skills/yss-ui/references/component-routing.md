# YSS UI 组件路由表

本文件是 YSS Wrapper 与 Ant Design Vue / VXE 组件选型的权威映射。`required` 表示生产页面必须优先使用 YSS；`fallback` 表示当前无独立 YSS 封装，可直接使用项目安装版本的 AntDV；`specialized` 表示必须加载专项 skill。

| 场景 | YSS 组件 | 底层能力 | 策略 | 关键差异 / 路由 |
|---|---|---|---|---|
| 普通按钮、权限按钮 | `YButton` | AntDV Button | required | 权限、主题和统一动作语义；不得直接导入 Button |
| 卡片 | `YCard` | AntDV Card | required | YSS 布局与间距扩展 |
| 数据表格 | `YTable` | VXE Table + AntDV Pagination | specialized | 使用 `yss-components`、`field/type`、字段插槽 |
| 编辑表格 | `YEditTable` | VXE Table | specialized | 对照 edit-table docs/demo |
| 树 | `YTree` | AntDV Tree | specialized | 搜索、Tooltip、动作和高度路由 |
| Schema 表单 | `YFormily` | Formily + AntDV | specialized | `YFormily` 为 canonical；`YssFormily` 仅为历史兼容名；加载 `yss-formily` |
| 分栏布局 | `YSplitPane` | YSS layout | required | 统一主从页面与容器高度 |
| 文件导入 | `YFileImport` | Upload/业务适配 | required | 使用 YSS 上传结果和表单适配 |
| 条件构建 | `YConditionBuilder` | YSS domain component | required | 使用对应 docs/demo |
| Cron | `YCron` | YSS domain component | required | 底层 Popover 可 fallback |
| 图表 | `YEcharts` | ECharts | required | 主题、resize、darkMode 使用 YSS API |
| 编辑器 | `YMonaco` | Monaco | required | 按需加载和尺寸治理 |
| Sheet | `YSheet` | Univer | required | locale 与资源包按 YSS 文档 |
| 输入、选择、日期 | 无独立通用 Wrapper | AntDV Input/Select/DatePicker 等 | fallback | 读取实际 AntDV 版本；服从 theme/locale/popup 规则 |
| 浮层反馈 | 无统一 Wrapper | Modal/Drawer/Popover/Tooltip/Alert | fallback | 服从容器、焦点、销毁、z-index 规则 |
| 服务式反馈 | 无统一 Wrapper | message/notification | fallback | 检查 App/ConfigProvider 上下文 |
| 布局与导航 | 按项目现状 | AntDV Layout/Grid/Menu/Tabs 等 | fallback | 不复制 React Ant Design v6 API |

## 受控回退

YSS `required` wrapper 缺少必要能力时，记录组件、能力缺口、依赖版本、替代方案、主题/locale/浮层影响和验证证据。没有记录不得回退。

## 更新规则

新增或变更 YSS Wrapper 时同步：本表、组件 docs、至少一个已验证 demo、三个索引、兼容矩阵和验证脚本。
