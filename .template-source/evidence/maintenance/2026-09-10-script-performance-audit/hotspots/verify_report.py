import json, hashlib, csv
from pathlib import Path
OUT=Path(__file__).resolve().parent
ROOT=OUT.parents[4]
data=json.loads((OUT/'candidates.json').read_text())
assert len(data['candidates'])==12
assert len({r['id'] for r in data['candidates']})==12
count=0
for row in data['candidates']:
    for ref in row['sources']:
        source=ROOT/ref['path']
        raw=source.read_bytes()
        assert 0 < ref['line'] <= len(raw.splitlines()), ref
        assert hashlib.sha256(raw).hexdigest()==ref['sha256'], ref
        count+=1
assessments=list(csv.DictReader((OUT/'implementation-assessments.csv').open()))
assert len(assessments)==338
assert sum(x['active_script_group']=='True' for x in assessments)==320
for row in assessments:
    raw=(ROOT/row['representative_path']).read_bytes()
    assert hashlib.sha256(raw).hexdigest()==row['sha256'], row['representative_path']
    assert all(x in {c['id'] for c in data['candidates']} for x in row['candidate_ids'].split(',') if x)
print(json.dumps({'status':'passed','candidate_count':12,'source_refs_verified':count,'assessment_groups_verified':len(assessments),'active_scripts_sha_groups':320}))
