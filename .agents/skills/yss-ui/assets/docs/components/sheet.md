---
toc: content
---

# Sheet 协同表格

YSheet 是基于 [Univer](https://univer.ai/) 封装的电子表格组件，提供类似 Excel 的编辑体验。

## 基础用法

<code id="demo-sheet-basic" src="./demos/sheet/basic/index.vue"></code>

## API

### Props

| 参数 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| modelValue | 工作簿数据，支持 v-model 双向绑定 | `IWorkbookData` | - |
| height | 容器高度 | `string \| number` | `'100%'` |
| locale | 语言配置 | `'zh-CN' \| 'en-US'` | `'zh-CN'` |
| darkMode | 是否启用暗黑模式 | `boolean` | `false` |
| config | Univer 核心配置 (IUniverSheetsCorePresetConfig) | `Partial<Config>` | `{ header: true, toolbar: true, footer: {}, contextMenu: true, formulaBar: true }` |
| readonly | 是否只读模式 | `boolean` | `false` |
| extraPresets | 额外的 Preset 包 | `any[]` | `[]` |
| extraPlugins | 额外的插件 | `any[]` | `[]` |
| extraLocales | 额外的语言包 | `Record<string, any>` | `{}` |
| permissionConfig | 权限管控配置 | `IPermissionConfig` | - |
| collaborationConfig | 协同编辑配置 | `ICollaborationConfig` | - |

### Config 配置详解

`config` 属性透传给 `UniverSheetsCorePreset`，支持其所有配置项。以下列出常用配置：

```typescript
interface IUniverSheetsCorePresetConfig {
  /** 容器元素 (内部自动处理) */
  container: HTMLElement;
  /** 是否显示头部 (默认 true) */
  header?: boolean;
  /** 是否显示工具栏 (默认 true) */
  toolbar?: boolean;
  /** 是否显示底部状态栏/SheetBar (默认 {}) */
  footer?: boolean | {
    sheetBar?: boolean;
    statisticBar?: boolean;
    menus?: boolean;
    zoomSlider?: boolean;
  };
  /** 是否显示右键菜单 (默认 true) */
  contextMenu?: boolean;
  /** 是否显示公式栏 (默认 true) */
  formulaBar?: boolean;
  /** 菜单配置 (用于隐藏/禁用菜单项) */
  menu?: Record<string, MenuItemConfig>;
  /** 表格特有配置 */
  sheets?: {
    /** 保护区域阴影策略 */
    protectedRangeShadow?: boolean | 'always' | 'non-editable' | 'non-viewable' | 'none';
    [key: string]: any;
  };
  [key: string]: any;
}
```

#### 配置示例

```html
<YSheet
  :config="{
    header: false, // 隐藏头部
    sheets: {
      protectedRangeShadow: false // 隐藏保护区域阴影
    },
    menu: {
      'sheet.contextMenu.permission': { hidden: true } // 隐藏特定的右键菜单
    }
  }"
/>
```

### Events

| 事件名 | 说明 | 回调参数 |
| --- | --- | --- |
| update:modelValue | 数据变化时触发 | `(value: IWorkbookData) => void` |
| workbook-created | 工作簿创建完成时触发 | `(workbook: Workbook) => void` |
| error | 错误回调 | `(error: Error) => void` |

### Methods

通过 `ref` 可以获取到组件实例并调用以下方法：

| 方法名 | 说明 | 参数 | 返回值 |
| --- | --- | --- | --- |
| getUniverAPI | 获取 Univer Facade API 实例 | - | `FUniver \| null` |
| getWorkbook | 获取当前工作簿 | - | `Workbook` |
| save | 保存数据 | - | `IWorkbookData \| null` |
| reload | 重新加载数据 | `(data: IWorkbookData) => void` | - |
| dispose | 销毁实例 | - | - |

## IWorkbookData 数据结构

```typescript
interface IWorkbookData {
  id: string                    // 工作簿 ID
  name: string                  // 工作簿名称
  locale: 'zh-CN' | 'en-US'     // 语言
  sheetOrder: string[]          // Sheet 顺序
  sheets: {
    [sheetId: string]: {
      id: string
      name: string
      cellData: {
        [row: number]: {
          [col: number]: {
            v: any              // 单元格值
            s?: object          // 样式(可选)
          }
        }
      }
      rowCount: number
      columnCount: number
    }
  }
  styles?: object               // 样式定义(可选)
}
```

## 导出包说明

为了方便在业务代码中使用 Univer 的进阶功能（如绘图、公式等），组件库已内置并导出以下核心对象，**无需在项目中单独安装 `@univerjs/*` 依赖**：

| 导出名 | 说明 | 来源包 |
| --- | --- | --- |
| `LocaleType` | 语言类型枚举 | `@univerjs/presets` |
| `UniverSheetsDrawingPreset` | 绘图 Preset（用于图片/形状/浮动元素此等） | `@univerjs/preset-sheets-drawing` |
| `UniverPresetSheetsDrawingZhCN` | 绘图中文语言包 | `@univerjs/preset-sheets-drawing/locales/zh-CN` |

### 示例：启用绘图功能

```typescript
import {
  YSheet,
  UniverSheetsDrawingPreset,
  UniverPresetSheetsDrawingZhCN,
  LocaleType
} from '@yss-ui/components';

// 引入样式 (如果未全局引入)
import '@univerjs/preset-sheets-drawing/lib/index.css';

const extraPresets = [UniverSheetsDrawingPreset()];
const extraLocales = {
  [LocaleType.ZH_CN]: UniverPresetSheetsDrawingZhCN
};
```

## 注意事项

1. **容器高度**: 必须为容器设置明确的高度，否则 Univer 无法正常渲染
2. **数据更新**: 必须通过 Facade API 更新数据，禁止直接修改 `IWorkbookData` 对象
3. **内存管理**: 组件销毁时会自动调用 `dispose()` 方法，避免内存泄漏
4. **依赖体积**: 该组件依赖 React、RxJS 等库，会增加约 2-3MB 的打包体积

## 更多资料

- [Univer 官方文档](https://docs.univer.ai/)
- [Univer GitHub](https://github.com/dream-num/univer)
