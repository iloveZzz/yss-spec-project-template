import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, cpSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { stringify } from '../../../../scripts/vendor/yaml.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const CLI = path.join(ROOT, '.template-source/plugins/yss-backend-delivery/plan.mjs');
const CONTRACT = '.agents/skills/yss-product-lifecycle/references/orchestration-contract.yaml';
const units = ['plan-opportunity', 'plan-requirements', 'domain-strategy-design', 'stage-decision',
  'spec-synthesis', 'prototype-design', 'technical-analysis', 'implementation-repository-preparation',
  'ticket-decomposition', 'slice-implementation', 'code-review'].map(x => `work-unit.${x}`);

function fixture(t) {
  const dir = mkdtempSync(path.join(tmpdir(), 'yss-plugin-m1-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const source = path.join(dir, 'source'), project = path.join(dir, 'project');
  function put(ref, value) {
    const file = path.join(source, ref);
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, typeof value === 'string' ? value : stringify(value));
  }
  const ids = ['yss-product-lifecycle', 'yss-prototype-stage', 'prototype-review', 'yss-domain', 'lombok', 'yss-ui'];
  const registry = { status: 'active', canonical_content_root: '.agents/skills',
    skills: ids.map(id => ({ id, maturity: 'supported', aliases: [] })),
    capabilities: [{ id: 'layer.domain', primary_skill: 'yss-domain' }],
    recipes: [{ id: 'backend.domain', capabilities: ['layer.domain'] }],
    skill_dependencies: { 'yss-prototype-stage': [{ skill: 'prototype-review', type: 'review-only' }],
      'yss-domain': [{ skill: 'lombok', type: 'context-conditional', when: 'pojo' }] },
  };
  const contract = { lifecycle_native_entries: { default_entry: 'yss-product-lifecycle', formal_artifact_owner: 'yss-product-lifecycle' },
    work_unit_routes: Object.fromEntries(units.map(id => [id, { primary_skill: 'yss-product-lifecycle', skills: [] }])) };
  contract.work_unit_routes['work-unit.prototype-design'].skills = ['yss-prototype-stage'];
  contract.work_unit_routes['work-unit.slice-implementation'].skills = ['yss-ui'];
  put('yss-project.yaml', { schema_version: 1, repository_mode: 'template-source' });
  put('docs/agents/yss-skill-registry.yaml', registry);
  put(CONTRACT, contract);
  put('docs/process/lifecycle-registry.yaml', { work_units: units.map(id => ({ id })) });
  put('docs/agents/digital-human-roles.yaml', { schema_version: 1 });
  put('docs/engineering/backend-platforms.json', JSON.stringify({ compatibility: [{ id: 'candidate', status: 'blocked' }] }));
  put('docs/process/schemas/contract.json', '{}');
  for (const id of ids) put(`.agents/skills/${id}/SKILL.md`, `---\nname: ${id}\n---\n`);
  put('CONTEXT.md', readFileSync(path.join(ROOT, 'CONTEXT.md'), 'utf8'));
  for (const ref of ['AGENTS.md', 'DESIGN.md']) put(ref, '# fixture\n');
  for (const family of ['plan', 'requirements', 'architecture', 'design', 'templates']) put(`docs/${family}/README.md`, '# fixture\n');
  put('scripts/tool.mjs', 'export const value = 1;\n');
  function clone() { cpSync(source, project, { recursive: true }); writeFileSync(path.join(project, 'yss-project.yaml'), 'schema_version: 1\nrepository_mode: project-instance\n'); }
  return { source, project, put, registry, contract, clone };
}

function run(source, args = ['plan']) {
  const result = spawnSync(process.execPath, [CLI, ...args, '--source-root', source], { encoding: 'utf8' });
  assert.equal(result.signal, null);
  return { code: result.status, data: JSON.parse(result.status === 0 ? result.stdout : result.stdout || result.stderr) };
}

test('planning includes prototype review and conditional backend dependencies without granting readiness', t => {
  const f = fixture(t), { code, data } = run(f.source);
  assert.equal(code, 0);
  assert.deepEqual(data.skills.map(s => s.id), ['lombok', 'prototype-review', 'yss-domain', 'yss-product-lifecycle', 'yss-prototype-stage']);
  assert.equal(data.ready_for_agent, false);
  assert.equal(data.installable, false);
  assert.equal(data.platform_status[0].status, 'blocked');
  assert.ok(data.omitted_frontend_routes.some(x => x.skill === 'yss-ui'));
  assert.ok(data.blockers.some(x => x.startsWith('M4:')));
  assert.deepEqual(run(f.source).data, data);
});

test('project check allows project-owned Context changes but blocks contract drift', t => {
  const f = fixture(t); f.clone();
  const context = path.join(f.project, 'CONTEXT.md');
  writeFileSync(context, readFileSync(context, 'utf8') + '\n本项目接入说明。\n');
  const args = ['check-project', '--project-root', f.project];
  assert.equal(run(f.source, args).data.result, 'binding-matched');
  writeFileSync(path.join(f.project, CONTRACT), 'changed: true\n');
  const result = run(f.source, args);
  assert.equal(result.code, 1);
  assert.ok(result.data.mismatches.some(x => x.ref === CONTRACT));
  assert.equal(result.data.ready_for_agent, false);
});

test('source change is detected even if the project keeps an older valid-looking contract', t => {
  const f = fixture(t); f.clone();
  f.put('docs/process/schemas/contract.json', '{"required":["evidence"]}');
  const result = run(f.source, ['check-project', '--project-root', f.project]);
  assert.equal(result.code, 1);
  assert.ok(result.data.mismatches.some(x => x.ref === 'docs/process/schemas/contract.json'));
});

test('a directory containing identical bytes cannot replace a bound project file', t => {
  const f = fixture(t); f.clone();
  const ref = '.agents/skills/lombok/SKILL.md', target = path.join(f.project, ref);
  const original = readFileSync(target);
  rmSync(target); mkdirSync(target); writeFileSync(path.join(target, 'copied.md'), original);
  const result = run(f.source, ['check-project', '--project-root', f.project]);
  assert.equal(result.code, 1);
  assert.ok(result.data.mismatches.some(x => x.ref === ref && x.reason === 'expected-regular-file'));
  assert.equal(result.data.ready_for_agent, false);
});

test('missing or retired dependencies fail closed at the public planning command', t => {
  const f = fixture(t);
  f.registry.skill_dependencies['yss-domain'].push({ skill: 'unregistered-skill', type: 'context-required' });
  f.put('docs/agents/yss-skill-registry.yaml', f.registry);
  assert.equal(run(f.source).code, 1);
  f.registry.skill_dependencies['yss-domain'].pop();
  f.registry.skills.find(s => s.id === 'lombok').maturity = 'deprecated';
  f.put('docs/agents/yss-skill-registry.yaml', f.registry);
  assert.equal(run(f.source).code, 1);
});

test('registered platform aliases stay explicit external prerequisites instead of copied canonical skills', t => {
  const f = fixture(t);
  f.registry.platform_skills = [{ id: 'product-design', root: '.codex/skills', aliases: ['product-design:index'] }];
  f.contract.work_unit_routes['work-unit.prototype-design'].skills.push('product-design:index');
  f.put('.codex/skills/product-design/skills/index/SKILL.md', '# platform fixture');
  f.put('docs/agents/yss-skill-registry.yaml', f.registry); f.put(CONTRACT, f.contract);
  const { code, data } = run(f.source);
  assert.equal(code, 0);
  assert.equal(data.platform_dependencies[0].status, 'external-provider-not-packaged');
  assert.equal(data.platform_dependencies[0].requested, 'product-design:index');
  assert.ok(!data.resources.files.some(item => item.ref.startsWith('.codex/')));
  assert.equal(data.installable, false);
});

test('unknown work units and replaced orchestrators cannot produce a plan', t => {
  const f = fixture(t);
  delete f.contract.work_unit_routes['work-unit.plan-requirements']; f.put(CONTRACT, f.contract);
  assert.equal(run(f.source).code, 1);
  f.contract.lifecycle_native_entries.default_entry = 'another-controller'; f.put(CONTRACT, f.contract);
  assert.match(run(f.source).data.error, /orchestrator-mismatch/);
});

test('missing and symlinked source resources cannot enter the inventory', t => {
  const f = fixture(t), skill = path.join(f.source, '.agents/skills/lombok/SKILL.md');
  rmSync(skill); assert.equal(run(f.source).code, 1);
  symlinkSync(path.join(f.source, 'CONTEXT.md'), skill);
  assert.match(run(f.source).data.error, /symlink-reference/);
});

test('template-source targets and invalid Context cannot pass project version checks', t => {
  const f = fixture(t);
  assert.match(run(f.source, ['check-project', '--project-root', f.source]).data.error, /project-identity-invalid/);
  f.clone(); writeFileSync(path.join(f.project, 'CONTEXT.md'), '# invalid context\n');
  assert.equal(run(f.source, ['check-project', '--project-root', f.project]).code, 1);
});
