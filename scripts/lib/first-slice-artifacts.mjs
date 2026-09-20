import fs from 'node:fs';
import path from 'node:path';

/** Declarations bind responsibilities to compiled types, not naming conventions. */
export function inspectFirstSliceArtifacts(contract, projectRoot) {
  const declaration = contract.backend?.first_slice;
  const failures = [], properties = { 'yss.firstSlice': 'true' };
  if (!declaration || !Array.isArray(declaration.artifacts) || !declaration.artifacts.length) {
    return { failures: ['backend.first_slice.artifacts-required'], properties };
  }
  const roles = new Map(), types = [], seen = new Set();
  const root = fs.realpathSync(projectRoot);
  for (const item of declaration.artifacts) {
    const label = item?.type || item?.path || 'unknown';
    try {
      if (!['domain','application','infrastructure','web','test'].includes(item.role)) throw Error('invalid-role');
      if (!/^[a-zA-Z_$][\w$]*(\.[a-zA-Z_$][\w$]*)+$/.test(item.type || '')) throw Error('qualified-type-required');
      if (seen.has(item.type)) throw Error('duplicate-type');
      seen.add(item.type);
      if (!item.path || path.isAbsolute(item.path) || item.path.split(/[\\/]/).includes('..')) throw Error('relative-path-required');
      const file = fs.realpathSync(path.resolve(root, item.path));
      if (!file.startsWith(`${root}${path.sep}`)) throw Error('path-escape');
      const source = fs.readFileSync(file, 'utf8');
      const pkg = source.match(/^\s*package\s+([\w.]+)\s*;/m)?.[1];
      const name = item.type.slice(item.type.lastIndexOf('.') + 1);
      if (`${pkg}.${name}` !== item.type || !new RegExp(`\\b(class|interface|enum|record)\\s+${name}\\b`).test(source)) throw Error('declared-type-mismatch');
      if (item.role === 'test') {
        if (!item.path.includes('/src/test/java/')) throw Error('test-source-required');
      } else {
        if (!item.path.includes('/src/main/java/')) throw Error('main-source-required');
        types.push(item.type);
        const packages = roles.get(item.role) || new Set(); packages.add(pkg); roles.set(item.role, packages);
      }
    } catch (error) { failures.push(`${label}:${error.message}`); }
  }
  const aliases = { service: 'application', core: 'domain', repository: 'infrastructure', server: 'web' };
  for (const layer of contract.backend.affected_layers || []) {
    const role = aliases[layer] || layer;
    if (['domain','application','infrastructure','web'].includes(role) && !roles.has(role)) failures.push(`affected-role-empty:${role}`);
  }
  if (!declaration.artifacts.some(item => item.role === 'test')) failures.push('behavior-test-binding-required');
  if ((contract.backend.affected_layers || []).some(layer => ['web','server'].includes(layer))) properties['yss.arch.requireController'] = 'true';
  if (!types.length) failures.push('business-type-required');
  properties['yss.arch.requiredTypes'] = types.join(',');
  for (const [role, packages] of roles) properties[`yss.arch.${role}`] = [...packages].join(',');
  return { failures, properties };
}
