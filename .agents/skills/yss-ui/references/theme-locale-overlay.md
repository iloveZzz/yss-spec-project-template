# 主题、Locale 与浮层门禁

## 主题

- 通过项目 `ConfigProvider`、`@yss-ui/theme`、语义 token 或项目 CSS variables 消费主题。
- 禁止页面硬编码表面色、状态色、任意圆角、阴影和 z-index。
- 暗色和紧凑模式由项目主题层切换，页面只消费语义角色。

## Locale 与格式化

- AntDV locale、时区和日期库由应用入口统一配置。
- 页面不得混用 dayjs、moment、原生字符串拼接和不同金额格式化器。
- 日期、金额、枚举、空值显示复用项目公共能力。

## Popup / Teleport

- Modal、Drawer、Dropdown、Popover、Tooltip、Select、DatePicker 使用项目统一 popup container。
- 微应用中明确宿主根节点、Shadow DOM/Teleport 目标和卸载行为。
- 禁止页面自行增加 z-index 解决遮挡；先修正挂载层级和项目 token。

## 生命周期与焦点

- 弹层关闭时清理临时表单、异步请求和订阅。
- 根据项目版本选择正确的销毁属性，不猜测最新官网 API。
- 打开后聚焦合理入口，关闭后恢复触发元素焦点。
