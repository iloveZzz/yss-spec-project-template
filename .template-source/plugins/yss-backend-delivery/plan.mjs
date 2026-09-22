#!/usr/bin/env node
// M1 read-only preparation. This tool never grants workflow or implementation readiness.
import identity from './identity.json' with { type: 'json' };
import { createHash } from 'node:crypto';
import { lstatSync, readFileSync, readdirSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { parseDocument } from '../../../scripts/vendor/yaml.mjs';
import { resolveSkillForNewUse } from '../../../scripts/lib/skill-registry.mjs';
import { parseContextContract } from '../../../scripts/lib/context-contract.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const REGISTRY = 'docs/agents/yss-skill-registry.yaml';
const CONTRACT = '.agents/skills/yss-product-lifecycle/references/orchestration-contract.yaml';
const UNITS = [
  'plan-opportunity', 'plan-requirements', 'domain-strategy-design', 'stage-decision',
  'spec-synthesis', 'prototype-design', 'technical-analysis',
  'implementation-repository-preparation', 'ticket-decomposition', 'slice-implementation', 'code-review',
].map(id => `work-unit.${id}`);
// These omissions are packaging proposals, never runtime routing exemptions.
const FRONTEND_IMPLEMENTATION = new Set([
  'yss-ui', 'yss-ui-business-page-generation', 'yss-frontend-scaffold-generator',
]);
const RESOURCE_FAMILIES = [
  'docs/agents', 'docs/plan', 'docs/requirements', 'docs/architecture', 'docs/design',
  'docs/engineering', 'docs/process', 'docs/templates', 'scripts',
];
const AUTHORITY = ['AGENTS.md', 'CONTEXT.md', 'DESIGN.md', REGISTRY,
  'docs/process/lifecycle-registry.yaml', 'docs/agents/digital-human-roles.yaml', CONTRACT];
const digest = bytes => `sha256:${createHash('sha256').update(bytes).digest('hex')}`;

function safe(root, ref) {
  if (typeof ref !== 'string' || !ref || path.posix.isAbsolute(ref) || /[\\\x00-\x1f]/u.test(ref)
      || ref.split('/').some(part => !part || part === '.' || part === '..')) {
    throw new Error(`unsafe-reference: ${ref}`);
  }
  let current = root;
  for (const part of ref.split('/')) {
    current = path.join(current, part);
    if (lstatSync(current).isSymbolicLink()) throw new Error(`symlink-reference: ${ref}`);
  }
  return current;
}

function yaml(root, ref) {
  const doc = parseDocument(readFileSync(safe(root, ref), 'utf8'), { uniqueKeys: true });
  if (doc.errors.length) throw new Error(`invalid-yaml: ${ref}: ${doc.errors[0].message}`);
  return doc.toJS({ maxAliasCount: 0 });
}

function inventory(root, refs) {
  const files = new Map();
  function visit(ref) {
    const file = safe(root, ref), stat = lstatSync(file);
    if (stat.isDirectory()) {
      for (const entry of readdirSync(file).sort()) {
        if (['.git', 'node_modules', '__pycache__', '.DS_Store'].includes(entry)) continue;
        visit(`${ref}/${entry}`);
      }
    } else if (stat.isFile()) {
      files.set(ref, { ref, sha256: digest(readFileSync(file)), executable: Boolean(stat.mode & 0o111) });
    } else throw new Error(`unsupported-file: ${ref}`);
  }
  refs.forEach(visit);
  return [...files.values()].sort((a, b) => a.ref < b.ref ? -1 : a.ref > b.ref ? 1 : 0);
}

function uniqueIndex(items, label) {
  if (!Array.isArray(items)) throw new Error(`invalid-${label}`);
  const result = new Map();
  for (const item of items) {
    if (!item?.id || result.has(item.id)) throw new Error(`duplicate-or-missing-${label}: ${item?.id}`);
    result.set(item.id, item);
  }
  return result;
}

export function planPlugin(sourceRoot = ROOT) {
  const root = realpathSync(sourceRoot);
  const identity = yaml(root, 'yss-project.yaml');
  if (identity.schema_version !== 1 || identity.repository_mode !== 'template-source') {
    throw new Error('source-identity-invalid: expected template-source schema 1');
  }
  const registry = yaml(root, REGISTRY), contract = yaml(root, CONTRACT);
  if (registry.status !== 'active' || registry.canonical_content_root !== '.agents/skills') {
    throw new Error('skill-registry-invalid');
  }
  if (contract.lifecycle_native_entries?.default_entry !== 'yss-product-lifecycle'
      || contract.lifecycle_native_entries?.formal_artifact_owner !== 'yss-product-lifecycle') {
    throw new Error('orchestrator-mismatch');
  }
  const skills = uniqueIndex(registry.skills, 'skill');
  const capabilities = uniqueIndex(registry.capabilities, 'capability');
  const lifecycle = yaml(root, 'docs/process/lifecycle-registry.yaml');
  const workUnits = uniqueIndex(lifecycle.work_units, 'work-unit');
  const selected = new Map(), edges = [], omitted = [], recipeIds = [], platformDependencies = new Map();
  const add = (requested, reason) => {
    const providers = (registry.platform_skills || []).filter(item => item.id === requested || item.aliases?.includes(requested));
    if (providers.length > 1) throw new Error(`ambiguous-platform-skill: ${requested}`);
    if (providers.length) {
      if (skills.has(requested) || [...skills.values()].some(item => item.aliases?.includes(requested))) throw new Error(`ambiguous-platform-skill: ${requested}`);
      const provider = providers[0];
      safe(root, `${provider.root}/${provider.id}`);
      platformDependencies.set(requested, { requested, provider: provider.id, root: provider.root,
        status: 'external-provider-not-packaged', reason });
      return;
    }
    const skill = resolveSkillForNewUse(registry, requested);
    if (!skills.has(skill.id)) throw new Error(`external-skill-requires-adapter: ${requested}`);
    if (FRONTEND_IMPLEMENTATION.has(skill.id)) {
      omitted.push({ skill: skill.id, reason });
      return;
    }
    if (!selected.has(skill.id)) selected.set(skill.id, { id: skill.id, maturity: skill.maturity, reasons: [] });
    if (!selected.get(skill.id).reasons.includes(reason)) selected.get(skill.id).reasons.push(reason);
  };
  add('yss-product-lifecycle', 'unique-orchestrator');
  for (const id of UNITS) {
    if (!workUnits.has(id) || !contract.work_unit_routes?.[id]) throw new Error(`work-unit-missing: ${id}`);
    const route = contract.work_unit_routes[id];
    const refs = [route.primary_skill, route.native?.skill, ...(route.skills || []), ...(route.supporting_skills || [])].filter(Boolean);
    refs.forEach(skill => add(skill, id));
  }
  for (const recipe of registry.recipes || []) {
    if (!recipe.id.startsWith('backend.') || recipe.maturity === 'deprecated') continue;
    recipeIds.push(recipe.id);
    for (const id of recipe.capabilities) {
      const capability = capabilities.get(id);
      if (!capability) throw new Error(`capability-missing: ${id}`);
      add(capability.primary_skill, `recipe:${recipe.id}`);
    }
  }
  // All typed edges are included for distribution; this is not runtime context expansion.
  const visited = new Set();
  for (const id of selected.keys()) {
    if (visited.has(id)) continue;
    visited.add(id);
    for (const edge of registry.skill_dependencies?.[id] || []) {
      add(edge.skill, `dependency:${id}:${edge.type}`);
      edges.push({ from: id, ...edge });
    }
  }
  const skillList = [...selected.values()].sort((a, b) => a.id.localeCompare(b.id));
  const skillRoots = skillList.map(item => `.agents/skills/${item.id}`);
  for (const ref of skillRoots) safe(root, `${ref}/SKILL.md`);
  const authorityFiles = inventory(root, [REGISTRY, CONTRACT, 'docs/process/lifecycle-registry.yaml',
    'docs/agents/digital-human-roles.yaml', 'docs/process/schemas']);
  // Project-owned Context, AGENTS and DESIGN are not source-equality requirements.
  const skillFiles = inventory(root, skillRoots);
  const bindingFiles = [...new Map([...authorityFiles, ...skillFiles].map(file => [file.ref, file])).values()]
    .sort((a, b) => a.ref < b.ref ? -1 : a.ref > b.ref ? 1 : 0);
  const candidateFiles = inventory(root, [...AUTHORITY, ...skillRoots, ...RESOURCE_FAMILIES]);
  const platform = JSON.parse(readFileSync(safe(root, 'docs/engineering/backend-platforms.json'), 'utf8'));
  return {
    schema_version: 1, kind: 'codex-plugin-preparation', phase: 'M1', result: 'planned',
    plugin_name: identity.name, orchestrator: 'yss-product-lifecycle',
    ready_for_agent: false, installable: false, releasable: false,
    scope: { start: 'Plan', terminal: 'Backend Delivery', runtime: 'macos-codex-desktop', implementation_side: 'backend' },
    proposed_work_units: UNITS, skills: skillList, recipes: recipeIds.sort(), dependency_edges: edges,
    platform_dependencies: [...platformDependencies.values()],
    omitted_frontend_routes: omitted,
    project_binding: { purpose: 'selected-contract-and-skill-equality-only', digest: digest(JSON.stringify(bindingFiles)), files: bindingFiles },
    resources: { status: 'conservative-inventory-not-validated-distribution-closure', families: RESOURCE_FAMILIES, files: candidateFiles },
    platform_status: (platform.compatibility || []).map(item => ({ id: item.id, status: item.status })),
    blockers: [
      'M2:portable-resource-closure-and-installed-namespace-unverified',
      'M3:fixed-cli-initialization-and-project-binding-not-integrated',
      'M4:backend-terminal-and-role-aware-ui-boundaries-not-enforced',
      'M5:selected-platform-and-real-delivery-require-current-evidence',
      'M6:installed-plugin-end-to-end-not-verified',
    ],
  };
}

export function checkProject(sourceRoot, projectRoot) {
  const plan = planPlugin(sourceRoot), root = realpathSync(projectRoot);
  const identity = yaml(root, 'yss-project.yaml');
  if (identity.schema_version !== 1 || identity.repository_mode !== 'project-instance') {
    throw new Error('project-identity-invalid: expected project-instance schema 1');
  }
  safe(root, 'CONTEXT.md');
  parseContextContract({ root });
  return compareBinding(plan, root);
}

function compareBinding(plan, root) {
  const mismatches = [];
  for (const expected of plan.project_binding.files) {
    try {
      if (!lstatSync(safe(root, expected.ref)).isFile()) throw new Error('expected-regular-file');
      const actual = inventory(root, [expected.ref])[0];
      if (actual.sha256 !== expected.sha256 || actual.executable !== expected.executable) mismatches.push({ ref: expected.ref, reason: 'content-or-mode-drift' });
    } catch (error) { mismatches.push({ ref: expected.ref, reason: error.message }); }
  }
  return { schema_version: 1, result: mismatches.length ? 'blocked' : 'binding-matched',
    expected_digest: plan.project_binding.digest, mismatches,
    ready_for_agent: false, installable: false, scope: 'version-diagnostic-only',
    next_action: mismatches.length ? 'inspect-version-and-migration-plan' : 'continue-lifecycle-preflight',
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const { values, positionals } = parseArgs({ allowPositionals: true, strict: true, options: {
      'source-root': { type: 'string', default: ROOT }, 'project-root': { type: 'string' },
    } });
    if (positionals.length !== 1 || !['plan', 'check-project'].includes(positionals[0])) {
      throw new Error('usage: plan.mjs plan [--source-root <template>] | check-project --project-root <instance> [--source-root <template>]');
    }
    if (positionals[0] === 'check-project' && !values['project-root']) throw new Error('project-root-required');
    const result = positionals[0] === 'plan' ? planPlugin(values['source-root']) : checkProject(values['source-root'], values['project-root']);
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    process.exitCode = result.result === 'blocked' ? 1 : 0;
  } catch (error) {
    process.stderr.write(`${JSON.stringify({ result: 'blocked', error: error.message, ready_for_agent: false })}\n`);
    process.exitCode = 1;
  }
}
