"""Run after actual tgz init: python3 this.py <workspace> <delivery-temp-root>."""
import hashlib, json, pathlib, subprocess, sys, tempfile
root, delivery = map(pathlib.Path, sys.argv[1:])
old = [('create-yss-spec', 'create-yss-spec', '.yss-template.json'), ('create-yss-harness-dev', 'create-yss-harness-dev', '.yss-harness-dev.json'), ('create-yss-strategic-design', 'create-yss-harness-design', '.yss-harness-design.json')]
families = [(name, root/'submodules'/folder/'bin'/(name+'.js'), marker) for folder, name, marker in old]
for side in ['backend', 'frontend']:
    name = 'create-yss-harness-'+side
    families.append((name, delivery/'packages'/name/'node_modules'/name/'bin'/(name+'.js'), '.yss-harness-'+side+'.json'))
def tree(target):
    return [(str(p.relative_to(target)), p.stat().st_mode, hashlib.sha256(p.read_bytes()).hexdigest() if p.is_file() else None) for p in sorted(target.rglob('*'))]
count = 0
with tempfile.TemporaryDirectory(prefix='yss-five-family-') as temp:
    temp = pathlib.Path(temp).resolve()
    for actor, entry, own in families:
        for foreign, _, marker in families:
            if own == marker: continue
            target = temp/(actor+'--'+foreign); target.mkdir()
            if foreign.endswith(('backend', 'frontend')):
                side = foreign.rsplit('-', 1)[1]
                payload = (delivery/'instances'/side/marker).read_bytes()
            else: payload = b'{'
            (target/marker).write_bytes(payload); (target/'business.txt').write_text('preserve')
            before = tree(target)
            commands = ['init'] if actor == 'create-yss-harness-design' else ['init', 'attach', 'sync']
            for command in commands:
                for apply in [False, True]:
                    args = ['node', str(entry)] + ([] if command == 'init' and not actor.endswith(('backend', 'frontend')) else [command]) + ['--target-dir', str(target), '--force', '--project-name', 'Identity probe', '--business-domain', 'CLI verification']
                    if not apply: args.append('--dry-run')
                    elif command == 'attach' or (command == 'sync' and actor.endswith(('backend', 'frontend'))): args.append('--apply')
                    result = subprocess.run(args, capture_output=True, text=True, timeout=120)
                    assert result.returncode != 0, (args, result.stdout)
                    assert any(x in result.stderr+result.stdout for x in ['身份', '家族', 'profile', '非空', '空目录', 'empty', 'metadata']), (args, result.stderr)
                    assert tree(target) == before, args
                    count += 1
    for side in ['backend','frontend']:
        actor, entry, marker = next(row for row in families if row[0] == 'create-yss-harness-'+side)
        target = temp/('legacy-'+side); target.mkdir(); (target/marker).write_text(json.dumps({'schema_version':1,'profile_id':'harness.'+side+'-delivery'}))
        before=tree(target)
        for command in ['attach','sync']:
            result=subprocess.run(['node',str(entry),command,'--target-dir',str(target),'--apply','--force','--json'],capture_output=True,text=True,timeout=120)
            assert result.returncode != 0 and tree(target)==before
            count+=1
print(json.dumps({'status':'pass','rejected_without_writes':count,'families':5,'new_entries':'installed npm tgz','legacy_adoption':'rejected'},ensure_ascii=False))
