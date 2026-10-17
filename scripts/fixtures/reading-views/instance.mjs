// 阅读视图的集成夹具：真实的 yss 初始化实例（固定版本 yss 现场 init），managed 阅读由固定的 yss 渲染与校验。
// 与 fixture.mjs 分开：这里在导入时就要求有固定的 yss，纯 Node 的阅读视图测试不应因此失败。
import {cpSync,readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {stringify} from '../../vendor/yaml.mjs';
import {makeRoot} from '../../../tests/helpers/yss-instance.mjs';
import {demoStrategy,repo} from './fixture.mjs';

export const checkpoint='.work/demo/checkpoint.json';
export const manifest='.work/demo/reading/.manifest.json';
const MANIFEST_SCHEMA='.template-spec/process/schemas/reading-manifest.schema.json';

/**
 * manifestSchema：'current' 使用本仓的清单 schema（接受 v1 与 v2）；'embedded' 保留 yss 内置模板里的旧 schema（只接受 v1）。
 * 登记式布局：checkpoint 带 feature_id，.work/demo/map.md 登记它；yss 不支持缺 feature_id 的 legacy 布局。
 */
export function readingInstance({profile='spec',manifestSchema='current'}={}){
  const root=makeRoot('yss-reading-',profile);
  const put=(ref,value)=>{const file=path.join(root,ref);mkdirSync(path.dirname(file),{recursive:true});writeFileSync(file,typeof value==='string'?value:stringify(value));};
  const read=ref=>readFileSync(path.join(root,ref),'utf8');
  if(manifestSchema==='current')cpSync(path.join(repo,MANIFEST_SCHEMA),path.join(root,MANIFEST_SCHEMA));
  const strategy=demoStrategy();
  put('.work/demo/plan/domain-strategy.yaml',strategy);
  const value=JSON.parse(readFileSync(path.join(repo,'scripts/fixtures/reading-views/checkpoint.json'),'utf8'));
  value.feature_id='feature.demo';value.artifacts={'artifact.domain-strategy':{ref:'.work/demo/plan/domain-strategy.yaml',status:'draft',evidence_refs:[]}};
  put(checkpoint,JSON.stringify(value));
  put('.work/demo/map.md',`---\ncheckpoint_ref: ${checkpoint}\n---\n# 当前功能\n`);
  const cli=(...args)=>spawnSync(process.execPath,[path.join(repo,'scripts/contract'),...args,'--root',root],{encoding:'utf8'});
  const enable=()=>{const plan=cli('plan-enable','--checkpoint',checkpoint,'--output','enable.json','--json'),apply=cli('apply-enable','enable.json','--json');return {plan,apply};};
  return {root,put,read,strategy,cli,enable,checkpoint,cleanup:()=>{}}; // makeRoot 的目录在进程退出时统一清理
}
