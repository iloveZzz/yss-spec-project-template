import nativeFs from 'node:fs';
import {readFileSync,existsSync,lstatSync} from './validation-phase.mjs';
const fs={...nativeFs,readFileSync,existsSync,lstatSync};
import path from 'node:path';
import { createHash } from 'node:crypto';
import { parseContent, yamlValue, ids as sourceIds } from './plan-spec-markdown.mjs';
import { fileURLToPath } from 'node:url';
import {nativeContractVerify,nativeCoverage,NEEDS} from './native-evidence.mjs';
import { sourceContextRef } from './strategic-handoff-io.mjs';

export const BUSINESS_TICKET_PROTOCOL = 1;
export const BUSINESS_TICKET_CAPABILITY = 'business-ticket-approval-v1';
const hash = bytes => `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
const nonempty = value => typeof value === 'string' && Boolean(value.trim());
const list = value => Array.isArray(value) && value.every(nonempty);
const fail = message => { throw new Error(message); };
export function businessPath(root, ref) {
  if (!nonempty(ref) || path.isAbsolute(ref) || ref.includes('\\') || ref.split('/').some(x => !x || x === '.' || x === '..')) fail(`BUSINESS_PATH_INVALID: ${ref}`);
  ref = sourceContextRef(root, ref);
  let file = fs.realpathSync(root);
  for (const part of ref.split('/')) {
    file = path.join(file, part);
    try { if (fs.lstatSync(file).isSymbolicLink()) fail(`BUSINESS_SYMLINK_FORBIDDEN: ${ref}`); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  return file;
}
export function ticketMetadata(text) {
  const match = String(text).match(/^\uFEFF?---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if(match)return yamlValue(match[1]);
  try {const data=yamlValue(String(text));return data&&typeof data==='object'&&!Array.isArray(data)?data:{};}catch{return {};}
}
export function businessTicketVersion(root) {
  const identity = businessPath(root, 'yss-project.yaml');
  if (fs.existsSync(identity) && yamlValue(fs.readFileSync(identity,'utf8'))?.repository_mode === 'template-source') return null;
  const ref = '.template-spec/agents/issue-tracker.md';
  const file = businessPath(root, ref);
  if (!fs.existsSync(file)) return null;
  const value = ticketMetadata(fs.readFileSync(file, 'utf8'))?.tracker?.business_ticket_version;
  if (value !== undefined && value !== 1) fail('BUSINESS_TICKET_VERSION_UNSUPPORTED');
  return value ?? null;
}
export function businessAuthoringEnabled(root) {
  if(businessTicketVersion(root)!==1)return false;
  const profile=businessPath(root,'.template-spec/process/harness-profile.yaml');
  const policy=fs.existsSync(profile)?yamlValue(fs.readFileSync(profile,'utf8')):null;
  return !['harness.backend-delivery'].includes(policy?.profile_id)||policy.business_input?.modes?.includes('standalone')===true;
}
export function assertImplementationTicket(text, ref = '') {
  const kind = ticketMetadata(text)?.kind;
  if (kind === 'stage-work-item' || /(^|\/)work-items\//.test(ref)) fail('stage-work-item 不能作为实现 Ticket');
  if (['business-ticket', 'business-ticket-set'].includes(kind) || /(^|\/)business-tickets\//.test(ref)) fail('business-ticket-not-implementable: 业务 Ticket 不能作为实现 Slice');
}

/** Structural evidence only. Business semantics and approval remain with lifecycle reviewers. */
export function checkBusinessTickets({root,setRef,mode='draft',reviewRef}={}) {
 const result=nativeContractVerify({root,kind:'business-tickets',file:setRef,extra:['--mode',mode,...(reviewRef?['--review-ref',reviewRef]:[])],needs:NEEDS.businessTickets});
 return nativeCoverage(result,'business_tickets',{allowBlocked:true});
}

export function businessSetRef(state) { return state?.artifacts?.['artifact.business-ticket-set']?.ref || state?.business_ticket_set_ref; }
export function assertBusinessTicketTransition(root, current, next, state = {}) {
  if (!businessAuthoringEnabled(root)) return;
  if (state.checkpoint_ref) state=yamlValue(fs.readFileSync(businessPath(root,state.checkpoint_ref),'utf8'));
  const spec = current === 'work-unit.spec-synthesis';
  const design = ['work-unit.prototype-design','work-unit.prototype-design-v2'].includes(current);
  const formal = current === 'work-unit.business-ticket-formalization';
  if (!spec && !design && !formal) return;
  if ((spec || design) && next === 'work-unit.technical-analysis') fail('BUSINESS_FORMALIZATION_REQUIRED');
  const report = checkBusinessTickets({root,setRef:businessSetRef(state),mode:formal?'formal':'draft'});
  if (report.status !== 'passed') fail(`business-ticket-blocked: ${report.diagnostics.map(x=>x.code).join(', ')}`);
}

export function assertSliceBusinessSources({root,ticketText,setBinding,acceptance,specBinding}) {
  const ticket = ticketMetadata(ticketText);
  if (businessTicketVersion(root) !== 1 && !ticket.business_ticket_refs && !setBinding) return;
  if(ticket.kind!=='vertical-slice-ticket')fail('IMPLEMENTATION_TICKET_KIND_REQUIRED');
  if(ticket.business_ticket_set_ref && ticket.business_ticket_set_ref!==setBinding?.ref)fail('BUSINESS_SET_REFERENCE_MISMATCH');
  if (!setBinding?.ref || !setBinding.digest) fail('BUSINESS_SET_BINDING_REQUIRED');
  const bytes = fs.readFileSync(businessPath(root,setBinding.ref));
  if (hash(bytes) !== setBinding.digest) fail('BUSINESS_SET_STALE');
  const result = checkBusinessTickets({root,setRef:setBinding.ref,mode:'formal'});
  if (result.status !== 'passed') fail(`BUSINESS_SOURCE_BLOCKED: ${result.diagnostics.map(x=>x.code).join(', ')}`);
  if (!list(ticket.business_ticket_refs) || !ticket.business_ticket_refs.length || ticket.business_ticket_refs.some(id=>!result.tickets.some(t=>t.id===id))) fail('BUSINESS_TICKET_REFERENCE_REQUIRED');
  const selected=result.tickets.filter(t=>ticket.business_ticket_refs.includes(t.id));
  const allowed=new Set(selected.flatMap(t=>t.acceptance_refs));
  if (!list(ticket.acceptance_refs) || !ticket.acceptance_refs.length || ticket.acceptance_refs.some(id=>!allowed.has(id))) fail('BUSINESS_ACCEPTANCE_REFERENCE_REQUIRED');
  if(acceptance) {
    if(!specBinding || ['ref','digest'].some(key=>result.spec[key]!==specBinding[key]))fail('BUSINESS_SPEC_BINDING_MISMATCH');
    for(const item of Object.values(acceptance))if(item.source!=='spec'||!ticket.acceptance_refs.includes(item.locator))fail('BUSINESS_ACCEPTANCE_SOURCE_MISMATCH');
    if(ticket.acceptance_refs.some(id=>!Object.values(acceptance).some(item=>item.locator===id)))fail('BUSINESS_ACCEPTANCE_UNCOVERED');
  }
}

export function assertBusinessCheckpoint(root,state) {
  if (!businessAuthoringEnabled(root)) return;
  const stage=state.stage;
  const pastSpec=['stage.product-design','stage.system-data-engineering','stage.ticket-formalization','stage.vertical-slice-implementation','stage.verification-release-retrospective'].includes(stage);
  // Design uses ticket-formalization for business drafting, while the full
  // lifecycle uses that stage for engineering Slices. Entering the business
  // work unit must remain possible with drafts; its exit requires formal proof.
  const finalized=['work-unit.technical-analysis','work-unit.strategic-design-handoff','work-unit.implementation-repository-preparation','work-unit.ticket-decomposition','work-unit.slice-implementation'].includes(state.next_work_unit) || ['stage.system-data-engineering','stage.vertical-slice-implementation','stage.verification-release-retrospective'].includes(stage) || (stage==='stage.ticket-formalization'&&state.next_work_unit!=='work-unit.business-ticket-formalization');
  const artifact=state.artifacts?.['artifact.business-ticket-set'];
  const completedSpec=['work-unit.prototype-design','work-unit.prototype-design-v2','work-unit.business-ticket-formalization'].includes(state.next_work_unit)||state.stage_trace?.completed_work_unit==='work-unit.spec-synthesis'||(stage==='stage.spec-architecture'&&['completed','paused-human-gate'].includes(state.status));
  if(!pastSpec && !finalized && !artifact?.ref && !completedSpec)return;
  if(!businessSetRef(state))fail('BUSINESS_CHECKPOINT_BLOCKED: 缺少业务票集合引用');
  const report=checkBusinessTickets({root,setRef:businessSetRef(state),mode:finalized?'formal':'draft'});
  if(report.status!=='passed')fail(`BUSINESS_CHECKPOINT_BLOCKED: ${report.diagnostics.map(x=>x.code).join(', ')}`);
  if(artifact?.digest && report.inputs.find(x=>x.ref===artifact.ref)?.digest!==artifact.digest)fail('BUSINESS_SYNC_STALE');
  const sync=businessSyncDiagnostics(root,businessSetRef(state),report);if(sync.length)fail('BUSINESS_SYNC_STALE: '+sync.map(x=>x.ref).join(', '));
}

// Only inspect explicit synchronization declarations in the two feature views.
export function businessSyncDiagnostics(root,setRef,report) {
  if(!setRef)return [];
  const digest=report.inputs?.find(x=>x.ref===setRef)?.digest,diagnostics=[];
  for(const name of ['map.md','parent-ticket.md']) {
    const ref=path.posix.join(path.posix.dirname(setRef),name),file=businessPath(root,ref);
    if(!fs.existsSync(file))continue;
    const m=ticketMetadata(fs.readFileSync(file,'utf8'));
    if(m.business_ticket_set_ref && (m.business_ticket_set_ref!==setRef||m.business_ticket_set_digest!==digest))diagnostics.push({code:'BUSINESS_SYNC_STALE',ref});
  }
  return diagnostics;
}

export function assertBusinessDeferredApprovals(report,verifiedRefs) {
  for(const item of report.coverage_deferred||[])if(!verifiedRefs.includes(item.decision?.ref))fail(`BUSINESS_DEFERRED_APPROVAL_UNBOUND: ${item.id}`);
}

export function summarizeBusinessImplementation({root,setRef,sliceRefs=[]}) {
  const business=checkBusinessTickets({root,setRef,mode:'formal'});
  const result={status:'not-recorded',execution_authorization:'not-evaluated',implementation_completion:'not-evaluated',tickets:[],diagnostics:[]};
  if(business.status!=='passed'){result.status='blocked';result.diagnostics=business.diagnostics;return result;}
  const mapped=new Map(business.tickets.map(t=>[t.id,new Map()]));
  for(const ref of [...new Set(sliceRefs)])try {
    const text=fs.readFileSync(businessPath(root,ref),'utf8');assertImplementationTicket(text,ref);const ticket=ticketMetadata(text);
    if(ticket.kind!=='vertical-slice-ticket'||ticket.business_ticket_set_ref!==setRef||!list(ticket.business_ticket_refs)||!ticket.business_ticket_refs.length||!list(ticket.acceptance_refs)||!ticket.acceptance_refs.length)fail('SLICE_BUSINESS_BINDING_INVALID');
    const allowed=new Set(business.tickets.filter(t=>ticket.business_ticket_refs.includes(t.id)).flatMap(t=>t.acceptance_refs));
    if(ticket.business_ticket_refs.some(id=>!mapped.has(id))||ticket.acceptance_refs.some(id=>!allowed.has(id)))fail('SLICE_COVERAGE_INVALID');
    for(const id of ticket.business_ticket_refs)for(const ac of ticket.acceptance_refs)if(business.tickets.find(t=>t.id===id).acceptance_refs.includes(ac)){const rows=mapped.get(id);rows.set(ac,[...(rows.get(ac)||[]),ref]);}
  }catch(error){result.diagnostics.push({code:'SLICE_MAPPING_INVALID',source_ref:ref,message:error.message});}
  result.tickets=business.tickets.map(t=>({id:t.id,acceptance_mappings:Object.fromEntries(mapped.get(t.id)),unmapped_acceptance:t.acceptance_refs.filter(ac=>!mapped.get(t.id).has(ac))}));
  result.status=result.diagnostics.length?'blocked':!sliceRefs.length?'not-recorded':result.tickets.some(t=>t.unmapped_acceptance.length)?'partial':'covered';
  return result;
}
