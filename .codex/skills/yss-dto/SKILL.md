---
name: yss-dto
description: 用于 YSS DTO 规范相关的实现与排障。当用户提到 Result、PageQuery、CommandDTO、QueryDTO、统一响应格式、分页入参基类或 DTO 继承约定时调用。
---

# yss-dto

用于处理 `yss-component-dto` 的使用规范和代码接入。

## 何时使用

- 用户要定义新的分页查询对象。
- 用户要统一接口返回结构。
- 用户提到 `Result`、`PageQuery`、`CommandDTO`、`QueryDTO`。
- 用户在排查分页参数、返回结构或 DTO 继承不一致问题。

## 工作方式

1. 优先沿用项目现有 DTO 体系，不重复造返回包装类。
2. 涉及真实类名、返回结构、分页字段或排障时，先读 `references/source-index.md`，再定位源码或文档。
3. 先确认当前项目用的是哪一套结果封装，再给出改法。
4. 只围绕当前 DTO 结构回答，不泛化到整个微服务理论。

## 源码索引

- 源码位置不要假设固定目录；先按 `yss-source-index/references/source-location.md` 定位。
- 当前技能索引：`references/source-index.md`
- 重点源码入口通常包括 `CommandDTO`、`QueryDTO`、`PageQuery`、`PageRequestFactory`、`Result`、`SingleResult`、`MultiResult`、`PageResult`。

当组件源码变化后，用 `yss-source-index` 刷新索引；刷新或读取前先按源码定位策略确认真实位置。

## 使用规则

- 写操作参数优先继承 `CommandDTO`。
- 读操作参数优先继承 `QueryDTO` 或 `PageQuery`。
- 分页查询优先继承 `PageQuery`，不要自行发明分页字段名。
- Controller 返回优先使用项目既有的 `Result` 或派生结果对象。
- 单对象返回优先 `SingleResult`，列表返回优先 `MultiResult`，分页返回优先 `PageResult`，前提是当前项目已采用这套体系。
- DTO 只表达接口契约，不承载 Repository PO 或领域对象的持久化细节。

## 检查清单

- 分页字段名是否和框架约定一致。
- Service / Repository 是否真的接收到了 `PageQuery`。
- 新增 DTO 是否与现有序列化和校验方式兼容。
- 返回结构是否和前端或上游调用方契约一致。
- Controller、Application Service、Domain、Repository 之间是否存在 DTO/VO/DO/PO 混穿。
- 前端 Orval 或调用方是否依赖当前返回包装结构。

## 修改约束

- 不要在一个项目里混用多套返回包装类。
- 不要新建与 `PageQuery` 含义重叠的分页基类。
- 若项目已有 `SingleResult`、`PageResult`、`MultiResult` 体系，优先保持一致。

## 按需读取

- 源码索引：`references/source-index.md`
- DTO 基类示例：`assets/CommandDTO.java`、`assets/QueryDTO.java`
- 分页基类：`assets/PageQuery.java`
- 返回结构：`assets/Result.java`
