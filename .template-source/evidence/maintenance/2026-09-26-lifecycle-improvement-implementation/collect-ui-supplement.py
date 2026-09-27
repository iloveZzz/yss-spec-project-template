"""Collect actual supplemental outputs without assigning semantic outcomes."""
import importlib.util,json,pathlib
E=pathlib.Path(__file__).resolve().parent
config=json.loads((E/'C2-ui-supplement-config.json').read_text());root=pathlib.Path(config['root'])
spec=importlib.util.spec_from_file_location('review',E/'collect-evaluation-review.py');module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
target=E/'ui-supplement-review-packets';target.mkdir(exist_ok=True);index=[]
for variant in ['baseline','candidate']:
 for p in sorted((root/variant).glob('*/result.json')):
  dest=target/f'{variant}-{p.parent.name}.json'
  if not dest.exists(): dest.write_text(json.dumps(module.collect(p.parent),ensure_ascii=False,indent=2)+'\n')
  d=json.loads(dest.read_text());index.append({'variant':variant,'run':p.parent.name,'automatic_result':d['result']['automatic_result'],'seconds':d['result']['elapsed_seconds'],'changed':d['original_files_changed'],'missing':d['original_files_missing'],'new_files':d['new_files'],'packet':dest.name})
(target/'index.json').write_text(json.dumps(index,ensure_ascii=False,indent=2)+'\n');print(json.dumps(index,ensure_ascii=False))
