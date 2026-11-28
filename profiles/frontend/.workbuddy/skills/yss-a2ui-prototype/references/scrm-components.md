# 用 SCRM 组件制作原型

销售机会的阶段变更和联系人备注编辑都可复用这套组件。四类节点共享一个[组件目录](../assets/scrm/catalog.json)，基础布局和按钮继续使用 Basic Catalog。组件所需的 Vue 源码、样式与本地映射随技能分发。

| A2UI 节点 | 适用场景与关键字段 |
| --- | --- |
| `ScrmFormSection` | 将同一任务的字段收进可折叠分区。传 `title`、可选的 `description`、一个 `child` 节点 ID。多个字段先组合到 Column。展开状态由组件本地维护。 |
| `ScrmCountedTextarea` | 填写有字数上限的说明。传 `label`、正整数 `maxLength` 和绑定到字符串的 `value`。可编辑且有值时支持清空并回焦，可用 `readonly` 或 `disabled` 表达当前操作条件。 |
| `ScrmFormCallout` | 在表单或预览中解释规则和反馈。传 `child`，可选 `tone` 为 `info`、`neutral`、`warning`。通过子节点提供可读文案。 |
| `ScrmStageTransition` | 预览阶段流转。传 `fromLabel`、`toLabel`，可加 `fromStatus`、`hint`、`reopenHint` 和 `toTone`（`stage`、`success`、`danger`、`neutral`）。阶段名称与允许的操作由宿主依据业务规格提供。 |

## 接入正在制作的原型

1. 按[基础装配](authoring.md)准备 Vue 3 原型，复制本技能的 `assets/scrm/` 整个目录到新原型 `src/scrm/`，与 `surface.ts` 同级。已有项目先复用相应本地组件和主题。
2. 采用模板基线时，在已有 Button、Card 之外，从设计技能固定快照复制 `ui/label/`、`ui/input-group/`、`ui/input/` 和 `ui/textarea/` 到原型的 `src/components/ui/`。保留 Vite 的 `@/registry/new-york-v4/ui` 别名。项目运行 Vue 类型检查时，同步 TypeScript 的路径映射到 `src/components/ui/*` 并支持导入 JSON。
3. 查看随附示范时，将 `src/main.ts` 的根组件导入改为 `import App from './scrm/ScrmExample.vue'`，把 HTML 标题改为“销售机会阶段变更”。按基础装配运行 Vite。自有场景可保留自己的根组件，使用 `usePrototypeSurface(surfaceId, onAction, scrmExtension)` 注册扩展。
4. 将 surface 的默认 catalog 设为 Basic；每个 SCRM 节点声明 `"@catalogId": "urn:yss:a2ui:scrm:v1"`。普通文本可直接传字符串或绑定路径；备注框的 `value` 必须指向初始数据模型中的字符串，例如：

```json
{
  "id": "note",
  "component": "ScrmCountedTextarea",
  "@catalogId": "urn:yss:a2ui:scrm:v1",
  "label": "备注",
  "maxLength": 120,
  "value": { "@path": "/note" }
}
```

初始 `dataModel` 可取 `{"note":""}`。输入和清空会更新 Core 的绑定。下一次按钮事件用 `context.note: {"@path":"/note"}` 取得当前草稿。重放新的场景时，由宿主将要保留的草稿带入新场景。[完整消息样例](../assets/scrm/scenes.ts)和[宿主示例](../assets/scrm/ScrmExample.vue)演示了往返流程。

## 来源与适配

采用 `scrm-frontend` 提交 `1a35d979fad3a16e40e4c57f186c1b4709c23062`。以下路径相对该仓库根目录，可用于后续对照升级。

- 表单组件取自 `src/components/common/forms/` 的 FormSection、CollapsePanel、FormCallout、CountedTextarea、FieldClearButton 及 `clear-native-field.ts`。分区注册表保留 `src/lib/forms/section-registry.ts` 的注入键与类型；原型内使用相对导入。清空按钮的悬停色增加了模板语义变量回退。
- 阶段预览取自 `src/components/business/shared/StageTransitionSummary.vue`。样式取自 `src/styles/form-drawer.css` 的流转和表单提示规则、`src/styles/motion.css` 的分区折叠规则，颜色沿用原型主题。工程中的实际调用可见 `OpportunityActionEditor.vue`、`ContactCreateField.vue` 和 `RemoteOpportunityFormBody.vue`。
- 新增的适配层负责标签关联、组件注册、绑定读写与动作校验。示范使用本地销售机会和预设消息，覆盖编辑、清空、预览和返回。正式阶段变更、权限查询、保存与持久化由目标项目的业务流程负责。

混用基础与领域组件时，按组件标注目录标识的协议约定见 [A2UI 官方自定义 Catalog 指南](https://a2ui.org/guides/defining-a-catalog/)。
