# yss-ui 关键词反查索引

## 使用方式

- 按关键词找到对应“场景 + 文档 + Demo”。
- 同一关键词命中多个条目时，优先选择最贴近当前业务目标的场景。
- 对复杂需求可组合多个关键词逐步定位。

---

## 关键词映射

| 关键词       | 场景                               | 文档                                                           | Demo                                                             |
| ------------ | ---------------------------------- | -------------------------------------------------------------- | ---------------------------------------------------------------- |
| 审批流程列表 | 列表管理页（查询 + 分页 + 操作）   | `./docs/components/table.md`                                   | `./demos/table/basic`、`./demos/table/action`                    |
| 待我审批     | 列表管理页（查询 + 分页 + 操作）   | `./docs/components/table.md`                                   | `./demos/table/pagination-remote`                                |
| 抽屉详情     | 列表管理页（查询 + 分页 + 操作）   | `./docs/components/table.md`                                   | `./demos/table/action-slot`                                      |
| 节点设计     | 可编辑表格（行内编辑）             | `./docs/components/editTable.md`                               | `./demos/edit-table/row-edit`、`./demos/edit-table/slot-linkage` |
| 行内编辑     | 可编辑表格（行内编辑）             | `./docs/components/editTable.md`                               | `./demos/edit-table/row-edit`                                    |
| 远程分页     | 列表管理页（查询 + 分页 + 操作）   | `./docs/components/table.md`                                   | `./demos/table/pagination-remote`                                |
| 远程筛选     | 远程筛选列表页                     | `./docs/components/table.md`                                   | `./demos/table/filter-remote`                                    |
| 树表联动     | 树表联动页面（左树右表）           | `./docs/components/tree.md`、`./docs/components/split-pane.md` | `./demos/split-pane/tree-table-layout`                           |
| 左树右表     | 树表联动页面（左树右表）           | `./docs/components/split-pane.md`                              | `./demos/split-pane/tree-table`                                  |
| 组织树选择   | 组织树/资源树选择                  | `./docs/components/tree.md`                                    | `./demos/tree/multiple-select`、`./demos/tree/multi-checkable`   |
| 新增编辑查看 | JSON Schema 表单（新增/编辑/查看） | `./docs/components/formily.md`                                 | `./demos/formily/modes.vue`                                      |
| 表单联动     | 表单联动与异步校验                 | `./docs/components/formily.md`                                 | `./demos/formily/linkage.vue`                                    |
| 异步校验     | 表单联动与异步校验                 | `./docs/components/formily.md`                                 | `./demos/formily/async-validate.vue`                             |
| 分步表单     | JSON Schema 表单（新增/编辑/查看） | `./docs/components/formily.md`                                 | `./demos/formily/steps.vue`                                      |
| 文件导入     | 文件导入两步流                     | `./docs/components/fileImport.md`                              | `./demos/file-import/basic.vue`                                  |
| 导入结果确认 | 文件导入两步流                     | `./docs/components/fileImport.md`                              | `./demos/file-import/formily.vue`                                |
| 条件构造器   | 条件构造器                         | `./docs/components/conditionBuilder.md`                        | `./demos/condition-builder/basic`                                |
| cron 表达式  | Cron 配置                          | `./docs/components/cron.md`                                    | `./demos/cron/basic`                                             |
| 代码编辑器   | 代码编辑与日志查看                 | `./docs/components/monaco.md`                                  | `./demos/monaco/monaco.vue`                                      |
| 日志查看     | 代码编辑与日志查看                 | `./docs/components/monaco.md`                                  | `./demos/monaco/log-viewer.vue`                                  |
| 全屏预览     | 代码编辑与日志查看                 | `./docs/hooks/useFullscreen.md`                                | `./demos/monaco/fullscreen.vue`                                  |
| 图表分析     | 图表分析页                         | `./docs/components/echarts.md`                                 | `./demos/echarts/mix.vue`、`./demos/echarts/line.vue`            |
| 指标卡片     | 卡片化指标看板                     | `./docs/components/card.md`                                    | `./demos/card/layout-metrics`                                    |
| 权限按钮     | 权限按钮与操作态                   | `./docs/components/button.md`                                  | `./demos/button/permission.vue`                                  |
| 表格高度     | 表格高度自适应                     | `./docs/hooks/use-table-height.md`                             | `./demos/table/basic`                                            |
| 树高度       | 树高度自适应                       | `./docs/hooks/use-tree-height.md`                              | `./demos/tree/search-toolbar`                                    |

---

## 快速建议

- 若关键词无法唯一命中，先打开 `./scenario-index.md` 按场景二次筛选。
- 若关键词未覆盖，优先补充到本文件并同步更新 `keyword-index.json`。
