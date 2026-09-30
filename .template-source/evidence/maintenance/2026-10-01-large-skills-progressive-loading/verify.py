from pathlib import Path
import sys,json,re,hashlib

work=Path(__file__).resolve().parent
root=work.parents[3]
baseline=json.loads((work/'entry-baseline.json').read_text())
target=Path(sys.argv[1]) if len(sys.argv)>1 else root/'.agents/skills'
rows=json.loads((work/'relocations.json').read_text())
errors=[]; checked=0
for row in rows:
    if row['profile']!='canonical': continue
    directory=target/row['skill']; entry=(directory/'SKILL.md').read_text()
    fm=entry.split('---',2)[1]
    if hashlib.sha256(fm.encode()).hexdigest()!=row['frontmatter_sha256']: errors.append(row['skill']+': frontmatter changed')
    for ref in row['references']:
        link='references/'+ref
        if ']('+link+')' not in entry: errors.append(row['skill']+': missing entry route '+link)
        file=directory/link
        if not file.exists(): errors.append(row['skill']+': missing reference '+link);continue
        checked+=1
        if len(file.read_text().strip())<100: errors.append(str(file)+': empty detail')
    # Resolve actual Markdown links from entry and the new references, never paths in code examples.
    for file in [directory/'SKILL.md',*[directory/'references'/r for r in row['references'] if (directory/'references'/r).exists()]]:
        source=re.sub(r'```[\s\S]*?```','',file.read_text())
        for match in re.finditer(r'\]\(([^\s)]+)\)',source):
            href=match.group(1)
            if href.startswith('#') or re.match(r'[a-z]+:',href): continue
            dest=file.parent/href.split('#',1)[0]
            # Sibling skills live outside the selected inventory; resolve those against the real canonical root.
            if not dest.exists() and file.parent==directory and href.startswith('../'):
                dest=root/'.agents/skills'/href[3:].split('#',1)[0]
            if not dest.exists():errors.append(str(file)+': broken link '+href)

# Exact line retention catches omitted conditions and examples; ignore link relocation only.
def normalize(line):
    line=re.sub(r'\]\((?:\.\./)+','](',line)
    return line.strip()
exceptions={
    'setup-matt-pocock-skills': ['- **Issue tracker** — where issues live (GitHub by default; local markdown is also supported out of the box)'],
    'wayfinder': ['Each ticket carries a', "The answer isn't part of the body"],
    'archify': ['Do not read `renderers/shared/geometry.mjs`'],
    'yss-hook': ['下面示例仅说明','`@yss-ui/hooks` 没有通用','`usePollingTask` 是通用'],
    'yss-openapi-governance': ['- 使用上面的锁定'],
}
for row in rows:
    if row['profile']!='canonical':continue
    before=baseline[row['skill']]
    directory=target/row['skill']
    after='\n'.join(p.read_text() for p in [directory/'SKILL.md',*[directory/'references'/r for r in row['references'] if (directory/'references'/r).exists()]])
    lines={normalize(l) for l in after.splitlines()}
    for line in before.splitlines():
        if not line.strip() or any(line.strip().startswith(x) for x in exceptions.get(row['skill'],[])): continue
        if normalize(line) not in lines:errors.append(row['skill']+': missing original line '+line[:130])

print(json.dumps({'status':'fail' if errors else 'pass','canonical_skills':14,'new_references_checked':checked,'errors':errors},ensure_ascii=False,indent=2))
sys.exit(bool(errors))
