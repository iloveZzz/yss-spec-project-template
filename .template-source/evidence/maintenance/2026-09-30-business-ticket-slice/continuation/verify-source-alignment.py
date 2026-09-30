from pathlib import Path
import json,hashlib,os,subprocess,datetime
out=Path(__file__).resolve().parent;manifest=json.loads((out/'verification-source-manifest.json').read_text());changes=[];head_changes=[]
for repo in manifest:
 root=Path(repo['source']);head=subprocess.check_output(['git','rev-parse','HEAD'],cwd=root,text=True).strip()
 if head!=repo['head']:head_changes.append(dict(repo=str(root),expected=repo['head'],actual=head))
 for ref,expected in repo['files'].items():
  p=root/ref
  if expected.get('kind')=='link':same=p.is_symlink() and os.readlink(p)==expected['target']
  else:same=p.is_file() and hashlib.sha256(p.read_bytes()).hexdigest()==expected['sha256'] and p.stat().st_mode & 0o777==expected['mode']
  if not same:changes.append(dict(repo=str(root),ref=ref,evidence_only=ref.startswith('.template-source/evidence/')))
 refs=set(subprocess.check_output(['git','ls-files','--cached','--others','--exclude-standard','-z'],cwd=root,text=True).split('\0'))-{''}
 for ref in refs-set(repo['files']):
  p=root/ref
  if p.is_file() or p.is_symlink():changes.append(dict(repo=str(root),ref=ref,added=True,evidence_only=ref.startswith('.template-source/evidence/')))
 implementation=[r for r in changes if not r['evidence_only']]
result=dict(observed_at=datetime.datetime.now(datetime.timezone.utc).isoformat(),head_changes=head_changes,recorded_file_changes=changes,implementation_source_unchanged=not implementation and not head_changes,scope='Files recorded in verification-source-manifest; evidence changes remain listed, not erased')
(out/'source-alignment.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
assert result['implementation_source_unchanged'],result
print(json.dumps(dict(implementation_source_unchanged=True,evidence_file_changes=len(changes),head_changes=len(head_changes))))
