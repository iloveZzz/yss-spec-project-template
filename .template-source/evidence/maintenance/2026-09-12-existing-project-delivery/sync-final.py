from pathlib import Path
import subprocess,json,time,concurrent.futures
root=Path('/Users/zhudaoming/Projects/yss-spec-project-template'); out=root/'.template-source/evidence/maintenance/2026-09-12-existing-project-delivery'; rows=[]
def run(name,cwd,argv):
 t=time.monotonic(); log=out/(name+'-10.log')
 with log.open('w') as f: r=subprocess.run(argv,cwd=cwd,stdout=f,stderr=subprocess.STDOUT)
 v={'name':name,'cwd':str(cwd),'argv':argv,'exit_code':r.returncode,'duration_seconds':round(time.monotonic()-t,2),'log':str(log)}
 return v
r=run('shared-sync',root,['node','scripts/sync-strategic-handoff-tools']); rows.append(r)
if r['exit_code']:raise SystemExit(json.dumps(r))
def cli(profile):
 cwd=root/'submodules'/profile
 if profile in ('create-yss-spec','create-yss-strategic-design'):return [run(profile+'-sync',cwd,['node','scripts/sync-template.js'])]
 core=run(profile+'-core-sync',cwd,['node','scripts/sync-core.mjs',str(root),'WORKTREE'])
 if core['exit_code']:return [core]
 template='yss-harness-backend-agent' if profile.endswith('backend') else 'yss-harness-frontend-agent'
 return [core,run(profile+'-template-sync',cwd,['node','scripts/sync-template.mjs',str(root/'submodules'/template),'WORKTREE'])]
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
 for result in pool.map(cli,['create-yss-spec','create-yss-strategic-design','create-yss-harness-backend','create-yss-harness-frontend']):rows.extend(result)
(out/'sync-final-10.json').write_text(json.dumps(rows,indent=2)+'\n'); print(json.dumps([{k:x[k]for k in ['name','exit_code','duration_seconds']}for x in rows]))
raise SystemExit(1 if any(x['exit_code'] for x in rows) else 0)
