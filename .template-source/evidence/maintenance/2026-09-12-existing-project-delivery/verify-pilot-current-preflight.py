from pathlib import Path
import subprocess,hashlib,json,time
root=Path('/Users/zhudaoming/Projects/yss-spec-project-template');m=root/'.template-source/evidence/maintenance/2026-09-12-existing-project-delivery'; p=Path('/private/var/folders/8d/60y8vj2j0nn37t4h26zbvvhw0000gn/T/yss-preview-pilot-20260912-0k_x_zmm')
def tree(r):
 h=hashlib.sha256();n=0
 for f in sorted(r.rglob('*')):
  if '.git' in f.relative_to(r).parts or f.is_symlink() or not f.is_file():continue
  h.update(str(f.relative_to(r)).encode()+b'\0'+hashlib.sha256(f.read_bytes()).digest());n+=1
 return {'sha256':h.hexdigest(),'files':n}
rows=[]
for role,ref,stage,want in [('backend','docs/.scratch/target-preview-pilot/existing-v2/delivery-preflight-input.json','build',0),('strategy','docs/.scratch/target-preview-existing-ui/handoff-draft/current-preflight-input.json','export',1)]:
 r=p/(role+'-governance');before=tree(r);log=m/f'pilot-{role}-preflight-10.json';cmd=['node','scripts/preflight-delivery','--input',ref,'--stage',stage,'--json'];t=time.monotonic()
 with log.open('w')as f:process=subprocess.run(cmd,cwd=r,stdout=f,stderr=subprocess.STDOUT)
 after=tree(r);result=json.loads(log.read_text());bad=[{'code':x['code'],'status':x['status'],'message':x['message']}for x in result.get('checks',[])if x['status']not in ('ready','not-applicable')]
 rows.append({'role':role,'argv':cmd,'cwd':str(r),'exit_code':process.returncode,'expected_exit':want,'duration_seconds':round(time.monotonic()-t,2),'before':before,'after':after,'unchanged':before==after,'diagnostics':bad})
(m/'pilot-preflight-current-10.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2)+'\n');print(json.dumps(rows,ensure_ascii=False))
raise SystemExit(0 if all(x['exit_code']==x['expected_exit'] and x['unchanged']for x in rows)else 1)
