import { readWorkLayout } from './work-layout.mjs';
import {existsSync,readFileSync} from './validation-phase.mjs';
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
 const layout=readWorkLayout(root),feature=layout.checkpointFeature(checkpoint),base=layout.featureRoot(feature);
 return {feature,base,directory:base+'/reading'};
}
