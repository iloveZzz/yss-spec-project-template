import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { parseSliceYaml } from './slice-contract.mjs';
import { treeHash } from './skill-supply-chain.mjs';

export const coverageDigest = value => createHash('sha256').update(typeof value === 'string' || Buffer.isBuffer(value) ? value : JSON.stringify(value)).digest('hex');
const ensure = (ok, message) => { if (!ok) throw Error(`backend-review: ${message}`); };
const beneath = (file, scope) => scope === '.' || file === scope || file.startsWith(`${scope}/`);
export const CORE_SKILLS = ['yss-web-controller','yss-dto','yss-domain','yss-application','yss-repository','yss-mybatis'];
const roleSkills = {web:'yss-web-controller',server:'yss-web-controller',domain:'yss-domain',application:'yss-application',service:'yss-application',core:'yss-application',infrastructure:'yss-repository',persistence:'yss-repository',repository:'yss-repository'};
export function coverageFile(root, ref) {
  ensure(typeof ref === 'string' && ref && !path.isAbsolute(ref) && !ref.split(/[\\/]/).includes('..'), 'safe relative coverage reference required');
  const resolved = fs.realpathSync(path.resolve(root, ref));
  ensure(resolved.startsWith(`${fs.realpathSync(root)}${path.sep}`), 'coverage reference escapes root');
  return resolved;
}
function binding(root, item) {
  ensure(item?.ref && item?.digest, 'coverage basis ref/digest required');
  const bytes = fs.readFileSync(coverageFile(root,item.ref));
  ensure(coverageDigest(bytes) === item.digest.replace(/^sha256:/,''), `coverage basis stale: ${item.ref}`);
  return parseSliceYaml(bytes.toString());
}
function files(root, prefix = '') {
  return fs.readdirSync(path.join(root,prefix),{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name,'en')).flatMap(entry => {
    if (['.git','target','node_modules'].includes(entry.name) || (prefix==='.template-source' && entry.name==='evidence')) return [];
    const ref = prefix ? `${prefix}/${entry.name}` : entry.name;
    ensure(!entry.isSymbolicLink(), `unresolved source symlink: ${ref}`);
    return entry.isDirectory() ? files(root,ref) : [ref];
  });
}
function git(root,args) {
  const r=spawnSync('git',args,{cwd:root,encoding:'utf8',maxBuffer:32*1024*1024});
  ensure(r.status===0,`coverage git ${args[0]} failed`); return r.stdout;
}
function stripComments(source) {
  // Exclude literals too: a diagnostic string containing "FooRepository" is not a dependency.
  return source.replace(/"""[\s\S]*?"""|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, value => value.replace(/[^\n]/g,' '));
}
function uses(from,to) {
  return to.declared.some(name => from.tokens.has(name) && (from.pkg===to.pkg || from.code.includes(`${to.pkg}.${name}`) || from.code.includes(`import ${to.pkg}.*`)));
}
function javaType(ref,source) {
  const code=stripComments(source), pkg=code.match(/\bpackage\s+([\w.]+)\s*;/)?.[1];
  const declared=[...code.matchAll(/(?:@\s*interface|\bclass|\binterface|\benum|\brecord)\s+(\w+)/g)].map(m=>m[1]);
  const annotations=[...code.matchAll(/@([\w.]+)/g)].map(m=>m[1].split('.').at(-1));
  const parents=[...code.matchAll(/\b(?:extends|implements)\s+([\w.,<>\s]+?)(?=\{|\bpermits\b)/g)].flatMap(m=>m[1].match(/\b[A-Z]\w*/g)||[]);
  const tokens=new Set(code.match(/\b[A-Z]\w*/g)||[]);
  return {ref,code,pkg,declared,annotations,parents,tokens,http:false,roles:new Set()};
}
function readRules(root,skill) {
  ensure(/^[a-z][a-z0-9-]*$/.test(skill),'invalid skill identifier');
  const folder=`.agents/skills/${skill}`;
  ensure(fs.existsSync(path.join(root,folder,'SKILL.md')), `missing applicable skill: ${skill}`);
  const sources=files(path.join(root,folder)).filter(p=>p.endsWith('.md') && !p.includes('source-index'));
  const rules=[],sourceDigests=[];
  for (const name of sources) {
    const ref=`${folder}/${name}`, source=fs.readFileSync(coverageFile(root,ref),'utf8');
    sourceDigests.push({ref,digest:coverageDigest(source)});
    for (const m of source.matchAll(/^<!-- yss-rule (\{[^\n]+\}) -->$/gm)) {
      const rule=JSON.parse(m[1]);
      ensure(/^[a-z][a-z0-9.-]+$/.test(rule.id) && rule.level==='mandatory' && ['always','change','web','wire','domain','application','persistence','mybatis','pagination','batch'].includes(rule.when), `invalid rule declaration: ${ref}`);
      ensure(source.includes(`<a id="${rule.id}"></a>`),`rule anchor missing: ${rule.id}`);
      rules.push({...rule,skill,rule_ref:`${ref}#${rule.id}`,rule_digest:coverageDigest(source)});
    }
  }
  // Whole-text semantic review is always required, including unstructured auxiliary rules.
  const ref=`${folder}/SKILL.md`;
  rules.push({id:`${skill}.full-text`,when:'always',level:'mandatory',evidence:'semantic-review',skill,rule_ref:ref,rule_digest:coverageDigest(fs.readFileSync(coverageFile(root,ref)))});
  return {rules,sourceDigests};
}

/** Read-only derivation: never approves a contract or executes project build commands. */
export function compileStandardsCoverage({root,projectRoot,contract=null,scope_kind='baseline',baseline_binding=null,comparison_ref=null,actual_skills=[],responsibility_evidence=[]}={}) {
  ensure(['baseline','change'].includes(scope_kind),'scope_kind required');
  root=fs.realpathSync(root);projectRoot=fs.realpathSync(projectRoot);
  const basis=contract?.resolution?.architecture_evidence?.engineering_baseline || baseline_binding;
  const baseline=basis?binding(root,basis):null;
  const identity=contract?.resolution?.architecture_identity || baseline?.architecture_identity;
  const family=identity?.architecture_family;
  const issues=[];
  if (baseline && (baseline.kind!=='existing-engineering-baseline' || baseline.status!=='current') && identity?.source_kind==='existing-registration') issues.push({id:'baseline-not-current',reason:'既有工程基线未标记为当前观测，须先核对登记'});
  if (!['domain-driven','layered-mvc'].includes(family)) issues.push({id:'architecture-unknown',reason:'需要登记架构；只读盘点不能猜测 DDD/MVC'});
  const all=files(projectRoot);
  const roots=baseline?.source?.roots || ['.'];
  ensure(roots.every(r=>r==='.' || (!path.isAbsolute(r)&&!r.split('/').includes('..'))),'invalid registered source roots');
  const selected=all.filter(ref=>roots.some(r=>beneath(ref,r)));
  const outside=all.filter(ref=>!selected.includes(ref)&&ref.endsWith('.java'));
  if (outside.length) issues.push({id:'unregistered-source',reason:outside.join(', ')});
  const inventory=selected.map(ref=>({path:ref,mode:fs.statSync(coverageFile(projectRoot,ref)).mode,digest:coverageDigest(fs.readFileSync(coverageFile(projectRoot,ref)))}));
  const types=selected.filter(ref=>ref.endsWith('.java')).map(ref=>javaType(ref,fs.readFileSync(coverageFile(projectRoot,ref),'utf8')));
  for(const t of types) if(!t.declared.length || /\\u[0-9a-fA-F]{4}/.test(t.code)) issues.push({id:`unparsed:${t.ref}`,reason:'源码类型解析不足，须人工核实或编译态证据'});
  if(!types.some(t=>!t.ref.includes('/test/'))) issues.push({id:'zero-business-types',reason:'未发现业务类型，不能证明存量工程合规'});
  const httpNames=new Set(['RestController','Controller','RequestMapping','GetMapping','PostMapping','PutMapping','DeleteMapping','PatchMapping']);
  let changed=true;
  while(changed){changed=false;for(const t of types) if(!t.http&&(t.annotations.some(a=>httpNames.has(a))||t.parents.some(p=>httpNames.has(p)))){t.http=true;for(const name of t.declared)httpNames.add(name);changed=true;}}
  const localNames=new Set(types.flatMap(t=>t.declared));
  const familiar=new Set([...httpNames,'interface','Override','Deprecated','SuppressWarnings','FunctionalInterface','Serializable','Comparable','Exception','RuntimeException','Service','Repository','Mapper','Entity','TableName','Id','TableId','Autowired','Component','Configuration','Bean','Valid','Validated','NotNull','NotBlank','Size','Min','Max','Pattern','RequestBody','RequestParam','PathVariable','RequestHeader','CookieValue','ResponseBody','ResponseStatus','ExceptionHandler','ControllerAdvice','RestControllerAdvice','Transactional','Data','Getter','Setter','Builder','NoArgsConstructor','AllArgsConstructor','RequiredArgsConstructor','Slf4j','EqualsAndHashCode','ToString','JsonProperty','JsonIgnore','JsonCreator','Test']);
  const resolutions=responsibility_evidence.map(item=>({...binding(root,item),binding:item}));
  const units=baseline?.build_units || [];
  for(const t of types) {
    for(const u of units) for(const [role,refs] of Object.entries(u.role_paths||{})) if(refs.some(ref=>beneath(t.ref,ref))) t.roles.add(role);
    for(const a of contract?.backend?.first_slice?.artifacts||[]) if(a.path===t.ref)t.roles.add(a.role);
    if(t.http)t.roles.add('web');
    if(t.annotations.includes('Service'))t.roles.add('application');
    if(t.annotations.some(a=>['Repository','Entity','TableName'].includes(a))||(t.annotations.includes('Mapper')&&!/org\.mapstruct/.test(t.code))||/\b(?:JdbcTemplate|SqlSession|EntityManager|BaseMapper)\b/.test(t.code))t.roles.add('persistence');
    const unresolved=[...t.annotations,...t.parents].filter(n=>!localNames.has(n)&&!familiar.has(n));
    if((unresolved.length || (!t.roles.size && !/@\s*interface\b/.test(t.code))) && !t.ref.includes('/test/')) {
      const resolution=resolutions.find(r=>r.source_ref===t.ref);
      if(!resolution)t.uncertainty={id:`unresolved-responsibility:${t.ref}`,reason:unresolved.join(', ')||'type has no registered or observed responsibility'};
      else {
        ensure(resolution.source_digest===coverageDigest(fs.readFileSync(coverageFile(projectRoot,t.ref))) && typeof resolution.reason==='string' && resolution.reason.trim() && Array.isArray(resolution.roles) && resolution.roles.length && resolution.roles.every(r=>roleSkills[r]||r==='data'),'responsibility evidence stale or invalid');
        ensure(resolution.evidence_ref && resolution.evidence_digest && coverageDigest(fs.readFileSync(coverageFile(root,resolution.evidence_ref)))===resolution.evidence_digest,'responsibility verification evidence stale');
        resolution.roles.forEach(r=>t.roles.add(r));
        if(resolution.roles.some(r=>['web','server'].includes(r)))t.http=true;
      }
    }

  }
  let active=types, changedPaths=[];
  if(scope_kind==='change') {
    ensure(contract && comparison_ref,'change coverage needs approved contract and comparison_ref');
    ensure(/^[a-f0-9]{40}$/.test(comparison_ref),'comparison_ref must be an immutable commit');
    changedPaths=[...new Set([...git(projectRoot,['diff','--name-only',comparison_ref]).trim().split('\n'),...git(projectRoot,['ls-files','--others','--exclude-standard']).trim().split('\n')].filter(Boolean))];
    const affected=new Set(types.filter(t=>changedPaths.includes(t.ref)));
    // Source inventory is broad; semantic work is restricted to changed types and bidirectional dependency closure.
    let expanding=true;
    while(expanding){expanding=false;for(const t of types)if(!affected.has(t)&&[...affected].some(a=>uses(t,a)||uses(a,t))){affected.add(t);expanding=true;}}
    active=[...affected];
    if(changedPaths.some(p=>selected.includes(p)&&!p.endsWith('.java')&&!p.startsWith('.template-source/'))) active=types; // config/build changes can affect all types
  }
  issues.push(...active.flatMap(t=>t.uncertainty?[t.uncertainty]:[]));
  const tags=new Set(['always',...(scope_kind==='change'?['change']:[])]), reasons=new Map();
  const add=(skill,reason)=>{if(!reasons.has(skill))reasons.set(skill,new Set());reasons.get(skill).add(reason);};
  const declaredSkills=[...(contract?.resolution?.required_skills||[]),...(contract?.common?.required_skills||[]),...(contract?.backend?.required_skills||[])];
  for(const s of [...declaredSkills,...actual_skills])add(s,'contract-or-declared-impact');
  add('alibaba-java-code-style','backend-scope');
  for(const t of active.filter(t=>!t.ref.includes('/test/'))) {
    for(const role of t.roles)if(roleSkills[role])add(roleSkills[role],t.ref);
    if(t.http){tags.add('web');tags.add('wire');add('yss-dto',t.ref);}
    if(/\b(?:PageResult|PageQuery|CommandDTO|QueryDTO|SingleResult|MultiResult)\b/.test(t.code)){tags.add('wire');add('yss-dto',t.ref);}
    if(t.roles.has('domain')&&family==='domain-driven')tags.add('domain');
    if([...t.roles].some(r=>['application','service','core'].includes(r)))tags.add('application');
    if([...t.roles].some(r=>['repository','persistence','infrastructure'].includes(r)))tags.add('persistence');
    if(/\b(?:PageQuery|PageRequest|PageResult|IPage|PageHelper|pageIndex|pageSize)\b/.test(t.code))tags.add('pagination');
    if(/\b(?:insertBatch|saveBatch|updateBatch|executeBatch)\b/.test(t.code))tags.add('batch');
    for(const [regex,skill] of [[/\b(?:Valid|Validated|NotNull|NotBlank|Size)\b/,'yss-validation'],[/\b(?:ExceptionHandler|ControllerAdvice|RestControllerAdvice)\b/,'yss-exception'],[/\borg\.mapstruct\b/,'mapstruct'],[/\blombok\b/,'lombok']])if(regex.test(t.code))add(skill,t.ref);
  }
  for(const layer of contract?.backend?.affected_layers||[]) if(roleSkills[layer])add(roleSkills[layer],`affected-layer:${layer}`);
  const configPaths=(scope_kind==='baseline'?selected:selected.filter(p=>changedPaths.includes(p))).filter(p=>/\.(?:xml|ya?ml|properties|sql|json)$/.test(p));
  const runtimeText=[...active.map(t=>t.code),...configPaths.filter(p=>!p.endsWith('.java')).map(p=>fs.readFileSync(coverageFile(projectRoot,p),'utf8'))].join('\n');
  // Derive component ownership from the existing registry and the locked platform index.
  // These are discovery signals only; they never certify component compatibility.
  const discovery_sources=[];
  const registryRef='.template-spec/agents/yss-skill-registry.yaml';
  if(fs.existsSync(path.join(root,registryRef))) {
    const registryBytes=fs.readFileSync(coverageFile(root,registryRef));
    discovery_sources.push({ref:registryRef,digest:coverageDigest(registryBytes)});
    const registry=parseSliceYaml(registryBytes.toString());
    const line=identity?.platform_configuration?.component_platform_line;
    if(!['boot2-java8','boot3-java17'].includes(line))issues.push({id:'component-discovery-platform-unknown',reason:'组件发现需要已登记的平台源码索引，不跨平台借证据'});
    else for(const skill of [...new Set((registry.capabilities||[]).filter(c=>c.provider?.kind==='yss-component').map(c=>c.primary_skill))].sort()) {
      ensure(/^[a-z][a-z0-9-]*$/.test(skill),'invalid registered component skill');
      const ref=`.agents/skills/${skill}/references/source-index.${line}.md`;
      if(!fs.existsSync(path.join(root,ref))){issues.push({id:`component-index-missing:${skill}`,reason:ref});continue;}
      const source=fs.readFileSync(coverageFile(root,ref),'utf8');
      discovery_sources.push({ref,digest:coverageDigest(source)});
      const symbols=[...source.matchAll(/src\/main\/java\/([\w/$]+)\.java/g)].map(m=>m[1].replaceAll('/','.'));
      const gavs=[...source.matchAll(/GAV `([^:`]+):([^:`]+):[^`]+`/g)];
      const symbolHit=symbols.some(symbol=>runtimeText.includes(symbol) || runtimeText.includes(`import ${symbol.slice(0,symbol.lastIndexOf('.'))}.*`));
      const artifactHit=gavs.some(([,group,artifact])=>runtimeText.includes(`<groupId>${group}</groupId>`) && runtimeText.includes(`<artifactId>${artifact}</artifactId>`));
      if(symbolHit||artifactHit)add(skill,`registered-component-index:${ref}`);
    }
  }
  if(/org\.apache\.ibatis|com\.baomidou|mybatis|<mapper\b/i.test(runtimeText)){tags.add('mybatis');tags.add('persistence');add('yss-mybatis','source-or-build-binding');add('yss-repository','source-or-build-binding');}
  if(/\b(?:JdbcTemplate|EntityManager)\b|spring-boot-starter-data-jpa|<mapper\b/.test(runtimeText)){tags.add('persistence');add('yss-repository','source-or-build-binding');}
  for(const [skill,tag] of [['yss-web-controller','web'],['yss-dto','wire'],['yss-domain','domain'],['yss-application','application'],['yss-repository','persistence'],['yss-mybatis','mybatis']])if(reasons.has(skill))tags.add(tag);
  if(family==='layered-mvc'){tags.delete('domain');if(reasons.has('yss-domain'))issues.push({id:'mvc-domain-conflict',reason:'MVC 不应加载 DDD 专属技能，须回合同核对'});reasons.delete('yss-domain');}
  const observedSkills=[...reasons.keys()].sort();
  if(scope_kind==='change')for(const skill of observedSkills)if(skill!=='alibaba-java-code-style'&&!declaredSkills.includes(skill))issues.push({id:`undeclared-skill:${skill}`,reason:'actual impact exceeds contract; recompile before execution'});
  const constraints=[],rulesSources=[];
  const lock=path.join(root,'skills-lock.json');
  const skillLock=fs.existsSync(lock)?JSON.parse(fs.readFileSync(lock,'utf8')):null;
  if(!skillLock)issues.push({id:'skill-lock-missing',reason:'缺少锁定的 canonical Skill 来源；只读盘点不能声明规范已锁定'});
  const skillTrees={};
  for(const skill of observedSkills) {
    ensure(/^[a-z][a-z0-9-]*$/.test(skill),'invalid skill identifier');
    const skillRoot=path.join(root,'.agents/skills',skill);
    if(fs.existsSync(skillRoot)) {
      skillTrees[skill]=treeHash(skillRoot);
      if(skillLock?.skills?.shared?.[skill]?.effectiveHash!==skillTrees[skill])issues.push({id:`skill-lock-drift:${skill}`,reason:'技能正文、引用或源码索引与锁不一致'});
    }
  }
  for(const skill of observedSkills){const {rules,sourceDigests}=readRules(root,skill);rulesSources.push(...sourceDigests);for(const rule of rules){const applicability=tags.has(rule.when)?'required':(['pagination','batch'].includes(rule.when)?'conditional':'not-applicable');constraints.push({...rule,constraint_id:rule.id,applicability,applicability_basis:applicability==='required'?[...reasons.get(skill)].sort():[`no-observed-${rule.when}; reviewer must reconcile actual behavior`]});}}
  ensure(new Set(constraints.map(r=>r.constraint_id)).size===constraints.length,'duplicate canonical constraint_id');
  const platform=identity?.platform_configuration;
  const catalogRef='.template-spec/engineering/backend-platforms.json';
  const catalogPath=path.join(root,catalogRef);
  let platform_catalog_digest=null;
  if(platform?.profile_id && fs.existsSync(catalogPath)) {
    const bytes=fs.readFileSync(catalogPath);platform_catalog_digest=coverageDigest(bytes);
    const profile=JSON.parse(bytes).profiles.find(p=>p.id===platform.profile_id);
    if(!profile || profile.java_version!==platform.java_version || profile.spring_boot_version!==platform.spring_boot_version || profile.component_platform_line!==platform.component_platform_line)issues.push({id:'platform-identity-mismatch',reason:'登记精确平台与事实源不一致'});
    else if(types.some(t=>new RegExp(`\\bimport\\s+${profile.validation_namespace==='javax'?'jakarta':'javax'}\\.(?:validation|servlet)\\.`).test(t.code)))issues.push({id:'platform-namespace-mismatch',reason:'源码使用了目标平台之外的 Validation/Servlet 命名空间'});
  }
  const findings=[];
  for(const t of active) {
    const dependencies=types.filter(other=>other!==t&&uses(t,other));
    if([...t.roles].some(r=>['infrastructure','repository','persistence'].includes(r)) && dependencies.some(o=>[...o.roles].some(r=>['web','server'].includes(r))))findings.push({constraint_id:'repository.ownership',code_ref:t.ref,disposition:'violation',reason:'持久化层引用 Web 类型'});
    if(t.http && !t.annotations.some(a=>['ControllerAdvice','RestControllerAdvice'].includes(a)) && (dependencies.some(o=>[...o.roles].some(r=>['domain','repository','infrastructure','persistence'].includes(r)))||/\b(?:[A-Z]\w*(?:Gateway|Repository|Mapper)|JdbcTemplate|EntityManager)\b/.test(t.code)))findings.push({constraint_id:'web.use-case',code_ref:t.ref,disposition:'violation',reason:'HTTP 入口直接引用领域/持久化能力'});
    if(t.roles.has('domain')&&family==='domain-driven'&&/\bimport\s+(?:org\.springframework|org\.apache\.ibatis|com\.baomidou|jakarta\.persistence|javax\.persistence)\./.test(t.code))findings.push({constraint_id:'domain.dependencies',code_ref:t.ref,disposition:'violation',reason:'Domain 技术依赖泄漏'});
  }
  return {schema_version:1,scope_kind,architecture_identity:identity||null,basis: basis||null,comparison_ref,source_roots:roots,source_head:git(projectRoot,['rev-parse','HEAD']).trim(),changed_paths:changedPaths.sort(),inventory,reviewed_paths:active.map(t=>t.ref).sort(),skills:observedSkills.map(skill=>({skill,tree_digest:skillTrees[skill],reasons:[...reasons.get(skill)].sort()})),skill_assessments:CORE_SKILLS.map(skill=>({skill,status:observedSkills.includes(skill)?'applicable':'not-applicable',reason:observedSkills.includes(skill)?'observed-or-declared':'no matching registered responsibility or source signal'})),constraints:constraints.sort((a,b)=>a.constraint_id.localeCompare(b.constraint_id)),responsibility_evidence,discovery_sources,platform_catalog_digest,rule_sources:rulesSources.sort((a,b)=>a.ref.localeCompare(b.ref)),skill_lock_digest:fs.existsSync(lock)?coverageDigest(fs.readFileSync(lock)):null,issues,findings,limitations:['源码检查用于发现职责与明确反例，不替代编译态 ArchUnit、HTTP fixture 或 Reviewer 全文语义审查。']};
}

export function verifyCoverageRows(coverage, rows, {root,projectRoot}={}) {
  ensure(!coverage.issues.length,`coverage unresolved: ${coverage.issues.map(i=>i.id).join(', ')}`);
  ensure(!coverage.findings.length,`Standards violation: ${coverage.findings.map(i=>i.constraint_id).join(', ')}`);
  ensure(Array.isArray(rows),'constraint_results required');
  const standards=rows.filter(r=>r.axis==='Standards');
  ensure(new Set(standards.map(r=>r.constraint_id)).size===standards.length,'duplicate constraint result');
  for(const expected of coverage.constraints) {
    const row=standards.find(r=>r.constraint_id===expected.constraint_id);
    ensure(row,`constraint not reviewed: ${expected.constraint_id}`);
    ensure(row.skill===expected.skill && row.rule_ref===expected.rule_ref && row.rule_digest===expected.rule_digest,'constraint owner/rule mismatch');
    ensure(typeof row.constraint==='string'&&row.constraint.trim()&&Array.isArray(row.applicability_basis)&&coverageDigest(row.applicability_basis)===coverageDigest(expected.applicability_basis),'constraint applicability evidence required');
    ensure(['passed','not-applicable'].includes(row.status),`${expected.constraint_id}: unresolved violation`);
    if(row.status==='not-applicable')ensure(expected.applicability!=='required' && typeof row.reason==='string' && row.reason.trim(),`${expected.constraint_id}: applicable rule cannot be waived`);
    ensure(row.code_ref && row.evidence_ref && row.evidence_digest,'rule/code/evidence required');
    coverageFile(projectRoot,row.code_ref.split(':')[0]);
    ensure(coverageDigest(fs.readFileSync(coverageFile(root,row.evidence_ref)))===row.evidence_digest,'verification evidence stale');
    if(expected.evidence==='semantic-review')ensure(typeof row.review_notes==='string'&&row.review_notes.trim().length>=20,'full-text semantic review needs concrete reasoning');
  }
  const ids=new Set(coverage.constraints.map(r=>r.constraint_id));
  ensure(standards.every(r=>ids.has(r.constraint_id)),'unknown constraint result; update canonical declaration before asserting coverage');
}
