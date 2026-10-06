from pathlib import Path
import re,json,hashlib,shutil,subprocess,stat
R=Path(__file__).resolve().parents[2]
import sys
CHECK="--check" in sys.argv
# Closed source payloads. Text-only Skill consumers get only the files they read;
# executable generators get their actual modules, assets and authority dependencies.
common=['.agents/skills/yss-ui/SKILL.md','.agents/skills/yss-ui/references/yss-ui-source-index.md']
seeds={
'design':['.agents/skills/yss-api-integration/SKILL.md','.agents/skills/yss-openapi-governance/SKILL.md','.agents/skills/yss-dto/SKILL.md','.agents/skills/yss-dto/references/openapi-wire-profile.yaml','.agents/skills/yss-openapi-draft-review/SKILL.md','.agents/skills/implementation-repo-onboarding/SKILL.md','.agents/skills/yss-implementation-contract-compiler/references/slice-implementation-contract.md','.agents/skills/yss-implementation-contract-compiler/SKILL.md','.agents/skills/yss-implementation-contract-compiler/references/compiler-contract.yaml','scripts/lib/implementation-contract-compiler.mjs','scripts/verify-yss-dto-openapi-profile'],
'backend':['.agents/skills/yss-prototype-stage/scripts/visual-baseline-contract.mjs'], 'frontend':['scripts/verify-scaffold-architecture-decisions']}
# Exact actual UI scenario reads, rather than copying its 300-file tree.
for profile in ['design','backend']:
 seeds[profile]+=['.agents/skills/yss-ui/SKILL.md']
 seeds[profile]+=[str(x.relative_to(R)) for x in (R/'.agents/skills/yss-ui/references').iterdir() if x.name in ['component-routing.md','antdv-compatibility.md','theme-locale-overlay.md','accessibility.md','verification.md','migration-antdv-to-yss.md','quick-recipes.md']]
 seeds[profile]+=[str(x.relative_to(R)) for x in (R/'.agents/skills/yss-ui/assets/demos').rglob('*.vue')]
 seeds[profile]+=['.agents/skills/yss-ui/assets/scenario-index.md']
for profile in seeds:
 src=R/'submodules'/f'yss-harness-{profile}-agent'
 f=src/'tests/scenarios/verify-yss-ui-scenarios.mjs'
 if f.exists():
  for x in re.findall(r'["\'](\.agents/skills/yss-ui/[^"\']+)["\']',f.read_text()): seeds[profile].append(x)
for profile in ['design','frontend']:
 seeds[profile]+=[str(x.relative_to(R)) for x in (R/'.agents/skills/yss-ddd-scaffold-generator').rglob('*') if x.is_file()]
 seeds[profile]+=['scripts/fixtures/user-decision/build-fixture.mjs','scripts/fixtures/backend-scaffold/attach-design-prerequisites.mjs','scripts/fixtures/backend-scaffold/design-prerequisites.mjs','yss-project.yaml','CONTEXT.md','.template-source/engineering/evidence/aliyun-artifact-resolution.json']
 # Data dependencies of schema validation and approved scaffold source provenance.
 seeds[profile]+=[str(x.relative_to(R)) for x in (R/'.template-spec/process/schemas').glob('*scaffold*') if x.is_file()]
 seeds[profile]+=[str(x.relative_to(R)) for x in (R/'.agents/skills/yss-technical-design/references').glob('*.json')]
for profile,initial in seeds.items():
 selected=set();pending=list(initial)
 while pending:
  ref=pending.pop();q=R/ref
  if ref in selected:continue
  if not q.is_file():
   if 'yss-ui-source-index' in ref:continue
   raise ValueError('missing seed '+ref)
  if q.is_symlink(): raise ValueError('source symlink '+ref)
  selected.add(ref)
  if q.suffix in ['.json','.yaml','.yml']:
   raw=q.read_text()
   for rel in re.findall(r'["\']([^"\']+\.json(?:#[^"\']*)?)["\']',raw):
    rel=rel.split('#')[0];dep=(q.parent/rel).resolve()
    if dep.is_relative_to(R) and dep.is_file():pending.append(str(dep.relative_to(R)))
  if q.suffix not in ['.mjs','.js'] and not ref.startswith('scripts/verify-'):continue
  text=q.read_text()
  # Relative ES imports/reexports and literal dynamic imports; builtins stay builtin.
  for rel in re.findall(r'(?m)^\s*(?:import|export)\b[^;]*?from\s*["\'](\.[^"\']+)["\']',text):
   dep=(q.parent/rel).resolve()
   if not dep.is_relative_to(R):raise ValueError('escaped import '+rel)
   pending.append(str(dep.relative_to(R)))
  for rel in re.findall(r'["\'](\.\.?/[^"\'\n]+)["\']',text):
   dep=(q.parent/rel).resolve()
   if dep.is_relative_to(R) and dep.is_file():pending.append(str(dep.relative_to(R)))
  for kind in re.findall(r'["\']([a-z][a-z0-9-]+)["\']',text):
   dep=R/'.template-spec/process/schemas'/f'{kind}.schema.json'
   if dep.is_file():pending.append(str(dep.relative_to(R)))
  # Literal repository paths consumed by module file IO.
  for dep in re.findall(r'["\']((?:\.template-source/|\.template-spec/|\.agents/skills/)[^"\'\n]+)["\']',text):
   if (R/dep).is_file():pending.append(dep)
 dest=R/'submodules'/f'yss-harness-{profile}-agent/tests/fixtures/upstream-source'
 
 if not CHECK:dest.mkdir(parents=True,exist_ok=True)
 rows=[]
 for ref in sorted(selected):
  s=R/ref;t=dest/ref
  if CHECK:
   assert t.is_file() and not t.is_symlink() and t.read_bytes()==s.read_bytes() and stat.S_IMODE(t.stat().st_mode)==stat.S_IMODE(s.stat().st_mode),(profile,ref)
  else:
   t.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(s,t)
  rows.append({'path':ref,'source_path':ref,'sha256':hashlib.sha256(s.read_bytes()).hexdigest(),'mode':stat.S_IMODE(s.stat().st_mode)})
 index={'schema_version':1,'kind':'test-only-canonical-source','source_repository':'yss-spec-project-template','source_head':subprocess.check_output(['git','rev-parse','HEAD'],cwd=R,text=True).strip(),'source_state':'working-tree','files':rows}
 expected='// Generated test source inventory; not a lifecycle policy or an approval.\nexport default '+json.dumps(index,ensure_ascii=False,indent=2)+';\n'
 if CHECK:
  assert (dest.parent/'upstream-source-index.mjs').read_text()==expected,(profile,'index')
  assert sorted(str(x.relative_to(dest)) for x in dest.rglob('*') if x.is_file())==sorted(selected),(profile,'extra files')
 else:(dest.parent/'upstream-source-index.mjs').write_text(expected)
 print(profile,len(rows),'fixture source files',flush=True)
