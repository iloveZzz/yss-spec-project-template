---
name: yss-excel-mvc
description: 用于 Spring MVC 下的 Excel 导入导出实现。当用户提到 RequestExcel、ResponseExcel、Excel 导入解析、Excel 下载、动态列导出或导入导出接口异常时调用。
---

# yss-excel-mvc

用于处理基于注解的 Excel 导入导出能力。

## 何时使用

- 用户要新增 Excel 导入接口。
- 用户要新增 Excel 导出接口。
- 用户提到 `@RequestExcel`、`@ResponseExcel`、`ExcelDynamicData`。
- 用户反馈下载文件名异常、导入失败、动态列导出错位。

## 工作方式

1. 先识别是导入、固定模型导出还是动态列导出。
2. 涉及真实注解、解析器、返回处理器、文件名或排障时，先读 `references/source-index.md`，再定位源码或文档。
3. 先看现有 Controller 和返回结构，再决定是否只加注解还是要改模型。
4. 优先复用项目现有的导入导出 VO，不要重新造重复模型。

## 源码索引

- 源码位置不要假设固定目录；先按 `yss-source-index/references/source-location.md` 定位。
- 当前技能索引：`references/source-index.md`
- 重点源码入口通常包括 `RequestExcel`、`ResponseExcel`、`ExcelDynamicData`、参数解析器、返回值处理器、starter 配置。

当组件源码变化后，用 `yss-source-index` 刷新索引；刷新或读取前先按源码定位策略确认真实位置。

## 常见实现路径

- 导入：`@RequestExcel List<T>`
- 固定模型导出：`@ResponseExcel` + `List<VO>`
- 动态列导出：返回 `ExcelDynamicData`

## 检查清单

- 启动类是否启用了 Excel MVC 能力。
- 上传字段名是否与前端一致。
- 导出接口是否正确设置文件名和 sheet 名。
- POST 下载场景是否能从响应头取到文件名。
- 动态列场景下 `columns`、`columnCn`、`rows` 是否一一对应。
- 导出 VO 字段注解和列顺序是否与前端模板一致。
- 大数据量导出是否需要流式、分页或异步任务，避免 Controller 一次性堆内存。

## 排障顺序

1. 确认 starter 和 MVC 配置是否生效。
2. 导入先查 multipart 字段名、文件格式、模型字段注解。
3. 固定列导出先查 `@ResponseExcel`、返回类型、VO 注解。
4. 动态列导出先查 `ExcelDynamicData` 的列、列中文名、行数据对齐。
5. 下载文件名问题先查响应头、编码和前端取 header 逻辑。

## 修改约束

- 不要把 Excel 导出和普通 JSON 返回写在同一方法里混用。
- 不要在不知道文件命名规则时硬编码中文名模板。
- 动态列导出优先用 `ExcelDynamicData`，不要在 Controller 里手写列映射。

## 按需读取

- 源码索引：`references/source-index.md`
- 注解与返回结构：`assets/RequestExcel.java`、`assets/ResponseExcel.java`、`assets/ExcelDynamicData.java`
- MVC 解析器：`assets/RequestFastExcelArgumentResolver.java`、`assets/ResponseFastExcelReturnValueHandler.java`
