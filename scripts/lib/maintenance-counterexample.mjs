import fs from 'node:fs';
import { readDocument, safeFile, fileBinding, digest } from './governance-io.mjs';
import {resolveMaintenanceReference} from './maintenance-storage.mjs';
import {parseDocument} from '../vendor/yaml.mjs';
const read = (root, ref) => {
  if (!ref?.startsWith('maintenance:')) return readDocument(root, ref);
  const doc = parseDocument(fs.readFileSync(resolveMaintenanceReference(ref, {root}), 'utf8'), {uniqueKeys:true, maxAliasCount:0});
  if (doc.errors.length) throw new TypeError(doc.errors[0].message);
  return doc.toJS({maxAliasCount:0});
};
const binding = (root, ref) => ref?.startsWith('maintenance:') ? digest(fs.readFileSync(resolveMaintenanceReference(ref, {root}))) : fileBinding(root, ref);

// Verify saved execution evidence. Never execute commands supplied by an evidence record.
export function validateCounterexample(evidence, {root, trigger}) {
  const fail=message=>{throw new TypeError(`counterexample ${trigger}: ${message}`);};
  if(!evidence?.run_ref)fail('缺少实际运行 run_ref');
  const run=read(root,evidence.run_ref);
  if(run.schema_version!==1||run.kind!=='maintenance-counterexample-run'||run.trigger!==trigger||run.command!==evidence.command||run.exit_code!==0)fail('运行身份、命令或退出码无效');
  if(!Number.isFinite(Date.parse(run.started_at))||!Number.isFinite(Date.parse(run.finished_at))||Date.parse(run.finished_at)<Date.parse(run.started_at))fail('运行时间无效');
  if(!Array.isArray(run.assertions)||!run.assertions.length)fail('缺少拒绝断言');
  const log=read(root,run.log?.ref);
  if(binding(root,run.log.ref)!==run.log.digest||!Array.isArray(log))fail('运行日志摘要或结构无效');
  for(const assertion of run.assertions) {
    const actual=log.find(x=>x.id===assertion.id);
    if(!assertion.id||assertion.expected!=='reject'||assertion.actual!=='rejected'||!actual||!Array.isArray(actual.command)||!actual.command.length||!Number.isInteger(actual.exit_code)||actual.exit_code===0||!String(actual.stderr||actual.stdout||'').trim())fail('拒绝场景缺少实际失败执行记录');
    if(typeof assertion.expected_diagnostic!=='string'||!assertion.expected_diagnostic.trim()||!`${actual.stderr||''}\n${actual.stdout||''}`.includes(assertion.expected_diagnostic))fail('拒绝场景未命中预期原因');
  }
  if(!Array.isArray(run.inputs)||!run.inputs.length)fail('缺少输入绑定');
  for(const input of run.inputs)if(!input.ref||binding(root,input.ref)!==input.digest)fail(`输入漂移: ${input.ref}`);
  if(run.input_digest!==digest(JSON.stringify(run.inputs)))fail('输入范围摘要不一致');
  return {status:'passed',trigger};
}
