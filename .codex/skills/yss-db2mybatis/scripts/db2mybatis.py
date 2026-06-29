#!/usr/bin/env python3
import argparse
import json
import re
import sys
from pathlib import Path
from typing import Dict, List

import tempfile

DEFAULT_AUDIT_COLUMNS = {"created_by", "created_date", "last_modified_by", "last_modified_date"}
DEFAULT_LOGIC_DELETE_FIELDS = ["deleted", "is_deleted"]
JAVA_IMPORTS = {
    "BigDecimal": "import java.math.BigDecimal;",
    "LocalDateTime": "import java.time.LocalDateTime;",
    "LocalDate": "import java.time.LocalDate;",
    "LocalTime": "import java.time.LocalTime;",
}


class SkillError(RuntimeError):
    pass


def log(message: str, verbose: bool = False):
    if verbose:
        print(f"[INFO] {message}")


def read_text(path: str) -> str:
    return Path(path).read_text(encoding="utf-8")


def write_text(path: str, content: str):
    p = Path(path)
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(content, encoding="utf-8")


def load_json(path: str) -> Dict:
    return json.loads(read_text(path))


def to_pascal_case(name: str) -> str:
    return "".join(part.capitalize() for part in re.split(r"[_\-\s]+", name) if part)


def to_camel_case(name: str) -> str:
    pascal = to_pascal_case(name)
    return pascal[:1].lower() + pascal[1:] if pascal else pascal


def lower_first(name: str) -> str:
    return name[:1].lower() + name[1:] if name else name


def upper_first(name: str) -> str:
    return name[:1].upper() + name[1:] if name else name


def normalize_sql_type(sql_type: str) -> str:
    if not sql_type:
        return ""
    t = sql_type.strip().lower()
    t = re.sub(r"\(.*\)", "", t)
    t = re.sub(r"\s+", " ", t)
    return t


def strip_sql_type(sql_type: str) -> str:
    normalized = normalize_sql_type(sql_type)
    return normalized.split()[0] if normalized else ""


def fill_template(template: str, values: Dict[str, str]) -> str:
    content = template
    for key, value in values.items():
        content = content.replace("${" + key + "}", value)
    return content


def default_path(skill_root: str, rel: str) -> str:
    return str((Path(skill_root) / rel).resolve())


def normalize_tables(tables: str):
    if not tables:
        return None
    return [x.strip() for x in tables.split(",") if x.strip()]


def apply_table_regex_filters(tables: List[Dict], include_regex: str, exclude_regex: str) -> List[Dict]:
    include_re = re.compile(include_regex) if include_regex else None
    exclude_re = re.compile(exclude_regex) if exclude_regex else None

    filtered = []
    for table in tables:
        name = table.get("table_name", "")
        if include_re and not include_re.search(name):
            continue
        if exclude_re and exclude_re.search(name):
            continue
        filtered.append(table)
    return filtered


def unquote_identifier(value: str) -> str:
    v = value.strip()
    if (v.startswith("`") and v.endswith("`")) or (v.startswith('"') and v.endswith('"')):
        v = v[1:-1]
    if "." in v:
        v = v.split(".")[-1]
    return v


def split_top_level(text: str, delimiter: str = ",") -> List[str]:
    parts = []
    buf = []
    depth = 0
    quote = ""
    i = 0
    while i < len(text):
        ch = text[i]
        if quote:
            buf.append(ch)
            if ch == quote and (i == 0 or text[i - 1] != "\\"):
                quote = ""
        else:
            if ch in ("'", '"', "`"):
                quote = ch
                buf.append(ch)
            elif ch == "(":
                depth += 1
                buf.append(ch)
            elif ch == ")":
                depth = max(0, depth - 1)
                buf.append(ch)
            elif ch == delimiter and depth == 0:
                part = "".join(buf).strip()
                if part:
                    parts.append(part)
                buf = []
            else:
                buf.append(ch)
        i += 1
    tail = "".join(buf).strip()
    if tail:
        parts.append(tail)
    return parts


def parse_sql_type(definition: str) -> str:
    lower_def = definition.lower()
    keywords = [
        r"\bnot\s+null\b",
        r"\bnull\b",
        r"\bdefault\b",
        r"\bcomment\b",
        r"\bprimary\s+key\b",
        r"\bauto_increment\b",
        r"\bgenerated\b",
        r"\bunique\b",
        r"\breferences\b",
        r"\bconstraint\b",
        r"\bcheck\b",
    ]
    pos = len(definition)
    for pattern in keywords:
        m = re.search(pattern, lower_def, re.IGNORECASE)
        if m:
            pos = min(pos, m.start())
    return definition[:pos].strip()


def parse_ddl_table(ddl_stmt: str) -> Dict:
    m = re.search(r"create\s+table\s+(?:if\s+not\s+exists\s+)?([`\".\w]+)", ddl_stmt, re.IGNORECASE)
    if not m:
        raise SkillError("DDL 解析失败：未识别 CREATE TABLE 语句")
    table_name = unquote_identifier(m.group(1))

    left = ddl_stmt.find("(", m.end())
    if left < 0:
        raise SkillError(f"DDL 解析失败：表 {table_name} 缺少字段定义")

    depth = 1
    quote = ""
    right = -1
    i = left + 1
    while i < len(ddl_stmt):
        ch = ddl_stmt[i]
        if quote:
            if ch == quote and ddl_stmt[i - 1] != "\\":
                quote = ""
        else:
            if ch in ("'", '"', "`"):
                quote = ch
            elif ch == "(":
                depth += 1
            elif ch == ")":
                depth -= 1
                if depth == 0:
                    right = i
                    break
        i += 1
    if right < 0:
        raise SkillError(f"DDL 解析失败：表 {table_name} 字段括号未闭合")

    body = ddl_stmt[left + 1:right]
    tail = ddl_stmt[right + 1:]
    table_comment = ""
    cm = re.search(r"comment\s*=\s*'([^']*)'", tail, re.IGNORECASE)
    if cm:
        table_comment = cm.group(1)

    columns = []
    primary_keys = []
    for item in split_top_level(body):
        s = item.strip().rstrip(",")
        lower_s = s.lower()
        if not s:
            continue

        if lower_s.startswith("primary key") or ("constraint" in lower_s and "primary key" in lower_s):
            pm = re.search(r"\((.*?)\)", s, re.IGNORECASE | re.DOTALL)
            if pm:
                for c in split_top_level(pm.group(1)):
                    primary_keys.append(unquote_identifier(c))
            continue

        if lower_s.startswith("key ") or lower_s.startswith("index ") or lower_s.startswith("unique key") \
                or lower_s.startswith("unique index") or lower_s.startswith("constraint") \
                or lower_s.startswith("foreign key"):
            continue

        cm = re.match(r"^\s*([`\".\w]+)\s+(.+)$", s, re.DOTALL)
        if not cm:
            continue
        col_name = unquote_identifier(cm.group(1))
        col_def = cm.group(2).strip()
        sql_type = parse_sql_type(col_def)
        lower_def = col_def.lower()
        nullable = not bool(re.search(r"\bnot\s+null\b", lower_def))
        primary_inline = bool(re.search(r"\bprimary\s+key\b", lower_def))
        auto_increment = bool(re.search(r"\bauto_increment\b", lower_def) or re.search(r"\bidentity\b", lower_def))
        comment = ""
        comment_m = re.search(r"comment\s+'([^']*)'", col_def, re.IGNORECASE)
        if comment_m:
            comment = comment_m.group(1)

        columns.append({
            "name": col_name,
            "sql_type": sql_type,
            "nullable": nullable,
            "primary": primary_inline,
            "auto_increment": auto_increment,
            "comment": comment,
        })
        if primary_inline and col_name not in primary_keys:
            primary_keys.append(col_name)

    pk_set = set(primary_keys)
    for col in columns:
        if col["name"] in pk_set:
            col["primary"] = True
            col["nullable"] = False

    return {
        "table_name": table_name,
        "table_comment": table_comment or table_name,
        "primary_keys": primary_keys,
        "columns": columns,
        "indexes": [],
        "foreign_keys": [],
    }


def metadata_from_ddl(ddl_text: str, db_type: str = "mysql", database: str = "ddl", schema: str = None) -> Dict:
    tables = []
    pos = 0
    pattern = re.compile(r"\bcreate\s+table\b", re.IGNORECASE)
    while True:
        m = pattern.search(ddl_text, pos)
        if not m:
            break
        start = m.start()
        next_m = pattern.search(ddl_text, m.end())
        end = next_m.start() if next_m else len(ddl_text)
        stmt = ddl_text[start:end].strip()
        if stmt:
            tables.append(parse_ddl_table(stmt))
        pos = end

    return {
        "db_type": db_type,
        "database": database,
        "schema": schema or database,
        "tables": tables,
    }


def read_ddl_input(args) -> str:
    if args.ddl_file and args.ddl_sql:
        raise SkillError("不能同时使用 --ddl-file 和 --ddl-sql")
    if args.ddl_file:
        return read_text(args.ddl_file)
    if args.ddl_sql:
        return args.ddl_sql
    raise SkillError("请提供 --ddl-file 或 --ddl-sql")


def resolve_java_type(sql_type: str, mapping: Dict[str, str]) -> str:
    normalized = normalize_sql_type(sql_type)
    base = strip_sql_type(sql_type)
    if normalized in mapping:
        return mapping[normalized]
    if base in mapping:
        return mapping[base]
    return "String"


def infer_domain_name(table_name: str, table_prefix: str) -> str:
    name = table_name
    if table_prefix and table_name.startswith(table_prefix):
        name = table_name[len(table_prefix):]
    return to_pascal_case(name)


def merge_datasource_args(args):
    if not args.datasource_config:
        return args
    cfg = load_json(args.datasource_config)
    dss = cfg.get("datasources") or {}
    if not args.datasource_name:
        raise SkillError("使用 --datasource-config 时必须传 --datasource-name")
    
    # 优先从 datasources 键下获取，如果没找到，尝试直接从根对象获取
    ds = dss.get(args.datasource_name)
    if not ds:
        ds = cfg.get(args.datasource_name)

    if not ds:
        raise SkillError(f"datasource 未找到: {args.datasource_name}")

    for key in ["db_type", "host", "port", "user", "password", "database", "schema"]:
        if getattr(args, key, None) in (None, "") and ds.get(key) not in (None, ""):
            setattr(args, key, ds.get(key))
    return args


def require_conn_args(args):
    if not args.db_type:
        raise SkillError("缺少 --db-type")
    missing = [k for k in ["host", "port", "user", "password", "database"] if not getattr(args, k, None)]
    if missing:
        raise SkillError("缺少连接参数: " + ", ".join(missing))


def mysql_metadata(args, db_type="mysql"):
    try:
        import pymysql
    except ImportError as e:
        raise SkillError(f"{db_type} 需要安装 pymysql: pip install pymysql") from e

    try:
        conn = pymysql.connect(
            host=args.host,
            port=int(args.port),
            user=args.user,
            password=args.password,
            database=args.database,
            charset="utf8mb4",
            cursorclass=pymysql.cursors.DictCursor,
        )
    except pymysql.MySQLError as e:
        raise SkillError(f"数据库连接失败: {str(e)}\n\n排查建议：\n  1. 检查数据库服务是否启动\n  2. 检查主机地址和端口是否正确\n  3. 检查用户名和密码是否正确\n  4. 检查数据库名是否正确\n  5. 检查网络连接是否正常\n") from e

    wanted = normalize_tables(args.tables)
    tables = []
    try:
        with conn.cursor() as cursor:
            if wanted:
                placeholders = ",".join(["%s"] * len(wanted))
                cursor.execute(
                    f"""
                    SELECT TABLE_NAME, TABLE_COMMENT
                    FROM information_schema.tables
                    WHERE table_schema=%s AND table_type='BASE TABLE' AND table_name IN ({placeholders})
                    ORDER BY table_name
                    """,
                    [args.database] + wanted,
                )
            else:
                cursor.execute(
                    """
                    SELECT TABLE_NAME, TABLE_COMMENT
                    FROM information_schema.tables
                    WHERE table_schema=%s AND table_type='BASE TABLE'
                    ORDER BY table_name
                    """,
                    [args.database],
                )
            table_rows = cursor.fetchall()

            for row in table_rows:
                table_name = row["TABLE_NAME"]
                cursor.execute(
                    """
                    SELECT COLUMN_NAME, DATA_TYPE, COLUMN_TYPE, IS_NULLABLE,
                           COLUMN_KEY, EXTRA, COLUMN_COMMENT
                    FROM information_schema.columns
                    WHERE table_schema=%s AND table_name=%s
                    ORDER BY ORDINAL_POSITION
                    """,
                    [args.database, table_name],
                )
                cols = cursor.fetchall()
                pks = []
                columns = []
                for col in cols:
                    is_pk = col["COLUMN_KEY"] == "PRI"
                    if is_pk:
                        pks.append(col["COLUMN_NAME"])
                    columns.append(
                        {
                            "name": col["COLUMN_NAME"],
                            "sql_type": col["COLUMN_TYPE"] or col["DATA_TYPE"],
                            "nullable": col["IS_NULLABLE"] == "YES",
                            "primary": is_pk,
                            "auto_increment": "auto_increment" in (col.get("EXTRA") or "").lower(),
                            "comment": col.get("COLUMN_COMMENT") or "",
                        }
                    )

                cursor.execute(
                    """
                    SELECT
                        INDEX_NAME AS index_name,
                        COLUMN_NAME AS column_name,
                        NON_UNIQUE = 0 AS is_unique,
                        INDEX_NAME = 'PRIMARY' AS is_primary
                    FROM information_schema.STATISTICS
                    WHERE TABLE_SCHEMA = %s AND TABLE_NAME = %s
                    ORDER BY INDEX_NAME, SEQ_IN_INDEX
                    """,
                    [args.database, table_name],
                )
                index_rows = cursor.fetchall()
                indexes = {}
                for idx_row in index_rows:
                    idx_name = idx_row["index_name"]
                    if idx_name not in indexes:
                        indexes[idx_name] = {
                            "name": idx_name,
                            "columns": [],
                            "unique": idx_row["is_unique"],
                            "primary": idx_row["is_primary"]
                        }
                    indexes[idx_name]["columns"].append(idx_row["column_name"])

                cursor.execute(
                    """
                    SELECT
                        CONSTRAINT_NAME AS fk_name,
                        COLUMN_NAME AS column_name,
                        REFERENCED_TABLE_NAME AS referenced_table,
                        REFERENCED_COLUMN_NAME AS referenced_column
                    FROM information_schema.KEY_COLUMN_USAGE
                    WHERE TABLE_SCHEMA = %s
                        AND TABLE_NAME = %s
                        AND REFERENCED_TABLE_NAME IS NOT NULL
                    ORDER BY CONSTRAINT_NAME, ORDINAL_POSITION
                    """,
                    [args.database, table_name],
                )
                fk_rows = cursor.fetchall()
                foreign_keys = {}
                for fk_row in fk_rows:
                    fk_name = fk_row["fk_name"]
                    if fk_name not in foreign_keys:
                        foreign_keys[fk_name] = {
                            "name": fk_name,
                            "columns": [],
                            "referenced_table": fk_row["referenced_table"],
                            "referenced_columns": []
                        }
                    foreign_keys[fk_name]["columns"].append(fk_row["column_name"])
                    foreign_keys[fk_name]["referenced_columns"].append(fk_row["referenced_column"])

                tables.append(
                    {
                        "table_name": table_name,
                        "table_comment": row.get("TABLE_COMMENT") or table_name,
                        "primary_keys": pks,
                        "columns": columns,
                        "indexes": list(indexes.values()),
                        "foreign_keys": list(foreign_keys.values()),
                    }
                )
    finally:
        conn.close()

    return {"db_type": db_type, "database": args.database, "schema": args.database, "tables": tables}


def postgres_metadata(args, db_type="postgres"):
    try:
        import psycopg2
        import psycopg2.extras
    except ImportError as e:
        raise SkillError(f"{db_type} 需要安装 psycopg2-binary: pip install psycopg2-binary") from e

    schema = args.schema or "public"
    conn = psycopg2.connect(
        host=args.host,
        port=int(args.port),
        user=args.user,
        password=args.password,
        dbname=args.database,
    )
    wanted = normalize_tables(args.tables)
    tables = []
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cursor:
            if wanted:
                cursor.execute(
                    """
                    SELECT t.table_name, pgd.description AS table_comment
                    FROM information_schema.tables t
                    LEFT JOIN pg_catalog.pg_statio_all_tables st
                           ON st.schemaname = t.table_schema
                          AND st.relname = t.table_name
                    LEFT JOIN pg_catalog.pg_description pgd
                           ON pgd.objoid = st.relid
                          AND pgd.objsubid = 0
                    WHERE t.table_schema=%s AND t.table_type='BASE TABLE' AND t.table_name = ANY(%s)
                    ORDER BY t.table_name
                    """,
                    [schema, wanted],
                )
            else:
                cursor.execute(
                    """
                    SELECT t.table_name, pgd.description AS table_comment
                    FROM information_schema.tables t
                    LEFT JOIN pg_catalog.pg_statio_all_tables st
                           ON st.schemaname = t.table_schema
                          AND st.relname = t.table_name
                    LEFT JOIN pg_catalog.pg_description pgd
                           ON pgd.objoid = st.relid
                          AND pgd.objsubid = 0
                    WHERE t.table_schema=%s AND t.table_type='BASE TABLE'
                    ORDER BY t.table_name
                    """,
                    [schema],
                )
            table_rows = cursor.fetchall()

            for row in table_rows:
                table_name = row["table_name"]
                table_comment = row.get("table_comment") or table_name
                cursor.execute(
                    """
                    SELECT c.column_name,
                           c.data_type,
                           c.udt_name,
                           c.is_nullable,
                           pgd.description AS column_comment
                    FROM information_schema.columns c
                    LEFT JOIN pg_catalog.pg_statio_all_tables st
                           ON st.schemaname = c.table_schema
                          AND st.relname = c.table_name
                    LEFT JOIN pg_catalog.pg_description pgd
                           ON pgd.objoid = st.relid
                          AND pgd.objsubid = c.ordinal_position
                    WHERE c.table_schema=%s AND c.table_name=%s
                    ORDER BY c.ordinal_position
                    """,
                    [schema, table_name],
                )
                col_rows = cursor.fetchall()

                cursor.execute(
                    """
                    SELECT kcu.column_name
                    FROM information_schema.table_constraints tc
                    JOIN information_schema.key_column_usage kcu
                      ON tc.constraint_name = kcu.constraint_name
                     AND tc.table_schema = kcu.table_schema
                     AND tc.table_name = kcu.table_name
                    WHERE tc.table_schema=%s AND tc.table_name=%s AND tc.constraint_type='PRIMARY KEY'
                    ORDER BY kcu.ordinal_position
                    """,
                    [schema, table_name],
                )
                pk_rows = cursor.fetchall()
                pks = [x["column_name"] for x in pk_rows]
                pk_set = set(pks)

                cursor.execute(
                    """
                    SELECT 
                        ic.relname AS index_name,
                        a.attname AS column_name,
                        idx.indisunique AS is_unique,
                        idx.indisprimary AS is_primary
                    FROM pg_index idx
                    JOIN pg_class ic ON idx.indexrelid = ic.oid
                    JOIN pg_class t ON idx.indrelid = t.oid
                    JOIN pg_namespace n ON t.relnamespace = n.oid
                    JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(idx.indkey)
                    WHERE n.nspname = %s AND t.relname = %s
                    ORDER BY ic.relname, a.attnum
                    """,
                    [schema, table_name],
                )
                index_rows = cursor.fetchall()
                indexes = {}
                for idx_row in index_rows:
                    idx_name = idx_row["index_name"]
                    if idx_name not in indexes:
                        indexes[idx_name] = {
                            "name": idx_name,
                            "columns": [],
                            "unique": idx_row["is_unique"],
                            "primary": idx_row["is_primary"]
                        }
                    indexes[idx_name]["columns"].append(idx_row["column_name"])

                cursor.execute(
                    """
                    SELECT
                        tc.constraint_name AS fk_name,
                        kcu.column_name AS column_name,
                        ccu.table_name AS referenced_table,
                        ccu.column_name AS referenced_column
                    FROM information_schema.table_constraints tc
                    JOIN information_schema.key_column_usage kcu
                        ON tc.constraint_name = kcu.constraint_name
                    JOIN information_schema.constraint_column_usage ccu
                        ON ccu.constraint_name = tc.constraint_name
                    WHERE tc.table_schema = %s
                        AND tc.table_name = %s
                        AND tc.constraint_type = 'FOREIGN KEY'
                    ORDER BY tc.constraint_name, kcu.ordinal_position
                    """,
                    [schema, table_name],
                )
                fk_rows = cursor.fetchall()
                foreign_keys = {}
                for fk_row in fk_rows:
                    fk_name = fk_row["fk_name"]
                    if fk_name not in foreign_keys:
                        foreign_keys[fk_name] = {
                            "name": fk_name,
                            "columns": [],
                            "referenced_table": fk_row["referenced_table"],
                            "referenced_columns": []
                        }
                    foreign_keys[fk_name]["columns"].append(fk_row["column_name"])
                    foreign_keys[fk_name]["referenced_columns"].append(fk_row["referenced_column"])

                columns = []
                for col in col_rows:
                    raw_type = col["data_type"]
                    if col["udt_name"]:
                        raw_type = col["udt_name"]
                    columns.append(
                        {
                            "name": col["column_name"],
                            "sql_type": raw_type,
                            "nullable": col["is_nullable"] == "YES",
                            "primary": col["column_name"] in pk_set,
                            "auto_increment": col["udt_name"] in {"serial", "bigserial"},
                            "comment": col.get("column_comment") or "",
                        }
                    )

                tables.append(
                    {
                        "table_name": table_name,
                        "table_comment": table_comment,
                        "primary_keys": pks,
                        "columns": columns,
                        "indexes": list(indexes.values()),
                        "foreign_keys": list(foreign_keys.values()),
                    }
                )
    finally:
        conn.close()

    return {"db_type": db_type, "database": args.database, "schema": schema, "tables": tables}


def oracle_metadata(args):
    try:
        import oracledb
    except ImportError as e:
        raise SkillError("oracle 需要安装 oracledb: pip install oracledb") from e

    dsn = f"{args.host}:{int(args.port)}/{args.database}"
    conn = oracledb.connect(user=args.user, password=args.password, dsn=dsn)
    wanted = normalize_tables(args.tables)
    tables = []
    try:
        cursor = conn.cursor()
        if wanted:
            names = [x.upper() for x in wanted]
            binds = {}
            bind_keys = []
            for idx, name in enumerate(names):
                key = f"t{idx}"
                bind_keys.append(f":{key}")
                binds[key] = name
            cursor.execute(
                f"SELECT table_name FROM user_tables WHERE table_name IN ({','.join(bind_keys)}) ORDER BY table_name",
                binds,
            )
        else:
            cursor.execute("SELECT table_name FROM user_tables ORDER BY table_name")
        table_rows = cursor.fetchall()

        for row in table_rows:
                table_name = row[0]
                cursor.execute(
                    """
                    SELECT utc.column_name,
                           utc.data_type,
                           utc.data_precision,
                           utc.data_scale,
                           utc.nullable,
                           ucc.comments
                    FROM user_tab_columns utc
                    LEFT JOIN user_col_comments ucc
                      ON utc.table_name = ucc.table_name
                     AND utc.column_name = ucc.column_name
                    WHERE utc.table_name = :table_name
                    ORDER BY utc.column_id
                    """,
                    {"table_name": table_name},
                )
                col_rows = cursor.fetchall()

                cursor.execute(
                    """
                    SELECT cols.column_name
                    FROM user_constraints cons
                    JOIN user_cons_columns cols
                      ON cons.constraint_name = cols.constraint_name
                    WHERE cons.constraint_type='P' AND cons.table_name=:table_name
                    ORDER BY cols.position
                    """,
                    {"table_name": table_name},
                )
                pks = [x[0].lower() for x in cursor.fetchall()]
                pk_set = set(pks)

                cursor.execute(
                    """
                    SELECT column_name
                    FROM user_tab_identity_cols
                    WHERE table_name = :table_name
                    """,
                    {"table_name": table_name},
                )
                identity_cols = {x[0].lower() for x in cursor.fetchall()}

                cursor.execute(
                    """
                    SELECT
                        ui.index_name,
                        uic.column_name,
                        ui.uniqueness = 'UNIQUE' AS is_unique,
                        ui.index_name IN (
                            SELECT uc.constraint_name
                            FROM user_constraints uc
                            WHERE uc.table_name = :table_name AND uc.constraint_type = 'P'
                        ) AS is_primary
                    FROM user_indexes ui
                    JOIN user_ind_columns uic
                        ON ui.index_name = uic.index_name
                    WHERE ui.table_name = :table_name
                    ORDER BY ui.index_name, uic.column_position
                    """,
                    {"table_name": table_name},
                )
                index_rows = cursor.fetchall()
                indexes = {}
                for idx_row in index_rows:
                    idx_name = idx_row[0].lower()
                    if idx_name not in indexes:
                        indexes[idx_name] = {
                            "name": idx_name,
                            "columns": [],
                            "unique": idx_row[2],
                            "primary": idx_row[3]
                        }
                    indexes[idx_name]["columns"].append(idx_row[1].lower())

                cursor.execute(
                    """
                    SELECT
                        uc.constraint_name AS fk_name,
                        ucc.column_name AS column_name,
                        ruc.table_name AS referenced_table,
                        rucc.column_name AS referenced_column
                    FROM user_constraints uc
                    JOIN user_cons_columns ucc
                        ON uc.constraint_name = ucc.constraint_name
                    JOIN user_constraints ruc
                        ON uc.r_constraint_name = ruc.constraint_name
                    JOIN user_cons_columns rucc
                        ON ruc.constraint_name = rucc.constraint_name
                        AND ucc.position = rucc.position
                    WHERE uc.table_name = :table_name
                        AND uc.constraint_type = 'R'
                    ORDER BY uc.constraint_name, ucc.position
                    """,
                    {"table_name": table_name},
                )
                fk_rows = cursor.fetchall()
                foreign_keys = {}
                for fk_row in fk_rows:
                    fk_name = fk_row[0].lower()
                    if fk_name not in foreign_keys:
                        foreign_keys[fk_name] = {
                            "name": fk_name,
                            "columns": [],
                            "referenced_table": fk_row[2].lower(),
                            "referenced_columns": []
                        }
                    foreign_keys[fk_name]["columns"].append(fk_row[1].lower())
                    foreign_keys[fk_name]["referenced_columns"].append(fk_row[3].lower())

                cursor.execute(
                    """
                    SELECT comments
                    FROM user_tab_comments
                    WHERE table_name = :table_name
                    """,
                    {"table_name": table_name},
                )
                table_comment_row = cursor.fetchone()
                table_comment = (table_comment_row[0] or table_name.lower()) if table_comment_row else table_name.lower()

                columns = []
                for col in col_rows:
                    col_name = col[0].lower()
                    data_type = (col[1] or "").lower()
                    precision = col[2]
                    scale = col[3]

                    sql_type = data_type
                    if data_type == "number":
                        if scale and int(scale) > 0:
                            sql_type = "numeric"
                        elif precision and int(precision) <= 9:
                            sql_type = "integer"
                        else:
                            sql_type = "bigint"

                    columns.append(
                        {
                            "name": col_name,
                            "sql_type": sql_type,
                            "nullable": col[4] == "Y",
                            "primary": col_name in pk_set,
                            "auto_increment": col_name in identity_cols,
                            "comment": col[5] or "",
                        }
                    )

                tables.append(
                    {
                        "table_name": table_name.lower(),
                        "table_comment": table_comment,
                        "primary_keys": pks,
                        "columns": columns,
                        "indexes": list(indexes.values()),
                        "foreign_keys": list(foreign_keys.values()),
                    }
                )
    finally:
        conn.close()

    return {"db_type": "oracle", "database": args.database, "schema": args.user, "tables": tables}


def extract_metadata(args):
    args = merge_datasource_args(args)
    require_conn_args(args)
    
    try:
        if args.db_type == "mysql":
            metadata = mysql_metadata(args, db_type="mysql")
        elif args.db_type == "postgres":
            metadata = postgres_metadata(args, db_type="postgres")
        elif args.db_type == "oracle":
            metadata = oracle_metadata(args)
        elif args.db_type == "opengauss":
            metadata = postgres_metadata(args, db_type="opengauss")
        elif args.db_type == "oceanbase":
            metadata = mysql_metadata(args, db_type="oceanbase")
        else:
            raise SkillError(f"不支持的 db_type: {args.db_type}")
    except Exception as e:
        error_msg = f"数据库连接失败: {e}\n\n"
        error_msg += "排查建议：\n"
        error_msg += "  1. 检查数据库服务是否启动\n"
        error_msg += "  2. 检查主机地址和端口是否正确\n"
        error_msg += "  3. 检查用户名和密码是否正确\n"
        error_msg += "  4. 检查数据库名是否正确\n"
        if args.db_type == "postgres":
            error_msg += "  5. 检查 schema 是否正确（PostgreSQL 默认为 public）\n"
        error_msg += "  6. 检查网络连接是否正常\n"
        raise SkillError(error_msg) from e

    all_tables = metadata.get("tables", [])
    filtered_tables = apply_table_regex_filters(all_tables, args.include_tables_regex, args.exclude_tables_regex)
    
    if not filtered_tables and all_tables:
        available_tables = ", ".join([t["table_name"] for t in all_tables])
        raise SkillError(f"没有匹配到表。可用表：{available_tables}")
    
    metadata["tables"] = filtered_tables
    return metadata


def java_imports_for_columns(columns: List[Dict], mapping: Dict[str, str]) -> str:
    imports = set()
    for col in columns:
        java_type = resolve_java_type(col["sql_type"], mapping)
        if java_type in JAVA_IMPORTS:
            imports.add(JAVA_IMPORTS[java_type])
    return "\n".join(sorted(imports))


def build_fields(columns: List[Dict], mapping: Dict[str, str], skip_columns: set, for_po: bool):
    lines = []
    usable = []
    for col in columns:
        if col["name"] in skip_columns:
            continue
        usable.append(col)
        field_name = to_camel_case(col["name"])
        java_type = resolve_java_type(col["sql_type"], mapping)
        if col.get("comment"):
            lines.append(f"/** {col['comment']} */")
        if for_po:
            if col.get("primary"):
                id_type = "AUTO" if col.get("auto_increment") else "ASSIGN_ID"
                lines.append(f'@TableId(value = "{col["name"]}", type = IdType.{id_type})')
            else:
                lines.append(f'    @TableField("{col["name"]}")')
        lines.append(f"    private {java_type} {field_name};")
        lines.append("")

    while lines and not lines[-1].strip():
        lines.pop()
    return "\n".join(lines), usable


def pick_primary_column(table: Dict, columns: List[Dict], pk_strategy: str) -> Dict:
    pks = table.get("primary_keys") or []
    if len(pks) > 1 and pk_strategy == "error":
        raise SkillError(f"表 {table['table_name']} 为联合主键 {pks}，当前 pk_strategy=error。可改用 --pk-strategy first")

    if pks:
        first = pks[0]
        for col in columns:
            if col["name"] == first:
                return col
    for col in columns:
        if col.get("primary"):
            return col
    for col in columns:
        if col["name"] == "id":
            return col
    return {"name": "id", "sql_type": "bigint", "primary": True, "auto_increment": False}


def order_by_expr(columns: List[Dict], domain_name: str, pk_field_name: str) -> str:
    names = {x["name"] for x in columns}
    if "created_date" in names:
        return f"{domain_name}PO::getCreatedDate"
    return f"{domain_name}PO::get{upper_first(pk_field_name)}"


def write_java_file(path: Path, content: str, dry_run: bool, overwrite: bool):
    if path.exists() and not overwrite:
        raise SkillError(f"文件已存在: {path}. 如需覆盖请添加 --overwrite")
    if dry_run:
        return
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content.strip() + "\n", encoding="utf-8")


def normalize_scaffold_args(args):
    if not args.type_mapping:
        args.type_mapping = default_path(args.skill_root, "references/type-mapping.json")
    if not args.po_template:
        args.po_template = default_path(args.skill_root, "assets/po.java.template")
    if not args.domain_model_template:
        args.domain_model_template = default_path(args.skill_root, "assets/domain_model.java.template")
    if not args.repository_template:
        args.repository_template = default_path(args.skill_root, "assets/repository.java.template")
    if not args.domain_gateway_template:
        args.domain_gateway_template = default_path(args.skill_root, "assets/domain_gateway.java.template")
    if not args.gateway_impl_template:
        args.gateway_impl_template = default_path(args.skill_root, "assets/gateway_impl.java.template")
    if not args.convertor_template:
        args.convertor_template = default_path(args.skill_root, "assets/convertor.java.template")

    convention = {
        "audit_columns": list(DEFAULT_AUDIT_COLUMNS),
        "logic_delete_fields": list(DEFAULT_LOGIC_DELETE_FIELDS),
        "pk_strategy": args.pk_strategy,
        "page_method_name": "page",
    }

    if args.convention_file:
        external = load_json(args.convention_file)
        convention.update(external)

    if args.keep_audit_columns:
        convention["audit_columns"] = []
    args._convention = convention
    return args


def build_paths(args, domain_name: str, domain_segment: str) -> Dict[str, Path]:
    domain_root = Path(args.domain_java_root)
    infra_root = Path(args.infra_java_root)
    
    base_path = Path(args.base_package.replace(".", "/"))
    
    if domain_segment:
        domain_sub_path = base_path / "domain" / domain_segment
    else:
        domain_sub_path = base_path / "domain" / domain_name.lower()

    return {
        "domain_model": domain_root / domain_sub_path / "model" / f"{domain_name}.java",
        "domain_gateway": domain_root / domain_sub_path / "gateway" / f"{domain_name}Gateway.java",
        "po": infra_root / base_path / "repository" / "entity" / f"{domain_name}PO.java",
        "repo": infra_root / base_path / "repository" / f"{domain_name}Repository.java",
        "gateway_impl": infra_root / base_path / "repository" / "gateway" / "impl" / f"{domain_name}GatewayImpl.java",
        "convertor": infra_root / base_path / "repository" / "convertor" / f"{domain_name}Convertor.java",
    }


def template_text(path: str) -> str:
    return read_text(path)


def generate_table(table: Dict, args, mapping: Dict[str, str]) -> List[Path]:
    conv = args._convention
    skip_columns = set(conv.get("audit_columns") or [])
    logic_delete_fields = conv.get("logic_delete_fields") or []
    base_entity_class = conv.get("base_entity_class")

    domain_name = infer_domain_name(table["table_name"], args.table_prefix)
    domain_segment = args.domain_segment
    
    if domain_segment:
        model_pkg = f"{args.base_package}.domain.{domain_segment}.model"
        gateway_pkg = f"{args.base_package}.domain.{domain_segment}.gateway"
    else:
        model_pkg = f"{args.base_package}.domain.{domain_name.lower()}.model"
        gateway_pkg = f"{args.base_package}.domain.{domain_name.lower()}.gateway"

    method_add = f"add{domain_name}"
    method_update = f"update{domain_name}"
    method_delete = f"delete{domain_name}"
    method_get = f"get{domain_name}ById"
    method_page = f"page{domain_name}"

    po_fields_block, po_columns = build_fields(table.get("columns", []), mapping, skip_columns, for_po=True)
    domain_fields_block, domain_columns = build_fields(table.get("columns", []), mapping, skip_columns, for_po=False)

    pk_col = pick_primary_column(table, domain_columns, conv.get("pk_strategy", "error"))
    pk_field_name = to_camel_case(pk_col["name"])
    pk_java_type = resolve_java_type(pk_col["sql_type"], mapping)
    pk_getter = "get" + upper_first(to_camel_case(pk_col["name"]))

    paths = build_paths(args, domain_name, domain_segment)


    table_comment = (table.get("table_comment") or table["table_name"]).replace("*/", "")
    po_content = fill_template(template_text(args.po_template), {
        "base_package": args.base_package,
        "table_name": table["table_name"],
        "table_comment": table_comment,
        "domain_name": domain_name,
        "fields_block": po_fields_block,
        "extra_imports": java_imports_for_columns(po_columns, mapping),
    })
    domain_model_content = fill_template(template_text(args.domain_model_template), {
        "base_package": args.base_package,
        "model_pkg": model_pkg,
        "domain_segment": domain_segment,
        "table_comment": table_comment,
        "domain_name": domain_name,
        "fields_block": domain_fields_block,
        "extra_imports": java_imports_for_columns(domain_columns, mapping),
    })
    repo_content = fill_template(template_text(args.repository_template), {
        "base_package": args.base_package,
        "domain_name": domain_name,
    })
    domain_gateway_content = fill_template(template_text(args.domain_gateway_template), {
        "base_package": args.base_package,
        "gateway_pkg": gateway_pkg,
        "model_pkg": model_pkg,
        "domain_segment": domain_segment,
        "domain_name": domain_name,
        "pk_java_type": pk_java_type,
        "pk_field_name": pk_field_name,
        "method_add": method_add,
        "method_update": method_update,
        "method_delete": method_delete,
        "method_get": method_get,
        "method_page": method_page,
    })

    logic_delete_condition = ""
    field_names = {c["name"] for c in domain_columns}
    for logic_field in logic_delete_fields:
        if logic_field in field_names:
            logic_delete_condition = f"        wrapper.eq({domain_name}PO::get{upper_first(to_camel_case(logic_field))}, 0);"
            break

    convertor_content = fill_template(template_text(args.convertor_template), {
        "base_package": args.base_package,
        "model_pkg": model_pkg,
        "domain_segment": domain_segment,
        "domain_name": domain_name,
    })

    gw_impl_content = fill_template(template_text(args.gateway_impl_template), {
        "base_package": args.base_package,
        "gateway_pkg": gateway_pkg,
        "model_pkg": model_pkg,
        "domain_segment": domain_segment,
        "domain_name": domain_name,
        "repository_field_name": lower_first(domain_name) + "Repository",
        "pk_java_type": pk_java_type,
        "pk_field_name": pk_field_name,
        "pk_getter": pk_getter,
        "order_by_expr": order_by_expr(domain_columns, domain_name, pk_field_name),
        "logic_delete_condition": logic_delete_condition,
        "method_add": method_add,
        "method_update": method_update,
        "method_delete": method_delete,
        "method_get": method_get,
        "method_page": method_page,
    })

    plan = [
        (paths["domain_model"], domain_model_content),
        (paths["domain_gateway"], domain_gateway_content),
        (paths["po"], po_content),
        (paths["repo"], repo_content),
        (paths["gateway_impl"], gw_impl_content),
        (paths["convertor"], convertor_content),
    ]

    generated = []
    for target, content in plan:
        generated.append(target)
        write_java_file(target, content, args.dry_run, args.overwrite)
    return generated


def validate_templates(args):
    expected = {
        args.po_template: ["${domain_name}", "${fields_block}", "${table_name}"],
        args.domain_model_template: ["${domain_name}"],
        args.repository_template: ["${domain_name}"],
        args.domain_gateway_template: ["${domain_name}", "${pk_java_type}"],
        args.gateway_impl_template: ["${domain_name}", "${repository_field_name}"],
        args.convertor_template: ["${domain_name}"],
    }
    for file_path, tokens in expected.items():
        text = read_text(file_path)
        for token in tokens:
            if token not in text:
                raise SkillError(f"模板 {file_path} 缺少占位符 {token}")


def run_extract(args):
    metadata = extract_metadata(args)
    write_text(args.output, json.dumps(metadata, ensure_ascii=False, indent=2) + "\n")
    print(f"metadata written: {args.output}")
    print(f"tables: {len(metadata.get('tables', []))}")


def run_ddl2metadata(args):
    ddl_text = read_ddl_input(args)
    metadata = metadata_from_ddl(
        ddl_text=ddl_text,
        db_type=(args.db_type or "mysql"),
        database=(args.database or "ddl"),
        schema=args.schema,
    )
    if not metadata.get("tables"):
        raise SkillError("DDL 中未识别到 CREATE TABLE")
    write_text(args.output, json.dumps(metadata, ensure_ascii=False, indent=2) + "\n")
    print(f"metadata written: {args.output}")
    print(f"tables: {len(metadata.get('tables', []))}")


def print_progress_bar(current: int, total: int, prefix: str = ""):
    bar_length = 40
    progress = current / total
    filled_length = int(bar_length * progress)
    bar = "█" * filled_length + "░" * (bar_length - filled_length)
    sys.stdout.write(f"\r{prefix}[{bar}] {current}/{total} ({int(progress * 100)}%)")
    sys.stdout.flush()


def run_scaffold(args):
    normalize_scaffold_args(args)
    validate_templates(args)
    mapping = load_json(args.type_mapping)

    if args.metadata_file:
        metadata = load_json(args.metadata_file)
        metadata["tables"] = apply_table_regex_filters(metadata.get("tables", []), args.include_tables_regex, args.exclude_tables_regex)
    elif args.ddl_file or args.ddl_sql:
        metadata = metadata_from_ddl(
            ddl_text=read_ddl_input(args),
            db_type=(args.db_type or "mysql"),
            database=(args.database or "ddl"),
            schema=args.schema,
        )
        metadata["tables"] = apply_table_regex_filters(metadata.get("tables", []), args.include_tables_regex, args.exclude_tables_regex)
    else:
        metadata = extract_metadata(args)

    tables = metadata.get("tables") or []
    if not tables:
        raise SkillError("没有匹配到可生成的表")

    generated_files = []
    total = len(tables)
    for i, table in enumerate(tables, 1):
        if not args.verbose and total > 1:
            print_progress_bar(i, total, prefix="生成进度: ")
        log(f"generate table: {table['table_name']}", args.verbose)
        generated_files.extend(generate_table(table, args, mapping))
    
    if not args.verbose and total > 1:
        print()
    
    for path in generated_files:
        prefix = "planned" if args.dry_run else "generated"
        print(f"{prefix}: {path}")
    print(f"done. file count: {len(generated_files)}")


def run_validate(args):
    normalize_scaffold_args(args)
    validate_templates(args)
    checks = []

    if args.datasource_config:
        cfg = load_json(args.datasource_config)
        if "datasources" not in cfg or not isinstance(cfg["datasources"], dict):
            raise SkillError("datasource 配置文件缺少 datasources 对象")
        checks.append("datasource-config")

    if args.convention_file:
        conv = load_json(args.convention_file)
        if not isinstance(conv, dict):
            raise SkillError("convention 文件必须为 JSON 对象")
        checks.append("convention-file")

    checks.append("templates")

    print("validate passed")
    print("checks: " + ", ".join(checks))


def add_conn_args(p):
    p.add_argument("--datasource-config", help="数据源配置 JSON")
    p.add_argument("--datasource-name", help="数据源名称")
    p.add_argument("--db-type", choices=["mysql", "oracle", "postgres"], help="数据库类型")
    p.add_argument("--host")
    p.add_argument("--port")
    p.add_argument("--user")
    p.add_argument("--password")
    p.add_argument("--database")
    p.add_argument("--schema")
    p.add_argument("--tables", help="逗号分隔的表名")
    p.add_argument("--include-tables-regex", help="包含表名正则")
    p.add_argument("--exclude-tables-regex", help="排除表名正则")


def add_scaffold_args(p):
    p.add_argument("--skill-root", required=True)
    p.add_argument("--base-package", required=True)
    p.add_argument("--domain-segment", required=True)
    p.add_argument("--domain-java-root", required=True)
    p.add_argument("--infra-java-root", required=True)
    p.add_argument("--table-prefix", default="t_")
    p.add_argument("--po-template")
    p.add_argument("--domain-model-template")
    p.add_argument("--repository-template")
    p.add_argument("--domain-gateway-template")
    p.add_argument("--gateway-impl-template")
    p.add_argument("--convertor-template")
    p.add_argument("--type-mapping")
    p.add_argument("--convention-file")
    p.add_argument("--pk-strategy", choices=["error", "first"], default="error")
    p.add_argument("--keep-audit-columns", action="store_true")
    p.add_argument("--overwrite", action="store_true", help="允许覆盖已存在文件")
    p.add_argument("--dry-run", action="store_true", help="只打印计划，不写文件")
    p.add_argument("--verbose", action="store_true")
    p.add_argument("--ddl-file", help="DDL SQL 文件路径（可替代 --metadata-file 与数据库连接）")
    p.add_argument("--ddl-sql", help="DDL SQL 文本（可替代 --metadata-file 与数据库连接）")


def build_parser():
    parser = argparse.ArgumentParser(description="db metadata to yss mybatis scaffold")
    sub = parser.add_subparsers(dest="cmd", required=True)

    p_init = sub.add_parser("init", help="交互式配置向导")
    p_init.add_argument("--skill-root", required=True, help="skill 根目录路径")

    p_extract = sub.add_parser("extract", help="提取数据库元数据")
    add_conn_args(p_extract)
    p_extract.add_argument("--output", required=True)

    p_ddl = sub.add_parser("ddl2metadata", help="根据 DDL 文本生成 metadata.json")
    p_ddl.add_argument("--ddl-file", help="DDL SQL 文件路径")
    p_ddl.add_argument("--ddl-sql", help="DDL SQL 文本")
    p_ddl.add_argument("--db-type", choices=["mysql", "oracle", "postgres", "opengauss", "oceanbase"])
    p_ddl.add_argument("--database")
    p_ddl.add_argument("--schema")
    p_ddl.add_argument("--output", required=True)

    p_scaffold = sub.add_parser("scaffold", help="根据元数据生成代码")
    add_conn_args(p_scaffold)
    p_scaffold.add_argument("--metadata-file", help="元数据文件，优先级高于数据库连接")
    add_scaffold_args(p_scaffold)

    p_validate = sub.add_parser("validate", help="校验配置和模板")
    p_validate.add_argument("--datasource-config")
    add_scaffold_args(p_validate)

    return parser


def prompt_input(prompt: str, default: str = None) -> str:
    if default:
        prompt = f"{prompt} [{default}]: "
    else:
        prompt = f"{prompt}: "
    value = input(prompt).strip()
    return value if value else (default or "")


def prompt_choice(prompt: str, choices: list, default: str = None) -> str:
    while True:
        print(f"\n{prompt}")
        for i, choice in enumerate(choices, 1):
            if choice == default:
                print(f"  {i}. {choice} (default)")
            else:
                print(f"  {i}. {choice}")
        try:
            choice = input(f"请选择 (1-{len(choices)}){f' [{default}]' if default else ''}: ").strip()
            if not choice and default:
                return default
            idx = int(choice) - 1
            if 0 <= idx < len(choices):
                return choices[idx]
        except ValueError:
            pass
        print(f"请输入 1-{len(choices)} 之间的数字")


def run_init(args):
    print("=" * 60)
    print("  yss-db2mybatis 配置向导")
    print("=" * 60)
    print("\n请按照提示输入配置信息\n")

    db_type = prompt_choice("请选择数据库类型", ["mysql", "postgres", "oracle"], "postgres")

    host = prompt_input("数据库主机地址", "localhost")

    default_port = {"mysql": "3306", "postgres": "5432", "oracle": "1521"}[db_type]
    port = prompt_input("数据库端口", default_port)

    user = prompt_input("数据库用户名", "dmz")
    password = prompt_input("数据库密码", "dmz")
    database = prompt_input("数据库名", "yss_metadata")

    schema = None
    if db_type == "postgres":
        schema = prompt_input("Schema 名称", "public")

    datasource_name = prompt_input("数据源名称", "my-datasource")

    base_package = prompt_input("基础包名", "com.yss.metadata")
    domain_segment = prompt_input("领域分段名", "metadata")

    print("\n" + "=" * 60)
    print("  配置信息确认")
    print("=" * 60)
    print(f"  数据库类型: {db_type}")
    print(f"  主机: {host}:{port}")
    print(f"  用户名: {user}")
    print(f"  数据库: {database}")
    if schema:
        print(f"  Schema: {schema}")
    print(f"  基础包名: {base_package}")
    print(f"  领域分段: {domain_segment}")
    print("=" * 60)

    confirm = prompt_input("\n确认生成配置文件? (y/n)", "y").lower()
    if confirm not in ["y", "yes", ""]:
        print("已取消")
        return

    datasource_config = {
        "datasources": {
            datasource_name: {
                "db_type": db_type,
                "host": host,
                "port": int(port),
                "user": user,
                "password": password,
                "database": database,
            }
        }
    }
    if schema:
        datasource_config["datasources"][datasource_name]["schema"] = schema

    config_dir = Path(tempfile.gettempdir()) / "yss-db2mybatis"
    config_dir.mkdir(parents=True, exist_ok=True)
    datasource_file = config_dir / "datasource-config.json"
    
    metadata_file = config_dir / "metadata.json"

    write_text(str(datasource_file), json.dumps(datasource_config, ensure_ascii=False, indent=2))
    print(f"\n✅ 数据源配置文件已生成: {datasource_file}")

    print("\n" + "=" * 60)
    print("  下一步")
    print("=" * 60)
    print(f"1. 提取元数据:")
    print(f"   python3 {args.skill_root}/scripts/db2mybatis.py extract \\")
    print(f"     --datasource-config {datasource_file} \\")
    print(f"     --datasource-name {datasource_name} \\")
    print(f"     --include-tables-regex '.*' \\")
    print(f"     --output {metadata_file}")
    print(f"\n2. 生成代码:")
    print(f"   python3 {args.skill_root}/scripts/db2mybatis.py scaffold \\")
    print(f"     --skill-root {args.skill_root} \\")
    print(f"     --metadata-file {metadata_file} \\")
    print(f"     --base-package {base_package} \\")
    print(f"     --domain-segment {domain_segment} \\")
    print(f"     --domain-java-root ./domain \\")
    print(f"     --infra-java-root ./infrastructure \\")
    print(f"     --dry-run")
    print("=" * 60)


def main():
    parser = build_parser()
    args = parser.parse_args()
    try:
        if args.cmd == "extract":
            run_extract(args)
        elif args.cmd == "ddl2metadata":
            run_ddl2metadata(args)
        elif args.cmd == "scaffold":
            run_scaffold(args)
        elif args.cmd == "init":
            run_init(args)
        elif args.cmd == "validate":
            run_validate(args)
        else:
            raise SkillError(f"不支持的命令: {args.cmd}")
    except SkillError as e:
        print(f"error: {e}")
        raise SystemExit(2)


if __name__ == "__main__":
    main()
