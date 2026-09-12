import { existsSync, lstatSync, readFileSync, mkdirSync, mkdtempSync, renameSync, rmSync, cpSync } from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { ensure, canonical, digest, hash, json, parse, read, safe, relative, files, write, project, schema, schemaBatch, archive, ROOT, sourceApprovalPolicy, withSourceContextSnapshot } from './strategic-handoff-io.mjs';
import { parseContextSource, parseContextContract, resolveContextTermRefs } from './context-contract.mjs';
import { countersignRuleForGate } from './digital-human-roles.mjs';
import { validateApprovalRecord } from './approval-record.mjs';
import { treeDigest } from './strategic-handoff-io.mjs';
import { uiBaselineKind, uiBaselineRef, uiBaselineCaseIds, hasConsumerRoutes, validateHandoffUiBaseline } from './ui-baseline.mjs';
import { extractTraceability, compareIndexes } from './strategic-handoff-rules.mjs';
const MAX_BYTES = 512 * 1024 * 1024;
const own = (a,b) => JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));
const nonempty = x => typeof x === 'string' && x.trim();
const bytesDigest = (bytes, kind) => kind === 'canonical-json' ? digest(parse(bytes)) : kind === 'sha256-bytes' ? hash(bytes) : (() => { throw new TypeError(`未知摘要算法: ${kind}`); })();
const HANDOFF_SCHEMAS = new Map([[3,'docs/process/schemas/strategic-design-handoff-v3.schema.json'],[4,'docs/process/schemas/strategic-design-handoff-v4.schema.json'],[5,'docs/process/schemas/strategic-design-handoff-v5.schema.json']]);
const SOURCE_SCHEMAS = new Map([
  [3,['docs/process/schemas/strategic-handoff-domain-strategy.schema.json','docs/process/schemas/strategic-handoff-stage-decision-package.schema.json']],
  [4,['docs/process/schemas/strategic-handoff-domain-strategy-v3.schema.json','docs/process/schemas/strategic-handoff-stage-decision-package-v3.schema.json']],
  [5,['docs/process/schemas/strategic-handoff-domain-strategy-v3.schema.json','docs/process/schemas/strategic-handoff-stage-decision-package-v3.schema.json']],
]);
const CAPABILITIES=['backend-technical-design','frontend-engineering-design','delivery-coordination'];

function versionSchema(version, schemas, label) {
  ensure(schemas.has(version), `${label} 未知 schema_version: ${String(version)}；支持版本: ${[...schemas.keys()].join(', ')}；请使用显式迁移器升级`);
  return schemas.get(version);
}

function validateConsumerRoutes(handoff, stage) {
  if(!hasConsumerRoutes(handoff))return;
  const routes=new Map();
  for(const route of handoff.consumer_routes||[]){
    ensure(!routes.has(route.capability),`消费者能力重复: ${route.capability}`);
    ensure(![...routes.values()].some(item=>item.route_id===route.route_id),`消费者 route_id 重复: ${route.route_id}`);
    routes.set(route.capability,route);
  }
  ensure(CAPABILITIES.every(capability=>routes.has(capability)),'Handoff v4 必须完整声明 backend、frontend 与 coordination 三条消费者路由');
  const impact=stage.impact_assessment||{};
  const mappingByCapability=new Map();
  for(const mapping of stage.downstream_mapping||[]){
    ensure(CAPABILITIES.includes(mapping.consumer_capability),`未知消费者能力: ${mapping.consumer_capability}`);
    const values=mappingByCapability.get(mapping.consumer_capability)||[];values.push(mapping);mappingByCapability.set(mapping.consumer_capability,values);
  }
  const expected=(capability,required)=>required?'required':(mappingByCapability.get(capability)||[]).some(mapping=>mapping.propagation!=='not-applicable')?'optional':'not-applicable';
  const backend=routes.get('backend-technical-design'),frontend=routes.get('frontend-engineering-design'),coordination=routes.get('delivery-coordination');
  const backendActive=Boolean(impact.backend||impact.api||impact.data),frontendActive=Boolean(impact.frontend||impact.ui);
  ensure(backend.activation===expected(backend.capability,backendActive),'backend 消费者路由与批准的 Backend/API/Data 影响矩阵不一致');
  ensure(frontend.activation===expected(frontend.capability,frontendActive),'frontend 消费者路由与批准的 Frontend/UI 影响矩阵不一致');
  ensure(coordination.activation===((backend.activation!=='not-applicable'||frontend.activation!=='not-applicable')?'required':'not-applicable'),'coordination 消费者路由与交付影响不一致');
  const activeBackend=backend.activation!=='not-applicable';
  ensure(own(frontend.dependencies,activeBackend?[backend.route_id]:[]),'frontend 路由依赖与 backend 路由不一致');
  ensure(own(coordination.dependencies,[...(backend.activation!=='not-applicable'?[backend.route_id]:[]),...(frontend.activation!=='not-applicable'?[frontend.route_id]:[])]),'coordination 路由依赖与消费者路由不一致');
  for(const route of routes.values())for(const dependency of route.dependencies)ensure([...routes.values()].some(item=>item.route_id===dependency),`消费者路由依赖悬空: ${dependency}`);
  for(const [capability,mappings] of mappingByCapability)for(const mapping of mappings){
    const route=routes.get(capability);
    ensure(mapping.propagation==='not-applicable'?route.activation==='not-applicable':route.activation!=='not-applicable',`downstream mapping 与消费者路由影响不一致: ${mapping.mapping_id}`);
  }
}

export async function sourceApproval(record, roles, root) {
  const options={rolesDoc:roles,requireApproved:true,root,read:ref=>readFileSync(safe(root,path.relative(root,ref).split(path.sep).join('/')))};
  if (roles.user_decision_policy.gates.includes(record.gate_id)) {
    ensure(existsSync(path.join(ROOT,'scripts/lib/user-decision.mjs')), '接收工具不支持源用户决定策略，请升级工具后验包');
    const { assertApprovalUserDecision } = await import('./user-decision-reuse.mjs');
    assertApprovalUserDecision(record, roles, options);
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
  schema(handoff,versionSchema(handoff?.schema_version,HANDOFF_SCHEMAS,'Strategic Handoff'));
  ensure(handoff.status==='approved', '交接包尚未批准');
  const config=handoff.package_export;
  schema(config,handoff.schema_version===5?'docs/process/schemas/strategic-handoff-export-v2.schema.json':'docs/process/schemas/strategic-handoff-export.schema.json');
  if(handoff.schema_version===5)ensure(config.ui_baseline_kind===uiBaselineKind(handoff),'交接与导出 UI 基线类型不一致');
  const source=parseContextSource(readFileSync(safe(root,'CONTEXT.md'),'utf8'));
  snapshot(handoff.source_context_snapshot,source); checkDelta(handoff,source);
  const strategy=read(safe(root,handoff.source.domain_strategy_ref.persisted_ref));
  const stage=read(safe(root,handoff.source.stage_decision_package_ref.persisted_ref));
  const [strategySchema,stageSchema]=versionSchema(handoff.schema_version,SOURCE_SCHEMAS,'Strategic Handoff source');
  schemaBatch([[strategy,strategySchema],[stage,stageSchema]]);
  snapshot(strategy.context_snapshot,source); snapshot(stage.context_snapshot,source);
  ensure(strategy.status==='approved' && stage.status==='approved', '战略合同/方案决策包尚未批准');
  ensure(strategy.domain_strategy_id===handoff.source.domain_strategy_ref.id && strategy.domain_version===handoff.source.domain_strategy_ref.version, '战略身份/版本不一致');
  ensure(stage.stage_decision_id===handoff.source.stage_decision_package_ref.id && stage.package_version===handoff.source.stage_decision_package_ref.version, '阶段包身份/版本不一致');
  ensure(stage.domain_strategy_ref.domain_strategy_id===strategy.domain_strategy_id && stage.domain_strategy_ref.domain_version===strategy.domain_version && stage.domain_strategy_ref.status==='approved' && stage.domain_strategy_ref.persisted_ref===handoff.source.domain_strategy_ref.persisted_ref && stage.domain_strategy_ref.digest===digest(strategy), '阶段包引用的战略内容不一致');
  ensure(!(stage.unresolved_items || []).some(x=>x.type==='blocker'), '阶段包含 blocker');
  validateConsumerRoutes(handoff,stage);
  if(uiBaselineKind(handoff)==='existing-ui-baseline')ensure(stage.impact_assessment?.ui===false,'existing-ui-baseline 不支持 UI 影响，返回产品设计');
  const indexes=extractTraceability(strategy);
  const sourceRoles=read(safe(root,'docs/agents/digital-human-roles.yaml'));
  const roles=sourceApprovalPolicy(sourceRoles);
  for (const [artifact, version] of [[strategy,strategy.domain_version],[stage,stage.package_version]]) {
    if(artifact.approval) { const record=read(safe(root,artifact.approval.approval_ref));await sourceApproval(record,roles,root);ensure(artifact.approval.current_version===version,'资产内置批准版本过期'); }
  }
  // Source packages retain their published approval vocabulary. Never promote old approvals into current checkpoint gates.
  const currentPlan = (roles.gate_policy.dual_digital_human || []).some(rule => rule.gate === 'gate.plan-approved');
  const terminalGate=currentPlan?'gate.plan-approved':countersignRuleForGate(roles.gate_policy,'gate.strategic-design-handoff-approved')?'gate.strategic-design-handoff-approved':'gate.stage-decision-package-approved';
  const expectedGates={domain_strategy_ref:currentPlan?'gate.plan-approved':'gate.domain-strategy-approved',stage_decision_package_ref:currentPlan?'gate.plan-approved':'gate.stage-decision-package-approved',spec_ref:'gate.spec-baseline-approved',prototype_ref:currentPlan?'gate.product-design-approved':'gate.user-confirmation',visual_baseline_ref:currentPlan?'gate.product-design-approved':'gate.user-confirmation',business_ticket_set_ref:terminalGate,handoff:terminalGate};
  expectedGates.existing_ui_baseline_ref=expectedGates.prototype_ref;
  const bindings={...handoff.source,handoff:{id:handoff.handoff_id,version:handoff.handoff_version,persisted_ref:handoffRef,status:'approved'}};
  for(const [key,ref] of Object.entries(bindings)) {
    const approval=config.approvals[key];
    ensure(approval,`缺少资产批准绑定: ${key}`);
    ensure(approval.gate_id===expectedGates[key],`资产使用错误批准门禁: ${key}`);
    const baselineKey=['visual_baseline_ref','existing_ui_baseline_ref'].includes(key);
    let actual;
    if(baselineKey) {
      const validated=await validateHandoffUiBaseline(root,handoff);actual=validated.digest;
      if(key==='existing_ui_baseline_ref') {
        ensure(approval.digest_kind==='sha256-bytes','既有 UI 批准必须绑定 manifest 原字节');
        ensure(roles.user_decision_policy.gates.includes(expectedGates.existing_ui_baseline_ref),'既有 UI 承接必须使用产品设计真实用户决定策略');
      }
    } else actual=bytesDigest(readFileSync(safe(root,ref.persisted_ref)),approval.digest_kind);
    if(key!=='handoff')ensure(ref.digest===actual,`源资产摘要过期: ${key}`);
    const record=read(safe(root,approval.record_ref));
    if(key==='existing_ui_baseline_ref')ensure(record.subject_ref===`${ref.persisted_ref}/${ref.manifest_ref}`,'既有 UI 用户决定必须以当前 manifest 为批准主体');
    await sourceApproval(record,roles,root);
    ensure(record.gate_id===approval.gate_id,`批准门禁不匹配: ${key}`);
    ensure((record.artifact_bindings || []).some(x=>x.id===(ref.id||ref.baseline_id) && x.version===ref.version && x.digest===actual),`批准记录未绑定当前资产: ${key}`);
  }
  if (roles.user_decision_policy.required_capabilities?.includes('strategic-decision-reuse-v1')) {
    const record=read(safe(root,config.approvals.handoff.record_ref));
    const scope=read(safe(root,record.subject_ref));
    ensure(scope.kind==='strategic-delivery-scope' && scope.schema_version===1, '交接必须绑定独立的交付范围清单');
    const {package_export,status,...delivery}=handoff;
    ensure(scope.delivery_ref && own(read(safe(root,scope.delivery_ref)),delivery), '交付范围清单未覆盖当前交接内容或风险');
    ensure(scope.assets?.some(asset=>asset.ref===scope.delivery_ref && asset.digest===hash(readFileSync(safe(root,scope.delivery_ref)))), '交接内容快照缺少批准覆盖');
    for (const [key,ref] of Object.entries(handoff.source)) {
      const file=['visual_baseline_ref','existing_ui_baseline_ref'].includes(key)?`${ref.persisted_ref}/${ref.manifest_ref}`:ref.persisted_ref;
      const decisionBoundaries=key==='business_ticket_set_ref'?['gate.spec-baseline-approved',terminalGate]:[expectedGates[key]];
      ensure(scope.assets?.some(asset=>asset.ref===file && asset.version===ref.version && decisionBoundaries.includes(asset.boundary) && asset.digest===hash(readFileSync(safe(root,file)))), `交付范围清单遗漏当前资产: ${key}`);
    }
  }
  if(uiBaselineKind(handoff)==='prototype') {
    const receipt=previewFiles(root,config.prototype);
    ensure(uiBaselineCaseIds(handoff).every(id=>receipt.case_ids.includes(id)), '离线验证未覆盖视觉基线 case');
  }
  return {handoff,config,indexes,strategy,stage};
}

function collect(root, handoffRef, handoff, config) {
  const collected=new Map(), queue=[handoffRef,'CONTEXT.md','docs/agents/digital-human-roles.yaml',...Object.values(handoff.source).map(x=>x.persisted_ref),...Object.values(config.approvals).map(x=>x.record_ref),...handoff.evidence_and_version_digests,...config.additional_files];
  if(config.prototype)queue.push(config.prototype.preview_root,config.prototype.verification_ref);
  if(config.prototype?.profile==='H2')queue.push(config.prototype.source_root,config.prototype.lock_ref);
  const symbolic=config.reference_map || {};
  const enqueue=ref=> { if(symbolic[ref])queue.push(symbolic[ref]); else if(/^https?:\/\//i.test(ref))return; else if(ref.startsWith('evidence.'))throw new TypeError(`未解析 evidence ID: ${ref}`); else if(ref.includes('/') || /\.(?:md|yaml|json|html|png|txt|log)$/.test(ref))queue.push(ref); };
  function refs(value,key='') {
    if(Array.isArray(value)) { if(key==='evidence_refs') value.forEach(enqueue); else value.forEach(v=>refs(v,key)); }
    else if(value && typeof value==='object') for(const [k,v]of Object.entries(value)) { if(['approval_ref','persisted_ref','user_decision_ref','decision_reuse_ref','scope_ref','subject_ref','delivery_ref'].includes(k)&&typeof v==='string')enqueue(v); else if(k==='ref'&&typeof v==='string'&&!/^[a-z]+:\/\//i.test(v))enqueue(v); else refs(v,k); }
  }
  let totalBytes = 0;
  while(queue.length) {
    const ref=symbolic[queue[0]]||queue[0]; queue.shift(); if(/^https?:\/\//i.test(ref))continue; relative(ref);
    if(collected.has(ref))continue;
    const full=safe(root,ref),stat=lstatSync(full);
    if(stat.isDirectory()) { queue.push(...files(root,ref)); continue; }
    ensure(stat.isFile() && stat.size<=MAX_BYTES,`源文件类型/大小无效: ${ref}`);
    const bytes=readFileSync(full); collected.set(ref,bytes); totalBytes += bytes.length;
    ensure(collected.size<=20000 && totalBytes<=MAX_BYTES,'交接包大小超限');
    const localBaseline=uiBaselineKind(handoff)==='existing-ui-baseline'&&ref.startsWith(`${uiBaselineRef(handoff).persisted_ref}/`);
    if(!localBaseline&&/\.(yaml|yml|json)$/.test(ref))refs(parse(bytes));
    // The entire existing UI observation directory was validated as a byte-bound file set.
    // Its copied source documentation is evidence, not governance dependency instructions.
    if(!localBaseline)queue.push(...documentLinks(ref,bytes));
  }
  return collected;
}
function materialize(captured, manifest, destination) {
  for(const file of manifest.files.filter(x=>x.original_ref))write(destination,file.original_ref,captured.get(file.path));
}
export async function openBundle(input, action, {readOnly=false}={}) {
  const temp=readOnly?null:mkdtempSync(path.join(tmpdir(),'yss-handoff-'));
  try {
    ensure(existsSync(input) && !lstatSync(input).isSymbolicLink(),'交接包不存在或是 symlink');
    let root=path.resolve(input);
    if(lstatSync(root).isFile()){ ensure(!readOnly,'readonly-extraction-required: 只读验证需要已展开目录');root=path.join(temp,'unpacked');mkdirSync(root);archive('unpack',path.resolve(input),root); }
    const manifest=read(safe(root,'manifest.json'));
    schema(manifest,'docs/process/schemas/strategic-handoff-package.schema.json');
    const {bundle_digest,...body}=manifest;ensure(bundle_digest===digest(body),'包清单摘要不一致');
    const paths=manifest.files.map(x=>x.path);
    ensure(new Set(paths.map(x=>x.toLowerCase())).size===paths.length,'包文件路径重复');
    ensure(own([...paths,'manifest.json'].sort(),files(root).sort()),'包文件缺失或存在未登记文件');
    ensure(manifest.files.length<=20000 && manifest.files.reduce((n,f)=>n+f.size_bytes,0)<=MAX_BYTES,'包大小超限');
    const captured = new Map();
    for(const file of manifest.files){const bytes=readFileSync(safe(root,file.path));ensure(bytes.length===file.size_bytes && hash(bytes)===file.sha256,`文件摘要不一致: ${file.path}`);if(file.original_ref)relative(file.original_ref);captured.set(file.path,bytes);}
    const originals=manifest.files.filter(x=>x.original_ref).map(x=>x.original_ref);
    ensure(new Set(originals.map(x=>x.toLowerCase())).size===originals.length,'源路径重复');
    let source;
    if(readOnly){
      ensure(manifest.files.filter(file=>file.original_ref).every(file=>file.path===`payload/files/${file.original_ref==='CONTEXT.md'?'source-context.snapshot.md':file.original_ref}`),'readonly-source-layout-required: 原始源布局需要只读文件映射支持');
      source=safe(root,'payload/files');
    }else{source=path.join(temp,'source');mkdirSync(source);materialize(captured,manifest,source);}
    const inspect=async()=>{
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
    };
    return readOnly?await withSourceContextSnapshot(source,inspect):await inspect();
  } finally {if(temp)rmSync(temp,{recursive:true,force:true});}
}
export async function exportBundle({sourceRoot,handoffRef,output,zip=false,previous}) {
  const root=project(sourceRoot); parseContextContract({root}); relative(handoffRef);
  const current=await inspectSource(root,handoffRef);
  let prior=null;
  if(previous)prior=await openBundle(previous, b=>({manifest:b.manifest,indexes:b.indexes,handoff:b.handoff,rulesBytes:readFileSync(safe(b.root,'indexes/rules.json')),scenariosBytes:readFileSync(safe(b.root,'indexes/scenarios.json'))}));
  if(prior){ensure(prior.manifest.bundle_id===current.handoff.handoff_id,'前版属于不同交接');ensure(Number(current.handoff.handoff_version.slice(1))>Number(prior.manifest.version.slice(1)),'更新必须提升交接版本');for(const[key,ref]of Object.entries(current.handoff.source)){const old=prior.handoff.source[key];if(old&&old.digest!==ref.digest)ensure(old.version!==ref.version,`源资产内容变化必须提升版本: ${key}`);}}
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
      const dest=current.handoff.schema_version===5?`payload/files/${ref==='CONTEXT.md'?'source-context.snapshot.md':ref}`:ref===handoffRef?'handoff.yaml':ref==='CONTEXT.md'?'payload/source-context.snapshot.md':`payload/files/${ref}`;
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
      let receipt;
      if(b.handoff.schema_version===3){
        receipt={schema_version:1,bundle_id:b.manifest.bundle_id,version:b.manifest.version,bundle_digest:b.manifest.bundle_digest,package_ref:`${rel}/package`,target_context_digest:context.document_digest,status:'pending-context-reconciliation'};
        write(stage,'import-receipt.json',json(receipt));write(stage,'context-reconciliation-draft.json',json({schema_version:1,status:'draft',import_receipt_ref:`${rel}/import-receipt.json`,target_context_digest:context.document_digest,terms}));
        write(stage,'tactical-traceability-draft.json',json({schema_version:1,import_receipt_ref:`${rel}/import-receipt.json`,bundle_digest:b.manifest.bundle_digest,rows}));
        write(stage,'upstream-change-impact.json',json({schema_version:1,previous_bundle:b.manifest.previous_bundle,changed_source_ids:[...b.changes.updated,...b.changes.removed],added_source_ids:b.changes.added,status:'requires-lifecycle-reconciliation',policy:'mark-dependent-tactical-and-slice-contracts-stale; unknown-dependency-blocks-all'}));
      }else{
        const profileRef=path.join(target,'docs/process/harness-profile.yaml');
        const profile=existsSync(profileRef)?read(profileRef):null;
        const capabilities=profile?.handoff?.consumer_capabilities||CAPABILITIES;
        ensure(Array.isArray(capabilities)&&capabilities.length&&capabilities.every(capability=>CAPABILITIES.includes(capability)),'目标 profile 未声明受支持的消费者能力');
        const selected=b.handoff.consumer_routes.filter(route=>capabilities.includes(route.capability));
        ensure(selected.length===capabilities.length,'目标 profile 的消费者能力在 Handoff v4 中缺失');
        const commonRefs=[`${rel}/context-reconciliation-draft.json`,`${rel}/upstream-change-impact.json`];
        const routeRecords=selected.map(route=>{
          const artifactRefs=[...commonRefs];
          if(route.activation!=='not-applicable'&&route.capability==='backend-technical-design')artifactRefs.push(`${rel}/backend-technical-traceability-draft.json`);
          if(route.activation!=='not-applicable'&&route.capability==='frontend-engineering-design')artifactRefs.push(`${rel}/frontend-strategic-preflight-draft.json`,`${rel}/frontend-traceability-draft.json`);
          if(route.activation!=='not-applicable'&&route.capability==='delivery-coordination')artifactRefs.push(`${rel}/consumer-status-index-draft.json`);
          return {route_id:route.route_id,capability:route.capability,activation:route.activation,artifact_refs:artifactRefs};
        });
        receipt={schema_version:2,bundle_id:b.manifest.bundle_id,version:b.manifest.version,bundle_digest:b.manifest.bundle_digest,package_ref:`${rel}/package`,target_context_digest:context.document_digest,target_profile_id:profile?.profile_id||'yss-full-lifecycle',selected_consumer_capabilities:capabilities,routes:routeRecords,status:'pending-context-reconciliation'};
        schema(receipt,'docs/process/schemas/strategic-handoff-import-receipt.schema.json');
        write(stage,'import-receipt.json',json(receipt));
        write(stage,'context-reconciliation-draft.json',json({schema_version:2,status:'draft',import_receipt_ref:`${rel}/import-receipt.json`,target_context_digest:context.document_digest,route_ids:selected.map(route=>route.route_id),terms}));
        write(stage,'upstream-change-impact.json',json({schema_version:2,previous_bundle:b.manifest.previous_bundle,routes:selected.map(route=>({route_id:route.route_id,capability:route.capability,activation:route.activation,changed_source_ids:[...b.changes.updated,...b.changes.removed],added_source_ids:b.changes.added,status:'requires-lifecycle-reconciliation'})),policy:'mark-only-known-dependent-contracts-stale; unknown-dependency-or-design-basis-change-blocks-all'}));
        const backendRoute=b.handoff.consumer_routes.find(route=>route.capability==='backend-technical-design');
        const frontendRoute=b.handoff.consumer_routes.find(route=>route.capability==='frontend-engineering-design');
        const coordinationRoute=b.handoff.consumer_routes.find(route=>route.capability==='delivery-coordination');
        if(capabilities.includes('backend-technical-design')&&backendRoute.activation!=='not-applicable')write(stage,'backend-technical-traceability-draft.json',json({schema_version:2,route_id:backendRoute.route_id,import_receipt_ref:`${rel}/import-receipt.json`,bundle_digest:b.manifest.bundle_digest,rows}));
        if(capabilities.includes('frontend-engineering-design')&&frontendRoute.activation!=='not-applicable'){
          const preflight={schema_version:b.handoff.schema_version===5?2:1,status:'draft',route_id:frontendRoute.route_id,capability:frontendRoute.capability,import_receipt_ref:`${rel}/import-receipt.json`,bundle_digest:b.manifest.bundle_digest,context_reconciliation_ref:'',...(b.handoff.schema_version===5?{ui_baseline_kind:uiBaselineKind(b.handoff),ui_baseline_ref:`${rel}/package/payload/files/${uiBaselineRef(b.handoff).persisted_ref}/${uiBaselineRef(b.handoff).manifest_ref}`}:{visual_baseline_ref:`${rel}/package/payload/files/${uiBaselineRef(b.handoff).persisted_ref}/${uiBaselineRef(b.handoff).manifest_ref}`}),source_rule_refs:rows.map(row=>row.source_id),backend_dependency:{mode:backendRoute.activation==='not-applicable'?'not-applicable':'required',route_id:backendRoute.route_id,...(backendRoute.activation==='not-applicable'?{reason:backendRoute.reason,impact_refs:backendRoute.impact_refs,evidence_refs:backendRoute.evidence_refs}:{})},ready_for_agent:false};
          schema(preflight,b.handoff.schema_version===5?'docs/process/schemas/frontend-strategic-preflight-v2.schema.json':'docs/process/schemas/frontend-strategic-preflight.schema.json');
          write(stage,'frontend-strategic-preflight-draft.json',json(preflight));write(stage,'frontend-traceability-draft.json',json({schema_version:1,route_id:frontendRoute.route_id,import_receipt_ref:`${rel}/import-receipt.json`,bundle_digest:b.manifest.bundle_digest,rows:rows.map(({tactical_refs,test_seam_refs,...row})=>({...row,frontend_case_refs:[]}))}));
        }
        if(capabilities.includes('delivery-coordination')&&coordinationRoute.activation!=='not-applicable')write(stage,'consumer-status-index-draft.json',json({schema_version:1,status:'draft',import_receipt_ref:`${rel}/import-receipt.json`,routes:b.handoff.consumer_routes.map(route=>({route_id:route.route_id,capability:route.capability,activation:route.activation,consumer_status:route.activation==='not-applicable'?'not-applicable':'pending',receipt_refs:[],acceptance_refs:[],feedback_refs:[]}))}));
      }
      ensure(!existsSync(dest),'导入并发冲突');renameSync(stage,dest);
      const traceabilityRef=b.handoff.schema_version===3?`${rel}/tactical-traceability-draft.json`:receipt.routes.find(route=>route.capability==='backend-technical-design')?.artifact_refs.find(ref=>ref.endsWith('backend-technical-traceability-draft.json'))||receipt.routes.find(route=>route.capability==='frontend-engineering-design')?.artifact_refs.find(ref=>ref.endsWith('frontend-traceability-draft.json'));
      return {result:'imported-pending-reconciliation',receipt_ref:`${rel}/import-receipt.json`,...(traceabilityRef?{traceability_ref:traceabilityRef}:{})};
    }finally{rmSync(stage,{recursive:true,force:true});}
  });
}
