SELECT jsonb_build_array(a.attnum::text, a.attname, pg_catalog.format_type(a.atttypid,a.atttypmod), a.attnotnull, pg_catalog.pg_get_expr(d.adbin,d.adrelid), pg_catalog.col_description(c.oid,a.attnum))::text AS canonical_value
FROM pg_catalog.pg_attribute a JOIN pg_catalog.pg_class c ON c.oid=a.attrelid JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace LEFT JOIN pg_catalog.pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum
WHERE n.nspname='public' AND c.relname='fs_sync_task_version' AND a.attnum>0 AND NOT a.attisdropped ORDER BY a.attnum LIMIT 1001
