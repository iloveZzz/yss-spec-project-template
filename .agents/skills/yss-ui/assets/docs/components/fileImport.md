---
title: 文件导入 FileImport
route: /components/file-import
toc: content
---

# 文件导入 FileImport

基于 Ant Design Vue Modal + Upload.Dragger 的文件导入弹窗组件，兼容旧版 MidBizFileImport 的核心 API，支持两步导入流程（选择文件 → 结果回显/确认导入），并提供丰富插槽。

## 代码演示

### 基础用法

<code src="./demos/file-import/basic.vue" title="基础导入流程：选择 → 下一步 → 确认/失败下载"></code>

### 多文件与自定义类型

<code src="./demos/file-import/multiple.vue" title="多文件 + 仅 CSV"></code>

### 失败数据下载与自定义结果插槽

<code src="./demos/file-import/result-slot.vue" title="自定义结果插槽 + 左侧附加按钮"></code>

### 与 Formily 结合

<code src="./demos/file-import/formily.vue" title="Schema 内按钮触发导入"></code>

## API

### Props

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| modelValue | `boolean` | `false` | 弹窗可见性（受控） |
| title | `string` | `导入` | 弹窗标题 |
| width | `string \| number` | `50%` | 弹窗宽度 |
| fileTypeList | `string[]` | `['xls','xlsx','csv']` | 文件类型集合，用于推导 `accept`（如 `.xls,.xlsx,.csv`） |
| accept | `string` | `''` | 指定 `accept`，优先于 `fileTypeList` |
| multiple | `boolean` | `false` | 是否支持多文件 |
| drag | `boolean` | `true` | 是否启用拖拽上传（Upload.Dragger 固定拖拽，保留开关以兼容旧版） |
| action | `string` | `''` | Upload 直传地址（若使用直传/自定义上传可通过 `uploadProps` 配置） |
| autoUpload | `boolean` | `false` | 兼容字段；受控模式下不触发自动上传 |
| loadings | `string[]` | `[]` | 外部传入 loading 标识集合；组件内部按字符串命名控制按钮 loading |
| importResult | `{ successkey?: string; failkey?: string; success?: number; fail?: number; total?: number }` | `{ successkey: '1', failkey: '', success: 2, fail: 0, total: 2 }` | 导入结果，用于控制“确认导入/下载失败”按钮显隐与数字显示 |
| modalProps | `Record<string, any>` | `{}` | 透传到 `Modal` 的属性（如 `maskClosable`、`centered` 等） |
| uploadProps | `Record<string, any>` | `{}` | 透传到 `Upload.Dragger` 的属性（如 `customRequest`、`headers` 等） |

说明：组件内部阻止了 Upload 的默认上传（`beforeUpload` 恒为 `false`）。如需直传，请在 `uploadProps.customRequest` 中实现。

### Events

| 事件名 | 参数 | 说明 |
| --- | --- | --- |
| update:modelValue | `boolean` | 可见性变更 |
| finalImport | `{ loadingName: 'finalImport', fileList, close }` | 点击“确认导入”时触发 |
| downloadTemplate | `{ loadingName: 'downloadTemplate', fileList, close }` | 点击“下载导入模板”时触发 |
| exportErrorData | `{ loadingName: 'exportErrorData', fileList, close }` | 点击“下载失败数据”时触发 |
| lastStep | `{ close }` | 点击“上一步”时触发 |
| nextStep | `{ loadingName: 'nextStep', fileList, close }` | 点击“下一步”且通过校验后触发 |

### 插槽

| 插槽名 | 说明 |
| --- | --- |
| uploader | 覆盖上传区域，作用域 `{ fileList, accept, multiple }` |
| result | 覆盖结果展示区域，作用域 `{ result }` |
| footerLeft | 底部左侧附加按钮/内容 |
| footerRight | 底部右侧附加按钮/内容 |

### 暴露方法

| 方法 | 说明 |
| --- | --- |
| open() | 打开弹窗 |
| close() | 关闭弹窗 |
| reset() | 重置内部状态（清空文件列表并回到第一步） |

## 设计说明

- 组件默认使用主题变量 `--yss-color-primary-6` 等，不硬编码颜色。
- 弹窗、下拉、提示等浮层统一 `getContainer: () => document.body`，避免被滚动容器裁剪。
- 若传入 `accept` 则不会再做扩展名校验；否则按 `fileTypeList` 校验。


