from pathlib import Path
import json, subprocess, hashlib, difflib, stat, os
OUT=Path(__file__).resolve().parent; SOURCE=OUT.parents[3]
initial=json.loads((OUT/'baseline/repositories.json').read_text()); base=Path(json.loads((OUT/'baseline/isolation.json').read_text())['root'])
def git(root,*args):return subprocess.check_output(['git','-C',str(root),*args],text=True).strip()
def signature(p):
 if p.is_symlink():return ['symlink',os.readlink(p)]
 if p.is_file():return ['file',hashlib.sha256(p.read_bytes()).hexdigest(),p.stat().st_mode & 0o777]
 if p.is_dir():return ['directory']
 return ['missing']
rows=[];changes=[];patches=[];heads=[];unavailable=[]
for name,data in initial.items():
 repo=Path(data['root']); prefix=Path('.') if name=='root' else Path('submodules')/name; old=base/prefix
 current={'repository':name,'head':git(repo,'rev-parse','HEAD'),'branch':git(repo,'branch','--show-current')}
 assert current['head']==data['head'] and current['branch']==data['branch'],current
 heads.append(current)
 for line in data['status'].splitlines():
  state,ref=line[:2],line[3:]; p=repo/ref;b=old/ref
  if ref.startswith('.template-source/evidence/') or ref.startswith('submodules/'):continue
  paths=[(p,b,ref)]
  if state=='??' and p.is_dir():paths=[(f,b/f.relative_to(p),str(Path(ref)/f.relative_to(p))) for f in p.rglob('*') if f.is_file() or f.is_symlink()]
  for p,b,ref in paths:
   if not b.exists() and p.exists() and not b.is_symlink():
    if state!='??':
     prior=(OUT/'baseline'/f'{name}.diff').read_text();currentdiff=subprocess.check_output(['git','-C',str(repo),'diff','--binary','HEAD','--',ref],text=True)
     if currentdiff and currentdiff in prior:rows.append({'path':str(prefix/ref),'result':'original-diff-preserved'});continue
    unavailable.append(str(prefix/ref));continue
   before,after=signature(b),signature(p)
   rows.append({'path':str(prefix/ref),'result':'unchanged' if before==after else 'optimization-extends-existing-change','before':before,'after':after})
 candidates=set(git(repo,'diff','--name-only','HEAD').splitlines()) | set(git(repo,'ls-files','--others','--exclude-standard').splitlines())
 for ref in sorted(candidates):
  if ref.startswith(('.template-source/evidence/','submodules/')):continue
  p=repo/ref;b=old/ref
  if p.is_dir() or b.is_dir():continue
  before,after=signature(b),signature(p)
  if before==after:continue
  # Excluded source-only assets are separately proven against the initial diff above.
  if before==['missing'] and any(x['path']==str(prefix/ref) and x['result']=='original-diff-preserved' for x in rows):continue
  changes.append({'path':str(prefix/ref),'before':before,'after':after})
  if (not b.exists() or b.is_file()) and p.is_file():
   try:patches.extend(difflib.unified_diff(b.read_text().splitlines(True) if b.exists() else [],p.read_text().splitlines(True),fromfile='before/'+str(prefix/ref),tofile='after/'+str(prefix/ref)))
   except UnicodeError:pass
assert not any(x['result']=='optimization-extends-existing-change' and x['after']==['missing'] for x in rows),'原有修改被删除'
result={'heads_and_branches_unchanged':heads,'initial_dirty_entries':rows,'not_copied_by_audit_isolation':unavailable,'audit_documents':'本轮未写入原审计目录；其初始验证见原 verification.json；不伪称初始审计文档字节另有副本','formal_dedicated_repositories_clean':all(not git(Path(initial[name]['root']),'status','--porcelain') for name in ['create-yss-harness-backend','create-yss-harness-frontend'])}
assert result['formal_dedicated_repositories_clean']
(OUT/'preservation.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');(OUT/'changes-from-baseline.json').write_text(json.dumps(changes,ensure_ascii=False,indent=2)+'\n');(OUT/'optimization.diff').write_text(''.join(patches))
print(json.dumps({'heads':len(heads),'initial_dirty_files_checked':len(rows),'intentionally_extended':[x['path'] for x in rows if x['result']=='optimization-extends-existing-change'],'not_snapshotted':unavailable,'optimization_paths':len(changes)},ensure_ascii=False))
