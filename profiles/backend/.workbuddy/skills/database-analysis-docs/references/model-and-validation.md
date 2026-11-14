# 模型与验证

## 边界

日常维护先修改 JSON，再重新生成 Markdown／Excel。若收到用户修改过的说明书，按 [文档与模型核对](ddl-generation.md) 整理新的目标模型，不以旧 JSON 覆盖更新资料。现状与目标是不同文件。仅分析报告无需先构造模型。

连接 MySQL／PostgreSQL 时，按 [连接与元信息采集](database-connections.md) 取得现状资料；需要同源模型时再据此整理。原始采集结果另存 `database-metadata.json` 或工具真实导出的格式，模型来源指向实际文件。SQL 默认表达式保持文本，物理外键不自动推导业务关系基数；数据库特有定义保留在规则或未结构化覆盖列表。修改建议另存目标模型。

以下版本 1 模型约定表达关系型 TABLE、普通字段、列型主键／唯一键／索引与外键。不支持的视图、过程、触发器、分区、表达式或部分索引记录在 `unsupported_objects` 和报告中，不当成普通表。

下面字段除注明可选外应存在；空集合用 `[]`，未知只用指定位置的 `null`。整理和核对时检查缺失、拼错键与格式版本，不丢弃未知内容；本技能不附带自动校验器。模型结构检查不能验证 SQL 执行语义；生成 SQL 时另按 [DDL 生成](ddl-generation.md) 核对目标方言与物理属性。

## 顶层

| 字段 | 类型与含义 |
|---|---|
| format_version | 整数 1 |
| title、status、scope | 字符串；status描述现状／草案／建议等，不能暗示已部署 |
| date | 有效 YYYY-MM-DD |
| database | `{ "product": 字符串或null, "version": 字符串或null }` |
| sources | `{id, locator, note}` 数组，均字符串；id唯一、locator能定位来源 |
| decisions | `{confirmed:字符串数组, proposed:字符串数组, open:字符串数组}` |
| tables | 非空 Table 数组 |
| relationships | 可选 Relation 数组 |
| unsupported_objects | 可选 `{kind, name, definition, reason, sources}` 数组；前四项字符串，sources为来源ID数组。定义未提供时明确写“未提供”，说明限制 |

所有表、来源引用都使用稳定 ID。相同表名可出现在不同 schema；不通过把名称按点拆分来解析引用。关键决定和问题在文字中引用来源ID；有约束来源差异时在对应表规则中记录。

## Table

必须包含 `id, schema, name, title, domain, fields, pk, unique, indexes, foreign_keys, checks, rules, sources`。

- `id`：唯一非空字符串，供关系引用；`schema` 可为空字符串；`name` 是完整真实表名，不强制前缀或字符长度。`schema+name` 不重复。
- `title, domain`：字符串，分别表示业务名称与范围。
- `fields`：非空 Field 数组，字段名在表内唯一。
- `pk`：有序字段名数组。现状没有声明主键可用 `[]`，应报告并核对；不自动补 id。
- `unique, indexes`：`{name:字符串, columns:有序字段名数组}` 数组。无法确认实际索引名称可用空字符串，在规则注明；不代表已执行。
- `foreign_keys`：`{name, columns, target, references, on_delete, on_update}` 数组。target为目标表ID；columns和references为对应字段名数组，数量相同且非空；动作是字符串或null。
- `checks`：`{kind:"sql"或"business", text:字符串}` 数组，分别展示 SQL 声明与自然语言规则；sql不意味着已执行验证。
- `rules`：业务规则字符串数组；`sources`：来源ID数组。

新设计默认以 `relationships` 的 business 关系和关联字段表达业务引用，`foreign_keys` 填 `[]`，不主动加入 SQL CHECK；业务规则仍写入 `rules` 或 business checks。根据已知规则设计 `pk`、可空性和必要的 `unique`，不凭字段名推断必填或唯一。主键 ID 默认由写入方提供；类型、生成责任和具体方式沿用项目事实，未知时记入待确认，不自动指定发号组件。

用户明确要求或适用的项目规范优先。采集、审查和转换已有结构时忠实保留实际外键、CHECK 和自增等属性；无法表达的定义及来源记入 `unsupported_objects`，不因新设计的默认约定抹去现状。

## Field 与默认值

必填 `name:字符串, type:字符串或null, nullable:布尔或null, comment:字符串`。可选 `source_ids:来源ID数组` 和 `default`。

| 输入 | 意义／显示 |
|---|---|
| 不写 default | 未声明默认值 |
| `{"kind":"null"}` | SQL NULL，必须省略value |
| `{"kind":"string","value":""}` | 空字符串；带引号显示，不能显示成缺省 |
| `{"kind":"number","value":0}` | 数字0；仅有限JSON数值 |
| `{"kind":"boolean","value":false}` | 布尔false，不能变成空值 |
| `{"kind":"expression","value":"CURRENT_TIMESTAMP"}` | 表达式文本；不在工具中求值 |

普通字符串默认值使用 kind=string，即使文本看起来像 SQL 或 Excel 公式。`type` 保留用户提供或明确提出的类型，不自动归一为某一数据库方言。nullable=null表示未知；不是SQL NULL默认值。

## Relation 的方向

必填 `from, to, from_min, from_max, to_min, to_max, kind, description, sources`。from/to是表ID，kind为business或physical，description字符串，sources来源ID数组。

- **from_min/from_max**：每个 to 对象可以关联多少个 from 对象。
- **to_min/to_max**：每个 from 对象可以关联多少个 to 对象。
- min为非负整数或null；max为正整数、`"many"`或null；null表示该端数量尚未确认。最小值不得大于最大值。

客户到订单示例：from=customer、to=order、from_min=1、from_max=1、to_min=0、to_max="many"。意为每条订单属于一个客户，客户可以没有或有多条订单。

business只表达业务引用；physical表示设计选择采用物理关系，具体列约束仍须写进foreign_keys。二者均不能证明线上约束已经部署。保留关系描述，便于检查数字方向与业务故事是否一致。

## 模型与产物核对

生成前核对必需字段、对象和来源 ID 唯一性、表／字段引用、列次序、默认值类型、关系方向、数量范围和未覆盖对象；发现结构错误先修正，不用占位事实补齐。缺主键、未知字段类型／可空性和未确认外键动作分别记录，影响完整 DDL 时按 [DDL 生成](ddl-generation.md) 处理。

模型未知键和额外物理定义不能静默丢弃。完整表名与 schema 分开保存，保留主键、唯一和索引的有序列集合；普通索引不当作唯一约束。只有确认采用物理关系时才根据真实依据填写外键，未知类型兼容性按实际方言核对。

将生成的 Markdown／Excel 与同一模型逐项比较，特别检查空值、空字符串、零、布尔值、完整名称和长 SQL；原始来源有错仍可能得到一致文件。记录由 Agent 核对或实际工具验证的具体范围，不把 JSON 可解析等同于业务或方言正确。新建输出保护旧版本；已有文件未经授权不得覆盖。
