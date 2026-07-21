# Excalidraw Diagram Generator 使用手册

`excalidraw-diagram-generator` 是可视化说明与审查辅助 skill，用来把流程、架构、状态、依赖、数据流和切片关系生成 `.excalidraw` 文件。

它不替代 `yss-product-lifecycle`、Spec、OpenAPI、ADR、Ticket 或测试。它的价值是让复杂关系可以被快速看见、讨论和审查。

## 1. 在流程中的定位

推荐使用位置：

```text
机会探索 / Discovery
  -> 用户旅程图、机会地图、竞品流程泳道图

Spec / 需求澄清
  -> 业务流程图、角色职责泳道图、页面地图

OpenAPI Draft / 工程基线 / 架构设计
  -> 系统架构图、数据流图、序列图、ER 图、DDD 边界图

系统 / 数据架构设计
  -> 状态流、调用链、领域边界、切片依赖图

设计审查 / 垂直切片前
  -> 用图暴露边界不清、契约缺口和切片依赖

复盘沉淀
  -> 最终流程图、架构演进图、知识沉淀图
```

最有价值的阶段是 Architecture / 系统 / 数据架构设计 和 Design Review。此时图可以帮助审查 DDD 边界、状态流、接口契约、异常路径和垂直切片是否一致。

## 1.1 四类架构图产物

四类架构图随生命周期逐步产出，不要求一次性全部画完。

| 架构产物 | 产出阶段 | 图的价值 | 常用图类型 | 保存位置 |
|---|---|---|---|---|
| 业务架构图 | 机会探索 / Discovery / 产品定义 | 让用户、价值流、角色协作和产品边界可视化 | 用户旅程、价值流、泳道图、能力地图、生态关系图 | `docs/discovery/diagrams/` 或 `docs/architecture/diagrams/` |
| 功能架构图 | Spec baseline / 产品设计 / Spec 校准 | 让功能域、模块、优先级和依赖关系可审查 | 功能模块图、依赖图、页面地图、关系图 | `docs/design/diagrams/` 或 `docs/architecture/diagrams/` |
| 系统总体架构图 | 工程基线 / 系统 / 数据架构设计 | 让服务边界、部署、集成、权限链路和 NFR 方案可审查 | C4/容器图、部署图、序列图、DFD、DDD 边界图 | `docs/architecture/diagrams/` |
| 数据架构图 | 详细设计 / 持久化开发前 | 让元模型、版本、血缘、查询和存储策略在写 Repository 前被看见 | ER 图、Class/元模型图、血缘图、DFD、查询路径图 | `docs/architecture/diagrams/` |

对于数据模型、元数据管理、模型版本或血缘分析类产品，数据架构图尤其有价值。它不能替代 `docs/architecture/<feature>-data-architecture.md`，但可以帮助提前发现元模型抽象不稳、版本边界不清、血缘关系无法高效查询等高成本问题。

## 2. 适用与不适用

适用：

- 多角色、多系统、多模块协作。
- 涉及前后端、OpenAPI、DDD、状态机。
- 有复杂页面流、审批流、发布流、导入导出流。
- 设计审查时理解不一致。
- 垂直切片之间有依赖，需要解释交付顺序。

不适用：

- 单点文案、小样式、小 bug。
- 已有清晰 Spec / OpenAPI / ADR，且没有理解歧义。
- 只是为了让文档看起来更完整。

## 3. 与 Agents 的协作

| Agent | 使用方式 |
|---|---|
| Ideation / Discovery Agent | 生成机会地图、用户旅程、竞品流程泳道图 |
| Product / Grill Agent | 把需求澄清结果画成业务流程、角色职责图 |
| API Contract Agent | 画接口调用序列、数据流、错误流 |
| Architecture Agent | 画系统架构、DDD 分层、模块依赖、ER / Class / DFD |
| Design Review Agent | 对图做审查，找职责不清、循环依赖、契约缺口 |
| Code Agent | 消费图辅助理解，不用图替代 Spec、OpenAPI 或 ADR |
| Review Agent | 检查实现是否偏离图中的边界和流程 |
| Knowledge / Retro Agent | 把稳定流程或架构图沉淀到 docs |

## 4. 产物位置

推荐目录：

```text
docs/discovery/diagrams/
docs/design/diagrams/
docs/architecture/diagrams/
```

示例：

```text
docs/discovery/diagrams/model-management-opportunity-map.excalidraw
docs/design/diagrams/model-management-user-flow.excalidraw
docs/architecture/diagrams/model-publishing-sequence.excalidraw
docs/architecture/diagrams/model-ddd-boundary.excalidraw
```

在对应 Markdown 文档中引用：

```markdown
相关图：`docs/architecture/diagrams/model-publishing-sequence.excalidraw`
```

## 5. 实践方式

推荐三步法：

1. 先有文字事实。
   来源应该是 Discovery、Spec、OpenAPI Draft、Architecture、系统 / 数据架构设计 或 Ticket。
2. 再生成图。
   根据用途选择 Flowchart、Swimlane、Relationship、Class、ER、Sequence、DFD、Architecture 或 Mind Map。
3. 最后回写审查结论。
   图里暴露的问题要回写到 Spec、OpenAPI、ADR、系统 / 数据架构设计 或 Ticket。

常用提示词：

```text
使用 excalidraw-diagram-generator，基于 docs/requirements/<feature>-spec.md
和 docs/api/specs/<feature>.yaml，生成 <feature> 的接口调用序列图。
保存到 docs/architecture/diagrams/<feature>-sequence.excalidraw。
```

```text
使用 excalidraw-diagram-generator，基于当前 系统 / 数据架构设计，
生成 DDD 边界和模块依赖图，突出 Domain、Application、Infrastructure、Adapter 的依赖方向。
保存到 docs/architecture/diagrams/<feature>-ddd-boundary.excalidraw。
```

```text
使用 excalidraw-diagram-generator，基于 docs/architecture/<feature>-data-architecture.md，
生成元模型 ER 图和血缘关系图，突出 Model、Entity、Attribute、Relationship、Version、LineageEdge 的关系。
保存到 docs/architecture/diagrams/<feature>-data-model.excalidraw。
```

```text
使用 excalidraw-diagram-generator，把这些垂直切片画成依赖关系图。
要求标出每个 slice 的用户动作、API、后端行为、前端入口和验证点。
```

## 6. 审查清单

- 图是否引用了明确的上游资产。
- 图是否帮助回答一个具体问题，而不是装饰文档。
- 节点数量是否可读，复杂图是否拆成高层图和子图。
- DDD、API、状态流、权限和错误路径是否表达清楚。
- 图中发现的问题是否回写到文本资产。
- `.excalidraw` 文件是否放在合适目录，并被相关文档引用。
