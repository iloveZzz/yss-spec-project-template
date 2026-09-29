export const readingIdFields=Object.freeze({contexts:'context_id',subdomains:'subdomain_id',relationships:'relationship_id',rule_catalog:'rule_id',scenarios:'scenario_id',concept_candidates:'concept_id',invariants:'invariant_id',downstream_mapping:'mapping_id',items:'id'});
// A lossless presentation index, never another editable contract.
const pointerPart=key=>String(key).replace(/~/g,'~0').replace(/\//g,'~1');
export function readingViewModel(view,raw){
  const locations=[];
  const walk=(value,pointer)=>{
    if(value===null||typeof value!=='object'||Object.keys(value).length===0){locations.push({content_pointer:pointer,pointer_kind:'view-content',...(view.kind!=='tracking-migration'&&Object.hasOwn(raw||{},pointer.split('/')[1])?{source_pointer:pointer}:{}),source_ref:view.binding.ref,source_digest:view.binding.digest});return;}
    for(const [key,child]of Object.entries(value))walk(child,`${pointer}/${pointerPart(key)}`);
  };
  walk(view.content,'');
  return {view_schema_version:1,kind:view.kind,profile:view.profile,binding:view.binding,read_only:true,execution_allowed:false,approval_validity:'not-checked',
    declared_state:{status:raw?.status??null,stage:raw?.stage??null},checks:view.checks,sections:Object.keys(view.content),diagnostics:view.blockers,source_locations:locations,coverage:{rendered_leaf_count:locations.length,scope:'presented-content; owner verification remains required'}};
}
