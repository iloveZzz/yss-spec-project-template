import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { shipped } from '../scripts/lib/profile-distribution.mjs';

const root = path.resolve(import.meta.dirname, '..');
const policy = JSON.parse(fs.readFileSync(path.join(root, '.template-source/distribution/bundle-profile.json')));

function copiedDesignSkill(t) {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'yss standalone design '));
  t.after(() => fs.rmSync(temp, {recursive:true,force:true}));
  const skill = path.join(temp,'copied-skill'), project = path.join(temp,'target-project');
  fs.cpSync(path.join(root,'.agents/skills/yss-design-system'),skill,{recursive:true});
  fs.mkdirSync(project);
  return {skill,project,temp};
}

function exportDesignExamples(f, output) {
  return spawnSync(process.execPath,[path.join(f.skill,'scripts/export-craft-examples.mjs'),'--project-root',f.project,'--output',output],{cwd:f.project,encoding:'utf8'});
}

function assertStandaloneSkillLinks(skill, entry = 'SKILL.md') {
  const root = fs.realpathSync(skill), pending = [path.join(root, entry)], seen = new Set();
  while (pending.length) {
    const file = pending.pop();
    assert.ok(file.startsWith(root + path.sep), `引用超出技能目录: ${file}`);
    assert.ok(fs.existsSync(file), `缺少技能引用: ${file}`);
    const real = fs.realpathSync(file);
    assert.ok(real.startsWith(root + path.sep), `引用超出技能目录: ${file}`);
    if (seen.has(real) || !file.endsWith('.md')) continue;
    seen.add(real);
    for (const [, href] of fs.readFileSync(file, 'utf8').matchAll(/\]\(([^)]+)\)/g)) {
      if (/^(?:[a-z][a-z0-9+.-]*:|#)/i.test(href)) continue;
      const relative = href.split('#', 1)[0];
      if (relative) pending.push(path.resolve(path.dirname(file), relative));
    }
  }
}

test('独立复制的设计技能内部引用递归闭合并识别缺失文件', t => {
  const { skill } = copiedDesignSkill(t);
  assertStandaloneSkillLinks(skill);
  fs.renameSync(path.join(skill, 'references/high-fidelity-default-theme.md'), path.join(skill, 'theme-backup'));
  assert.throws(() => assertStandaloneSkillLinks(skill), /high-fidelity-default-theme\.md/);
});

test('仅复制技能时入口可读取且缺项目数据不创建示例', t => {
  const f=copiedDesignSkill(t), output=path.join(f.project,'examples');
  assert.equal(fs.existsSync(path.join(f.temp,'.agents')),false);
  assert.equal(fs.existsSync(path.join(f.temp,'scripts/vendor/yaml.mjs')),false);
  const entry=fs.readFileSync(path.join(f.skill,'SKILL.md'),'utf8');
  for (const [,ref] of entry.matchAll(/\]\(([^)]+)\)/g)) {
    if (!ref.includes('://')) assert.equal(fs.existsSync(path.resolve(f.skill,ref)),true,ref);
  }
  const result=exportDesignExamples(f,output);
  assert.notEqual(result.status,0);
  assert.match(result.stderr,/variables\.css/);
  assert.equal(fs.existsSync(output),false);
});

test('示例导出使用目标项目数据并拒绝覆盖已有输出', t => {
  const f=copiedDesignSkill(t), output=path.join(f.project,'examples');
  const tokens=path.join(f.project,'.template-spec/design/tokens');
  fs.mkdirSync(tokens,{recursive:true});
  fs.cpSync(path.join(root,'DESIGN.md'),path.join(f.project,'DESIGN.md'));
  fs.cpSync(path.join(root,'.template-spec/design/tokens/variables.css'),path.join(tokens,'variables.css'));
  const first=exportDesignExamples(f,output);
  assert.equal(first.status,0,first.stderr);
  assert.deepEqual(fs.readFileSync(path.join(output,'tokens.css')),fs.readFileSync(path.join(tokens,'variables.css')));
  assert.match(fs.readFileSync(path.join(output,'index.html'),'utf8'),/tokens\.css/);
  const provenance=JSON.parse(fs.readFileSync(path.join(output,'example-provenance.json'),'utf8'));
  assert.equal(provenance.design_source.ref,'DESIGN.md');
  fs.writeFileSync(path.join(output,'user-file.txt'),'保留');
  const second=exportDesignExamples(f,output);
  assert.notEqual(second.status,0);
  assert.match(second.stderr,/拒绝覆盖/);
  assert.equal(fs.readFileSync(path.join(output,'user-file.txt'),'utf8'),'保留');
});

function governedInstance(t, additionalSkills = []) {
  const instance = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'yss-spec-minimal-entry-')));
  t.after(() => fs.rmSync(instance, { recursive: true, force: true }));
  const cfg = policy.installations.governed;
  const skills = [...new Set([...cfg.skills, ...additionalSkills])];
  for (const ref of new Set([...cfg.files, ...skills.flatMap(skill => cfg.skillReferences[skill] ?? [])])) {
    const target = path.join(instance, ref);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(path.join(root, ref), target);
  }
  for (const skill of skills) {
    const ref = `.agents/skills/${skill}`;
    fs.mkdirSync(path.dirname(path.join(instance, ref)), { recursive: true });
    fs.cpSync(path.join(root, ref), path.join(instance, ref), { recursive: true });
  }
  for (const [target, source] of Object.entries(cfg.entries)) fs.copyFileSync(path.join(root, source), path.join(instance, target));
  return instance;
}

test('Spec governed 初始入口引用的政策可从 common 分发，模板源仍被排除', t => {
  const instance = fs.mkdtempSync(path.join(os.tmpdir(), 'yss-spec-initial-entry-'));
  t.after(() => fs.rmSync(instance, { recursive: true, force: true }));
  for (const ref of policy.common.files) {
    const source = path.join(root, ref);
    if (!shipped(ref, policy.manifest) || !fs.existsSync(source)) continue;
    const target = path.join(instance, ref);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(source, target);
  }
  const agents = fs.readFileSync(path.join(root, 'AGENTS.md'), 'utf8');
  const ref = '.template-spec/process/agent-entry-policy.md';
  assert.ok(agents.includes(`\`${ref}\``), '治理入口应实际引用政策文件');
  assert.ok(fs.existsSync(path.join(instance, ref)), '初始治理入口引用的政策必须随 common 可用');
  assert.ok(fs.statSync(path.join(instance, ref)).isFile());
  const entry = fs.readFileSync(path.join(instance, ref), 'utf8');
  const glossary = '.template-spec/process/process-glossary.md';
  assert.ok(entry.includes(`\`${glossary}\``), '入口应确实指向流程术语');
  assert.ok(fs.existsSync(path.join(instance, glossary)), '入口按需读取的流程术语必须可用');
  assert.equal(shipped('.template-source/process/maintenance-intensity.yaml', policy.manifest), true, 'skills 参考资料显式进入 Bundle');
  assert.equal(fs.existsSync(path.join(instance, '.template-source')), false);
});

test('新 Spec governed 初始安装不携带实现阶段，tracker 参考能从核心技能解析', t => {
  const instance = governedInstance(t);
  const cfg=policy.installations.governed;
  for(const ref of ['CONTEXT.md','.template-spec/process/lifecycle-registry.yaml','.template-spec/process/orchestration-contract.yaml','.agents/skills/implement','.agents/skills/code-review'])
    assert.equal(fs.existsSync(path.join(instance,ref)),false,ref);
  const entry=path.join(instance,'.agents/skills/to-spec/SKILL.md');
  const links=[...fs.readFileSync(entry,'utf8').matchAll(/\]\(([^)]+)\)/g)].map(x=>x[1]);
  assert.ok(links.length>0);
  for(const link of links) {
    const resolved=path.resolve(path.dirname(entry),link);
    assert.ok(resolved.startsWith(instance+path.sep));assert.ok(fs.statSync(resolved).isFile());
  }
  const config=JSON.parse(fs.readFileSync(path.join(instance,'.template-spec/process/spec-workflow.json')));
  assert.equal(config.specWorkflow,cfg.specWorkflow);
});

test('新 Spec 仅补装设计系统即可离线检查设计投影漂移', t => {
  const instance = governedInstance(t, ['yss-design-system']);
  assert.equal(fs.existsSync(path.join(instance, '.agents/skills/yss-prototype-stage')), false);
  assert.equal(fs.existsSync(path.join(instance, '.template-source/design/design-system-sync.yaml')), false);
  const result = spawnSync(process.execPath, ['.agents/skills/yss-design-system/scripts/design-md.mjs', 'drift'], { cwd: instance, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /无漂移/);
});

test('设计技能单独复制与补装均保留 yaml 上游 ISC 许可全文', t => {
  const sourceLicense = fs.readFileSync(path.join(root, '.template-source/cli-core/vendor/yaml.LICENSE'));
  const relative = 'scripts/vendor/yaml.LICENSE';
  const {skill} = copiedDesignSkill(t);
  assert.deepEqual(fs.readFileSync(path.join(skill, relative)), sourceLicense);
  for (const ref of ['LICENSE', 'THIRD-PARTY-NOTICES.md', relative]) {
    assert.ok(fs.existsSync(path.join(skill, ref)), ref);
    assert.ok(policy.installations.governed.skillReferences['yss-design-system'].includes(`.agents/skills/yss-design-system/${ref}`), ref);
  }
  const instance = governedInstance(t, ['yss-design-system']);
  assert.deepEqual(fs.readFileSync(path.join(instance, '.agents/skills/yss-design-system', relative)), sourceLicense);
  for (const ref of ['LICENSE', 'THIRD-PARTY-NOTICES.md']) {
    assert.deepEqual(fs.readFileSync(path.join(instance, '.agents/skills/yss-design-system', ref)), fs.readFileSync(path.join(skill, ref)));
  }
});

test('新 Spec 按需补装原型后可构建并校验 H1/H2，且拒绝覆盖已有原型', t => {
  const instance = governedInstance(t, ['yss-prototype-stage', 'yss-design-system']);
  const script = '.agents/skills/yss-prototype-stage/scripts/prototype-contract.mjs';
  const run = args => spawnSync(process.execPath, [script, ...args], { cwd: instance, encoding: 'utf8' });
  for (const [profile, command] of [['H1', 'prepare-static'], ['H2', 'prepare-flow']]) {
    const feature = `prototype-${profile.toLowerCase()}`;
    const target = path.join(instance, '.work', feature, 'design/prototypes');
    const args = [command, '--project-root', instance, '--root', target, '--feature', feature];
    const prepared = run(args);
    assert.equal(prepared.status, 0, prepared.stderr);
    const manifest = JSON.parse(prepared.stdout);
    assert.equal(manifest.prototype_profile, profile);
    assert.equal(manifest.component_basis, 'html-css-js');
    assert.ok(manifest.files['index.html']);
    const checked = run(['validate-project', '--project-root', instance, '--root', target, '--profile', profile]);
    assert.equal(checked.status, 0, checked.stderr);
    const occupied = run(args);
    assert.equal(occupied.status, 1);
    assert.match(occupied.stderr, /原型目录已存在内容/);
    assert.deepEqual(JSON.parse(fs.readFileSync(path.join(target, 'yss-prototype-adapter.json'))), manifest);
  }
  for (const ref of ['.template-spec/process/lifecycle-registry.yaml', '.template-spec/process/orchestration-contract.yaml'])
    assert.equal(fs.existsSync(path.join(instance, ref)), false, ref);
});

test('新 Spec 仅补装研究技能即可从有效证据导出竞品矩阵和报告', t => {
  const instance = governedInstance(t, ['yss-research']);
  const skill = '.agents/skills/yss-research';
  const data = JSON.parse(fs.readFileSync(path.join(instance, skill, 'assets/evidence-template.yaml')));
  data.scope = { topic: '固定资料 CSV 导出比较', audience: '产品负责人', time_horizon: '2026-10-30', research_questions: ['样本产品是否支持 CSV 导出？'], inclusion_criteria: ['固定测试资料'], exclusion_criteria: ['其他版本'] };
  data.ownership.downstream_owner = 'yss-product-lifecycle';
  for (const search of data.search_log) Object.assign(search, { channel: 'fixture-docs', query_or_corpus: 'CSV 导出及限制', searched_at: '2026-10-30' });
  Object.assign(data.evidence_items[0], { source_level: 'primary', source_class: 'official-docs', source_ref: 'fixture://alpha/csv', locator: 'CSV export', observed_at: '2026-10-30', evidence_date: '2026-10-30', observation: '固定样本支持 CSV 导出。', limitations: ['仅测试资料'] });
  Object.assign(data.claims[0], { claim_kind: 'business-constraint', statement: '固定样本支持 CSV 导出。' });
  data.competitive_analysis = {
    schema_version: 1, output_selection: 'both', as_of: '2026-10-30', comparison_scope: '固定测试资料，v1 Pro CN',
    competitors: [{ id: 'alpha', name: 'Fixture Alpha', type: 'direct', product: 'Alpha', version: '1', edition: 'Pro', region: 'CN' }],
    capabilities: [{ id: 'csv-export', module: '数据', name: 'CSV 导出', definition: '将数据导出为 CSV 文件', user_value: '下游复用数据' }],
    assessments: [{ competitor_id: 'alpha', capability_id: 'csv-export', status: 'supported', claim_refs: ['claim-001'], limitations: ['仅测试资料'], gap: null }],
    artifacts: { matrix: 'sample-competitive-matrix.md', report: 'sample-competitive-analysis.md' }
  };
  const evidence = path.join(instance, 'sample-evidence.yaml');
  const brief = path.join(instance, 'sample-research-brief.md');
  fs.writeFileSync(evidence, JSON.stringify(data));
  fs.writeFileSync(brief, ['Research Scope', 'Executive Read', 'Findings', 'Counter-Signals', 'Source Map', 'Decision Handoff', 'Evidence Limitations'].map(heading => `## ${heading}\n\nclaim-001\n`).join('\n'));
  const rendered = spawnSync(process.execPath, [`${skill}/scripts/render-competitive-outputs.mjs`, evidence], { cwd: instance, encoding: 'utf8' });
  assert.equal(rendered.status, 0, rendered.stderr);
  for (const filename of ['sample-competitive-matrix.md', 'sample-competitive-analysis.md']) {
    const content = fs.readFileSync(path.join(instance, filename), 'utf8');
    assert.match(content, /Fixture Alpha/);
    assert.match(content, /固定样本支持 CSV 导出。/);
    assert.match(content, /fixture:\/\/alpha\/csv/);
  }
  const checked = spawnSync(process.execPath, [`${skill}/scripts/validate-research-package.mjs`, brief, evidence], { cwd: instance, encoding: 'utf8' });
  assert.equal(checked.status, 0, checked.stderr);
  assert.match(checked.stdout, /research package valid/);
});

test('原型组件来源校验在独立技能中拒绝篡改和非法来源', t => {
  const f = copiedDesignSkill(t);
  const file = path.join(f.temp, 'download.vue');
  const manifestFile = path.join(f.temp, 'manifest.json');
  const entry = 'ui/button/Button.vue';
  const bytes = fs.readFileSync(path.join(root,'.agents/skills/yss-prototype-stage/assets/shadcn-vue-authoring',entry));
  const original=fs.readFileSync(path.join(f.skill,'assets/prototype/registry-manifest.json'));
  const manifest = () => JSON.parse(original.toString('utf8'));
  const run = (doc, key=entry, input=file) => {
    fs.writeFileSync(manifestFile,JSON.stringify(doc));
    return spawnSync(process.execPath,[path.join(f.skill,'scripts/verify-prototype-source.mjs'),'--manifest',manifestFile,'--entry',key,'--file',input],{encoding:'utf8'});
  };
  fs.writeFileSync(file,bytes);
  const ok=run(manifest());
  assert.equal(ok.status,0,ok.stderr);
  fs.writeFileSync(file,'tampered');
  assert.notEqual(run(manifest()).status,0);
  assert.equal(fs.readFileSync(file,'utf8'),'tampered');
  fs.writeFileSync(file,bytes);
  assert.notEqual(run(manifest(),'../button/Button.vue').status,0);
  assert.notEqual(run(manifest(),'ui/button/Missing.vue').status,0);
  assert.notEqual(run(manifest(),entry,path.join(f.temp,'missing')).status,0);
  const fake=manifest(); fake.components.find(x=>x.path===entry).source_url='https://example.com/Button.vue';
  assert.notEqual(run(fake).status,0);
  const changed=manifest(); changed.revision='0'.repeat(40);
  assert.notEqual(run(changed).status,0);
  assert.deepEqual(fs.readFileSync(file),bytes);
});

test('原型独立素材可从单独复制的技能读取并保留固定来源', t => {
  const f = copiedDesignSkill(t), asset=path.join(f.skill,'assets/prototype');
  for (const name of ['registry-manifest.json','SHADCN-LICENSE.txt','package.json','pnpm-lock.yaml','vite.config.ts']) assert.equal(fs.existsSync(path.join(asset,name)),true,name);
  assert.equal(fs.existsSync(path.join(f.skill,'scripts/verify-prototype-source.mjs')),true);
  assert.equal(fs.existsSync(path.join(f.temp,'.agents/skills/yss-prototype-stage')),false);
  const manifest=JSON.parse(fs.readFileSync(path.join(asset,'registry-manifest.json'),'utf8'));
  assert.equal(manifest.revision,'67c9a3926dc0a854507b325c6337ff2210d16379');
  assert.ok(manifest.components.some(item => item.path==='ui/button/Button.vue'));
  const pkg=JSON.parse(fs.readFileSync(path.join(asset,'package.json'),'utf8'));
  assert.equal(pkg.packageManager,'pnpm@10.32.1');
  assert.equal(pkg.dependencies.vue,'3.5.40');
  assert.equal(pkg.devDependencies.vite,'8.3.5');
  assert.equal(fs.existsSync(path.join(asset,'ui')),false);
});

test('来源校验拒绝替换清单以冒充固定上游内容', async t => {
  const {createHash} = await import('node:crypto');
  const f = copiedDesignSkill(t), entry='ui/button/Button.vue';
  const file=path.join(f.temp,'forged.vue'), override=path.join(f.temp,'forged.json');
  const doc=JSON.parse(fs.readFileSync(path.join(f.skill,'assets/prototype/registry-manifest.json'),'utf8'));
  const row=doc.components.find(c=>c.path===entry);
  fs.writeFileSync(file,'forged');
  row.digest='sha256:'+createHash('sha256').update('forged').digest('hex');
  fs.writeFileSync(override,JSON.stringify(doc));
  const check=spawnSync(process.execPath,[path.join(f.skill,'scripts/verify-prototype-source.mjs'),'--entry',entry,'--file',file,'--manifest',override],{encoding:'utf8'});
  assert.notEqual(check.status,0);
  assert.equal(fs.readFileSync(file,'utf8'),'forged');
});

test('原型构建解析上游跨组件别名', {skip: !process.env.YSS_DESIGN_PROTOTYPE_TOOLCHAIN}, t => {
  const f=copiedDesignSkill(t), project=f.project;
  const toolchain=fs.realpathSync(process.env.YSS_DESIGN_PROTOTYPE_TOOLCHAIN);
  const vite=path.join(toolchain,'node_modules/vite/bin/vite.js');
  const asset=path.join(f.skill,'assets/prototype/vite.config.ts');
  fs.writeFileSync(path.join(project,'package.json'),'{"type":"module"}');
  fs.writeFileSync(path.join(project,'index.html'),'<div id="app"></div><script type="module" src="/src/main.ts"></script>');
  fs.mkdirSync(path.join(project,'src/components/ui'),{recursive:true});
  fs.mkdirSync(path.join(project,'src/lib'),{recursive:true});
  fs.symlinkSync(path.join(toolchain,'node_modules'),path.join(project,'node_modules'),process.platform==='win32'?'junction':'dir');
  for (const group of ['field','label','separator']) {
    const source=path.join(root,'.agents/skills/yss-prototype-stage/assets/shadcn-vue-authoring/ui',group);
    for (const name of fs.readdirSync(source)) {
      const file=path.join(source,name);
      const checked=spawnSync(process.execPath,[path.join(f.skill,'scripts/verify-prototype-source.mjs'),'--entry',`ui/${group}/${name}`,'--file',file],{encoding:'utf8'});
      assert.equal(checked.status,0,checked.stderr);
    }
    fs.cpSync(source,path.join(project,'src/components/ui',group),{recursive:true});
  }
  fs.copyFileSync(path.join(root,'.agents/skills/yss-prototype-stage/assets/shadcn-vue-authoring/utils.ts'),path.join(project,'src/lib/utils.ts'));
  fs.writeFileSync(path.join(project,'src/main.ts'),"import { createApp } from 'vue'; import App from './App.vue'; createApp(App).mount('#app');");
  fs.writeFileSync(path.join(project,'src/App.vue'),'<script setup lang="ts">import { FieldSeparator } from "@/components/ui/field";</script><template><FieldSeparator>或者</FieldSeparator></template>');
  if (fs.existsSync(asset)) fs.copyFileSync(asset,path.join(project,'vite.config.ts'));
  else fs.writeFileSync(path.join(project,'vite.config.ts'),"import {defineConfig} from 'vite';import vue from '@vitejs/plugin-vue';import {fileURLToPath,URL} from 'node:url';export default defineConfig({plugins:[vue()],resolve:{alias:{'@':fileURLToPath(new URL('./src',import.meta.url))}}});");
  const result=spawnSync(process.execPath,[vite,'build',project],{cwd:project,encoding:'utf8'});
  assert.equal(result.status,0,result.stderr);
  assert.equal(fs.existsSync(path.join(project,'dist/index.html')),true);
});

test('原型组件清单提供常用交互控件的固定来源', t => {
  const {skill}=copiedDesignSkill(t);
  const m=JSON.parse(fs.readFileSync(path.join(skill,'assets/prototype/registry-manifest.json'),'utf8'));
  const expected={switch:['Switch.vue','index.ts'],accordion:['Accordion.vue','AccordionContent.vue','AccordionItem.vue','AccordionTrigger.vue','index.ts'],'radio-group':['RadioGroup.vue','RadioGroupItem.vue','index.ts'],slider:['Slider.vue','index.ts'],progress:['Progress.vue','index.ts'],avatar:['Avatar.vue','AvatarFallback.vue','AvatarImage.vue','index.ts'],collapsible:['Collapsible.vue','CollapsibleContent.vue','CollapsibleTrigger.vue','index.ts'],'scroll-area':['ScrollArea.vue','ScrollBar.vue','index.ts']};
  for (const [group,files] of Object.entries(expected)) {
    assert.ok(m.component_groups.includes(group),group);
    for (const name of files) {
      const entry=m.components.find(c=>c.path===`ui/${group}/${name}`);
      assert.ok(entry,`${group}/${name}`);
      assert.match(entry.digest,/^sha256:[a-f0-9]{64}$/);
      assert.equal(entry.source_url,`https://github.com/unovue/shadcn-vue/blob/${m.revision}/apps/v4/registry/new-york-v4/${entry.path}`);
    }
  }
});

test('新增上游开关和折叠组件固定摘要校验后可构建', {skip: !process.env.YSS_DESIGN_PROTOTYPE_TOOLCHAIN || !process.env.YSS_DESIGN_PROTOTYPE_EXPANDED}, t => {
  const f=copiedDesignSkill(t), project=f.project;
  const toolchain=fs.realpathSync(process.env.YSS_DESIGN_PROTOTYPE_TOOLCHAIN);
  const expanded=fs.realpathSync(process.env.YSS_DESIGN_PROTOTYPE_EXPANDED);
  fs.writeFileSync(path.join(project,'package.json'),'{"type":"module"}');
  fs.writeFileSync(path.join(project,'index.html'),'<div id="app"></div><script type="module" src="/src/main.ts"></script>');
  fs.mkdirSync(path.join(project,'src/components/ui'),{recursive:true});fs.mkdirSync(path.join(project,'src/lib'),{recursive:true});
  fs.symlinkSync(path.join(toolchain,'node_modules'),path.join(project,'node_modules'),process.platform==='win32'?'junction':'dir');
  for(const group of ['switch','accordion']) {
    const dest=path.join(project,'src/components/ui',group);fs.mkdirSync(dest);
    for(const name of fs.readdirSync(path.join(expanded,group))) {
      const src=path.join(expanded,group,name);
      const check=spawnSync(process.execPath,[path.join(f.skill,'scripts/verify-prototype-source.mjs'),'--entry',`ui/${group}/${name}`,'--file',src],{encoding:'utf8'});
      assert.equal(check.status,0,check.stderr);fs.copyFileSync(src,path.join(dest,name));
    }
  }
  fs.copyFileSync(path.join(root,'.agents/skills/yss-prototype-stage/assets/shadcn-vue-authoring/utils.ts'),path.join(project,'src/lib/utils.ts'));
  fs.copyFileSync(path.join(f.skill,'assets/prototype/vite.config.ts'),path.join(project,'vite.config.ts'));
  fs.writeFileSync(path.join(project,'src/main.ts'),"import { createApp } from 'vue'; import App from './App.vue'; createApp(App).mount('#app');");
  fs.writeFileSync(path.join(project,'src/App.vue'),'<script setup lang="ts">import { Switch } from "@/components/ui/switch"; import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";</script><template><Switch/><Accordion type="single"><AccordionItem value="a"><AccordionTrigger>A</AccordionTrigger><AccordionContent>B</AccordionContent></AccordionItem></Accordion></template>');
  const result=spawnSync(process.execPath,[path.join(toolchain,'node_modules/vite/bin/vite.js'),'build',project],{cwd:project,encoding:'utf8'});
  assert.equal(result.status,0,result.stderr);assert.equal(fs.existsSync(path.join(project,'dist/index.html')),true);
});
