"""Restore only this run's generated, digest-verified intermediate copies before normal sync."""
from pathlib import Path
import hashlib,json,subprocess
root=Path.cwd(); out=root/'.template-source/evidence/maintenance/2026-09-28-llm-wiki-implementation'
prior=json.loads((out/'profile-sync-apply.json').read_text()); config=json.loads((root/'.template-source/profile-skill-sync.json').read_text()); records=[]
# Complete all preflight checks before mutating any file. Nothing from outside the prior receipt is touched.
for change in prior['changes']:
 profile=root/config['profiles'][change['profile']]['target'];target=profile/change['path'];source=root/change['path']
 if source.read_bytes()==target.read_bytes(): continue
 data=target.read_bytes();assert hashlib.sha256(data).hexdigest()==change['after_sha256'],str(target)+' intervening edit'
 original=None
 if change['before_sha256']:
  original=subprocess.check_output(['git','show','HEAD:'+change['path']],cwd=profile)
  assert hashlib.sha256(original).hexdigest()==change['before_sha256']
 records.append((change,target,data,original))
for change,target,data,original in records:
 backup=out/'profile-intermediate-backup'/change['profile']/change['path'];backup.parent.mkdir(parents=True,exist_ok=True);backup.write_bytes(data)
 if original is None: target.unlink()
 else: target.write_bytes(original)
(out/'profile-intermediate-restore.json').write_text(json.dumps([c for c,_,_,_ in records],ensure_ascii=False,indent=2)+'\n')
print('digest verified own intermediate files restored:',len(records))
