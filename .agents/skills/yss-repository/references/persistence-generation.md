# PO／Mapper 生成工具

先检查工程已有生成器和检查入口，优先复用；工程缺少工具或明确要求接入时，使用 [通用脚本](../scripts/generate_persistence.py)。脚本为 Python 3.10+ 标准库单文件，生成 PO 与单类型参数 Mapper，不生成业务规则、Domain、Gateway、Convertor、SQL 或 JSON handler。

## 输入与工程配置

输入沿用 `database-analysis-docs` 的 `database-model.json` v1。生成器读取所需结构，不改写模型、未知扩展、索引、关系或数据库定义，也不代替模型全量审查和数据库验证。每张表至少提供 `id`、`schema`、`name`、`title`、`pk`、`fields`；字段提供 `name`、`type`、`comment`。表的 `comment` 可省略，届时使用已有 `title`。schema 与表名分开保存，以稳定 `id` 配置归属。初版不配置运行时 schema 路由，也不在 PO 注解中固定 schema；一次输入含跨 schema 同名表时明确拒绝，须按数据源／schema 分批生成，并由工程已有运行时配置绑定实际数据库。

例如一个最小生成输入：

```json
{
  "format_version": 1,
  "tables": [{
    "id": "TABLE-CUSTOMER", "schema": "", "name": "t_customer",
    "title": "客户", "comment": "客户基本信息", "pk": ["customer_id"],
    "fields": [
      {"name": "customer_id", "type": "BIGINT", "nullable": false, "comment": "客户编号"},
      {"name": "display_name", "type": "VARCHAR(100)", "nullable": true, "comment": "客户名称"}
    ]
  }]
}
```

此例只展示生成所需字段，完整的数据库模型仍按原 v1 约定维护。`nullable`、SQL `default`、审计／版本／租户列名不自动改变 Java 注解或写入策略。

配置独立存放，例如 `tools/persistence-config.json`：

```json
{
  "format_version": 1,
  "output_root": "customer-infrastructure/src/main/java/com/example/infrastructure",
  "base_package": "com.example.infrastructure",
  "package_pattern": "{base_package}.{group}.persistence",
  "table_groups": {"customer": ["TABLE-CUSTOMER"]},
  "naming": {
    "strip_table_prefix": "t_",
    "strip_is_prefix": false,
    "reserved_word_suffix": "Flag"
  },
  "mapper_base": "com.yss.cloud.mybatis.support.BasePlusRepository",
  "id_type": "INPUT",
  "generated_by": "tools/generate_persistence.py"
}
```

`mapper_base` 必须依据工程当前 MyBatis／YSS 组件选择，例中的类名不证明所有项目均提供该基类。脚本不安装 Java 依赖。

| 配置 | 约定 |
|---|---|
| `format_version` | 整数 `1`；未知配置键报错，防止拼写错误静默改变生成行为 |
| `output_root` | **对应 `base_package` 本身的目录**，不是通常所说的 `src/main/java`；相对路径以 `--project-root` 为基准，也可传工程内绝对路径 |
| `base_package` | 输出根对应的完整 Java 包名 |
| `package_pattern` | 缺省 `{base_package}.{group}.persistence`；仅支持这两个占位符，结果必须位于 `base_package` 内 |
| `table_groups` | 业务组到稳定表 ID 数组的映射，完整且不重复覆盖本次模型全部表；组可为点分包路径 |
| `naming` | 三项均可省略；默认不移除表前缀、不裁剪 `is_`、遇到 Java 关键字报错。显式配置后才应用相应转换 |
| `mapper_base` | 完整 Java 类名，生成 `extends 基类<PO>`，不支持额外泛型参数或任意 Java 模板 |
| `id_type` | 必须显式提供：`AUTO`、`NONE`、`INPUT`、`ASSIGN_ID` 或 `ASSIGN_UUID`；仅生成声明，不实现发号 |
| `generated_by` | 必填生成来源文案，写入 PO Javadoc；迁移已有生成器时保持旧文案 |
| `to_string_fields` | 可选列名数组，缺省为空；只有显式列入的字段带 `@ToString.Include` |

示例将生成 `customer/persistence/po/CustomerPO.java` 和 `customer/persistence/mapper/CustomerMapper.java`。MVC 可将 `output_root`、`base_package` 指向已有 repository 模块，使用 `{base_package}.{group}` 等现有布局，不补造 DDD 层。

## 类型与字段策略

内置映射使用包装类型：BIGINT→Long、INT／INTEGER→Integer、SMALLINT→Short、BOOLEAN→Boolean、CHAR／VARCHAR／TEXT→String、DATE→LocalDate、TIME→LocalTime、TIMESTAMP→LocalDateTime、TIMESTAMP WITH TIME ZONE→OffsetDateTime、DECIMAL／NUMERIC→BigDecimal。支持这些类型的长度／精度写法和 TIMESTAMP WITHOUT TIME ZONE；类型比较忽略首尾空白、连续空白及大小写。其他类型必须明确配置覆盖，不把未知类型当成 String。

```json
{
  "type_overrides": {
    "UUID": "java.util.UUID",
    "DATETIME": "java.time.LocalDateTime"
  },
  "json": {
    "type_handler": "com.example.infrastructure.config.DatabaseJsonTypeHandler",
    "jdbc_type": "OTHER"
  },
  "default_insert_strategy": "NOT_NULL",
  "default_update_strategy": "NOT_NULL"
}
```

以上为合并到工程配置的可选项。覆盖键为 SQL 类型，值为具体 Java 类型的完整类名，或脚本已知的简单类型名；不支持泛型和任意 Java 源码。JSON／JSONB 默认映射 String，必须显式配置 handler 和 JDBC 类型；数据库方言绑定由项目已有 handler 负责，生成成功不代表其兼容所有数据库。

字段扩展沿用现有 `persistence`：

```json
{
  "name": "created_at", "type": "TIMESTAMP(3)", "comment": "创建时间",
  "persistence": {"insert_strategy": "NOT_NULL", "update_strategy": "NEVER"}
}
```

字段策略优先于工程默认。未提供或显式配置 `null` 时省略该策略属性，沿用框架默认；支持 `DEFAULT`、`ALWAYS`、`NOT_NULL`、`NOT_EMPTY`、`NEVER`。SQL 默认值和 `nullable` 不参与推导；主键使用 `@TableId`，不附加 `@TableField` 策略。SCRM 等原有工程需要 `ALWAYS` 时由适配器显式配置。

## 调用、退出码与文件保护

```sh
python3 /absolute/skill/scripts/generate_persistence.py \
  --project-root /absolute/project \
  --model docs/database/database-model.json \
  --config tools/persistence-config.json \
  --dry-run
```

`--model` 与 `--config` 的相对路径同样以工程根为基准，可读取工程外的明确输入；输出始终限制在工程根内。输入必须为 UTF-8 JSON，重复键报错。无需连接数据库。

| 模式 | 行为与退出码 |
|---|---|
| 缺省／`--dry-run` | 展示 `MISSING`、`CONFLICT`（含文本 diff）、`STALE`；预览正常退出 `0`，不创建目录或文件 |
| `--check` | 按原始 UTF-8 字节检查；一致退出 `0`，缺失、不同或残留退出 `1`，不写文件 |
| `--write` | 全量渲染并预检后，仅以排他创建方式新增缺失文件；相同文件不重写；已知内容冲突或残留退出 `2`，不开始写入 |
| 输入、路径或 I/O 错误 | stderr 说明原因，退出 `2`；校验不依赖 Python `assert` |

不自动覆盖或删除文件。扫描输出根的 Java 文件时，以来源文案、预期文件名及旧 Mapper 的“的内部持久化映射”Javadoc 识别可能残留的生成文件，保守报冲突供人工核对；这不是持久化文件所有权证明。无关手写文件保留。复合主键、无主键、跨 schema 同名表、未知字段类型／注释、非法 Unicode、Java 命名冲突、重复输出（含大小写别名）和输出越界均失败；路径检查包含已有符号链接，不跟随扫描目录中的链接到工程外读取文件。文件检查和写入 API 都会在任何建目录／创建文件前完整预编码全部预期内容，不能编码为 UTF-8 的输入不会留下空文件或部分新产物。

输出为 UTF-8、LF、稳定字段顺序。数据模型有变化时，先预览差异并人工审阅已有产物，再安排工程明确授权的替换；本工具没有强制覆盖、自动清理或自动迁移模式。

## 在已有项目中复用

脚本提供下列无写入 API，项目适配器可保留原命令、项目检查和测试入口：

```python
bindings = engine.render_outputs(model, config, project_root)  # dict[绝对 Path, str]
class_name, po, mapper = engine.render_table(table, group, config)
simple_type = engine.java_type(sql_type, config.get('type_overrides'))
property_name = engine.property_name(column, config.get('naming'))
```

`output_root(config, project_root)` 返回规范化输出根；`inspect_outputs(bindings, scan_root, generated_by, project_root)` 返回缺失、不同和疑似残留路径；`write_outputs(bindings, project_root)` 在再次预检后只创建缺失文件，调用方应先检查残留。`render_outputs` 校验全部表归属，`render_table` 仅处理一张表。路径经过物理规范化，macOS `/var` 与 `/private/var` 等别名会返回同一规范路径。

需要独立运行的工程可将单文件引擎作为固定版本副本纳入项目；记录 `VERSION`、来源和 SHA-256，升级时显式核对与权威脚本逐字一致。不要在运行时搜索个人技能目录、下载最新版或修改模型补造事实。映射行为、原始注释、导入排序、字段顺序和换行均应纳入已有工程兼容验证；编译、实库、事务、权限和并发分别按本次影响验证。
