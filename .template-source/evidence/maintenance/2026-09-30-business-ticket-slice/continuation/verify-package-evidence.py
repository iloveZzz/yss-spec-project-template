from pathlib import Path
import hashlib,json,datetime
root=Path('/Users/zhudaoming/Projects/yss-spec-project-template');out=Path(__file__).resolve().parent;report=[]
for side,folder in [('spec','create-yss-spec'),('design','create-yss-strategic-design'),('backend','create-yss-harness-backend'),('frontend','create-yss-harness-frontend')]:
 cli=root/'submodules'/folder;pkg=json.loads((cli/'package.json').read_text());installed=out/('install-'+side)/'node_modules'/pkg['name'];snapshot=cli/'template.snapshot.json'
 assert (installed/'template.snapshot.json').read_bytes()==snapshot.read_bytes(),side
 refs=['scripts/lib/business-tickets.mjs','scripts/lib/business-ticket-lifecycle.mjs','scripts/lib/strategic-handoff-io.mjs','scripts/lib/slice-contract.mjs','scripts/verify-business-tickets'];hashes={}
 if side!='design':refs.append('scripts/lib/slice-contract-preparation.mjs')
 if side=='spec':refs.append('.agents/skills/yss-product-lifecycle/SKILL.md')
 for ref in refs:
  data=(out/('instance-'+side)/ref).read_bytes();assert data==(root/ref).read_bytes(),(side,ref);hashes[ref]=hashlib.sha256(data).hexdigest()
 archive=out/'packs'/f"{pkg['name']}-{pkg['version']}.tgz";meta=json.loads(snapshot.read_text())
 report.append(dict(profile=side,package=pkg['name'],version=pkg['version'],archive=str(archive),archive_sha256=hashlib.sha256(archive.read_bytes()).hexdigest(),snapshot_sha256=hashlib.sha256(snapshot.read_bytes()).hexdigest(),installed_snapshot_matches=True,runtime_module_matches=hashes,sourceState=meta['sourceState'],templateCommit=meta['templateCommit']))
results=json.loads((out/'integration-results.json').read_text());assert len(results)==44 and all(r['exit_code']==r['expected'] for r in results)
inputs=json.loads((out/'source-before.json').read_text());drift=[]
for ref,old in inputs.items():
 actual=hashlib.sha256((root/ref).read_bytes()).hexdigest()
 if actual!=old:drift.append(dict(ref=ref,expected=old,actual=actual))
(out/'package-evidence.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');(out/'source-recheck.json').write_text(json.dumps(dict(observed_at=datetime.datetime.now(datetime.timezone.utc).isoformat(),checked=len(inputs),input_drift=bool(drift),changes=drift),ensure_ascii=False,indent=2)+'\n')
assert not drift,drift
print('4 package snapshots and installed business modules match; 44 integration commands passed; 39 scoped inputs unchanged')
