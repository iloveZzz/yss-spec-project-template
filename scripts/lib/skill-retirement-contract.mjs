export const RETIREMENT_SOURCE = '.template-spec/agents/yss-skill-registry.yaml#/retirement_contract/retired_ids';
export const LEGACY_RETIREMENT_SOURCE = 'scripts/lib/skill-supply-chain.mjs#OBSOLETE';
const fields = ['schema_version','stages','deprecated_new_use','cleanup_statuses','hard_retirement_tombstone','retired_id_source','failure_codes'];
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const fail = reason => { throw new TypeError(`retirement_contract: ${reason}`); };
function sameSet(actual, expected, name) {
  if (!Array.isArray(actual) || actual.length !== expected.length || new Set(actual).size !== expected.length || actual.some(x => !expected.includes(x))) fail(`invalid ${name}`);
}

export function readRetirementContract(registry, options = {}) {
  if (!object(registry)) fail('registry must be an object');
  const present = Object.hasOwn(registry, 'retirement_contract');
  const contract = registry.retirement_contract;
  if (present) {
    if (!object(contract) || ![1,2].includes(contract.schema_version)) fail('unsupported schema_version or malformed contract');
    const allowed = contract.schema_version === 2 ? [...fields,'retired_ids'] : fields;
    if (Object.keys(contract).some(key => !allowed.includes(key)) || allowed.some(key => !Object.hasOwn(contract,key))) fail('unknown or missing field');
    sameSet(contract.stages,['deprecated','retired'],'stages');
    sameSet(contract.cleanup_statuses,['migration-only','remove-ready'],'cleanup_statuses');
    if (contract.deprecated_new_use !== 'forbidden') fail('deprecated_new_use must be forbidden');
    if (contract.hard_retirement_tombstone !== '.template-spec/agents/skill-migrations.md') fail('invalid hard_retirement_tombstone');
    const codes = contract.failure_codes;
    if (!object(codes) || Object.keys(codes).length !== 2 || codes.deprecated !== 'skill-deprecated' || codes.retired !== 'skill-retired') fail('invalid failure_codes');
    if (contract.retired_id_source !== (contract.schema_version === 2 ? RETIREMENT_SOURCE : LEGACY_RETIREMENT_SOURCE)) fail('invalid retired_id_source');
  }
  let ids;
  if (contract?.schema_version === 2) {
    const values = contract.retired_ids;
    if (!Array.isArray(values) || values.some(id => typeof id !== 'string' || !/^[a-z0-9][a-z0-9-]*$/.test(id)) || new Set(values).size !== values.length) fail('retired_ids must contain unique valid string IDs');
    ids = new Set(values);
  } else {
    if (!(options.legacyIds instanceof Set)) fail('legacy IDs unavailable');
    ids = new Set(options.legacyIds);
  }
  for (const skill of [...(registry.skills ?? []),...(registry.platform_skills ?? []),...(registry.external_skills ?? []).filter(skill => skill.source !== 'cross-repo-reference')]) {
    if (ids.has(skill.id)) fail(`retired canonical skill: ${skill.id}`);
  }
  return ids;
}

// Match only the historical literal/concat/add shapes; never execute source JS.
export function readLegacyRetirementIds(text) {
  const arrays = [...text.matchAll(/(?:OBSOLETE = new Set\(|for \(const id of )(\[[^\]]*\])/gs)];
  if (!arrays.length) fail('历史来源缺少退役技能合同');
  const ids = new Set();
  for (const [, array] of arrays) {
    const values = JSON.parse(array.replace(/"([^"\\]*)"\s*\+\s*"([^"\\]*)"/g, '"$1$2"'));
    if (!Array.isArray(values) || values.some(value => typeof value !== 'string')) fail('历史退役数组必须为字符串');
    for (const value of values) ids.add(value);
  }
  for (const [, id] of text.matchAll(/OBSOLETE\.add\("([^"\\]+)"\)/g)) ids.add(id);
  return ids;
}
