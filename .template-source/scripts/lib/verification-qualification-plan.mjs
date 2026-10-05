import {planTemplateVerification} from '../../../scripts/lib/template-verification.mjs';
import {loadLegacyManifest} from './verification-gates.mjs';
import {compileLegacyPlan} from './legacy-verification.mjs';

/** Pure policy compilation shared by the driver and independent consumer. */
export function compileQualificationPlans({root,config,changedFiles,commit}) {
  const frozen=loadLegacyManifest(root),changed=[...new Set(changedFiles)].sort();
  const reference=compileLegacyPlan(frozen);
  reference.legacy_manifest_digest=frozen.coverage_digest;
  reference.changed_files=changed;
  reference.representative_commit=commit;
  reference.tooling={requested_mode:'legacy',effective_mode:'legacy',verification_concurrency:1,test_concurrency:1};
  // The shadow retains all assertions selected by the protected policy. It
  // never grants activation, baseline acceptance or qualification to itself.
  const planned=planTemplateVerification({profile:'release',changedFiles:changed,config,root,selection:'legacy'});
  const candidate={...planned,strategy:'qualification-shadow',experimental:true,commands:planned.shadow_commands,
    groups:[...new Set(planned.shadow_commands.map(task=>task.group))],experimental_reasons:planned.fallback_reasons,
    selection:{requested:'shadow',effective:'shadow',omitted:[]}};
  candidate.tooling={requested_mode:'optimized',effective_mode:'optimized',verification_concurrency:2,test_concurrency:2};
  candidate.representative_commit=commit;
  return {legacy:reference,candidate};
}
