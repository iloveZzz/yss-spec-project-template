import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { shipped } from '../scripts/lib/profile-distribution.mjs';

const root = path.resolve(import.meta.dirname, '..');
const policy = JSON.parse(fs.readFileSync(path.join(root, '.template-source/distribution/bundle-profile.json')));

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
