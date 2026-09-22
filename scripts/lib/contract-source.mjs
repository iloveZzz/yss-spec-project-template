import {readFileSync} from './validation-phase.mjs';
import {safe,hash} from './strategic-handoff-io.mjs';
import {parseSliceYaml} from './slice-contract.mjs';
export function contractSourceMetadata(bytes){
 const text=String(bytes),front=/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(text);
 if(front)return parseSliceYaml(front[1]);
 return /^\s*[{[]/.test(text)||/^[A-Za-z_][\w-]*:\s/m.test(text)&&!/^#/m.test(text)?parseSliceYaml(text):{};
}
/** Reads original bytes; returns derivable facts only. It never selects or approves a source. */
export function readContractSource(selection,{root=process.cwd(),read=ref=>readFileSync(safe(root,ref))}={}){
 const selected=typeof selection==='string'?{ref:selection}:selection;
 if(!selected?.ref)throw new TypeError('来源选择缺少 ref');
 const bytes=read(selected.ref),digest=hash(bytes),data=contractSourceMetadata(bytes);
 const observed=data.requirement_version??data.version??data.contract_version??data.decision_version;
 const conflicts=[];
 const conflict=(field,before,after)=>conflicts.push({field,source_ref:selected.ref,before,after});
 if(selected.digest&&selected.digest!==digest)conflict('digest',selected.digest,digest);
 if(selected.version!==undefined&&observed!==undefined&&String(selected.version)!==String(observed))conflict('version',selected.version,observed);
 if(conflicts.length){const error=new TypeError(conflicts.map(({field,before,after})=>`${field==='version'?'来源版本冲突':'来源冲突'} ${selected.ref}.${field}: supplied=${before}; observed=${after}; 恢复: 核对双方来源并显式选择当前版本`).join('\n'));Object.assign(error,{code:'SLICE_SOURCE_CONFLICT',...conflicts[0],conflicts});throw error;}
 const version=selected.version??observed;
 return {bytes,data,binding:{ref:selected.ref,digest,...(version!==undefined?{version:String(version)}:{}),...(selected.approval_ref?{approval_ref:selected.approval_ref}:{})}};
}
