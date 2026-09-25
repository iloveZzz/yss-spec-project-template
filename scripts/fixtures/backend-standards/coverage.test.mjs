import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {compileStandardsCoverage,coverageDigest as sha,verifyCoverageRows,CORE_SKILLS} from '../../lib/backend-standards-coverage.mjs';
import {treeHash} from '../../lib/skill-supply-chain.mjs';
import {validateBackendReview} from '../../lib/backend-review.mjs';
import {validateNextRoute} from '../../lib/lifecycle-transition.mjs';

// Synthetic review actors validate the protocol only; they are not independent approvals.
function fixture(family='domain-driven',line='boot2-java8') {
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'yss-coverage-')),projectRoot=path.join(root,'project');fs.mkdirSync(projectRoot);
 const write=(ref,value)=>{const file=path.join(root,ref);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,typeof value==='string'?value:JSON.stringify(value,null,2)+'\n');return {ref,digest:sha(fs.readFileSync(file))};};
 const git=(...args)=>execFileSync('git',args,{cwd:projectRoot,encoding:'utf8'}).trim();
 git('init','-q');git('config','user.name','Fixture');git('config','user.email','fixture@example.invalid');
 write('project/pom.xml','<project><modelVersion>4.0.0</modelVersion><artifactId>fixture</artifactId></project>');
 write('project/src/main/java/transport/Endpoint.java','package transport; import org.springframework.web.bind.annotation.RestController; @RestController public class Endpoint { usecase.LoginUseCase service; public String login() { return service.login(); } }');
 write('project/src/main/java/usecase/LoginUseCase.java','package usecase; public class LoginUseCase { public String login() { return "ok"; } }');
 write('project/src/test/java/Behavior.java','package test; class Behavior {}');
 git('add','.');git('commit','-qm','synthetic baseline');
 const role_paths={web:['src/main/java/transport'],application:['src/main/java/usecase'],...(family==='domain-driven'?{domain:['src/main/java/model']}:{}),persistence:['src/main/java/store']};
 const baseline={architecture_identity:{architecture_family:family,architecture_profile:family==='domain-driven'?'existing-domain-driven-maven':'existing-layered-mvc-maven',platform_configuration:{component_platform_line:line,java_version:line==='boot2-java8'?8:17}},source:{roots:['.']},build_units:[{id:'business',role_paths}]};
 const baseline_binding=write('baseline.json',baseline);
 for(const skill of [...CORE_SKILLS,'alibaba-java-code-style','yss-validation','yss-exception','mapstruct','lombok']) {
  const src=new URL(`../../../.agents/skills/${skill}/SKILL.md`,import.meta.url);write(`.agents/skills/${skill}/SKILL.md`,fs.readFileSync(src,'utf8'));
 }
 write('skills-lock.json',{version:3,skills:{shared:Object.fromEntries([...CORE_SKILLS,'alibaba-java-code-style','yss-validation','yss-exception','mapstruct','lombok'].map(skill=>[skill,{effectiveHash:treeHash(path.join(root,'.agents/skills',skill))}]))}});
 const compile=(extra={})=>compileStandardsCoverage({root,projectRoot,baseline_binding,...extra});
 write('checks.log','Synthetic fixture: rule and protocol tests only, not Boot/JDK certification.');
 const rows=c=>c.constraints.map(r=>({axis:'Standards',skill:r.skill,constraint_id:r.constraint_id,constraint:'checked exact owning clause',status:r.applicability==='required'?'passed':'not-applicable',reason:'Fixture does not use conditional pagination/batch behavior',applicability_basis:r.applicability_basis,rule_ref:r.rule_ref,rule_digest:r.rule_digest,code_ref:'src/main/java/transport/Endpoint.java:1',evidence_ref:'checks.log',evidence_digest:sha(fs.readFileSync(path.join(root,'checks.log'))),review_notes:'Synthetic reviewer checked the applicable full text and fixture seams; not a real approval.'}));
 const state=c=>{
  write('coverage.json',c);const candidate=sha(c.inventory);
  const input={scope_kind:'baseline',project_root:projectRoot,baseline_binding,standards_coverage_ref:'coverage.json',standards_coverage_digest:sha(fs.readFileSync(path.join(root,'coverage.json'))),candidate_digest:candidate,implementation_actor_id:'fixture-implementer',implementation_instance_id:'fixture-worker'};
  const record={skill:'code-review',result:'completed',candidate_digest:candidate,axes:{Standards:'passed',Spec:'missing_evidence'},reviewer:{actor_id:'fixture-reviewer',instance_id:'fixture-reviewer-instance',runtime_id:'node-fixture'},implementer:{actor_id:'fixture-implementer',instance_id:'fixture-worker',runtime_id:'node-fixture'},constraint_results:rows(c),findings:[],verification_results:[{command:'node --test coverage.test.mjs (synthetic)',exit_code:0,executed_at:new Date().toISOString(),candidate_digest:candidate,evidence_ref:'checks.log',evidence_digest:sha(fs.readFileSync(path.join(root,'checks.log')))}]};
  write('review.json',record);return {review_input:input,review_result_ref:'review.json',record};
 };
 return {root,projectRoot,write,git,compile,rows,state,baseline,baseline_binding,cleanup:()=>fs.rmSync(root,{recursive:true,force:true})};
}
const run=(name,fn)=>test(name,()=>{const f=fixture();try{fn(f);}finally{f.cleanup();}});
run('registered component imports and Maven artifacts discover omitted auxiliary skills on their own platform',f=>{
 f.write('.template-spec/agents/yss-skill-registry.yaml',{capabilities:[{id:'component.cache',primary_skill:'yss-cache',provider:{kind:'yss-component'}}]});
 f.write('.agents/skills/yss-cache/SKILL.md','# Synthetic cache standard\nReview cache consistency.');
 const index='.agents/skills/yss-cache/references/source-index.boot2-java8.md';
 f.write(index,'- `component/src/main/java/com/yss/cloud/cache/CacheApi.java`\n- module — GAV `com.yss.cloud:cache-starter:2.0`\n');
 f.write('.agents/skills/yss-cache/references/source-index.boot3-java17.md','- `component/src/main/java/com/yss/cloud/cache/FutureApi.java`\n');
 const lock=JSON.parse(fs.readFileSync(path.join(f.root,'skills-lock.json')));lock.skills.shared['yss-cache']={effectiveHash:treeHash(path.join(f.root,'.agents/skills/yss-cache'))};f.write('skills-lock.json',lock);
 f.write('project/src/main/java/usecase/LoginUseCase.java','package usecase; import com.yss.cloud.cache.CacheApi; public class LoginUseCase { CacheApi cache; }');
 const c=f.compile();assert(c.skills.some(s=>s.skill==='yss-cache'));assert(c.constraints.some(r=>r.constraint_id==='yss-cache.full-text'));assert(c.discovery_sources.some(s=>s.ref===index));
 const contract={resolution:{architecture_identity:f.baseline.architecture_identity,required_skills:[]},backend:{affected_layers:[]}};
 assert(f.compile({scope_kind:'change',contract,comparison_ref:f.git('rev-parse','HEAD')}).issues.some(i=>i.id==='undeclared-skill:yss-cache'));
 f.write('project/src/main/java/usecase/LoginUseCase.java','package usecase; import com.yss.cloud.cache.FutureApi; public class LoginUseCase { FutureApi cache; }');
 assert(!f.compile().skills.some(s=>s.skill==='yss-cache'),'Java 8 must not borrow the Java 17 source index');
 f.write('project/pom.xml','<project><dependencies><dependency><groupId>com.yss.cloud</groupId><artifactId>cache-starter</artifactId></dependency></dependencies></project>');
 assert(f.compile().skills.some(s=>s.skill==='yss-cache'));
});
run('HTTP and DTO are discovered without reported skill impacts',f=>{
 const c=f.compile();assert(c.skills.some(s=>s.skill==='yss-web-controller'));assert(c.skills.some(s=>s.skill==='yss-dto'));
 const contract={resolution:{architecture_identity:f.baseline.architecture_identity,required_skills:[]},backend:{affected_layers:[]}};
 f.write('project/src/main/java/transport/Endpoint.java','package transport; @RestController class Endpoint { String respond(){return "ok";} }');
 const drift=f.compile({scope_kind:'change',contract,comparison_ref:f.git('rev-parse','HEAD')});assert(drift.issues.some(i=>i.id==='undeclared-skill:yss-dto'));
});
run('renamed controller, annotated interface and local composed annotation stay in coverage',f=>{
 f.write('project/src/main/java/elsewhere/Api.java','package elsewhere; interface Api { @GetMapping String data(); }');
 f.write('project/src/main/java/elsewhere/Adapter.java','package elsewhere; class Adapter implements Api { public String data(){return "ok";} }');
 f.write('project/src/main/java/elsewhere/Protocol.java','package elsewhere; @RestController @interface Protocol {}');
 f.write('project/src/main/java/elsewhere/Other.java','package elsewhere; @Protocol class Other {}');
 const reasons=f.compile().skills.find(s=>s.skill==='yss-web-controller').reasons;
 for(const name of ['Api','Adapter','Other'])assert(reasons.includes(`src/main/java/elsewhere/${name}.java`));
});
run('missing one rule and duplicate rows cannot masquerade as complete skill review',f=>{
 const c=f.compile(),rows=f.rows(c);const removed=rows.findIndex(r=>r.constraint_id==='web.wire');assert(removed>=0);rows.splice(removed,1);
 assert.throws(()=>verifyCoverageRows(c,rows,f),/constraint not reviewed/);
 rows.push(rows[0]);assert.throws(()=>verifyCoverageRows(c,rows,f),/duplicate/);
});
run('rule-level N/A is allowed for absent pagination, never for the required use-case boundary',f=>{
 const c=f.compile(),rows=f.rows(c);assert.equal(rows.find(r=>r.constraint_id==='web.pagination').status,'not-applicable');verifyCoverageRows(c,rows,f);
 rows.find(r=>r.constraint_id==='web.use-case').status='not-applicable';assert.throws(()=>verifyCoverageRows(c,rows,f),/cannot be waived/);
});
run('missing semantics, stale rule and evidence cannot pass',f=>{
 const c=f.compile(),rows=f.rows(c);rows.find(r=>r.constraint_id.endsWith('.full-text')).review_notes='通过';assert.throws(()=>verifyCoverageRows(c,rows,f),/concrete reasoning/);
 const state=f.state(c);f.write('.agents/skills/yss-dto/SKILL.md','# changed');assert.throws(()=>validateBackendReview(state,{root:f.root}),/coverage stale/);
});
run('baseline can be clean and lacks business Spec but never authorizes implementation',f=>{
 const state=f.state(f.compile());const result=validateBackendReview(state,{root:f.root});assert.equal(result.status,'audited');assert.equal(result.axes.Spec,'missing_evidence');assert.equal(result.execution_allowed,false);
 assert.equal(validateNextRoute('work-unit.code-review','work-unit.release-and-retrospective',state,{root:f.root}).result,'blocked');
 state.record.axes.Spec='passed';f.write('review.json',state.record);assert.throws(()=>validateBackendReview(state,{root:f.root}),/Spec evidence binding/);
});
run('baseline evidence binds current code and filesystem modes',f=>{
 const state=f.state(f.compile());fs.chmodSync(path.join(f.projectRoot,'src/main/java/transport/Endpoint.java'),0o755);assert.throws(()=>validateBackendReview(state,{root:f.root}),/coverage stale/);
});
for(const family of ['domain-driven','layered-mvc'])test(`${family}: discover violation → remediation → fresh independent protocol → full reconciliation`,()=>{
 const f=fixture(family);try{
  const action=family==='domain-driven'?'login':'query';
  f.write('project/src/main/java/store/AccountRepository.java','package store; public class AccountRepository { public String load(){return "ok";} }');
  f.write('project/src/main/java/transport/Endpoint.java','package transport; @RestController public class Endpoint { store.AccountRepository repo; public String login(){return repo.load();} }'.replaceAll('login',action));
  const before=f.compile();assert(before.findings.some(x=>x.constraint_id==='web.use-case'));assert.throws(()=>verifyCoverageRows(before,f.rows(before),f),/Standards violation/);
  const unit={finding:'web.use-case',seam:`${action} returns ok`,allowed_write_paths:['src/main/java/transport/Endpoint.java','src/main/java/usecase/LoginUseCase.java'],authorization:'synthetic fixture only'};
  assert.equal(unit.allowed_write_paths.length,2);
  f.write('project/src/main/java/transport/Endpoint.java','package transport; @RestController public class Endpoint { usecase.LoginUseCase service; public String login(){return service.login();} }'.replaceAll('login',action));
  f.write('project/src/main/java/usecase/LoginUseCase.java','package usecase; public class LoginUseCase { store.AccountRepository repo; public String login(){return repo.load();} }'.replaceAll('login',action));
  if(family==='domain-driven') {
   f.write('project/src/main/java/model/Account.java','package model; import org.springframework.stereotype.Component; class Account {}');
   assert(f.compile().findings.some(x=>x.constraint_id==='domain.dependencies'));
   f.write('project/src/main/java/model/Account.java','package model; class Account { private final String name; Account(String name){if(name==null)throw new IllegalArgumentException();this.name=name;} }');
  }
  const after=f.compile();assert.equal(after.findings.length,0);const state=f.state(after);assert.equal(validateBackendReview(state,{root:f.root}).status,'audited');
  assert.equal(after.skills.some(s=>s.skill==='yss-domain'),family==='domain-driven');assert(!after.skills.some(s=>s.skill==='yss-mybatis'));assert(after.inventory.some(i=>i.path.includes('src/test/')));
 }finally{f.cleanup();}
});
for(const line of ['boot2-java8','boot3-java17'])test(`keeps registered ${line}, manual streaming endpoints need no CRUD metadata`,()=>{
 const f=fixture('layered-mvc',line);try{f.write('project/src/main/java/transport/Endpoint.java','package transport; @RestController class Endpoint { java.io.InputStream download(){return null;} }');const c=f.compile();assert.equal(c.architecture_identity.platform_configuration.component_platform_line,line);assert(!c.skills.some(s=>s.skill==='yss-domain'));assert.equal(validateBackendReview(f.state(c),{root:f.root}).status,'audited');}finally{f.cleanup();}
});
run('MyBatis from mapper XML is detected without Java Mapper naming',f=>{f.write('project/src/main/resources/sql/data.xml','<mapper namespace="store.Data"><select id="lookup">SELECT 1</select></mapper>');assert(f.compile().skills.some(s=>s.skill==='yss-mybatis'));});
run('empty or unparsed business scope cannot claim conformance',f=>{fs.rmSync(path.join(f.projectRoot,'src/main'),{recursive:true});const c=f.compile();assert(c.issues.some(i=>i.id==='zero-business-types'));assert.throws(()=>verifyCoverageRows(c,f.rows(c),f),/coverage unresolved/);});
run('unknown external annotation requires source-bound responsibility evidence',f=>{
 f.write('project/src/main/java/transport/Endpoint.java','package transport; @ExternalRoute class Endpoint { String call(){return "ok";} }');
 assert(f.compile().issues.some(i=>i.id.startsWith('unresolved-responsibility:')));
 const resolution=f.write('responsibility.json',{source_ref:'src/main/java/transport/Endpoint.java',source_digest:sha(fs.readFileSync(path.join(f.projectRoot,'src/main/java/transport/Endpoint.java'))),roles:['web'],reason:'Synthetic external annotation bytecode observation classifies this as HTTP',evidence_ref:'checks.log',evidence_digest:sha(fs.readFileSync(path.join(f.root,'checks.log')))});
 const c=f.compile({responsibility_evidence:[resolution]});assert.equal(c.issues.length,0);assert(c.skills.some(s=>s.skill==='yss-dto'));
 f.write('project/src/main/java/transport/Endpoint.java','package transport; @ExternalRoute class Endpoint { String changed(){return "ok";} }');assert.throws(()=>f.compile({responsibility_evidence:[resolution]}),/responsibility evidence stale/);
});
run('exact registered platform rejects wrong Validation namespace without upgrading JDK',f=>{
 const catalog=JSON.parse(fs.readFileSync(new URL('../../../.template-spec/engineering/backend-platforms.json',import.meta.url),'utf8'));
 f.write('.template-spec/engineering/backend-platforms.json',catalog);
 const p=catalog.profiles.find(p=>p.component_platform_line==='boot2-java8');
 f.baseline.architecture_identity.platform_configuration={profile_id:p.id,java_version:p.java_version,spring_boot_version:p.spring_boot_version,component_platform_line:p.component_platform_line};
 const b=f.write('exact-baseline.json',f.baseline);
 f.write('project/src/main/java/transport/Endpoint.java','package transport; import jakarta.validation.Valid; @RestController class Endpoint {}');
 const c=f.compile({baseline_binding:b});assert(c.issues.some(i=>i.id==='platform-namespace-mismatch'));assert.equal(c.architecture_identity.platform_configuration.java_version,8);
});
run('comment and string type names are not architecture dependencies',f=>{
 f.write('project/src/main/java/transport/Endpoint.java','package transport; @RestController class Endpoint { String text(){return "AccountRepository";} /* AccountGateway */ }');assert.equal(f.compile().findings.length,0);
});
run('persistence cannot import Web DTO even when behavioral assertions are green',f=>{
 f.write('project/src/main/java/store/Storage.java','package store; class Storage { transport.Endpoint web; }');assert(f.compile().findings.some(i=>i.constraint_id==='repository.ownership'));
});
run('CLI compilation is read-only and can audit without a Slice or scaffold manifest',f=>{
 const input=f.write('input.json',{review_input:{scope_kind:'baseline',project_root:f.projectRoot,baseline_binding:f.baseline_binding}});
 const before=f.git('status','--porcelain');
 const output=execFileSync(process.execPath,[new URL('../../backend-standards-coverage',import.meta.url).pathname,'--root',f.root,'--input',path.join(f.root,input.ref)],{encoding:'utf8'});
 assert.equal(JSON.parse(output).scope_kind,'baseline');assert.equal(f.git('status','--porcelain'),before);
});
run('unclassified existing type is a coverage gap, not an automatic N/A',f=>{
 f.write('project/src/main/java/unknown/Thing.java','package unknown; class Thing { int value; }');
 assert(f.compile().issues.some(i=>i.id==='unresolved-responsibility:src/main/java/unknown/Thing.java'));
});
run('changed source index or wire profile invalidates the locked skill even when SKILL.md is unchanged',f=>{
 const before=f.state(f.compile());
 f.write('.agents/skills/yss-dto/references/openapi-wire-profile.yaml','version: changed\n');
 assert(f.compile().issues.some(i=>i.id==='skill-lock-drift:yss-dto'));
 assert.throws(()=>validateBackendReview(before,{root:f.root}),/coverage stale/);
});
