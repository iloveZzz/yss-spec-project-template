# YSS UI 交付检查

开发时按当前页面和影响面自检，联调时核对数据链路。交付路径沿用 `yss-ui` 消费的当前生命周期 `route`：`daily` 绑定同一 Ticket / PR 的当前验收、范围、工程与 API 基线、实际 UI 证据和独立审查；`governed` 重新绑定当前 Slice 的实现计划、实现还原验证与实际执行证据。未命中项在各自记录中说明原因；命中但未验证的项保留阻塞，不能用清单勾选替代执行。

## 通用基线

- [ ] 已从目标工程用 `pnpm why` 确认 Vue、YSS UI、AntDV、VXE 实际版本及 lockfile。
- [ ] 组件选型符合 [组件路由](component-routing.md)，已导出的组件 / Hook / Utils 使用真实包来源；受控回退有能力缺口、版本和验证证据。
- [ ] 使用 Vue 3 Composition API 与 `<script setup lang="ts">`，未引入不存在的 Y 前缀组件或违规 `@formily/antd*` UI。
- [ ] 页面编排、业务 Hook、纯配置和样式按职责组织；容器的间距与可计算高度符合工程基线。
- [ ] 适用实现已对照匹配版本的组件文档和已验证 Demo；`pending-verification` 示例不作为推荐依据。
- [ ] loading、empty、error、disabled/no-access 和实际依赖的 selected 状态都有反馈与恢复路径。

## 主题、Locale、浮层和可访问性

- [ ] 通过项目 ConfigProvider、YSS theme 或语义 Token 消费主题，未新增页面级主题色、任意 z-index；状态不只用颜色表达。
- [ ] locale、时区、日期和金额格式化复用统一能力；Popup/Teleport 目标与宿主、微应用容器一致。
- [ ] 图标按钮有可访问名称，表单 label 与错误提示有语义关联；主要动作支持键盘，Tab 顺序合理。
- [ ] Modal/Drawer 打开后焦点合理，关闭时清理状态并恢复触发元素焦点。
- [ ] 窄屏布局、表格横向滚动、操作收敛及实际采用的大数据 / 搜索 / 按需加载策略已验证。

## 列表与选择

配置 YTable 时由已安装的 `ytable-usage` 核对专项规则，组件公开 API 见 [YTable 文档](../assets/docs/components/table.md)；没有多选或分页的页面不需要引入对应能力。公共包未附的专项及缺失时的停止、恢复条件见 [专项技能的可用性](quick-recipes.md#专项技能的可用性)，组件文档不能替代必要专项。

- [ ] 列使用 `YTableColumn` 与 `field/type`；行键配置实际业务主键和 `useKey: true`。
- [ ] 自定义单元格与表头使用真实字段插槽，不用 `bodyCell` 分支冒充 YTable 主渲染模式；DOM 模板中的插槽按 kebab-case。
- [ ] 远程分页使用 `pageable + v-model:pagination`，状态为 `current/pageSize/total/remote`，监听 `@page-change` 的 `{ current, pageSize }`。
- [ ] 多选场景配置 Checkbox、受控选择和空选择禁用；批量操作成功后受控字段与可见勾选同时清空。
- [ ] 远程查询由业务 Hook 执行，未把实例 `refresh()` 当作接口重查；危险操作使用组件确认或邻近 `Popconfirm`。

## 抽屉与步骤

- [ ] 抽屉开关与当前记录有单一来源，打开前完成回填，关闭时清理临时输入，Tab 切换不引入脏数据。
- [ ] 抽屉内列表沿用 YTable 列和分页合同；底部危险操作按批准交互设置确认，不默认使用居中 `Modal.confirm`。
- [ ] 步骤状态有单一来源，当前实例校验成功才前进；跨步骤数据与弹层编辑回填都保留。
- [ ] 上一步、下一步、取消与完成按钮的状态和文案正确；完成后提供反馈并进入合同约定的目标页面。

## API、Mock、路由与菜单

- [ ] API 经项目统一 mutator，导入当前真实生成函数与 DTO；URL 未重复拼接 `/api`。
- [ ] 请求分页、筛选和响应映射均匹配冻结合同；Mock 路径、字段、状态码和包装复现同一 wire shape，不另定通用包装。
- [ ] 查询回第一页，翻页保留筛选；API 失败只由 mutator 提示，Hook 维护状态与恢复，不重复错误 Toast。
- [ ] 路由位于实际模块层级，`meta.title` 和唯一 `name` 符合页面语义；已有工程采用 `MENU_TYPE.INNER_MENU` 时，详情 / 创建页沿用其配置。

## 实际验证与限制

- [ ] 类型、静态检查和目标文件诊断没有新增问题；无调试输出遗留。格式检查优先使用工程现有检查模式，避免重写无关文件。
- [ ] 适用组件测试、关键交互、E2E、响应式与视觉回归已执行，浏览器 console 无新增 warning/error。
- [ ] `daily` 的适用 UI 验收、当前参照、实现截图与差异证据已记回原任务；`governed` 的 `frontend_implementation_plan` / `frontend_implementation_verification` 绑定当前输入，视觉场景按 `case_id` 配对基准图、实现图、diff/mask 与差异解释。
- [ ] 验证记录含工作目录、实际命令、退出码、环境及证据。失败报告实际现象和已确认原因；原因未知时保留未知，未执行项不写通过。
- [ ] 文档查询按 [组件来源判定](component-routing.md#导入来源判定)选择 MCP、匹配版本的本地资料或源码，不因生成代码就预读完整 `llms-full.txt`。
