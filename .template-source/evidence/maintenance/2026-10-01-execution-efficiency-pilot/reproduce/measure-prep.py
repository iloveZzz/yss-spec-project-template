import pathlib,subprocess,os,json,time
P=pathlib.Path(__file__).parent
rows=[]
for i in range(3):
 trace=P/f'prep-{i}.jsonl';envfile=P/f'prep-{i}-env.json';env={**os.environ,'PILOT_TRACE':str(trace),'PILOT_PREP_ENV':str(envfile)}
 if i==2:env['PILOT_KEEP_PREP']='1'
 start=time.perf_counter();r=subprocess.run(['node',str(P/'prepare-profile.mjs'),'placeholder-not-executed.test.mjs'],cwd=P/'source/.template-source/tooling/node',env=env,text=True,capture_output=True);elapsed=(time.perf_counter()-start)*1000
 (P/f'prep-{i}.stdout').write_text(r.stdout);(P/f'prep-{i}.stderr').write_text(r.stderr)
 rows.append({'index':i,'wall_ms':elapsed,'exit_code':r.returncode,'steps':[json.loads(l) for l in trace.read_text().splitlines()]})
 (P/'preparation-results.json').write_text(json.dumps(rows,indent=2))
 print(json.dumps({'index':i,'wall_ms':elapsed,'exit_code':r.returncode}),flush=True)
 if r.returncode:break
