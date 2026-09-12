BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;
SET LOCAL TIME ZONE 'UTC';
SET LOCAL statement_timeout='2s';
SELECT jsonb_build_object('id','populated_target_columns','rows',coalesce(jsonb_agg(canonical_value),'[]'::jsonb))::text FROM (SELECT jsonb_build_array(a.attnum::text, a.attname, pg_catalog.format_type(a.atttypid,a.atttypmod), a.attnotnull, pg_catalog.pg_get_expr(d.adbin,d.adrelid), pg_catalog.col_description(c.oid,a.attnum))::text AS canonical_value
FROM pg_catalog.pg_attribute a JOIN pg_catalog.pg_class c ON c.oid=a.attrelid JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace LEFT JOIN pg_catalog.pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum
WHERE n.nspname='public' AND c.relname='pilot_preview_rows' AND a.attnum>0 AND NOT a.attisdropped ORDER BY a.attnum LIMIT 1001) fixed_query;
SELECT jsonb_build_object('id','populated_target_primary_key','rows',coalesce(jsonb_agg(canonical_value),'[]'::jsonb))::text FROM (SELECT jsonb_build_array(con.conname, array_agg(a.attname ORDER BY k.ordinality))::text AS canonical_value
FROM pg_catalog.pg_constraint con JOIN pg_catalog.pg_class c ON c.oid=con.conrelid JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace CROSS JOIN LATERAL unnest(con.conkey) WITH ORDINALITY k(attnum,ordinality) JOIN pg_catalog.pg_attribute a ON a.attrelid=c.oid AND a.attnum=k.attnum
WHERE n.nspname='public' AND c.relname='pilot_preview_rows' AND con.contype='p' GROUP BY con.conname ORDER BY con.conname COLLATE "C" LIMIT 1001) fixed_query;
SELECT jsonb_build_object('id','populated_rows','rows',coalesce(jsonb_agg(canonical_value),'[]'::jsonb))::text FROM (SELECT jsonb_build_array(id::text,label,to_char(start_date,'YYYY-MM-DD"T"HH24:MI:SS.US'),to_char(end_date,'YYYY-MM-DD"T"HH24:MI:SS.US'))::text AS canonical_value FROM public.pilot_preview_rows ORDER BY id LIMIT 1001) fixed_query;
SELECT jsonb_build_object('id','empty_target_columns','rows',coalesce(jsonb_agg(canonical_value),'[]'::jsonb))::text FROM (SELECT jsonb_build_array(a.attnum::text, a.attname, pg_catalog.format_type(a.atttypid,a.atttypmod), a.attnotnull, pg_catalog.pg_get_expr(d.adbin,d.adrelid), pg_catalog.col_description(c.oid,a.attnum))::text AS canonical_value
FROM pg_catalog.pg_attribute a JOIN pg_catalog.pg_class c ON c.oid=a.attrelid JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace LEFT JOIN pg_catalog.pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum
WHERE n.nspname='public' AND c.relname='pilot_preview_empty' AND a.attnum>0 AND NOT a.attisdropped ORDER BY a.attnum LIMIT 1001) fixed_query;
SELECT jsonb_build_object('id','empty_target_primary_key','rows',coalesce(jsonb_agg(canonical_value),'[]'::jsonb))::text FROM (SELECT jsonb_build_array(con.conname, array_agg(a.attname ORDER BY k.ordinality))::text AS canonical_value
FROM pg_catalog.pg_constraint con JOIN pg_catalog.pg_class c ON c.oid=con.conrelid JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace CROSS JOIN LATERAL unnest(con.conkey) WITH ORDINALITY k(attnum,ordinality) JOIN pg_catalog.pg_attribute a ON a.attrelid=c.oid AND a.attnum=k.attnum
WHERE n.nspname='public' AND c.relname='pilot_preview_empty' AND con.contype='p' GROUP BY con.conname ORDER BY con.conname COLLATE "C" LIMIT 1001) fixed_query;
SELECT jsonb_build_object('id','empty_rows','rows',coalesce(jsonb_agg(canonical_value),'[]'::jsonb))::text FROM (SELECT jsonb_build_array(id::text,label,to_char(start_date,'YYYY-MM-DD"T"HH24:MI:SS.US'),to_char(end_date,'YYYY-MM-DD"T"HH24:MI:SS.US'))::text AS canonical_value FROM public.pilot_preview_empty ORDER BY id LIMIT 1001) fixed_query;
ROLLBACK;
