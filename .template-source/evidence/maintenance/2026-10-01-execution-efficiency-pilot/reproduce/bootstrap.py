"""Recreate the isolated pilot; never writes into the supplied source repository."""
import pathlib,subprocess,shutil,json,argparse
a=argparse.ArgumentParser();a.add_argument('--repo',required=True);a.add_argument('--output',required=True);args=a.parse_args()
HERE=pathlib.Path(__file__).resolve().parent;P=pathlib.Path(args.output).resolve();repo=pathlib.Path(args.repo).resolve()
if P.exists() or P==repo or repo in P.parents:raise SystemExit('output must be a new directory outside source repository')
P.mkdir(parents=True);fixed='8fc0122a9e417a91c62cfe78afc1c0cb70ca56d6'
def run(argv,cwd=None):subprocess.run(argv,cwd=cwd,check=True)
run(['git','clone','--quiet','--shared','--no-checkout',str(repo),str(P/'source')]);run(['git','checkout','--quiet','--detach',fixed],P/'source')
for line in subprocess.check_output(['git','ls-tree',fixed+':submodules'],cwd=repo,text=True).splitlines():
 meta,name=line.split('\t');commit=meta.split()[2];run(['git','clone','--quiet','--shared','--no-checkout',str(repo/'submodules'/name),str(P/'source/submodules'/name)]);run(['git','checkout','--quiet','--detach',commit],P/'source/submodules'/name)
for file in HERE.iterdir():
 if file.is_file() and file.suffix in ['.py','.mjs']:shutil.copyfile(file,P/file.name)
shutil.copytree(HERE/'tools',P/'tools');shutil.copytree(HERE/'trial',P/'trial')
for file in [P/'prepare-profile.mjs',P/'trial/inputs/schema.json']:
 file.write_text(file.read_text().replace('/tmp/yss-execution-pilot-20261001',str(P)))
shutil.copyfile(HERE.parent/'evidence/baseline.json',P/'baseline.json')
run(['pnpm','install','--frozen-lockfile'],P/'tools');run(['pnpm','install','--frozen-lockfile'],P/'source/.template-source/tooling/node')
(P/'trial/node_modules').symlink_to(P/'tools/node_modules',target_is_directory=True)
run(['git','init','--quiet'],P/'trial');run(['git','add','.'],P/'trial');run(['git','-c','user.name=Pilot','-c','user.email=pilot@example.invalid','commit','--quiet','-m','Isolated execution pilot fixture'],P/'trial')
run(['git','clone','--quiet','--no-checkout','https://github.com/json-schema-org/JSON-Schema-Test-Suite.git',str(P/'json-schema-suite')]);run(['git','checkout','--quiet','--detach','5b0ee1613e45fcc2bddac00e07c19cd49b00d8a8'],P/'json-schema-suite')
print(P)
