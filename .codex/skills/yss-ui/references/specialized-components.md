# YSS 专项组件契约

本文件只承载尚无独立 Skill 的组件边界。页面编排使用 `yss-ui-business-page-generation`，表格、树、Formily、请求和高度分别加载对应专项 Skill。

## YSplitPane

- 轻内容可使用实时拖拽；树、宽表、编辑器、图表等重内容优先 `resize-mode="deferred"` 与 `collapse-animation="transform"`。
- 尺寸受控时使用 `v-model:left-width`，纵向使用 `v-model:top-height`；`storage-key` 只保存尺寸，不替代页面状态。
- 折叠默认保留内容状态。只有允许丢失展开、勾选、滚动等内部状态时才启用销毁。

## YConditionBuilder

- 根值是 `ConditionGroup`；叶子保持字段、操作符和值的标准模型。接口 DSL 的序列化、恢复与错误兜底放入 Hook。
- 字段切换需要动态操作符或候选值时使用组件公开的加载入口；提交前执行公开校验。
- 默认严格校验，只有明确允许未完成草稿时才关闭；展示态使用 `disabled`，不使用已废弃的 `readonly`。
- 组件资料见 `../assets/component-docs/condition-builder-*`，实现前仍须核对目标项目安装版本。

## YMonthCalendar

- `v-model` 管理选中日期，`v-model:month` 管理展示月份，不把二者当作日期范围。
- `valid-range` 限制范围，`disabled-date` 表达业务禁用日期；业务层仍需规范化起止输入。
- 自定义日期单元格应保留 today、selected、disabled 等状态语义。
- `fill-height` 仅用于父容器已有明确高度的场景；键盘、右键和双击动作使用公开事件，不覆盖默认焦点行为。

## YFileImport

- 文件选择、预检、结果回显和最终确认组成两步流程；业务上传与校验由 `nextStep` / `finalImport` 接入。
- 默认 `beforeUpload=false`，不能期待 `action` 自动上传；直传只通过 `upload-props.customRequest`。
- `importResult` 展示结果，失败数据通过 `exportErrorData` 下载。弹窗配置与上传器配置保持分离。
- 组件资料见 `../assets/component-docs/file-import-*`。

## YMonaco / YMonacoDiff

- 分栏折叠或 Drawer 打开等容器尺寸变化后确认已重新布局。
- 日志增量使用 `appendContent()`，避免频繁重设超大完整字符串。
- 编辑器必须按需加载并在页面卸载时释放相关资源。

## YCron

- 业务值是七段表达式：秒、分、时、天、月、周、年。
- 页面只负责双向绑定和禁用态；时区、后端模型转换和生效校验属于 API/Hook 层。

## YSheet

- 必须提供明确容器高度。
- 初始化后只通过公开 Facade API 修改工作簿，并通过公开保存入口取值；不得直接修改工作簿原始数据对象。
- 卸载时释放实例，接入前确认 Univer、React、RxJS 等可选依赖及包体影响。

## YssEcharts

- option、更新策略和容器尺寸以目标版本手册与项目已验证实践为准。
- 不在页面层重复原生 ECharts 初始化、销毁或 ResizeObserver 管理。
