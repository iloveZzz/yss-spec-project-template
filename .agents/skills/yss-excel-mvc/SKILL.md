---
name: yss-excel-mvc
description: "实现或排查 YSS Spring MVC Excel 导入导出、RequestExcel、ResponseExcel 和动态列。"
---

# yss-excel-mvc

执行路线按 Spec 项目中的 `.agents/skills/yss-product-lifecycle/references/daily-delivery.md` 的项目本地政策与固定 CLI 核验。仅合格且范围已授权的 Spec `daily` 消费同 Ticket 的范围、验收与已核验工程基线；`governed` 保留当前批准合同。缺本地政策/能力、其他 Profile 或已绑定正式任务不能凭标签降级；路线不授予执行授权。

用于处理基于注解的 Excel 导入导出能力。

## 平台与源码门禁

接入、修改、代码生成或提供精确类名/配置前，必须读取并执行 [共享平台与源码门禁](../yss-skill-source-index-refresh/references/backend-component-platform-compatibility.md)，以 `--skill yss-excel-mvc` 校验当前路线已核验的精确平台线及匹配源码根（`daily` 来自同 Ticket 的已有工程基线，`governed` 来自批准的配置）；不因普通路径跳过源码检查。缺失、错配或漂移返回 `blocked`；不跨代回退，不在业务实现中升级、降级或替换组件。只读分诊可继续，但须标注未完成源码核验，不能据此宣称跨 Boot/JDK 兼容。

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

- 源码位置不要假设固定目录；先按 `yss-skill-source-index-refresh/references/source-location.md` 定位。
- 当前技能索引：`references/source-index.md`
- 重点源码入口通常包括 `RequestExcel`、`ResponseExcel`、`ExcelDynamicData`、参数解析器、返回值处理器、starter 配置。

当组件源码变化后，用 `yss-skill-source-index-refresh` 刷新索引；刷新或读取前先按源码定位策略确认真实位置。

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

## 执行证据与新增影响

`daily` 将命中的组件来源、技术约束和真实测试/命令/退出码回填同 Ticket，接受独立审查；`governed` 保留原合同与正式结果协议。缺平台/源码事实、测试失败或超出当前范围的影响时停止受影响动作并回生命周期调查，未知或排除风险升级；不从本技能取得迁移、升级或新生产接入授权。
