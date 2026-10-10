import path from 'node:path';
import { readWorkLayout } from './work-layout.mjs';
import {existsSync,readFileSync,readdirSync,lstatSync} from './validation-phase.mjs';
import {safe,schema} from './strategic-handoff-io.mjs';
import {parseSliceYaml} from './slice-contract.mjs';
export const READING_POLICY='.template-spec/process/reading-policy.yaml';
export function readingPolicy(root){
 const file=safe(root,READING_POLICY,{missing:true});
 if(!existsSync(file))return {schema_version:1,mode:'manual',checkpoints:[]};
 const value=parseSliceYaml(readFileSync(file));schema(value,'.template-spec/process/schemas/reading-policy.schema.json');
 return value;
}
export function managedReading(root,checkpoint){const policy=readingPolicy(root);return policy.mode==='managed'&&policy.checkpoints.includes(checkpoint);}
export function readingLocation(root, checkpoint){
 const read=ref=>readFileSync(safe(root,ref)),cp=parseSliceYaml(read(checkpoint));
 const profileRef='.template-spec/process/harness-profile.yaml';
 if(typeof cp.feature_id==='string'&&cp.feature_id.startsWith('feature.')&&existsSync(safe(root,profileRef,{missing:true}))){
  const profile=parseSliceYaml(read(profileRef)),skill={
   'harness.spec-template':'yss-product-lifecycle',
   'harness.business-ddd-strategy-handoff':'yss-strategic-design',
   'harness.backend-delivery':'harness-orchestrator',
   'harness.frontend-delivery':'harness-orchestrator'
  }[profile.profile_id];
  if(!skill)throw Error('reading-profile-identity');
  const contractRef='.agents/skills/'+skill+'/references/orchestration-contract.yaml';
  if(existsSync(safe(root,contractRef,{missing:true}))){
   const contract=parseSliceYaml(read(contractRef));
   if(Object.hasOwn(contract,'progression_target')){
    const policy=contract.progression_target;
    if(![1,2].includes(profile.schema_version)||policy?.schema_version!==1||policy.config_file!=='progression-target.json'||!Array.isArray(policy.required_capabilities)||!policy.required_capabilities.includes('lifecycle-target-v1')||policy.required_capabilities.some(cap=>cap!=='lifecycle-target-v1'))throw Error('reading-capability-unsupported');
    if(cp.schema_version!==1||cp.repository_mode!=='project-instance'||cp.feature_id==='feature.')throw Error('reading-feature-identity');
    const layout=readWorkLayout(root,{read:ref=>read(ref)}),matches=[];
    const directory=safe(root,layout.root,{missing:true});
    if(existsSync(directory))for(const entry of readdirSync(directory,{withFileTypes:true})){
     const child=layout.root+'/'+entry.name,file=safe(root,child);
     if(!lstatSync(file).isDirectory())continue;
     const mapRef=child+'/map.md',mapFile=safe(root,mapRef,{missing:true});
     if(!existsSync(mapFile))continue;
     const source=String(read(mapRef)).replace(/^\uFEFF/,''),header=/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(source);
     let metadata;try{metadata=parseSliceYaml(header?header[1]:source);}catch(error){if(header)throw error;continue;}
     const registered=metadata?.checkpoint_ref;
     if(!registered)continue;
     const other=parseSliceYaml(read(registered));
     if(other.feature_id===cp.feature_id)matches.push({checkpoint:registered,base:path.posix.dirname(mapRef)});
    }
    if(matches.length!==1||matches[0].checkpoint!==checkpoint)throw Error('reading-feature-registration-not-unique');
    return {feature:cp.feature_id,base:matches[0].base,directory:matches[0].base+'/reading'};
   }
  }
 }
 const layout=readWorkLayout(root),feature=layout.checkpointFeature(checkpoint),base=layout.featureRoot(feature);
 return {feature,base,directory:base+'/reading'};
}
