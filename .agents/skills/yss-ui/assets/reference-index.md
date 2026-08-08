# yss-ui 引用索引

## 说明

- 本索引从以下文件提取依赖引用并校验可达性：
  - `../SKILL.md`
  - `../references/quick-recipes.md`
  - `../references/checklist.md`
- 目标：集中沉淀到 `assets`，便于快速定位文档与示例。
- 已将引用文档复制到：`./docs`
- 已将引用样例复制到：`./demos`
- 校验结果：以下引用路径均已存在。

---

## A. 文档引用（Docs）

| 分类       | 原引用路径                       | 本地副本路径                            |
| ---------- | -------------------------------- | --------------------------------------- |
| Components | `components/table.md`            | `./docs/components/table.md`            |
| Components | `components/editTable.md`        | `./docs/components/editTable.md`        |
| Components | `components/formily.md`          | `./docs/components/formily.md`          |
| Components | `components/tree.md`             | `./docs/components/tree.md`             |
| Components | `components/split-pane.md`       | `./docs/components/split-pane.md`       |
| Components | `components/monaco.md`           | `./docs/components/monaco.md`           |
| Components | `components/echarts.md`          | `./docs/components/echarts.md`          |
| Components | `components/fileImport.md`       | `./docs/components/fileImport.md`       |
| Components | `components/conditionBuilder.md` | `./docs/components/conditionBuilder.md` |
| Components | `components/cron.md`             | `./docs/components/cron.md`             |
| Components | `components/card.md`             | `./docs/components/card.md`             |
| Components | `components/button.md`           | `./docs/components/button.md`           |
| Components | `components/sheet.md`            | `./docs/components/sheet.md`            |
| Hooks      | `hooks/use-table-height.md`      | `./docs/hooks/use-table-height.md`      |
| Hooks      | `hooks/use-tree-height.md`       | `./docs/hooks/use-tree-height.md`       |
| Hooks      | `hooks/useFullscreen.md`         | `./docs/hooks/useFullscreen.md`         |
| Hooks      | `hooks/useLoading.md`            | `./docs/hooks/useLoading.md`            |
| Guide      | `guide/index.md`                 | `./docs/guide/index.md`                 |
| Guide      | `guide/installation.md`          | `./docs/guide/installation.md`          |
| Guide      | `guide/jsp.md`                   | `./docs/guide/jsp.md`                   |
| Guide      | `guide/llms.md`                  | `./docs/guide/llms.md`                  |
| Guide      | `guide/release-workflow.md`      | `./docs/guide/release-workflow.md`      |
| Guide      | `guide/gitlab-ci-integration.md` | `./docs/guide/gitlab-ci-integration.md` |
| Guide      | `guide/monorepo-versioning.md`   | `./docs/guide/monorepo-versioning.md`   |
| Root       | `resources.md`                   | `./docs/root/resources.md`              |

---

## B. 样例引用（Demos）

| 组件              | 原引用模式                                  | 本地副本目录                |
| ----------------- | ------------------------------------------- | --------------------------- |
| YTable            | `docs/components/demos/table/*`             | `./demos/table`             |
| YEditTable        | `docs/components/demos/edit-table/*`        | `./demos/edit-table`        |
| YFormily          | `docs/components/demos/formily/*`           | `./demos/formily`           |
| YTree             | `docs/components/demos/tree/*`              | `./demos/tree`              |
| SplitPane         | `docs/components/demos/split-pane/*`        | `./demos/split-pane`        |
| YMonaco           | `docs/components/demos/monaco/*`            | `./demos/monaco`            |
| YEcharts          | `docs/components/demos/echarts/*`           | `./demos/echarts`           |
| YFileImport       | `docs/components/demos/file-import/*`       | `./demos/file-import`       |
| YConditionBuilder | `docs/components/demos/condition-builder/*` | `./demos/condition-builder` |
| YCron             | `docs/components/demos/cron/*`              | `./demos/cron`              |
| YCard             | `docs/components/demos/card/*`              | `./demos/card`              |
| YButton           | `docs/components/demos/button/*`            | `./demos/button`            |

---

## C. 快速打开建议

- 组件 API：优先打开 `A. 文档引用` 中对应 `components/*.md`。
- 真实样例：优先打开 `B. 样例引用` 中对应目录下 `index.vue`。
- 表格/树高度问题：先看 `hooks/use-table-height.md` 与 `hooks/use-tree-height.md`。
- DOM 模板插槽命名问题：先看 `guide/jsp.md` 与 `components/table.md` 插槽章节。
- 业务场景检索：优先打开 `./scenario-index.md` 按场景快速跳转。
- 关键词反向定位：优先打开 `./keyword-index.md` 按关键词快速跳转。
