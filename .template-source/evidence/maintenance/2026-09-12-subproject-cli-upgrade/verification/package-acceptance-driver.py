from pathlib import Path
import subprocess,sys,json,re,hashlib
side=sys.argv[1];folder={'design':'create-yss-strategic-design','backend':'create-yss-harness-backend','frontend':'create-yss-harness-frontend'}[side]
repo=Path('/Users/zhudaoming/Projects/yss-spec-project-template/submodules')/folder
root=Path(Path('/tmp/yss-cli-artifact-location').read_text().strip());stages=[]
def run(label,args,cwd=None):
 r=subprocess.run(args,cwd=cwd,capture_output=True,text=True)
 (root/f'final-{side}-{label}.log').write_text(r.stdout+r.stderr)
 stages.append({'stage':label,'command':args,'cwd':str(cwd or Path.cwd()),'exitCode':r.returncode})
 (root/f'final-{side}-results.json').write_text(json.dumps(stages,ensure_ascii=False,indent=2))
 print(side,label,r.returncode,flush=True)
 if r.returncode:raise SystemExit(r.returncode)
 return r
run('source-test',['pnpm','test'],repo)
run('verify-bundle',['pnpm','verify-bundle'],repo)
r=run('pack',['npm','pack','--json','--pack-destination',str(root)],repo)
match=re.search(r'(\[\s*\{\s*"id".*\]\s*)$',r.stdout,re.S)
assert match,r.stdout
package=json.loads(match.group(1))[0];(root/f'final-{side}-pack.json').write_text(json.dumps(package,indent=2))
tar=root/package['filename'];prefix=root/f'final-installed-{side}'
run('offline-install',['npm','install','--prefix',str(prefix),'--ignore-scripts','--offline','--package-lock=false','--no-audit','--no-fund',str(tar)])
pkg=prefix/'node_modules'/f'create-yss-harness-{side}'
source=f"import {{packageContract}} from {json.dumps((pkg/'vendor/cli-core/tests/package-contract.mjs').as_uri())};packageContract({json.dumps(str(pkg))});"
run('installed-test',['node','--input-type=module','-e',source])
run('installed-version',['node',str(pkg/'bin'/f'create-yss-harness-{side}.js'),'--version','--json'])
(root/f'final-{side}-artifact.json').write_text(json.dumps({'path':str(tar),'sha256':hashlib.sha256(tar.read_bytes()).hexdigest(),'sourceState':json.loads((pkg/'template.snapshot.json').read_text())['sourceState'],'coreSourceState':json.loads((pkg/'cli-core.lock.json').read_text())['sourceState']},indent=2))
