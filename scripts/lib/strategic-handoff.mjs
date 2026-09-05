import { existsSync, lstatSync, readFileSync, mkdirSync, mkdtempSync, renameSync, rmSync, cpSync } from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { ensure, canonical, digest, hash, json, parse, read, safe, relative, files, write, project, schema, archive, ROOT, sourceApprovalPolicy } from './strategic-handoff-io.mjs';
import { parseContextSource, parseContextContract, resolveContextTermRefs } from './context-contract.mjs';
import { countersignRuleForGate } from './digital-human-roles.mjs';
import { validateApprovalRecord } from './approval-record.mjs';
import { treeDigest } from './strategic-handoff-io.mjs';
import { validateVisualBaseline } from '../../.agents/skills/yss-prototype-stage/scripts/visual-baseline-contract.mjs';
import { extractTraceability, compareIndexes } from './strategic-handoff-rules.mjs';
const MAX_BYTES = 512 * 1024 * 1024;
const own = (a,b) => JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));
const nonempty = x => typeof x === 'string' && x.trim();
const bytesDigest = (bytes, kind) => kind === 'canonical-json' ? digest(parse(bytes)) : kind === 'sha256-bytes' ? hash(bytes) : (() => { throw new TypeError(`未知摘要算法: ${kind}`); })();

async function sourceApproval(record, roles, root) {
  const options={rolesDoc:roles,requireApproved:true,root,read:ref=>readFileSync(safe(root,path.relative(root,ref).split(path.sep).join('/')))};
  if (roles.user_decision_policy.gates.includes(record.gate_id)) {
    ensure(existsSync(path.join(ROOT,'scripts/lib/user-decision.mjs')), '接收工具不支持源用户决定策略，请升级工具后验包');
    const { assertUserDecisionRequirement } = await import('./user-decision.mjs');
    assertUserDecisionRequirement({boundary:record.gate_id,subject_ref:record.subject_ref,scope:record.approval_scope,user_decision_ref:record.user_decision_ref},options);
  }
  validateApprovalRecord(record,options);
}

function snapshot(snapshot, source) {
  ensure(snapshot?.context_ref === 'CONTEXT.md' && snapshot.context_schema_version === 1, '源 context snapshot 合同无效');
  const terms = resolveContextTermRefs(source, snapshot.term_refs);
  ensure(snapshot.document_digest === source.document_digest && snapshot.referenced_terms_digest === terms.referenced_terms_digest, '源 CONTEXT snapshot 摘要过期');
}
function checkDelta(handoff, source) {
  const used = new Set();
  for (const op of ['added','updated','deprecated']) for (const term of handoff.context_delta[op]) {
    ensure(!used.has(term.term_ref), '术语增量跨分类重复'); used.add(term.term_ref);
    ensure(handoff.source_context_snapshot.term_refs.includes(term.term_ref), `源 snapshot 未引用增量术语: ${term.term_ref}`);
    const actual = source.terms_by_ref.get(term.term_ref);
    ensure(actual, `源术语不存在: ${term.term_ref}`);
    for (const key of ['term','meaning','english_identifier','context_id','forbidden_aliases']) ensure(own(actual[key],term[key]), `源术语增量不一致: ${term.term_ref}.${key}`);
  }
}
function localDependency(from, href) {
  if (!href || /^(?:#|https?:|mailto:|data:)/i.test(href)) return null;
  ensure(!/^[a-z][a-z0-9+.-]*:/i.test(href), `不支持的资源协议: ${href}`);
  const clean = decodeURIComponent(href.split(/[?#]/)[0]);
  ensure(!clean.startsWith('/'), `资源必须使用相对路径: ${href}`);
  return relative(path.posix.normalize(path.posix.join(path.posix.dirname(from), clean)));
}
function documentLinks(ref, bytes) {
  const text = String(bytes); const result = [];
  if (/\.md$/i.test(ref)) for (const match of text.matchAll(/!?\[[^\]]*\]\(<?([^\s)>]+)>?(?:\s+[^)]*)?\)/g)) { const p=localDependency(ref,match[1]); if(p)result.push(p); }
  return result;
}
function previewFiles(root, config) {
  ensure(['H1','H2'].includes(config?.profile), 'package_export.prototype.profile 必须是 H1/H2');
  const preview = safe(root, config.preview_root);
  ensure(lstatSync(preview).isDirectory(), 'preview_root 必须为目录');
  const entry = safe(root, config.entry_ref);
  ensure(entry.startsWith(`${preview}${path.sep}`), '预览入口必须在 preview_root 内');
  const included = files(root, config.preview_root);
  // Structural closure plus an independently captured offline-browser receipt.
  for (const ref of included.filter(x => /\.(html|css)$/i.test(x))) {
    const text=readFileSync(safe(root,ref),'utf8');
    const matches=[...text.matchAll(/(?:src|href)\s*=\s*["']([^"']+)["']/gi), ...text.matchAll(/url\(\s*["']?([^\s)'";]+)["']?\s*\)/gi)];
    for (const match of matches) {
      ensure(!/^(?:https?:)?\/\//i.test(match[1]), `离线预览包含远程资源: ${ref}`);
      const dependency=localDependency(ref,match[1]); if(dependency)ensure(included.includes(dependency),`离线预览资源未打包: ${dependency}`);
    }
  }
  if (config.profile === 'H2') {
    safe(root,config.lock_ref); const source=safe(root,config.source_root);
    ensure(lstatSync(source).isDirectory() && config.lock_ref.startsWith(`${config.source_root}/`), 'H2 缺少源码/锁文件');
    ensure(!files(root,config.source_root).some(x => x.split('/').some(p => ['node_modules','.git'].includes(p))), 'H2 source_root 必须为不含依赖缓存的源码交付目录');
    ensure(config.source_digest===treeDigest(root,config.source_root), 'H2 源码/锁文件批准摘要已过期');
  }
  ensure(config.verification_digest===hash(readFileSync(safe(root,config.verification_ref))), '离线验证记录批准摘要已过期');
  const receipt=read(safe(root,config.verification_ref));
  ensure(receipt.network_mode === 'offline' && receipt.exit_code === 0 && nonempty(receipt.command) && nonempty(receipt.executed_at) && Array.isArray(receipt.case_ids) && receipt.case_ids.length && Array.isArray(receipt.evidence_refs) && receipt.evidence_refs.length, '缺少实际离线浏览验证证据');
  const tree=treeDigest(root,config.preview_root);
  ensure(receipt.preview_digest===tree, '离线预览验证证据已过期');
  for(const ref of receipt.evidence_refs)safe(root,ref);
  return receipt;
}

export async function inspectSource(root, handoffRef) {
  const handoff=read(safe(root,handoffRef));
  schema(handoff,'docs/process/schemas/strategic-design-handoff.schema.json');
  ensure(handoff.status==='approved', '交接包尚未批准');
  const config=handoff.package_export;
  schema(config,'docs/process/schemas/strategic-handoff-export.schema.json');
  const source=parseContextSource(readFileSync(safe(root,'CONTEXT.md'),'utf8'));
  snapshot(handoff.source_context_snapshot,source); checkDelta(handoff,source);
  const strategy=read(safe(root,handoff.source.domain_strategy_ref.persisted_ref));
  const stage=read(safe(root,handoff.source.stage_decision_package_ref.persisted_ref));
  schema(strategy,'docs/process/schemas/strategic-handoff-domain-strategy.schema.json');
  schema(stage,'docs/process/schemas/strategic-handoff-stage-decision-package.schema.json');
  snapshot(strategy.context_snapshot,source); snapshot(stage.context_snapshot,source);
  ensure(strategy.status==='approved' && stage.status==='approved', '战略合同/方案决策包尚未批准');
  ensure(strategy.domain_strategy_id===handoff.source.domain_strategy_ref.id && strategy.domain_version===handoff.source.domain_strategy_ref.version, '战略身份/版本不一致');
  ensure(stage.stage_decision_id===handoff.source.stage_decision_package_ref.id && stage.package_version===handoff.source.stage_decision_package_ref.version, '阶段包身份/版本不一致');
  ensure(stage.domain_strategy_ref.domain_strategy_id===strategy.domain_strategy_id && stage.domain_strategy_ref.domain_version===strategy.domain_version && stage.domain_strategy_ref.status==='approved' && stage.domain_strategy_ref.persisted_ref===handoff.source.domain_strategy_ref.persisted_ref && stage.domain_strategy_ref.digest===digest(strategy), '阶段包引用的战略内容不一致');
  ensure(!(stage.unresolved_items || []).some(x=>x.type==='blocker'), '阶段包含 blocker');
  const indexes=extractTraceability(strategy);
  const sourceRoles=read(safe(root,'docs/agents/digital-human-roles.yaml'));
  const roles=sourceApprovalPolicy(sourceRoles);
  for (const [artifact, version] of [[strategy,strategy.domain_version],[stage,stage.package_version]]) {
    if(artifact.approval) { const record=read(safe(root,artifact.approval.approval_ref));await sourceApproval(record,roles,root);ensure(artifact.approval.current_version===version,'资产内置批准版本过期'); }
  }
  const terminalGate=countersignRuleForGate(roles.gate_policy,'gate.strategic-design-handoff-approved')?'gate.strategic-design-handoff-approved':'gate.stage-decision-package-approved';
  const expectedGates={domain_strategy_ref:'gate.domain-strategy-approved',stage_decision_package_ref:'gate.stage-decision-package-approved',spec_ref:'gate.spec-baseline-approved',prototype_ref:'gate.user-confirmation',visual_baseline_ref:'gate.user-confirmation',business_ticket_set_ref:terminalGate,handoff:terminalGate};
  const bindings={...handoff.source,handoff:{id:handoff.handoff_id,version:handoff.handoff_version,persisted_ref:handoffRef,status:'approved'}};
  for(const [key,ref] of Object.entries(bindings)) {
    const approval=config.approvals[key];
    ensure(approval,`缺少资产批准绑定: ${key}`);
    ensure(approval.gate_id===expectedGates[key],`资产使用错误批准门禁: ${key}`);
    const bytes=key==='visual_baseline_ref'?null:readFileSync(safe(root,ref.persisted_ref));
    let actual;
    if(key==='visual_baseline_ref') {
      const baseline=read(safe(root,`${ref.persisted_ref}/${ref.manifest_ref}`));
      const result=await validateVisualBaseline(baseline,{bundleRoot:safe(root,ref.persisted_ref)});
      ensure(!result.errors.length,`视觉基线无效: ${result.errors.join('; ')}`);
      ensure(baseline.baseline_id===ref.baseline_id && baseline.version===ref.version && own([...ref.case_ids].sort(),baseline.cases.map(x=>x.case_id).sort()),'视觉基线身份不一致');
      actual=baseline.bundle.digest;
    } else actual=bytesDigest(bytes,approval.digest_kind);
    if(key!=='handoff')ensure(ref.digest===actual,`源资产摘要过期: ${key}`);
    const record=read(safe(root,approval.record_ref));
    await sourceApproval(record,roles,root);
    ensure(record.gate_id===approval.gate_id,`批准门禁不匹配: ${key}`);
    ensure((record.artifact_bindings || []).some(x=>x.id===(ref.id||ref.baseline_id) && x.version===ref.version && x.digest===actual),`批准记录未绑定当前资产: ${key}`);
  }
  const receipt=previewFiles(root,config.prototype);
  ensure(handoff.source.visual_baseline_ref.case_ids.every(id=>receipt.case_ids.includes(id)), '离线验证未覆盖视觉基线 case');
  return {handoff,config,indexes,strategy,stage};
}

function collect(root, handoffRef, handoff, config) {
  const collected=new Map(), queue=[handoffRef,'CONTEXT.md','docs/agents/digital-human-roles.yaml',...Object.values(handoff.source).map(x=>x.persisted_ref),...Object.values(config.approvals).map(x=>x.record_ref),...handoff.evidence_and_version_digests,...config.additional_files,config.prototype.preview_root,config.prototype.verification_ref];
  if(config.prototype.profile==='H2')queue.push(config.prototype.source_root,config.prototype.lock_ref);
  const symbolic=config.reference_map || {};
  const enqueue=ref=> { if(symbolic[ref])queue.push(symbolic[ref]); else if(/^https?:\/\//i.test(ref))return; else if(ref.startsWith('evidence.'))throw new TypeError(`未解析 evidence ID: ${ref}`); else if(ref.includes('/') || /\.(?:md|yaml|json|html|png|txt|log)$/.test(ref))queue.push(ref); };
  function refs(value,key='') {
    if(Array.isArray(value)) { if(key==='evidence_refs') value.forEach(enqueue); else value.forEach(v=>refs(v,key)); }
    else if(value && typeof value==='object') for(const [k,v]of Object.entries(value)) { if(['approval_ref','persisted_ref','user_decision_ref'].includes(k)&&typeof v==='string')enqueue(v); else if(k==='ref'&&typeof v==='string'&&!/^[a-z]+:\/\//i.test(v))enqueue(v); else refs(v,k); }
  }
  while(queue.length) {
    const ref=symbolic[queue[0]]||queue[0]; queue.shift(); if(/^https?:\/\//i.test(ref))continue; relative(ref);
    if(collected.has(ref))continue;
    const full=safe(root,ref),stat=lstatSync(full);
    if(stat.isDirectory()) { queue.push(...files(root,ref)); continue; }
    ensure(stat.isFile() && stat.size<=MAX_BYTES,`源文件类型/大小无效: ${ref}`);
    const bytes=readFileSync(full); collected.set(ref,bytes);
    ensure(collected.size<=20000 && [...collected.values()].reduce((n,b)=>n+b.length,0)<=MAX_BYTES,'交接包大小超限');
    if(/\.(yaml|yml|json)$/.test(ref))refs(parse(bytes));
    queue.push(...documentLinks(ref,bytes));
  }
  return collected;
}
function materialize(bundleRoot, manifest, destination) {
  for(const file of manifest.files.filter(x=>x.original_ref))write(destination,file.original_ref,readFileSync(safe(bundleRoot,file.path)));
}
export async function openBundle(input, action) {
  const temp=mkdtempSync(path.join(tmpdir(),'yss-handoff-'));
  try {
    ensure(existsSync(input) && !lstatSync(input).isSymbolicLink(),'交接包不存在或是 symlink');
    let root=path.resolve(input);
    if(lstatSync(root).isFile()){ root=path.join(temp,'unpacked');mkdirSync(root);archive('unpack',path.resolve(input),root); }
    const manifest=read(safe(root,'manifest.json'));
    schema(manifest,'docs/process/schemas/strategic-handoff-package.schema.json');
    const {bundle_digest,...body}=manifest;ensure(bundle_digest===digest(body),'包清单摘要不一致');
    const paths=manifest.files.map(x=>x.path);
    ensure(new Set(paths.map(x=>x.toLowerCase())).size===paths.length,'包文件路径重复');
    ensure(own([...paths,'manifest.json'].sort(),files(root).sort()),'包文件缺失或存在未登记文件');
    ensure(manifest.files.length<=20000 && manifest.files.reduce((n,f)=>n+f.size_bytes,0)<=MAX_BYTES,'包大小超限');
    for(const file of manifest.files){const bytes=readFileSync(safe(root,file.path));ensure(bytes.length===file.size_bytes && hash(bytes)===file.sha256,`文件摘要不一致: ${file.path}`);if(file.original_ref)relative(file.original_ref);}
    const originals=manifest.files.filter(x=>x.original_ref).map(x=>x.original_ref);
    ensure(new Set(originals.map(x=>x.toLowerCase())).size===originals.length,'源路径重复');
    const source=path.join(temp,'source');mkdirSync(source);materialize(root,manifest,source);
    const inspected=await inspectSource(source,manifest.handoff_ref);
    ensure(manifest.bundle_id===inspected.handoff.handoff_id && manifest.version===inspected.handoff.handoff_version,'包身份与源交接不一致');
    ensure(own(read(safe(root,'indexes/rules.json')),inspected.indexes.rules) && own(read(safe(root,'indexes/scenarios.json')),inspected.indexes.scenarios),'规则/场景索引与源资产不一致');
    const expected=collect(source,manifest.handoff_ref,inspected.handoff,inspected.config);
    ensure(own([...expected.keys()].sort(),originals.sort()),'源快照闭包不一致');
    const changes=read(safe(root,'indexes/changes.json'));
    ensure(own(changes.previous_bundle,manifest.previous_bundle), '版本差异的前版绑定不一致');
    let previousIndexes;
    if(manifest.previous_bundle){
      const previous=read(safe(root,'indexes/previous-manifest.json'));const{bundle_digest:previousDigest,...previousBody}=previous;
      ensure(previousDigest===digest(previousBody)&&previousDigest===manifest.previous_bundle.digest&&previous.bundle_id===manifest.bundle_id&&previous.version===manifest.previous_bundle.version&&Number(previous.version.slice(1))<Number(manifest.version.slice(1)),'前版清单绑定无效');
      previousIndexes={};
      for(const kind of ['rules','scenarios']){const bytes=readFileSync(safe(root,`indexes/previous-${kind}.json`));const priorFile=previous.files.find(x=>x.path===`indexes/${kind}.json`);ensure(priorFile&&priorFile.sha256===hash(bytes)&&priorFile.size_bytes===bytes.length,'前版索引摘要无效');previousIndexes[kind]=parse(bytes);}
    }
    ensure(own(changes,{previous_bundle:manifest.previous_bundle,...compareIndexes(inspected.indexes,previousIndexes)}),'版本差异与实际索引不一致');
    return await action({root,manifest,...inspected,changes});
  } finally {rmSync(temp,{recursive:true,force:true});}
}
export async function exportBundle({sourceRoot,handoffRef,output,zip=false,previous}) {
  const root=project(sourceRoot); parseContextContract({root}); relative(handoffRef);
  const current=await inspectSource(root,handoffRef);
  let prior=null;
  if(previous)prior=await openBundle(previous, b=>({manifest:b.manifest,indexes:b.indexes,handoff:b.handoff,rulesBytes:readFileSync(safe(b.root,'indexes/rules.json')),scenariosBytes:readFileSync(safe(b.root,'indexes/scenarios.json'))}));
  if(prior){ensure(prior.manifest.bundle_id===current.handoff.handoff_id,'前版属于不同交接');ensure(Number(current.handoff.handoff_version.slice(1))>Number(prior.manifest.version.slice(1)),'更新必须提升交接版本');for(const[key,ref]of Object.entries(current.handoff.source)){const old=prior.handoff.source[key];if(old.digest!==ref.digest)ensure(old.version!==ref.version,`源资产内容变化必须提升版本: ${key}`);}}
  const previousBundle=prior?{bundle_id:prior.manifest.bundle_id,version:prior.manifest.version,digest:prior.manifest.bundle_digest}:null;
  const snapshotFiles=collect(root,handoffRef,current.handoff,current.config);
  const target=path.resolve(output);
  ensure(!existsSync(target) && (!zip||!existsSync(`${target}.zip`)),'输出已存在，禁止覆盖');
  ensure(target!==root && !root.startsWith(`${target}${path.sep}`),'输出不能覆盖源仓');
  mkdirSync(path.dirname(target),{recursive:true});
  ensure(path.resolve(path.dirname(target))===path.dirname(target),'输出路径无效');
  const staging=mkdtempSync(path.join(path.dirname(target),'.handoff-staging-'));
  try {
    const entries=[];
    const put=(ref,bytes,original)=>{write(staging,ref,bytes);entries.push({path:ref,sha256:hash(bytes),size_bytes:bytes.length,...(original?{original_ref:original}:{})});};
    for(const [ref,bytes]of [...snapshotFiles].sort(([a],[b])=>a.localeCompare(b))) {
      const dest=ref===handoffRef?'handoff.yaml':ref==='CONTEXT.md'?'payload/source-context.snapshot.md':`payload/files/${ref}`;
      ensure(!dest.endsWith('/CONTEXT.md'),'只允许源根词汇快照，禁止嵌套 CONTEXT.md');put(dest,bytes,ref);
    }
    put('indexes/rules.json',Buffer.from(json(current.indexes.rules)));
    put('indexes/scenarios.json',Buffer.from(json(current.indexes.scenarios)));
    put('indexes/changes.json',Buffer.from(json({previous_bundle:previousBundle,...compareIndexes(current.indexes,prior?.indexes)})));
    if(prior){put('indexes/previous-manifest.json',Buffer.from(json(prior.manifest)));put('indexes/previous-rules.json',prior.rulesBytes);put('indexes/previous-scenarios.json',prior.scenariosBytes);}
    const body={schema_version:1,bundle_id:current.handoff.handoff_id,version:current.handoff.handoff_version,handoff_ref:handoffRef,previous_bundle:previousBundle,files:entries.sort((a,b)=>a.path.localeCompare(b.path))};
    const manifest={...body,bundle_digest:digest(body)};write(staging,'manifest.json',json(manifest));
    await openBundle(staging,()=>null);
    // Recheck every captured source byte before publishing the immutable directory.
    for(const [ref,bytes]of snapshotFiles)ensure(hash(readFileSync(safe(root,ref)))===hash(bytes),`导出期间源文件变化: ${ref}`);
    if(zip)archive('pack',staging,`${staging}.zip`);
    ensure(!existsSync(target),'输出并发冲突');renameSync(staging,target);
    if(zip)renameSync(`${staging}.zip`,`${target}.zip`);
    return {result:'exported',bundle_id:manifest.bundle_id,version:manifest.version,bundle_digest:manifest.bundle_digest,output:target,...(zip?{zip:`${target}.zip`,zip_sha256:hash(readFileSync(`${target}.zip`))}:{})};
  } finally {rmSync(staging,{recursive:true,force:true});rmSync(`${staging}.zip`,{force:true});}
}
export async function importBundle({bundle,targetRoot}) {
  const target=project(targetRoot);const context=parseContextContract({root:target});
  return openBundle(bundle,async b=>{
    const rel=`docs/handoffs/${b.manifest.bundle_id}/${b.manifest.version}`,dest=safe(target,rel,{missing:true});
    if(existsSync(dest)) {
      const receipt=read(safe(dest,'import-receipt.json'));
      ensure(receipt.bundle_digest===b.manifest.bundle_digest,'同 ID/version 内容冲突');
      await openBundle(safe(dest,'package'),()=>null);
      return {result:'already-imported',receipt_ref:`${rel}/import-receipt.json`};
    }
    const terms=[];
    for(const operation of ['added','updated','deprecated'])for(const expected of b.handoff.context_delta[operation]) {
      const actual=context.terms_by_ref.get(expected.term_ref);
      const equal=actual&&['term','meaning','english_identifier','context_id','forbidden_aliases'].every(key=>own(expected[key],actual[key]));
      terms.push({operation,term_ref:expected.term_ref,expected,current:actual||null,status:operation==='deprecated'?(actual?'pending':'matched'):(equal?'matched':actual?'conflict':'pending')});
    }
    const rows=[...b.indexes.rules.map(x=>({source_id:x.rule_id,source_digest:x.source_digest,kind:'rule'})),...b.indexes.scenarios.filter(x=>x.critical).map(x=>({source_id:x.scenario_id,source_digest:x.source_digest,kind:'scenario'}))].map(x=>({...x,disposition:'pending',tactical_refs:[],test_seam_refs:[],evidence_refs:[],dependent_slice_refs:[],dependency_status:'unknown'}));
    mkdirSync(path.dirname(dest),{recursive:true});const stage=mkdtempSync(path.join(path.dirname(dest),'.import-staging-'));
    try {
      cpSync(b.root,path.join(stage,'package'),{recursive:true,errorOnExist:true,force:false});
      const receipt={schema_version:1,bundle_id:b.manifest.bundle_id,version:b.manifest.version,bundle_digest:b.manifest.bundle_digest,package_ref:`${rel}/package`,target_context_digest:context.document_digest,status:'pending-context-reconciliation'};
      write(stage,'import-receipt.json',json(receipt));write(stage,'context-reconciliation-draft.json',json({schema_version:1,status:'draft',import_receipt_ref:`${rel}/import-receipt.json`,target_context_digest:context.document_digest,terms}));
      write(stage,'tactical-traceability-draft.json',json({schema_version:1,import_receipt_ref:`${rel}/import-receipt.json`,bundle_digest:b.manifest.bundle_digest,rows}));
      write(stage,'upstream-change-impact.json',json({schema_version:1,previous_bundle:b.manifest.previous_bundle,changed_source_ids:[...b.changes.updated,...b.changes.removed],added_source_ids:b.changes.added,status:'requires-lifecycle-reconciliation',policy:'mark-dependent-tactical-and-slice-contracts-stale; unknown-dependency-blocks-all'}));
      ensure(!existsSync(dest),'导入并发冲突');renameSync(stage,dest);
      return {result:'imported-pending-reconciliation',receipt_ref:`${rel}/import-receipt.json`,traceability_ref:`${rel}/tactical-traceability-draft.json`};
    }finally{rmSync(stage,{recursive:true,force:true});}
  });
}
