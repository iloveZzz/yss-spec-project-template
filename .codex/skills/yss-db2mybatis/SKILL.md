---
name: yss-db2mybatis
description: 用于从数据库元数据或 DDL 生成 YSS 风格的 Domain Gateway、PO、Repository、Convertor 和 GatewayImpl。当用户要求按表结构、DDL、metadata 或数据库连接批量生成持久层代码时调用。
---

# yss-db2mybatis

这是一个生成器型 skill。优先复用脚本 `scripts/db2mybatis.py`，不要在对话里手写大段样板代码替代脚本。

## 何时使用

- 用户给出数据库表、DDL、metadata，要求生成 YSS 持久层代码。
- 用户要求批量生成 `PO / Repository / Convertor / GatewayImpl / Domain Gateway`。
- 用户要从 MySQL、PostgreSQL、Oracle、OpenGauss、OceanBase 提取元数据。
- 用户要先从 DDL 离线生成 metadata，再生成代码。

## 不适用

- 复杂 SQL 优化、手写 XML Mapper。
- 联合主键需要特殊建模且用户未确认策略。
- 用户只想补某个领域行为，而不是批量落持久层。

## 优先流程

1. 识别输入来源：`metadata.json`、数据库连接、DDL 文件、DDL 文本。
2. 先执行 `validate` 或 `extract` / `ddl2metadata`，不要直接盲生成。
3. 生成前优先用 `--dry-run` 预览。
4. 生成后检查输出路径、命名、主键策略和类型映射。
5. 如用户要继续补 Domain 或 Web，再衔接 `yss-domain`、`yss-web-controller`。

## 推荐命令

### 从数据库提取 metadata

```bash
python3 scripts/db2mybatis.py extract \
  --datasource-config references/datasource-config.example.json \
  --datasource-name your-datasource \
  --tables t_example \
  --output /tmp/metadata.json
```

### 从 DDL 生成 metadata

```bash
python3 scripts/db2mybatis.py ddl2metadata \
  --ddl-file /path/schema.sql \
  --db-type mysql \
  --database demo \
  --output /tmp/metadata.json
```

### 生成代码

```bash
python3 scripts/db2mybatis.py scaffold \
  --skill-root /Users/zhudaoming/.codex/skills/yss-db2mybatis \
  --metadata-file /tmp/metadata.json \
  --base-package com.yss.demo \
  --domain-segment example \
  --domain-java-root /path/project-domain/src/main/java \
  --infra-java-root /path/project-infra/src/main/java \
  --dry-run
```

## 关键参数

- 表过滤：`--tables`、`--include-tables-regex`、`--exclude-tables-regex`
- 安全控制：`--dry-run`、`--overwrite`
- 输入来源：`--metadata-file`、`--ddl-file`、`--ddl-sql`
- 主键策略：`--pk-strategy error|first`
- 项目约定：`--convention-file`

## 输出预期

- `domain/{segment}/gateway/*Gateway.java`
- `repository/entity/*PO.java`
- `repository/*Repository.java`
- `repository/convertor/*Convertor.java`
- `repository/gateway/impl/*GatewayImpl.java`

## 质量要求

- 遇到无法推断的类型时，给出明确告警，不要静默猜测。
- 联合主键默认报错，除非用户明确接受 `first` 策略。
- 默认先生成可编译骨架，再由调用方补复杂查询。
- 输出前检查生成路径是否真的对齐当前工程。

## 按需读取

- 主脚本：`scripts/db2mybatis.py`
- 类型映射：`references/type-mapping.json`
- 数据源示例：`references/datasource-config.example.json`
- 项目约定示例：`references/project-convention.example.json`
