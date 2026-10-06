# YSS UI 场景与示例入口

新建页面时，按当前任务选择下面的示例；重构时依次核对列与插槽、请求与分页、路由和交付证据。示例用于说明组件组合，不决定业务字段、接口包装或实现资格。交付路径沿用 `yss-ui` 消费的当前生命周期 `route`；`daily` 先消费同一任务的当前验收、范围与工程及 API 基线，`governed` 先消费批准合同。两者均核对目标 lockfile、类型和真实导出，本地快照与目标版本不同的部分需重新核验。

## 专项技能的可用性

下表链接的公共路由、API 资料和 Demo 随公开包提供；`ytable-usage`、`ytree-usage`、`formily-*`、`file-export-download`、`theme-token-usage` 专项不随该包附带。任务命中时仍加载消费工程已安装的对应专项，由原专项持有唯一规则；部分组件资料、Demo 或 Blob 响应说明不能替代完整专项与当前路径的必要输入（`daily` 的同一任务证据或 `governed` 的批准合同）。

必要专项未安装或不可读时，停止受影响的实现，记录缺失 Skill 与来源；从消费工程已登记的技能来源恢复，核验版本与项目基线一致并重新读取后再继续。只读诊断可以使用随包资料确认组件事实，不据此跳过必需专项、`daily` 的当前任务证据或 `governed` 的批准输入。分步场景仍由 `formily-step-flow` 决定，不以快照中的 FormStep Demo 替代其方案。

## 按场景读取

| 当前任务 | 按需读取 | 必须保留的场景差异 |
|---|---|---|
| 列表管理：选择、分页、状态和操作 | [YTable 组件 API](../assets/docs/components/table.md) 与 [列表请求及分页](../../yss-hook/references/list-pagination.md)；选择和批量操作由已加载的 `ytable-usage` 核对 | `pageable`、`pagination.remote` 和 `@page-change` 单对象 `{ current, pageSize }`；危险操作确认与成功后选择态清理 |
| 待办审批：列表与详情抽屉 | [业务页面生成](../../yss-ui-business-page-generation/SKILL.md) 与 [模式及插槽路由](../../yss-formily/SKILL.md)，按命中条件加载 `formily-mode-slot-detail` | 抽屉打开前准备记录，关闭时清理临时状态；同意、拒绝等行为消费冻结规则与当前权限 |
| 分步创建与步骤中的节点列表 | [分步场景路由](../../yss-formily/SKILL.md)加载 `formily-step-flow`；节点列表再按已安装的 YTable 专项 | 当前步骤校验成功才前进，前序数据跨步骤保留，编辑弹层保存后回填源数据，确认步骤不另造提交数据源 |
| 列表请求与 Mock 接入 | [API 集成](../../yss-api-integration/SKILL.md) 与 [列表分页 Hook](../../yss-hook/references/list-pagination.md) | 请求、响应与 Mock 均遵循目标冻结 DTO，分页字段在 Hook 边界映射；不固定 `page`、`data.list` 或响应包装 |
| 左树右表 | [YTree 组件 API](../assets/docs/components/tree.md) 与 [页面组合](../../yss-ui-business-page-generation/references/page-composition-example.md)；树与删除确认由已加载的 `ytree-usage` 核对 | `YSplitPane + YCard + YTree + YTable`，树选中后右表回第一页，高度偏移只扣实际启用区域 |
| 同一表单新增、编辑与查看 | [三态与插槽路由](../../yss-formily/SKILL.md)加载 `formily-mode-slot-detail` | 新代码使用 `YFormily`；历史 `YssFormily` 只在真实兼容导出已确认时维护；详情路径与编辑 Slot 分开 |
| 文件导入两步流 | [YFileImport 边界](specialized-components.md#yfileimport) 与 [导入 Demo](../assets/demos/file-import/basic.vue) | 文件选择 / 结果确认、`nextStep` / `finalImport` / `exportErrorData`；下载失败数据时先加载已安装的 `file-export-download`，响应边界另核对 [API 集成](../../yss-api-integration/SKILL.md)的 Blob 契约 |

完整组件与 Demo 入口见 [场景索引](../assets/scenario-index.md)和[文档索引](../assets/reference-index.md)。仅加载当前使用的表格、编辑表格、Formily、树、分栏、Monaco、图表、文件导入、条件构建、Cron、Card 或 Button；不预读所有示例。

样例中的视觉表达消费 [设计系统](../../yss-design-system/SKILL.md)和[主题、Locale 与浮层基线](theme-locale-overlay.md)；涉及 Token 实现与换肤时仍加载已安装的 `theme-token-usage`，由原专项决定规则。错误提示服从项目 mutator，操作失败不能继续执行成功动作。`daily` 页面验收在同一 Ticket / PR 保留当前参照、实际适用的截图、交互、console warning、`pnpm` 退出码与独立审查；`governed` 还须保留当前 Slice 的 `frontend_implementation_plan` / `frontend_implementation_verification` 及其正式证据。
