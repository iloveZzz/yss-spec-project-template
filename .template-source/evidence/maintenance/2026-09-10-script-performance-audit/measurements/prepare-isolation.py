"""Create a fresh physical-path working copy for analysis; never writes source."""
from pathlib import Path
import argparse,shutil,tempfile,json,time,hashlib
p=argparse.ArgumentParser();p.add_argument('source');p.add_argument('--output',required=True);args=p.parse_args()
source=Path(args.source).resolve();out=Path(args.output).resolve();out.mkdir(parents=True,exist_ok=True)
base=Path(tempfile.mkdtemp(prefix='yss-perf-audit-')).resolve();dest=base/'root';start=time.perf_counter()
exclude={'.git','.codegraph','.graphify','node_modules','dist','build','__pycache__','.DS_Store','submodules','.template-source','.idea','.vscode','.wiki','raw','wiki'}
def ignore(directory,names):return [n for n in names if n in exclude or n.startswith('.template-staging-')]
shutil.copytree(source,dest,ignore=ignore,symlinks=True)
for ref in ['.template-source/scripts','.template-source/cli-core','.template-source/tooling/node']:
 if (source/ref).exists():shutil.copytree(source/ref,dest/ref,ignore=ignore,symlinks=True)
for side in ['backend','frontend']:
 shutil.copytree(source/'submodules'/('create-yss-harness-'+side),base/('cli-'+side),symlinks=True,ignore=shutil.ignore_patterns('.git','node_modules','.codegraph'))
for name in ['create-yss-spec','create-yss-strategic-design','create-yss-harness-dev']:
 target=base/name;target.mkdir()
 for ref in ['scripts','src','package.json','template.manifest.json','template.snapshot.json']:
  old=source/'submodules'/name/ref
  if old.is_dir():shutil.copytree(old,target/ref,symlinks=True)
  elif old.is_file():shutil.copy2(old,target/ref)
result={'root':str(dest),'source':str(source),'base':str(base),'copy_duration_ms':(time.perf_counter()-start)*1000,'excluded':sorted(exclude),'symlinks_preserved':True,'git_metadata_copied':False}
(out/'isolation.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps(result))
