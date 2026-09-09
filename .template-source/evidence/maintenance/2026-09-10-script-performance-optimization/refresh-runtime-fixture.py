from pathlib import Path
import json,shutil,subprocess,os
out=Path(__file__).resolve().parent;i=json.loads((out/'integration.json').read_text());root=Path(i['root']);source=out.parents[3]
refs=['scripts/lib/template-commit-cache.mjs','scripts/verify-template-cache-scenarios']
for ref in refs:shutil.copy2(source/ref,root/ref)
def git(*args):return subprocess.check_output(['git','-C',str(root),'-c','user.name=Performance fixture','-c','user.email=fixture@example.invalid','-c','core.hooksPath=/dev/null',*args],text=True).strip()
git('add',*refs);git('commit','-qm','exercise default managed fetch and timeout cleanup');revision=git('rev-parse','HEAD')
i['template_root_revision']=revision;(out/'integration.json').write_text(json.dumps(i,indent=2)+'\n')
env=os.environ.copy();env['YSS_SPEC_TEMPLATE_REPO']=str(root)
r=subprocess.run(['node','scripts/sync-template.js'],cwd=Path(i['base'])/'create-yss-spec',env=env)
print('final template revision',revision);raise SystemExit(r.returncode)
