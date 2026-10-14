import {readInstanceMetadata} from './instance-metadata.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { parseDocument } from '../vendor/yaml.mjs';
import {sourceContextRef} from './source-context-snapshot.mjs';
import {loadOrchestrationContract} from './orchestration-contract.mjs';

export const digest = bytes => `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
export function safeFile(root, ref) {
  if (typeof ref !== 'string' || !ref || path.isAbsolute(ref) || /[\\\x00-\x1f:#?]/.test(ref) || ref.split('/').some(p=>!p||p==='.'||p==='..')) throw new Error(`非法治理引用: ${ref}`);
  ref=sourceContextRef(root,ref);
  let file=fs.realpathSync(root);
  for(const part of ref.split('/')) {
    file=path.join(file,part);
    try { if(fs.lstatSync(file).isSymbolicLink()) throw new Error(`治理引用禁止符号链接: ${ref}`); }
    catch(error) { if(error.code!=='ENOENT') throw error; }
  }
  return file;
}
export function readDocument(root, ref) {
  if(ref.endsWith("/orchestration-contract.yaml")) return readOrchestrationContract(root,ref).value;
  const bytes=fs.readFileSync(safeFile(root,ref));
  const doc=parseDocument(bytes.toString('utf8'),{uniqueKeys:true,maxAliasCount:0});
  if(doc.errors.length) throw new Error(`${ref}: ${doc.errors[0].message}`);
  return doc.toJS({maxAliasCount:0});
}
export function fileBinding(root, ref) {
  const file=safeFile(root,ref);
  try { if(!fs.statSync(file).isFile()) throw new Error(`治理引用不是文件: ${ref}`); return digest(fs.readFileSync(file)); }
  catch(error) { if(error.code==='ENOENT')return null; throw error; }
}

/** 读取编排合同（单文件或清单 + 部件）；digest 带 sha256: 前缀，覆盖清单与全部部件。 */
export function readOrchestrationContract(root, ref = orchestrationRef(root)) {
  const loaded=loadOrchestrationContract(part=>fs.readFileSync(safeFile(root,part)),ref);
  return {...loaded,digest:`sha256:${loaded.digest}`};
}

export function orchestrationRef(root) {
  const canonical=fileBinding(root,'.template-spec/process/orchestration-contract.yaml')?'.template-spec/process/orchestration-contract.yaml':null;
  const profileRef='.template-spec/process/harness-profile.yaml';
  if(!fileBinding(root,profileRef))return canonical || '.agents/skills/yss-product-lifecycle/references/orchestration-contract.yaml';
  const profile=readDocument(root,profileRef).profile_id;
  if(profile==='harness.spec-template') {
    const identity=readInstanceMetadata(root);
    if(identity?.kind!=='native'||identity.profile!=='spec')throw new Error('Spec 原生 Profile 缺少匹配的实例身份');
    return canonical || '.agents/skills/yss-product-lifecycle/references/orchestration-contract.yaml';
  }
  const owner={
    'harness.business-ddd-strategy-handoff':'yss-strategic-design',
    'harness.backend-delivery':'harness-orchestrator'
  }[profile];
  if(!owner)throw new Error(`未知生命周期 profile: ${profile}`);
  return canonical || `.agents/skills/${owner}/references/orchestration-contract.yaml`;
}
