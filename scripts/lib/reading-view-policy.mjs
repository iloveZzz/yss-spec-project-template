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
export function readingLocation(checkpoint){
 const match=/^docs\/\.scratch\/([a-z0-9][a-z0-9-]*)\/[^/]+\.(yaml|json)$/.exec(checkpoint);
 if(!match)throw Error('reading-checkpoint-path-invalid');
 return {feature:match[1],base:`docs/.scratch/${match[1]}`,directory:`docs/.scratch/${match[1]}/reading`};
}
