import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { parseDocument } from '../vendor/yaml.mjs';

const REFERENCE_SOURCES = new Set(['cross-repo-reference', 'downstream-rd-profile']);

// External identities support prohibitions and handoff; they are not executable skills.
export function assertLocalSkillReferences(ids, registry, profile) {
  const blocked = new Set(profile.skill_scope?.retired_local_skills ?? []);
  for (const external of registry.external_skills ?? []) {
    if (REFERENCE_SOURCES.has(external.source)) {
      blocked.add(external.id);
      for (const alias of external.aliases ?? []) blocked.add(alias);
    }
  }
  for (const id of ids) {
    if (blocked.has(id)) throw new Error(`跨端引用不得进入本地执行闭包: ${id}`);
  }
}

export function validateHarnessSkillScope(root) {
  const read = file => readFileSync(path.join(root, file), 'utf8');
  const yaml = file => {
    const document = parseDocument(read(file), {uniqueKeys:true,maxAliasCount:0});
    if (document.errors.length) throw new Error(`${file}: ${document.errors[0].message}`);
    return document.toJS({maxAliasCount:0});
  };
  const profile = yaml('.template-spec/process/harness-profile.yaml');
  const scope = profile.skill_scope;
  if (scope?.policy !== 'local-workflow-only' || !Array.isArray(scope.retired_local_skills) || !scope.retired_local_skills.length) {
    throw new Error('harness profile 缺少本地技能退役范围');
  }
  const retired = new Set(scope.retired_local_skills);
  for (const optional of scope.optional_skills ?? []) {
    if (retired.has(optional.id)) throw new Error(`可选技能不得同时永久禁止: ${optional.id}`);
  }
  const lock = JSON.parse(read('skills-lock.json'));
  const registry = yaml('.template-spec/agents/yss-skill-registry.yaml');
  const roots = [lock.canonicalRoot, ...lock.projectionRoots];
  for (const directory of roots) {
    if (!existsSync(path.join(root, directory))) continue;
    for (const entry of readdirSync(path.join(root, directory))) {
      if (retired.has(entry)) throw new Error(`本地已退役技能重新进入发现面: ${directory}/${entry}`);
    }
  }
  const locked = [...Object.keys(lock.skills.shared), ...Object.values(lock.skills.platform ?? {}).flatMap(Object.keys)];
  const registered = [...registry.skills, ...(registry.platform_skills ?? []), ...(registry.external_skills ?? []).filter(s => !REFERENCE_SOURCES.has(s.source))];
  for (const id of [...locked, ...registered.flatMap(s => [s.id, ...(s.aliases ?? [])])]) {
    if (retired.has(id)) throw new Error(`本地已退役技能仍被锁定或注册: ${id}`);
  }
  assertLocalSkillReferences((registry.capabilities ?? []).map(c => c.primary_skill), registry, profile);
  for (const [owner, dependencies] of Object.entries(registry.skill_dependencies ?? {})) {
    assertLocalSkillReferences([owner], registry, profile);
    assertLocalSkillReferences(dependencies.filter(d => ['context-required','context-conditional'].includes(d.type)).map(d => d.skill), registry, profile);
  }
  const strings = value => Array.isArray(value) ? value.flatMap(strings)
    : value && typeof value === 'object' ? Object.values(value).flatMap(strings)
    : typeof value === 'string' ? [value] : [];
  for (const skill of ['harness-orchestrator','yss-strategic-design']) {
    const contract = `.agents/skills/${skill}/references/orchestration-contract.yaml`;
    if (existsSync(path.join(root,contract))) assertLocalSkillReferences(strings(yaml(contract).work_unit_routes), registry, profile);
  }
  return { profile: profile.profile_id, retired: retired.size, shared: Object.keys(lock.skills.shared).length };
}
