SELECT jsonb_build_array(con.conname, array_agg(a.attname ORDER BY k.ordinality))::text AS canonical_value
FROM pg_catalog.pg_constraint con JOIN pg_catalog.pg_class c ON c.oid=con.conrelid JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace CROSS JOIN LATERAL unnest(con.conkey) WITH ORDINALITY k(attnum,ordinality) JOIN pg_catalog.pg_attribute a ON a.attrelid=c.oid AND a.attnum=k.attnum
WHERE n.nspname='public' AND c.relname='pilot_preview_empty' AND con.contype='p' GROUP BY con.conname ORDER BY con.conname COLLATE "C" LIMIT 1001
