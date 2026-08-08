# yss-ui 场景索引

## 使用方式

- 先按业务场景选条目，再打开对应 API 文档与 Demo 目录。
- 默认顺序：先看 `docs` 规则，再看 `demos` 实现。
- 若一个需求覆盖多个场景，按“主流程优先、增强能力补充”组合取用。

---

## 场景映射

| 场景                               | 优先文档                                                                                          | 优先 Demo                                                                                                |
| ---------------------------------- | ------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| 列表管理页（查询 + 分页 + 操作）   | `./docs/components/table.md`                                                                      | `./demos/table/basic`、`./demos/table/action`、`./demos/table/pagination-remote`                         |
| 远程筛选列表页                     | `./docs/components/table.md`                                                                      | `./demos/table/filter-remote`、`./demos/table/filter-mixed`                                              |
| 可编辑表格（行内编辑）             | `./docs/components/editTable.md`                                                                  | `./demos/edit-table/row-edit`、`./demos/edit-table/required`、`./demos/edit-table/custom-rule`           |
| 大数据表格                         | `./docs/components/table.md`、`./docs/components/editTable.md`                                    | `./demos/table/merge-cells`、`./demos/edit-table/big-data`                                               |
| 树表联动页面（左树右表）           | `./docs/components/tree.md`、`./docs/components/split-pane.md`、`./docs/hooks/use-tree-height.md` | `./demos/split-pane/tree-table`、`./demos/split-pane/tree-table-layout`                                  |
| 组织树/资源树选择                  | `./docs/components/tree.md`                                                                       | `./demos/tree/search-toolbar`、`./demos/tree/multiple-select`、`./demos/tree/multi-checkable`            |
| JSON Schema 表单（新增/编辑/查看） | `./docs/components/formily.md`                                                                    | `./demos/formily/basic.vue`、`./demos/formily/modes.vue`、`./demos/formily/steps.vue`                    |
| 表单联动与异步校验                 | `./docs/components/formily.md`                                                                    | `./demos/formily/linkage.vue`、`./demos/formily/linkage-multi.vue`、`./demos/formily/async-validate.vue` |
| 文件导入两步流                     | `./docs/components/fileImport.md`                                                                 | `./demos/file-import/basic.vue`、`./demos/file-import/formily.vue`                                       |
| 条件构造器                         | `./docs/components/conditionBuilder.md`                                                           | `./demos/condition-builder/basic`、`./demos/condition-builder/linked`                                    |
| Cron 配置                          | `./docs/components/cron.md`                                                                       | `./demos/cron/basic`、`./demos/cron/select`                                                              |
| 代码编辑与日志查看                 | `./docs/components/monaco.md`、`./docs/hooks/useFullscreen.md`                                    | `./demos/monaco/monaco.vue`、`./demos/monaco/log-viewer.vue`、`./demos/monaco/fullscreen.vue`            |
| 图表分析页                         | `./docs/components/echarts.md`                                                                    | `./demos/echarts/line.vue`、`./demos/echarts/mix.vue`、`./demos/echarts/dark.vue`                        |
| 卡片化指标看板                     | `./docs/components/card.md`                                                                       | `./demos/card/layout-metrics`、`./demos/card/basic`                                                      |
| 权限按钮与操作态                   | `./docs/components/button.md`                                                                     | `./demos/button/permission.vue`、`./demos/button/states.vue`                                             |
| 表格高度自适应                     | `./docs/hooks/use-table-height.md`                                                                | `./demos/table/basic`                                                                                    |
| 树高度自适应                       | `./docs/hooks/use-tree-height.md`                                                                 | `./demos/tree/search-toolbar`                                                                            |

---

## 常见任务到场景

- “做一个管理列表页”：使用“列表管理页（查询 + 分页 + 操作）”。
- “左树右表联动”：使用“树表联动页面（左树右表）”。
- “表单要支持查看模式”：使用“JSON Schema 表单（新增/编辑/查看）”。
- “导入模板并校验结果”：使用“文件导入两步流”。
- “表格/树撑满可视区域”：使用“表格高度自适应”或“树高度自适应”。
