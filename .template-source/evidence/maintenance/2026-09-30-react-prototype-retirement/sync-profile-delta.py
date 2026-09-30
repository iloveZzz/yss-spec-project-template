"""Replay only this maintenance delta, preserving profile-specific and parallel edits.
Abort all writes on a three-way conflict. Then use standard sync/check/lock scripts.
"""
from pathlib import Path
import subprocess,hashlib,json,tempfile,shutil
r=Path(__file__).resolve().parents[4]; e=Path(__file__).parent; baseline=e/'evidence/source-before'; pending=[]; conflicts=[]
skills=['yss-prototype-stage','yss-design-system','prototype-review']
refs=['DESIGN.md','.template-spec/design/design.md','.template-spec/design/README.md','.template-spec/design/templates/prototype-evidence-template.yaml','.template-spec/design/tokens/.design-md-projection.json','.template-spec/design/tokens/variables.css','.template-source/design/design-system-sync.yaml']
for skill in skills:
 rel=Path('.agents/skills')/skill
 refs.extend(str(p.relative_to(r)) for p in (r/rel).rglob('*') if p.is_file())
 refs.extend(str(p.relative_to(baseline)) for p in (baseline/rel).rglob('*') if p.is_file())
for profile in ['design','frontend']:
 target=r/f'submodules/yss-harness-{profile}-agent'
 for ref in sorted(set(refs)):
  old=baseline/ref;new=r/ref;dst=target/ref
  before=old.read_bytes() if old.exists() else None;after=new.read_bytes() if new.exists() else None
  if before==after:continue
  current=dst.read_bytes() if dst.exists() else None
  if current==after:continue
  if current==before:merged=after
  elif before is not None and current is not None and after is not None:
   with tempfile.TemporaryDirectory(prefix='yss-profile-merge-') as t:
    t=Path(t);(t/'current').write_bytes(current);(t/'base').write_bytes(before);(t/'new').write_bytes(after)
    result=subprocess.run(['git','merge-file','--stdout',str(t/'current'),str(t/'base'),str(t/'new')],capture_output=True)
    if result.returncode:conflicts.append({'profile':profile,'path':ref,'reason':'overlapping three-way delta'});continue
    merged=result.stdout
  else:conflicts.append({'profile':profile,'path':ref,'reason':'independent add/delete'});continue
  pending.append((dst,current,merged,profile,ref))
if conflicts:raise RuntimeError(json.dumps(conflicts,ensure_ascii=False,indent=2))
records=[]
for dst,current,merged,profile,ref in pending:
 if (dst.read_bytes() if dst.exists() else None)!=current:raise RuntimeError('Target changed during planning '+str(dst))
for dst,current,merged,profile,ref in pending:
 if current is not None:
  backup=e/'evidence/profile-before'/profile/ref;backup.parent.mkdir(parents=True,exist_ok=True);backup.write_bytes(current)
 if merged is None:dst.unlink()
 else:dst.parent.mkdir(parents=True,exist_ok=True);dst.write_bytes(merged)
 records.append({'profile':profile,'path':ref,'before':hashlib.sha256(current).hexdigest() if current else None,'after':hashlib.sha256(merged).hexdigest() if merged is not None else None,'method':'three-way canonical delta; preserve target-only edits'})
(e/'evidence/profile-delta.json').write_text(json.dumps(records,ensure_ascii=False,indent=2)+'\n')
# Adaptation patch is unchanged. Refresh its source-tree digest using the repository algorithm.
p=r/'.template-source/profile-skill-sync.json';config=json.loads(p.read_text());h=hashlib.sha256();base=r/'.agents/skills/prototype-review'
for file in sorted((p for p in base.rglob('*') if p.is_file()),key=lambda p:str(p.relative_to(base))):
 h.update(str(file.relative_to(base)).encode());h.update(b'\0');h.update(file.read_bytes());h.update(b'\0')
for item in config['profiles']['frontend']['adapted']:
 if item['id']=='prototype-review':item['source_tree_sha256']=h.hexdigest()
p.write_text(json.dumps(config,ensure_ascii=False,indent=2)+'\n')
print('Applied checked non-overlapping source deltas:',len(records))

for profile in ['design','frontend']:
 target=r/f'submodules/yss-harness-{profile}-agent/.agents/skills/yss-prototype-stage'
 for ref in ['assets/shadcn-authoring','assets/business-patterns']:
  p=target/ref
  if p.exists():
   for d in sorted((x for x in p.rglob('*') if x.is_dir()),key=lambda x:len(x.parts),reverse=True):d.rmdir()
   p.rmdir()
