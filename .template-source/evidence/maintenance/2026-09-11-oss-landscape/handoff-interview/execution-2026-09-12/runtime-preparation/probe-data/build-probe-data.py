from pathlib import Path
import json,subprocess,hashlib,datetime
OUT=Path(__file__).resolve().parent;SQL=OUT/'sql';SQL.mkdir(exist_ok=True);queries=[]
def add(qid,db,phase,sql):
 sql=sql.strip()+'\n';(SQL/(qid+'.sql')).write_text(sql);queries.append({'id':qid,'datasource':db,'phase':phase,'sql_ref':'sql/'+qid+'.sql','sql_sha256':hashlib.sha256(sql.encode()).hexdigest(),'sql':sql,'max_rows':1001})
def structure(prefix,db,table):
 add(prefix+'_columns',db,'structure',f'''SELECT jsonb_build_array(a.attnum::text, a.attname, pg_catalog.format_type(a.atttypid,a.atttypmod), a.attnotnull, pg_catalog.pg_get_expr(d.adbin,d.adrelid), pg_catalog.col_description(c.oid,a.attnum))::text AS canonical_value
FROM pg_catalog.pg_attribute a JOIN pg_catalog.pg_class c ON c.oid=a.attrelid JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace LEFT JOIN pg_catalog.pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum
WHERE n.nspname='public' AND c.relname='{table}' AND a.attnum>0 AND NOT a.attisdropped ORDER BY a.attnum LIMIT 1001''')
 add(prefix+'_primary_key',db,'structure',f'''SELECT jsonb_build_array(con.conname, array_agg(a.attname ORDER BY k.ordinality))::text AS canonical_value
FROM pg_catalog.pg_constraint con JOIN pg_catalog.pg_class c ON c.oid=con.conrelid JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace CROSS JOIN LATERAL unnest(con.conkey) WITH ORDINALITY k(attnum,ordinality) JOIN pg_catalog.pg_attribute a ON a.attrelid=c.oid AND a.attnum=k.attnum
WHERE n.nspname='public' AND c.relname='{table}' AND con.contype='p' GROUP BY con.conname ORDER BY con.conname COLLATE "C" LIMIT 1001''')
for table in ['fs_sync_task','fs_sync_task_draft','fs_sync_task_version']:structure(table,'control',table)
cases=[]
for cid,task,table in [('populated','PILOT_PREVIEW','pilot_preview_rows'),('empty','PILOT_EMPTY','pilot_preview_empty')]:
 start=len(queries)
 add(cid+'_task','control','content',f'''SELECT jsonb_build_array(t.id::text,t.task_code,t.task_name,t.task_status,t.published_version::text,t.owner_id,t.snapshot_retention_days::text,to_char(t.gmt_create,'YYYY-MM-DD"T"HH24:MI:SS.US'),to_char(t.gmt_modified,'YYYY-MM-DD"T"HH24:MI:SS.US'))::text AS canonical_value FROM public.fs_sync_task t WHERE t.task_code='{task}' ORDER BY t.id LIMIT 1001''')
 add(cid+'_draft','control','content',f'''SELECT jsonb_build_array(d.id::text,d.task_id::text,d.revision::text,d.config_json,d.validation_config_digest,d.validation_environment_digest,to_char(d.validated_at,'YYYY-MM-DD"T"HH24:MI:SS.US'),to_char(d.validation_expires_at,'YYYY-MM-DD"T"HH24:MI:SS.US'),to_char(d.gmt_create,'YYYY-MM-DD"T"HH24:MI:SS.US'),to_char(d.gmt_modified,'YYYY-MM-DD"T"HH24:MI:SS.US'))::text AS canonical_value FROM public.fs_sync_task_draft d JOIN public.fs_sync_task t ON t.id=d.task_id WHERE t.task_code='{task}' ORDER BY d.id LIMIT 1001''')
 add(cid+'_versions','control','content',f'''SELECT jsonb_build_array(v.id::text,v.task_id::text,v.version_number::text,v.config_digest,v.config_json,to_char(v.gmt_create,'YYYY-MM-DD"T"HH24:MI:SS.US'),to_char(v.gmt_modified,'YYYY-MM-DD"T"HH24:MI:SS.US'))::text AS canonical_value FROM public.fs_sync_task_version v JOIN public.fs_sync_task t ON t.id=v.task_id WHERE t.task_code='{task}' ORDER BY v.version_number,v.id LIMIT 1001''')
 structure(cid+'_target','target',table)
 add(cid+'_rows','target','content',f'''SELECT jsonb_build_array(id::text,label,to_char(start_date,'YYYY-MM-DD"T"HH24:MI:SS.US'),to_char(end_date,'YYYY-MM-DD"T"HH24:MI:SS.US'))::text AS canonical_value FROM public.{table} ORDER BY id LIMIT 1001''')
 cases.append({'id':cid,'task_code':task,'target_schema':'public','target_table':table,'query_ids':[q['id']for q in queries[start:]]})
(OUT/'fixed-queries.json').write_text(json.dumps({'schema_version':1,'queries':queries},ensure_ascii=False,indent=2)+'\n');results={};commands=[]
for db,database in [('control','pilot_control'),('target','pilot_target')]:
 lines=['BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;',"SET LOCAL TIME ZONE 'UTC';","SET LOCAL statement_timeout='2s';"]
 for q in queries:
  if q['datasource']==db:lines.append("SELECT jsonb_build_object('id','"+q['id']+"','rows',coalesce(jsonb_agg(canonical_value),'[]'::jsonb))::text FROM ("+q['sql'].strip()+") fixed_query;")
 lines.append('ROLLBACK;');text='\n'.join(lines)+'\n';(OUT/('readback-'+db+'.sql')).write_text(text);start=datetime.datetime.now(datetime.timezone.utc).isoformat();argv=['docker','--context','desktop-linux','exec','-i','yss-preview-0kxzmm-pg','psql','-U','pilot','-d',database,'-A','-t','-v','ON_ERROR_STOP=1'];p=subprocess.run(argv,input=text,capture_output=True,text=True);rec={'argv':argv,'started_at':start,'finished_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'exit_code':p.returncode,'sql_sha256':hashlib.sha256(text.encode()).hexdigest(),'stderr':p.stderr};commands.append(rec);(OUT/('psql-'+db+'.log')).write_text(p.stdout+p.stderr);assert p.returncode==0,p.stderr
 for line in p.stdout.splitlines():
  if line.startswith('{'):
   row=json.loads(line);results[row['id']]=row['rows']
assert set(results)=={q['id']for q in queries}
for q in queries:
 if q['phase']=='structure':assert len(results[q['id']])>0,q['id']
assert len(results['populated_task'])==len(results['populated_draft'])==len(results['empty_task'])==len(results['empty_draft'])==1
assert len(results['populated_rows'])==2 and results['empty_rows']==[]
checks=[{k:q[k]for k in ['id','datasource','phase','sql_ref','sql_sha256','max_rows']}|{'expected_rows':results[q['id']]} for q in queries]
doc={'schema_version':1,'baseline_id':'target-preview-pilot-two-cases-v1','normalization_id':'postgresql15-jsonb-array-text-v1','postgres_major':15,'scope':{'control_database':'pilot_control','target_database':'pilot_target','selected_tasks':['PILOT_PREVIEW','PILOT_EMPTY'],'control_tables':['public.fs_sync_task','public.fs_sync_task_draft','public.fs_sync_task_version'],'excluded_dynamic_data':['Scheduler runtime','Ops telemetry','unselected business tasks']},'schema_source_ref':'../database-setup.json','seed_sources':[{'path':'../'+name,'sha256':hashlib.sha256((OUT.parent/name).read_bytes()).hexdigest()}for name in ['control-seed.sql','target-seed.sql']],'query_registry_sha256':hashlib.sha256((OUT/'fixed-queries.json').read_bytes()).hexdigest(),'common_query_ids':[q['id']for q in queries if q['id'].startswith('fs_sync_')],'cases':cases,'checks':checks}
(OUT/'test-data.json').write_text(json.dumps(doc,ensure_ascii=False,indent=2)+'\n');(OUT/'snapshot.json').write_text(json.dumps(results,ensure_ascii=False,indent=2)+'\n');(OUT/'readback-commands.json').write_text(json.dumps(commands,ensure_ascii=False,indent=2)+'\n');print('18 fixed query snapshots captured; test-data file SHA256',hashlib.sha256((OUT/'test-data.json').read_bytes()).hexdigest())
