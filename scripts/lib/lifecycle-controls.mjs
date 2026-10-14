import {ROOT} from './lifecycle-registry.mjs';
import {nativeContractVerify,nativeCoverage,NEEDS} from './native-evidence.mjs';
export function assertGateChecks(gateId,state,options={}) {
 return nativeCoverage(nativeContractVerify({root:options.root||ROOT,kind:'gate-checks',document:state,extra:['--gate',gateId],needs:NEEDS.gateChecks}),'gate_checks');
}
