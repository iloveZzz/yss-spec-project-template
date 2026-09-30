# 企业页面模式与维护场景

仅在当前需求确有同类任务时按需读取并选择模式；已有页面的局部修改优先保持其结构。示例不创建业务规则、批准或生产组件承诺。

五类模式及组件状态展示统一使用 [Vue 模式](shadcn-vue-integration.md)：`assets/vue-business-patterns/` 与 `export-vue-patterns.mjs`。框架中立的 `export-business-patterns.mjs` 命令同样导出 Vue，不再加载 React。

## Vue 模式的运行与定制

`assets/vue-business-patterns/` 中每个 `*.config.json` 是作者入口，包含 `schema_version: 1`、`title`、`entry`、`scenarios`。在独立作者目录准备固定依赖后执行：

```bash
node .agents/skills/yss-prototype-stage/scripts/export-business-patterns.mjs --project-root <项目根> --output <新的空目录> --toolchain <作者工具目录>
```

交付目录中打开 index.html，可逐页评审。定制时复制所选入口、实际导入的 页面 SFC、Frame.vue / mount.ts / patterns.css / refinement.css 与场景 JSON；替换为自己的交互说明和状态矩阵引用，用 build-shadcn-vue-prototype.mjs --config 构建。原型脚本不会自动迁移为生产代码。

默认套用共享紧凑主题；查询筛选与动作同行、表单限制阅读宽度、审批采用紧凑行、窄屏列表展示摘要。布局选择不修改示例行为。已有页面仅在明确允许时采用这些布局，保持原密度可通过作者配置 `density: comfortable` 选择。

## 教学状态及已声明规则

所有资料均为虚构数据；行、版本和服务端快照来自对应场景 JSON。`state_ref` 指向本文只表示维护 fixture 的规则来源，真实业务必须替换。

| 模式 | 场景 | 动作与可观察结果 |
|---|---|---|
| 查询详情 | primary / empty / loading / no-permission | 名称和状态共同过滤；编号排序；每页两条；跨页选择保留；只读时禁止选择但可查看详情。无筛选结果显示空态。 |
| 分步表单 | primary / failure / no-permission | 名称和负责人必填；返回保留所有字段；首次模拟提交失败后再次提交成功；无权限不能提交。 |
| 审批权限 | primary / empty / failure / no-permission | 本 fixture 允许单项与批量通过。李华负责的资料在当前 fixture 中因关联资料未补齐不可审批；失败场景首次操作的最后一个可处理项失败，其余成功项移出列表；失败项保留并可重试。 |
| 冲突恢复 | primary / failure / conflict / no-permission | 修改后保存；冲突保留草稿；确认放弃后整体替换为 server_rows，包含名称、负责人和版本；取消确认不改输入；重载后可再次保存。 |
| 高密度分析 | primary / empty / loading | 24 行代表资料；筛选同步改变统计和明细；概览可定位资料；明细保留横向表格及固定编号列。 |

这些状态是可重复触发的固定评审输入，不模拟真实服务器或并发通信。未声明的场景不可退回正常页面。准备只读/加载/异常快照时核对当前模式是否支持该场景。

## 评审方法

从用户任务选择模式，再调整信息优先级、密度和反馈位置；不要先堆叠所有组件。先在 1440×900 检查主操作与内容分组，再在 390×844 实际完成相同关键任务。表格整体不溢出不代表行操作可发现；应定位可操作控件、确认可见及可聚焦。保持项必须与原页面同状态对照。

每条关键路径至少记录入口、初始输入、操作、结果和来源中的 actionKey / 状态引用。失败、恢复与再次提交作为连续流程检查，不以按钮出现代替结果正确。该记录并入现有交互说明和六轴 QA。

既有三组视觉正反例位于 yss-design-system/assets/enterprise-craft：查询层级对应查询详情模式，字段分组对应分步表单，阻断及恢复对应审批权限和冲突模式。正反例用于解释设计取舍；上述可运行模式用于任务演练。

新增组件状态展示从导出入口的 `component-states/index.html` 进入；字段/详情/菜单/分页等配方见 [组件导航](component-recipes.md)。五类模式保持既有确定性场景和业务规则，不因组件选择新增状态来源。

