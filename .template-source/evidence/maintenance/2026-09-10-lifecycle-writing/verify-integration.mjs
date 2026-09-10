// Maintenance check: validates integration and preserves workflow semantics, not prose quality.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

const read = ref => readFileSync(ref, 'utf8');
const guideline = 'docs/process/document-writing.md';
const examples = 'docs/templates/examples/lifecycle-writing-examples.md';
const templates = ['docs/plan/templates/plan-template.md', 'docs/templates/spec-template.md', 'docs/templates/vertical-slice-ticket-template.md'];
const skills = ['yss-product-lifecycle', 'yss-research', 'yss-stage-decision', 'yss-prototype-stage', 'yss-technical-design', 'yss-openapi-governance', 'yss-implementation-contract-compiler', 'code-review'];
const projection = JSON.parse(execFileSync('scripts/query-lifecycle-context', ['--include', 'document_writing'], {encoding: 'utf8'}));
assert.equal(projection.execution.selected.document_writing.reference, guideline);
assert.equal(projection.execution.selected.document_writing.artifact_ownership, 'unchanged');
assert.equal(projection.execution.selected.document_writing.gate_and_status_semantics, 'unchanged');
assert.ok(projection.references.includes(examples));
for (const skill of skills) assert.ok(read(`.agents/skills/${skill}/SKILL.md`).includes(guideline), `${skill}: missing writing input`);
assert.ok(Buffer.byteLength(read('.agents/skills/yss-product-lifecycle/SKILL.md')) <= 8192);

const slug = text => text.toLowerCase().replace(/[^\p{L}\p{N}\s_-]/gu, '').replace(/ /g, '-');
for (const ref of [guideline, examples, ...templates]) {
  const text = read(ref);
  assert.ok(!text.includes('.template-source/'), `${ref}: instance references maintenance-only data`);
  for (const match of text.matchAll(/\]\(([^)]+)\)/g)) {
    if (match[1].includes('://')) continue;
    const [target, fragment] = match[1].split('#');
    const linked = read(target ? path.resolve(path.dirname(ref), target) : ref);
    if (fragment) {
      const headings = [...linked.matchAll(/^#+ (.+)$/gm)].map(m => slug(m[1]));
      assert.ok(headings.includes(fragment), `${ref}: missing anchor ${match[1]}`);
    }
  }
}
const ticket = read(templates[2]);
assert.match(ticket, /^---\nstatus: ready-for-human\n---/);
assert.ok(!ticket.includes('无，可立即开始'));
assert.ok(!/^`ready-for-agent`$/m.test(ticket));
assert.ok(!/^Status:/m.test(ticket));
for (const ref of ['CONTEXT.md', 'docs/process/lifecycle-registry.yaml', 'docs/agents/digital-human-roles.yaml']) {
  assert.equal(read(ref), execFileSync('git', ['show', `HEAD:${ref}`], {encoding: 'utf8'}), `${ref}: unexpected workflow change`);
}

// Local manifest eligibility only; this does not verify an external CLI release snapshot.
const manifest = JSON.parse(read('submodules/create-yss-spec/template.manifest.json'));
const selected = ref => {
  const top = ref.split('/')[0];
  return ((manifest.allowRootEntries || []).includes(top) || (manifest.allowRootFiles || []).includes(ref) || (manifest.allowFiles || []).includes(ref))
    && ![...(manifest.excludeRootEntries || []), ...(manifest.initExcludeRootEntries || [])].includes(top)
    && ![...(manifest.excludeRootFiles || []), ...(manifest.initExcludeRootFiles || [])].includes(ref)
    && ![...(manifest.excludePaths || []), ...(manifest.initExcludePaths || [])].some(p => ref === p || ref.startsWith(p + '/'));
};
for (const ref of [guideline, examples, ...templates]) assert.ok(selected(ref), `${ref}: not eligible for instance distribution`);
assert.ok(!selected('.template-source/evidence/maintenance/2026-09-10-lifecycle-writing/writing-guideline-draft.md'));
console.log('PASS: lifecycle query, 8 skill inputs, entry budget, links/anchors, single Ticket status, unchanged gate/role/glossary facts, local manifest eligibility.');
