// Explicit historical fixture policy. It does not represent the current default.
import fs from 'node:fs';
import path from 'node:path';
import {parse} from '../../vendor/yaml.mjs';
const historical=JSON.parse(fs.readFileSync(new URL('../../fixtures/role-independent-draft/legacy-spec-policy.json',import.meta.url)));
export function installLegacySpecPolicy(root) {
 const write=(ref,v)=>fs.writeFileSync(path.join(root,ref),JSON.stringify(v));
 write('.template-spec/process/orchestration-contract.yaml',historical.policy);
 write('.template-spec/process/lifecycle-registry.yaml',historical.registry);
 const ref='.template-spec/process/harness-profile.yaml',profile=parse(fs.readFileSync(path.join(root,ref),'utf8'));
 profile.required_capabilities=(profile.required_capabilities||[]).filter(x=>x!=='stage-gates-v1');write(ref,profile);
}
