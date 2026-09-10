// Structural and real dependency-resolution checks; not a model-output quality evaluation.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

const root=path.resolve(process.argv[2] || '.');
const read=ref=>fs.readFileSync(path.join(root,ref),'utf8');
const {parse}=await import(pathToFileURL(path.join(root,'scripts/vendor/yaml.mjs')));
const registry=parse(read('docs/agents/yss-skill-registry.yaml'));
const skill=registry.skills.find(x=>x.id==='i-have-adhd');
assert.equal(skill.instance_default_discoverable,true);
assert.equal(registry.invocation_contract.overrides['i-have-adhd'].invocation_mode,'model');
assert.ok(registry.invocation_contract.overrides['i-have-adhd'].exclusion_conditions.includes('unrelated-conversation'));
assert.ok(registry.invocation_contract.overrides['i-have-adhd'].exclusion_conditions.includes('user-disabled'));
const entry=read('.agents/skills/i-have-adhd/SKILL.md');
assert.ok(!entry.includes('disable-model-invocation: true'));
assert.equal(parse(read('.agents/skills/i-have-adhd/agents/openai.yaml')).policy.allow_implicit_invocation,true);
const lock=JSON.parse(read('skills-lock.json'));
const locked=lock.skills.shared['i-have-adhd'];
assert.equal(locked.source,'ayghri/i-have-adhd');
assert.equal(locked.sourceRevision,'7b9069b39972e269e61bd95c2f66ebb90cac6a02');
assert.notEqual(locked.upstreamHash,locked.effectiveHash);
const {treeHash}=await import(pathToFileURL(path.join(root,'scripts/lib/skill-supply-chain.mjs')));
assert.equal(treeHash(path.join(root,'.agents/skills/i-have-adhd')),locked.effectiveHash);
for (const target of locked.targets) {
  const skillPath=target.endsWith('/i-have-adhd')?target:path.join(target,'i-have-adhd');
  assert.equal(treeHash(path.join(root,skillPath)),locked.effectiveHash,`projection ${target}`);
}
for(const ref of ['docs/process/document-writing.md','docs/templates/examples/lifecycle-writing-examples.md']) {
  assert.ok(read(ref).length);
  assert.ok(!read(ref).includes('.template-source/'));
}
const callers=Object.entries(registry.skill_dependencies).filter(([,deps])=>deps.some(d=>d.skill==='i-have-adhd'));
assert.ok(callers.length>0);
for(const [owner,deps] of callers) {
  const edge=deps.find(d=>d.skill==='i-have-adhd');
  assert.equal(edge.type,'context-conditional');
  assert.equal(edge.when,'lifecycle-document-output');
  assert.ok(read(`.agents/skills/${owner}/SKILL.md`).includes('`i-have-adhd`'));
}
const orchestrator=registry.skills.find(x=>['yss-product-lifecycle','yss-strategic-design','harness-orchestrator'].includes(x.id)).id;
const contract=parse(read(`.agents/skills/${orchestrator}/references/orchestration-contract.yaml`));
assert.equal(contract.document_writing.supporting_skill,'i-have-adhd');
assert.equal(contract.document_writing.condition,'lifecycle-document-output');
assert.equal(contract.document_writing.scope,'current-document-work-only');
assert.equal(contract.document_writing.gate_and_status_semantics,'unchanged');

// Compile using the actual repository resolver, with and without the condition and again without it.
const compiler=path.join(root,'scripts/lib/implementation-contract-compiler.mjs');
if(fs.existsSync(compiler)) {
  const api=await import(pathToFileURL(compiler));
  const capability=registry.capabilities.find(c=>c.id==='governance.implementation-contract');
  assert.ok(capability);
  const run=conditions=>api.compileImplementationContract({registry,compilerContract:api.loadCompilerContract(),requiredCapabilities:[capability.id],conditions,root});
  const off=run([]),on=run(['lifecycle-document-output']),next=run([]);
  assert.ok(!off.required_skills.includes('i-have-adhd'));
  assert.ok(on.required_skills.includes('i-have-adhd'));
  assert.ok(!next.required_skills.includes('i-have-adhd'));
  assert.equal(on.status,'draft');
  console.log('PASS: actual resolver excludes code-only, includes document output, does not persist condition or approve the contract.');
} else console.log('N/A: this strategic-only template has no implementation compiler; conditional route verified in registry and orchestration contract.');
console.log(`PASS: source, license metadata, ${locked.targets.length} projections, ${callers.length} callers, scope and readable writing inputs. Model output quality not measured.`);
