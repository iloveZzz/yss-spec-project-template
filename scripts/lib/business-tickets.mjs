import nativeFs from 'node:fs';
import {readFileSync,existsSync,lstatSync} from './validation-phase.mjs';
const fs={...nativeFs,readFileSync,existsSync,lstatSync};
import path from 'node:path';
import { createHash } from 'node:crypto';
import { parseContent, yamlValue, ids as sourceIds } from './plan-spec-markdown.mjs';
import { fileURLToPath } from 'node:url';
import { validateJsonSchemas } from './json-schema.mjs';
import { sourceContextRef, withSourceContextSnapshot } from './strategic-handoff-io.mjs';

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
  return !['harness.backend-delivery','harness.frontend-delivery'].includes(policy?.profile_id)||policy.business_input?.modes?.includes('standalone')===true;
}
export function assertImplementationTicket(text, ref = '') {
  const kind = ticketMetadata(text)?.kind;
  if (kind === 'stage-work-item' || /(^|\/)work-items\//.test(ref)) fail('stage-work-item 不能作为实现 Ticket');
  if (['business-ticket', 'business-ticket-set'].includes(kind) || /(^|\/)business-tickets\//.test(ref)) fail('business-ticket-not-implementable: 业务 Ticket 不能作为实现 Slice');
}

/** Structural evidence only. Business semantics and approval remain with lifecycle reviewers. */
export function checkBusinessTickets({root, setRef, mode = 'draft', reviewRef} = {}) {
  // Imported v5 sources retain root-relative bindings inside the immutable payload.
  const imported=typeof setRef==='string'&&setRef.match(/^(docs\/handoffs\/[^/]+\/v[1-9][0-9]*\/package\/payload\/files\/)(.+)$/);
  if(imported) {
    const prefix=imported[1], sourceRoot=businessPath(root,prefix.slice(0,-1));
    const result=withSourceContextSnapshot(sourceRoot,()=>checkBusinessTickets({root:sourceRoot,setRef:imported[2],mode,reviewRef:reviewRef?.startsWith(prefix)?reviewRef.slice(prefix.length):reviewRef}));
    const mapped=ref=>typeof ref==='string'?prefix+(ref==='CONTEXT.md'?'source-context.snapshot.md':ref):ref;
    result.inputs=result.inputs.map(x=>({...x,ref:mapped(x.ref)}));
    result.diagnostics=result.diagnostics.map(x=>({...x,source_ref:mapped(x.source_ref)}));
    result.tickets=result.tickets.map(x=>({...x,ref:mapped(x.ref)}));
    if(result.spec)result.spec={...result.spec,ref:mapped(result.spec.ref)};
    if(result.semantic_review)result.semantic_review={...result.semantic_review,ref:mapped(result.semantic_review.ref)};
    return result;
  }
  const report = {schema_version:1, read_only:true, execution_authorization:'not-evaluated', mode, status:'passed', diagnostics:[], inputs:[], tickets:[], uncovered:[], unassessed:['business-granularity','semantic-fidelity','approval-validity']};
  const observed = new Map();
  const schemaInputs = [];
  const schemaPath = fileURLToPath(new URL('../../.template-spec/process/schemas/business-tickets-v1.schema.json',import.meta.url));
  const issue = (code, message, ref = setRef, locator = null) => report.diagnostics.push({code,message,source_ref:ref,locator,recovery:'核对来源、补齐引用或重新审查当前业务 Ticket 集'});
  const read = ref => {
    const bytes = fs.readFileSync(businessPath(root,ref)), digest = hash(bytes);
    if (observed.has(ref) && observed.get(ref) !== digest) fail(`INPUT_DRIFT: ${ref}`);
    observed.set(ref,digest); return bytes.toString('utf8');
  };
  const binding = value => {
    if (!value || !nonempty(value.ref) || !/^v[1-9][0-9]*$/.test(value.version ?? '') || !/^sha256:[a-f0-9]{64}$/.test(value.digest ?? '')) fail('BINDING_INVALID: 需要 ref/version/digest');
    const text = read(value.ref);
    if (observed.get(value.ref) !== value.digest) issue('SOURCE_STALE','来源原始字节已变化',value.ref);
    return text;
  };
  try {
    if (!['draft','formal'].includes(mode)) fail('MODE_INVALID');
    const set = yamlValue(read(setRef));
    schemaInputs.push({value:set,schemaPath,label:setRef});
    if (set?.schema_version !== 1 || set.kind !== 'business-ticket-set' || !nonempty(set.id) || !/^v[1-9][0-9]*$/.test(set.version ?? '') || !['draft','ready-for-human'].includes(set.status)) fail('BUSINESS_SET_INVALID');
    report.id=set.id; report.version=set.version; report.spec=set.spec; report.coverage_deferred=set.coverage_deferred ?? [];
    const spec = parseContent(binding(set.spec),set.spec.ref);
    if (!spec.supported) issue('SPEC_FORMAT_UNASSESSED','Spec 需显式采用 plan-spec-v1；旧格式不推断覆盖',set.spec.ref);
    const entries = spec.entries.filter(x => ['FR','NFR','AC'].includes(x.kind));
    const ids = new Set();
    for (const entry of entries) {
      if (ids.has(entry.id)) issue('DUPLICATE_ID',`Spec ID 重复: ${entry.id}`,set.spec.ref,entry.position.start.line);
      ids.add(entry.id);
    }
    if (!entries.some(x => x.kind === 'FR') || !entries.some(x => x.kind === 'AC')) issue('SPEC_COVERAGE_UNASSESSED','缺少可机械读取的 FR/AC',set.spec.ref);
    if (!Array.isArray(set.tickets) || !set.tickets.length) fail('BUSINESS_TICKETS_REQUIRED');
    const tickets = new Map(), covered = new Set(), seenPaths = new Set();
    for (const entry of set.tickets) {
      const text = binding(entry), ticket = ticketMetadata(text);
      schemaInputs.push({value:ticket,schemaPath,label:entry.ref});
      if (tickets.has(entry.id) || seenPaths.has(entry.ref)) issue('DUPLICATE_ID',`Ticket ID 或路径重复: ${entry.id}`,entry.ref);
      seenPaths.add(entry.ref);
      if (ticket.schema_version !== 1 || ticket.kind !== 'business-ticket' || !/^BT-[A-Za-z0-9][A-Za-z0-9._-]*$/.test(ticket.id ?? '') || ticket.id !== entry.id || ticket.version !== entry.version) issue('BUSINESS_TICKET_INVALID','类型、稳定 ID 或版本不匹配',entry.ref);
      if (!['draft','ready-for-human'].includes(ticket.status)) issue('BUSINESS_READINESS_FORBIDDEN','业务票不得声明实现就绪',entry.ref);
      if (!entry.ref.startsWith(`${path.posix.dirname(setRef)}/business-tickets/`) || !entry.ref.endsWith('.md')) issue('BUSINESS_TICKET_LOCATION','业务票需独立放在 business-tickets/',entry.ref);
      if (['ref','version','digest'].some(key=>ticket.spec?.[key]!==set.spec?.[key])) issue('SPEC_BINDING_MISMATCH','票据与集合的 Spec 依据不一致',entry.ref);
      for (const field of ['requirement_refs','acceptance_refs','dependencies']) if (!list(ticket[field])) issue('REQUIRED_FIELD',`缺少 ${field}`,entry.ref);
      if (!ticket.requirement_refs?.length || !ticket.acceptance_refs?.length) issue('COVERAGE_REQUIRED','需要需求与验收引用',entry.ref);
      for (const [field, pattern] of [['requirement_refs',/^(FR|NFR)-/],['acceptance_refs',/^AC-/]]) {
        for (const id of Array.isArray(ticket[field]) ? ticket[field] : []) {
          if (!ids.has(id) || !pattern.test(id)) issue('DANGLING_REFERENCE',`无效引用 ${id}`,entry.ref);
          else covered.add(id);
        }
      }
      for(const ac of Array.isArray(ticket.acceptance_refs)?ticket.acceptance_refs:[]) {
        const requirementIds=sourceIds(entries.find(x=>x.id===ac)?.fields?.['需求引用'],['FR','NFR']);
        if(!requirementIds.length || requirementIds.some(id=>!ticket.requirement_refs?.includes(id)))issue('AC_REQUIREMENT_MISMATCH',`验收 ${ac} 与本票需求来源不一致`,entry.ref,ac);
      }
      for (const source of ticket.source_refs ?? []) {
        const sourceText = binding(source);
        if (source.locator) {
          let found;
          if (/\.(yaml|yml|json)$/.test(source.ref)) {
            const ids=[];
            const walk=value=>{if(Array.isArray(value))value.forEach(walk);else if(value&&typeof value==='object')for(const [key,item]of Object.entries(value)){if((key==='id'||key.endsWith('_id'))&&typeof item==='string')ids.push(item);else walk(item);}};
            walk(yamlValue(sourceText));found=source.locator_kind!=='heading'&&ids.filter(x=>x===source.locator).length===1;
          } else {const parsed=parseContent(sourceText,source.ref);found=(source.locator_kind==='heading'?parsed.headings:parsed.locators).filter(x=>x.value===source.locator).length===1;}
          if(!found)issue('DANGLING_REFERENCE',`来源定位缺失或不唯一: ${source.locator}`,source.ref,source.locator);
        }
      }
      for (const heading of ['业务结果','范围','非目标','验收','风险']) if (!new RegExp(`^## ${heading}\\s*$`,'m').test(text)) issue('REQUIRED_SECTION',`缺少 ${heading}`,entry.ref);
      for (const question of ticket.open_questions ?? []) {
        if (![question.id,question.question,question.owner,question.resolve_by].every(nonempty) || typeof question.blocking !== 'boolean') issue('QUESTION_INCOMPLETE','未决项需问题、责任人、时点及阻断判断',entry.ref);
        if (mode === 'formal' && question.blocking) issue('OPEN_BLOCKER',question.question,entry.ref);
      }
      if (mode === 'formal' && ticket.status !== 'ready-for-human') issue('TICKET_DRAFT','正式化仍有草案票',entry.ref);
      tickets.set(entry.id,ticket);
      report.tickets.push({id:entry.id,ref:entry.ref,version:entry.version,source_digest:entry.digest,source_refs:ticket.source_refs,requirement_refs:ticket.requirement_refs,acceptance_refs:ticket.acceptance_refs,dependencies:ticket.dependencies});
    }
    const visiting = new Set(), visited = new Set();
    const visit = id => {
      if (visiting.has(id)) { issue('DEPENDENCY_CYCLE',`依赖环包含 ${id}`); return; }
      if (visited.has(id)) return;
      visiting.add(id);
      for (const dep of tickets.get(id)?.dependencies ?? []) {
        if (!tickets.has(dep)) issue('DANGLING_DEPENDENCY',`${id} 依赖未知票 ${dep}`);
        else visit(dep);
      }
      visiting.delete(id); visited.add(id);
    };
    tickets.forEach((_,id)=>visit(id));
    const deferred = new Set();
    for (const item of set.coverage_deferred ?? []) {
      if (!ids.has(item.id) || deferred.has(item.id) || covered.has(item.id)) issue('DEFERRED_COVERAGE_INVALID',`延期引用无效或重复: ${item.id}`);
      if (!['reason','risk','owner','target_version','followup_ticket_ref','verification_plan'].every(k=>nonempty(item[k]))) issue('DEFERRED_INCOMPLETE',`延期缺少责任或处理计划: ${item.id}`);
      if (mode === 'formal') {
        if (!item.decision) issue('DEFERRED_DECISION_REQUIRED',`延期缺少既有决定绑定: ${item.id}`);
        else binding(item.decision);
      }
      deferred.add(item.id);
    }
    report.uncovered = [...ids].filter(id=>!covered.has(id)&&!deferred.has(id));
    for (const id of report.uncovered) issue('COVERAGE_MISSING',`未覆盖 ${id}`,set.spec.ref,id);
    if (mode === 'formal') {
      if (set.status !== 'ready-for-human') issue('SET_DRAFT','业务集合尚未正式化');
      const review = yamlValue(read(reviewRef || set.review_ref));
      schemaInputs.push({value:review,schemaPath,label:reviewRef || set.review_ref});
      if (review.kind !== 'business-ticket-review' || review.schema_version !== 1 || review.result !== 'passed' || review.subject_ref !== setRef || review.subject_digest !== observed.get(setRef) || !nonempty(review.reviewer) || !nonempty(review.drafter) || review.reviewer === review.drafter || !Array.isArray(review.evidence) || !review.evidence.length) issue('REVIEW_REQUIRED','需要独立且绑定当前集合的专业审查');
      for (const ref of review.evidence ?? []) binding(ref);
      report.semantic_review={status:'recorded',ref:reviewRef||set.review_ref,result:review.result,subject_digest:review.subject_digest};
      report.unassessed = ['approval-validity','semantic-review-truth'];
    }
  } catch (error) { issue(error.message.split(':')[0],error.message); }
  try { validateJsonSchemas(schemaInputs).forEach((result,index)=>{if(!result.valid)issue('SCHEMA_INVALID',result.error,schemaInputs[index].label);}); }
  catch(error) {issue('SCHEMA_UNAVAILABLE',error.message);}
  for (const [ref,digest] of observed) {
    try { if (hash(fs.readFileSync(businessPath(root,ref))) !== digest) issue('INPUT_DRIFT','读取期间来源变化',ref); }
    catch { issue('INPUT_DRIFT','读取期间来源消失',ref); }
  }
  report.inputs = [...observed].map(([ref,digest])=>({ref,digest}));
  report.status = report.diagnostics.length ? 'blocked' : 'passed';
  return report;
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
