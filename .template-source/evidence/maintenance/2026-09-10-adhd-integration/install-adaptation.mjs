import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {parse} from '../../../../scripts/vendor/yaml.mjs';
import {treeHash} from '../../../../scripts/lib/skill-supply-chain.mjs';

const root = process.cwd();
const evidence = '.template-source/evidence/maintenance/2026-09-10-adhd-integration';
const revision = '7b9069b39972e269e61bd95c2f66ebb90cac6a02';
const source = 'ayghri/i-have-adhd';
const skill = 'i-have-adhd';
const rawHash = treeHash(path.join(evidence, 'upstream/skills/i-have-adhd'));
const repoNames = process.argv.slice(2);
const owners = ['yss-product-lifecycle','yss-strategic-design','harness-orchestrator','yss-research','research','yss-stage-decision','yss-prototype-stage','yss-technical-design','yss-openapi-governance','yss-implementation-contract-compiler','code-review','prototype-review','architecture-agent','frontend-agent','backend-agent','test-agent'];
const pointer = '文档输出时按 `lifecycle-document-output` 条件调用 `i-have-adhd`，读取 `docs/process/document-writing.md`；作用域仅限当前产物，派发时传递条件及引用。';
function appendList(text, key, entry) {
  const re = new RegExp(`^${key}:\\n( *)-`, 'm');
  const m = text.match(re);
  if (!m) throw new Error(`Cannot locate ${key}`);
  return text.replace(new RegExp(`^${key}:\\n`, 'm'), `${key}:\n${m[1]}- ${entry}\n`);
}
for (const name of repoNames) {
  const repo = path.resolve(root, name);
  const read = ref => fs.readFileSync(path.join(repo, ref),'utf8');
  const write = (ref, text) => {fs.mkdirSync(path.dirname(path.join(repo, ref)),{recursive:true}); fs.writeFileSync(path.join(repo, ref),text);};
  if (parse(read('yss-project.yaml')).repository_mode !== 'template-source') throw new Error('Invalid template identity');
  if (repo !== root) {
    fs.cpSync(path.join(root,'.agents/skills/i-have-adhd'), path.join(repo,'.agents/skills/i-have-adhd'),{recursive:true,errorOnExist:true,force:false});
    for (const ref of ['docs/process/document-writing.md','docs/templates/examples/lifecycle-writing-examples.md']) write(ref,fs.readFileSync(path.join(root,ref)));
    fs.cpSync(path.join(root,evidence,'upstream'),path.join(repo,evidence,'upstream'),{recursive:true});
    write(`${evidence}/upstream-files.json`,fs.readFileSync(path.join(root,evidence,'upstream-files.json')));
  }
  write('.agents/skills/i-have-adhd/LICENSE',fs.readFileSync(path.join(root,evidence,'upstream/LICENSE')));
  const registryRef = 'docs/agents/yss-skill-registry.yaml';
  let text = read(registryRef);
  const registry = parse(text);
  const available = new Set(registry.skills.map(x=>x.id));
  const callers = owners.filter(x=>available.has(x));
  if (!available.has(skill)) {
    text = appendList(text,'skills','{ id: i-have-adhd, layer: core, maturity: supported, instance_default_discoverable: true, aliases: [], impacts: [writing] }');
    text = appendList(text,'capabilities','{ id: writing.lifecycle-document, primary_skill: i-have-adhd, task_modes: [guidance] }');
    text = text.replace(/^  overrides: \{\}\n/m, '  overrides:\n');
    text = text.replace(/^  overrides:\n/m,'  overrides:\n    i-have-adhd:\n      invocation_mode: model\n      trigger_conditions: [lifecycle-document-output]\n      exclusion_conditions: [code-only-work, command-only-work, unrelated-conversation, user-disabled]\n      primary_output: document-writing-assistance\n');
    for (const owner of callers) {
      const deps = registry.skill_dependencies[owner];
      if (deps?.some(x=>x.skill===skill)) continue;
      const line = '{ skill: i-have-adhd, type: context-conditional, when: lifecycle-document-output }';
      if (deps && deps.length) {
        const re = new RegExp(`(^  ${owner}:\\n)( *)-`,'m');
        const m = text.match(re);
        if (!m) throw new Error(`Cannot insert dependency for ${owner}`);
        text = text.replace(re, `$1${m[2]}- ${line}\n${m[2]}-`);
      } else if (deps) {
        text = text.replace(new RegExp(`^  ${owner}: \\[\\]$`,'m'),`  ${owner}:\n    - ${line}`);
      } else text = text.replace(/^skill_dependencies:\n/m,`skill_dependencies:\n  ${owner}:\n    - ${line}\n`);
    }
    parse(text);
    write(registryRef,text);
  }
  for (const owner of callers) {
    const ref = `.agents/skills/${owner}/SKILL.md`;
    if (!fs.existsSync(path.join(repo,ref))) throw new Error(`Missing canonical caller ${ref}`);
    let entry=read(ref);
    if (entry.includes('`i-have-adhd`')) continue;
    if (owner === 'yss-product-lifecycle') entry=entry.replace('文档起草、修订、派发和会签按 `document_writing` 加载并传递 `docs/process/document-writing.md`。','文档工作按 `document_writing` 条件调用 `i-have-adhd` 并传递写作规范。');
    else {
      const at=entry.indexOf('\n## ');
      entry=at<0 ? entry.trimEnd()+'\n\n'+pointer+'\n' : entry.slice(0,at)+'\n'+pointer+'\n'+entry.slice(at);
    }
    write(ref,entry);
  }
  const orchestrator = callers.find(x=>['yss-product-lifecycle','yss-strategic-design','harness-orchestrator'].includes(x));
  const contractRef = `.agents/skills/${orchestrator}/references/orchestration-contract.yaml`;
  let contract=read(contractRef);
  if (!contract.includes('document_writing:')) contract=contract.replace(/^(schema_version: [12])\n/m,'$1\ndocument_writing:\n  reference: docs/process/document-writing.md\n  examples: docs/templates/examples/lifecycle-writing-examples.md\n  artifact_ownership: unchanged\n  gate_and_status_semantics: unchanged\n');
  if (!contract.includes('  supporting_skill: i-have-adhd')) contract=contract.replace('document_writing:\n','document_writing:\n  supporting_skill: i-have-adhd\n  condition: lifecycle-document-output\n  scope: current-document-work-only\n  dispatch: pass-condition-and-reference-to-document-owner\n');
  write(contractRef,contract);
  execFileSync('scripts/update-skill-lock',[`--add=${skill}`],{cwd:repo});
  const lock=JSON.parse(read('skills-lock.json'));
  lock.sources[source]={revision};
  Object.assign(lock.skills.shared[skill],{source,sourceType:'git',sourceRevision:revision,skillPath:'skills/i-have-adhd/SKILL.md',upstreamHash:rawHash,adaptationRef:'.agents/skills/i-have-adhd/references/yss-adaptation.md'});
  write('skills-lock.json',JSON.stringify(lock,null,2)+'\n');
  execFileSync('scripts/sync-skills',[],{cwd:repo});
  execFileSync('scripts/update-skill-lock',[],{cwd:repo});
  console.log(`${name}: installed ${skill}, ${callers.length} conditional callers, ${orchestrator}`);
}
