import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { safeFile, fileBinding, readDocument, digest } from './governance-io.mjs';
import { CI_CONFIG, TRACKER, governanceScope } from './project-governance.mjs';

export const CI_WORKFLOW='.github/workflows/yss-governance.yml';
export const CI_RECEIPT='.template-spec/process/project-ci-install.json';
export const CI_JOURNAL='.template-spec/process/.project-ci-transaction.json';
const conflict=message=>{const error=new Error(message);error.exitCode=1;throw error;};
const canonical=value=>Array.isArray(value)?value.map(canonical):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(k=>[k,canonical(value[k])])):value;
const encode=value=>JSON.stringify(canonical(value),null,2)+'\n';
const hashObject=value=>digest(encode(value));
function workflow(branch) {
  return `# Managed by scripts/project-ci; edit through an explicit plan/apply.\nname: YSS project governance\non:\n  pull_request:\n  push:\n    branches: [${JSON.stringify(branch)}]\n  workflow_dispatch:\npermissions:\n  contents: read\njobs:\n  governance:\n    name: YSS governance\n    runs-on: ubuntu-latest\n    timeout-minutes: 15\n    steps:\n      - uses: actions/checkout@v4\n        with:\n          fetch-depth: 0\n          persist-credentials: false\n      - uses: actions/setup-node@v4\n        with:\n          node-version: '24'\n      - uses: actions/setup-python@v5\n        with:\n          python-version: '3.12'\n      - run: python -m pip install jsonschema==4.23.0\n      - name: Check current governance evidence\n        env:\n          BASE_SHA: \${{ github.event.pull_request.base.sha }}\n        shell: bash\n        run: |\n          if [[ -n "$BASE_SHA" ]]; then\n            node scripts/project-ci check --root . --base "$BASE_SHA" --json > "$RUNNER_TEMP/yss-governance.json"\n          else\n            node scripts/project-ci check --root . --json > "$RUNNER_TEMP/yss-governance.json"\n          fi\n      - uses: actions/upload-artifact@v4\n        if: always()\n        with:\n          name: yss-governance\n          path: \${{ runner.temp }}/yss-governance.json\n          if-no-files-found: error\n`;
}
function configuration(branch,additionalPaths) {
  if(typeof branch!=='string'||!/^[A-Za-z0-9][A-Za-z0-9._/-]*$/.test(branch)||branch.includes('..')||branch.includes('//')||branch.endsWith('/')||branch.endsWith('.lock'))throw new Error('目标分支无效');
  return {schema_version:1,provider:'github',branch,additional_paths:[...new Set(additionalPaths)].sort()};
}
function outputs(config) {
  const items=[{ref:CI_WORKFLOW,content:workflow(config.branch)},{ref:CI_CONFIG,content:encode(config)}];
  const receipt={schema_version:1,kind:'project-ci-installation',managed:Object.fromEntries(items.map(x=>[x.ref,digest(x.content)]))};
  return [...items,{ref:CI_RECEIPT,content:encode(receipt)}].map(x=>({...x,sha256:digest(x.content)}));
}
export function planProjectCi({root,provider='github',branch,additionalPaths}={}) {
  root=fs.realpathSync(root);
  if(provider!=='github')throw new Error('首版仅支持 --provider github');
  const scope=governanceScope(root);
  const config=configuration(branch??scope.config.branch??'main',additionalPaths??scope.config.additional_paths);
  config.additional_paths.forEach(ref=>safeFile(root,ref));
  const owned=fileBinding(root,CI_RECEIPT)?readDocument(root,CI_RECEIPT):null;
  if(owned&&(owned.schema_version!==1||owned.kind!=='project-ci-installation'||!owned.managed))throw new Error('CI 托管凭据无效');
  const expected=outputs(config),conflicts=[];
  const inputs=[...new Set(['yss-project.yaml',TRACKER,CI_CONFIG,CI_RECEIPT,CI_WORKFLOW,CI_JOURNAL])].sort().map(ref=>({ref,sha256:fileBinding(root,ref)}));
  for(const item of expected) {
    const current=fileBinding(root,item.ref);
    if(item.ref===CI_RECEIPT)continue;
    if(current&&(!owned||owned.managed[item.ref]!==current))conflicts.push({ref:item.ref,reason:'已有人工文件或托管输出已被修改'});
    if(!current&&owned?.managed[item.ref])conflicts.push({ref:item.ref,reason:'托管文件缺失，先恢复或显式处理'});
  }
  if(fileBinding(root,CI_JOURNAL))conflicts.push({ref:CI_JOURNAL,reason:'存在未完成事务，运行 apply --recover'});
  const implementation=['project-ci-install.mjs','project-governance.mjs','governance-io.mjs'].map(ref=>({ref,sha256:digest(fs.readFileSync(new URL(ref,import.meta.url)))}));
  const plan={schema_version:1,kind:'project-ci-plan',root,provider,branch:config.branch,additional_paths:config.additional_paths,roots:[...new Set([scope.trackerRoot,...config.additional_paths])],inputs,implementation,outputs:expected,conflicts,execution_authorization:'not-evaluated'};
  return {...plan,plan_digest:hashObject(plan)};
}
function atomicWrite(root,ref,bytes) {
  const target=safeFile(root,ref);fs.mkdirSync(path.dirname(target),{recursive:true});
  const temporary=`${target}.tmp-${randomUUID()}`;
  try{fs.writeFileSync(temporary,bytes,{flag:'wx'});fs.renameSync(temporary,target);}finally{if(fs.existsSync(temporary))fs.unlinkSync(temporary);}
}
export function recoverProjectCi(root) {
  root=fs.realpathSync(root);
  governanceScope(root);
  const journal=readDocument(root,CI_JOURNAL);
  if(journal.schema_version!==1||journal.kind!=='project-ci-transaction'||!Array.isArray(journal.files)||journal.files.length!==3||new Set(journal.files.map(x=>x.ref)).size!==3||journal.files.some(x=>![CI_WORKFLOW,CI_CONFIG,CI_RECEIPT].includes(x.ref)))throw new Error('CI 恢复日志无效');
  for(const item of journal.files) {
    const old=item.before===null?null:Buffer.from(item.before,'base64');
    if((old===null?null:digest(old))!==item.before_digest)throw new Error(`恢复备份摘要不一致: ${item.ref}`);
    const current=fileBinding(root,item.ref);
    if(current!==item.after_digest&&current!==item.before_digest)conflict(`恢复冲突，保留后续修改: ${item.ref}`);
  }
  for(const item of [...journal.files].reverse())if(fileBinding(root,item.ref)!==item.before_digest) {
    if(item.before===null)fs.unlinkSync(safeFile(root,item.ref));else atomicWrite(root,item.ref,Buffer.from(item.before,'base64'));
  }
  fs.unlinkSync(safeFile(root,CI_JOURNAL));return {status:'recovered',remote_changed:false};
}
export function applyProjectCi({root,plan,recover=false}={}) {
  root=fs.realpathSync(root);
  if(recover)return recoverProjectCi(root);
  const {plan_digest,...body}=plan||{};
  if(plan_digest!==hashObject(body)||plan.schema_version!==1||plan.provider!=='github'||plan.kind!=='project-ci-plan'||plan.root!==root||plan.conflicts.length)throw new Error('CI 计划无效、根不匹配或存在冲突');
  const intended=outputs(configuration(plan.branch,plan.additional_paths));
  if(encode(intended)!==encode(plan.outputs))throw new Error('CI 计划输出被替换');
  if(fileBinding(root,CI_JOURNAL))throw new Error('存在未完成事务，先运行 apply --recover');
  const currentScope=governanceScope(root);
  if(intended.every(x=>fileBinding(root,x.ref)===x.sha256)) {
    const unchanged=plan.inputs.filter(x=>![CI_CONFIG,CI_RECEIPT,CI_WORKFLOW].includes(x.ref)).every(x=>fileBinding(root,x.ref)===x.sha256);
    const sameCode=plan.implementation.every(x=>['project-ci-install.mjs','project-governance.mjs','governance-io.mjs'].includes(x.ref)&&digest(fs.readFileSync(new URL(x.ref,import.meta.url)))===x.sha256);
    if(!unchanged||!sameCode||!plan.roots.includes(currentScope.trackerRoot))conflict('CI 计划输入已变化，请重新 plan');
    return {status:'unchanged',remote_changed:false};
  }
  const current=planProjectCi({root,provider:plan.provider,branch:plan.branch,additionalPaths:plan.additional_paths});
  if(current.plan_digest!==plan.plan_digest)conflict('CI 计划输入已变化，请重新 plan');
  const journal={schema_version:1,kind:'project-ci-transaction',plan_digest,files:intended.map(x=>{const hash=fileBinding(root,x.ref);return {ref:x.ref,before:hash?fs.readFileSync(safeFile(root,x.ref)).toString('base64'):null,before_digest:hash,after_digest:x.sha256};})};
  const journalFile=safeFile(root,CI_JOURNAL);fs.mkdirSync(path.dirname(journalFile),{recursive:true});
  fs.writeFileSync(journalFile,encode(journal),{flag:'wx'});
  try {
    for(const item of intended) {
      const before=journal.files.find(x=>x.ref===item.ref).before_digest;
      if(fileBinding(root,item.ref)!==before)throw new Error(`并发修改: ${item.ref}`);
      atomicWrite(root,item.ref,item.content);
    }
    if(!intended.every(x=>fileBinding(root,x.ref)===x.sha256))throw new Error('CI 写入后并发变化');
    fs.unlinkSync(journalFile);
  }catch(error){try{recoverProjectCi(root);}catch(recovery){throw new Error(`${error.message}; ${recovery.message}`);}throw error;}
  return {status:'applied',files:intended.map(x=>x.ref),remote_changed:false};
}
