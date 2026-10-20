// Select a checkpoint reference; all authority, currentness and membership
// decisions remain in the native consumer.
import path from 'node:path';
import {parse} from '../vendor/yaml.mjs';
import {readFileSync} from './validation-phase.mjs';
import {nativeContractVerify,nativeCoverage,NEEDS} from './native-evidence.mjs';
export function verifyStageResult({root,checkpointRef,gateId,assetRef,recordRef,checkpoint}) {
 if(!recordRef) {
  if(!checkpointRef&&!checkpoint)throw new TypeError('STAGE_CHECKPOINT: 缺少 checkpoint');
  checkpoint??=parse(readFileSync(path.resolve(root,checkpointRef),'utf8'));
  recordRef=checkpoint.gates?.[gateId]?.record_ref;
 }
 if(!recordRef)throw new TypeError(`STAGE_PENDING: ${gateId} 尚无阶段记录`);
 const extra=[...(checkpointRef?['--checkpoint',checkpointRef]:[]),'--gate',gateId,...(assetRef?['--asset-ref',assetRef]:[])];
 return nativeCoverage(nativeContractVerify({root,kind:'stage-result',file:recordRef,extra,documents:checkpoint&&!checkpointRef?{'--checkpoint':checkpoint}:{},needs:NEEDS.stageResult}),'stage_result',{successStatus:'approved'});
}

// Routing only: every consuming branch still validates both declarations natively.
export function usesStageGates(root) {
 const profile=parse(readFileSync(path.resolve(root,'.template-spec/process/harness-profile.yaml'),'utf8'));
 return profile.required_capabilities?.includes('stage-gates-v1')===true;
}
