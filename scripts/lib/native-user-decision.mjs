import path from 'node:path';
import {ROOT} from './lifecycle-registry.mjs';
import {platformProfile} from './backend-platform.mjs';
import {decisionError} from './user-decision-core.mjs';
import {nativeEvidenceVerify,nativeContractVerify,nativeCoverage,nativeUserDecisionRequirement,NEEDS} from './native-evidence.mjs';
export {decisionError,decisionDigest,requestDigest,decisionIO,renderDecisionRequest} from './user-decision-core.mjs';
const rootFor=options=>path.resolve(options.root||ROOT);
export function validateUserDecision(record,options={}) {
 return nativeCoverage(nativeEvidenceVerify({root:rootFor(options),kind:'user-decision',document:record,documents:options.expected===undefined?{}:{'--requirements':options.expected.map(({user_decision_ref,...requirement})=>requirement)},extra:options.expected===undefined?['--from-record']:[],needs:NEEDS.userDecision}),'user_decision_result');
}
export function verifyUserDecisionFile(ref,options={}) {
 return nativeCoverage(nativeEvidenceVerify({root:rootFor(options),kind:'user-decision',file:ref,documents:options.expected===undefined?{}:{'--requirements':options.expected},extra:options.expected===undefined?['--from-record']:[],needs:NEEDS.userDecision}),'user_decision_result');
}
export function assertUserDecisionRequirement(requirement,options={}) {
 if(!requirement)decisionError('user-decision-response-required','缺少当前决定及其范围');
 if(requirement.user_decision_ref&&requirement.continuation_ref)decisionError('user-decision-proof-conflict','当前决定与延续不能同时提供');
 return nativeUserDecisionRequirement({root:rootFor(options),requirement});
}
// Policy selects the workflow boundaries; each selected proof is validated only by yss.
export function assertWorkUnitUserDecision(workUnit,state,options={}) {
 return nativeCoverage(nativeContractVerify({root:rootFor(options),kind:'work-unit-user-decision',document:{work_unit:workUnit,state},needs:NEEDS.userDecision}),'user_decision_validated');
}
export function assertImplementationDecision(state,options={}) {
 return nativeCoverage(nativeContractVerify({root:rootFor(options),kind:'implementation-scope',document:state,needs:NEEDS.implementationScope}),'implementation_scope');
}
export function assertScaffoldUserDecision(decision,options={}) {
 return nativeCoverage(nativeContractVerify({root:rootFor(options),kind:'scaffold-user-decision',document:decision,needs:NEEDS.scaffoldUserDecision}),'scaffold_user_decision');
}
export function scaffoldDecisionSnapshot(decision) {
  const { user_confirmation, status, decision_inputs_digest, ...inputs } = decision;
  const profile = platformProfile(decision.platform_profile, undefined, decision.platform_configuration?.spring_boot_version);
  return {
    ...inputs,
    platform_selection: {
      profile_id: profile.id,
      spring_boot_version: profile.spring_boot_version,
      java_version: profile.java_version,
    },
  };
}

// This query only computes the actual delta; classifications and original authorization remain native verification inputs.
export function compareContinuationAssets(before,after,options={}) {
 return nativeCoverage(nativeContractVerify({root:rootFor(options),kind:'continuation-comparison',document:{before,after},needs:NEEDS.userDecision}),'continuation_comparison');
}
