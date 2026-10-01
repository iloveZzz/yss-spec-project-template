import pathlib,subprocess,json,time,hashlib
P=pathlib.Path(__file__).parent;R=P/'source';source=R/'scripts/lib/json-schema.mjs';original=source.read_bytes();records=[]
def run(label,args):
 start=time.perf_counter();r=subprocess.run(args,cwd=R,capture_output=True,text=True,timeout=90)
 (P/f'{label}.stdout').write_text(r.stdout);(P/f'{label}.stderr').write_text(r.stderr)
 records.append({'label':label,'argv':args,'exit_code':r.returncode,'ms':(time.perf_counter()-start)*1000})
 return r.returncode
check=['node','--test','--test-name-pattern','strict YAML and schema batching','scripts/fixtures/contract-efficiency/security.test.mjs']
assert run('dependency-baseline',check)==0
try:
 needle=b'return jobs.map((_,i)=>structuredClone(cached.get(i)));';assert original.count(needle)==1
 source.write_bytes(original.replace(needle,b"return jobs.map(() => ({valid:true,error:''})); // PILOT MUTATION ONLY"))
 hygiene=run('dependency-mutant-selected-hygiene',['node','scripts/verify-governance-layout'])
 caught=run('dependency-mutant-semantic-check',check)
 assert hygiene==0 and caught!=0
finally:source.write_bytes(original)
assert run('dependency-restored',check)==0
(P/'dependency-mutation.json').write_text(json.dumps({'scope':'isolated fixed-source copy only; not production change','original_sha256':hashlib.sha256(original).hexdigest(),'restored_sha256':hashlib.sha256(source.read_bytes()).hexdigest(),'records':records,'result':'selected-hygiene-misses-regression-existing-semantic-test-catches'},indent=2)+'\n')
print(json.dumps(records,indent=2))
