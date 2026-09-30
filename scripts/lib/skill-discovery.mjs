import { createHash } from 'node:crypto';
import { existsSync, lstatSync, readFileSync, readdirSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { StringDecoder } from 'node:string_decoder';
import { parseDocument } from '../vendor/yaml.mjs';

const digest = (value) => createHash('sha256').update(value).digest('hex');

// Hash the complete resource tree, including executable bits. Never follow an
// escaping resource link or a cycle; an incomplete digest cannot establish equality.
export function resourceIdentity(directory) {
  const root = realpathSync(directory), files = [], active = new Set();
  function walk(file, relative) {
    const real = realpathSync(file);
    if (real !== root && !real.startsWith(root + path.sep)) throw new Error(`resource link escapes skill: ${relative}`);
    if (active.has(real)) throw new Error(`resource cycle: ${relative}`);
    const stat = lstatSync(real);
    if (stat.isDirectory()) {
      active.add(real);
      for (const name of readdirSync(real).sort()) {
        if (['.DS_Store', '__pycache__', '.git'].includes(name)) continue;
        walk(path.join(real, name), relative ? `${relative}/${name}` : name);
      }
      active.delete(real);
    } else if (stat.isFile()) files.push({ path: relative, executable: Boolean(stat.mode & 0o111), sha256: digest(readFileSync(real)) });
    else throw new Error(`unsupported resource: ${relative}`);
  }
  walk(root, '');
  return { sha256: digest(JSON.stringify(files)), files };
}

function yaml(source) {
  const doc = parseDocument(source, { uniqueKeys: true, maxAliasCount: 0 });
  if (doc.errors.length) throw new Error(doc.errors[0].message);
  return doc.toJS({ maxAliasCount: 0 });
}

export function inspectSkill(file) {
  try {
    const source = readFileSync(file, 'utf8');
    const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
    if (!match) throw new Error('missing frontmatter');
    const header = yaml(match[1]);
    if (!header || typeof header.name !== 'string') throw new Error('missing name');
    const metadataPath = path.join(path.dirname(file), 'agents/openai.yaml');
    const metadata = existsSync(metadataPath) ? yaml(readFileSync(metadataPath, 'utf8')) : {};
    return { name: header.name, path: path.resolve(file), real_path: realpathSync(file), resource: resourceIdentity(path.dirname(file)),
      declared_policy: { codex_allow_implicit_invocation: metadata?.policy?.allow_implicit_invocation ?? null, disable_model_invocation: header['disable-model-invocation'] ?? null }, status: 'observed-filesystem' };
  } catch (error) { return { path: path.resolve(file), status: 'unknown', reason: error.message }; }
}

export function assessDiscovery({ registered, observation, required = [], selections = [], expected }) {
  const findings = [];
  const bound = observation.runtime === expected.runtime && observation.version === expected.version && observation.cwd === expected.cwd;
  if (!bound) findings.push({ severity: 'block', code: 'observation-binding-mismatch' });
  const entries = bound && observation.status === 'observed' ? observation.entries : [];
  for (const name of required) {
    if (!registered.some((item) => item.name === name)) findings.push({ name, severity: 'block', code: 'required-skill-unregistered' });
    if (observation.status !== 'observed') findings.push({ name, severity: 'block', code: 'required-catalog-unknown' });
  }
  for (const selection of selections) {
    if (!registered.some((item) => item.name === selection.name)) findings.push({ name: selection.name, severity: 'block', code: 'selected-skill-unregistered' });
  }
  for (const wanted of registered) {
    const matches = entries.filter((entry) => entry.name === wanted.name && entry.enabled !== false);
    const identities = matches.map((entry) => ({ entry, identity: inspectSkill(entry.path) }));
    if (identities.length > 1) findings.push({ name: wanted.name, severity: 'warning', code: identities.every(({ identity }) => identity.resource?.sha256 && identity.resource.sha256 === wanted.resource?.sha256) ? 'equivalent-resource-duplicates' : 'catalog-source-conflict', scope: 'resource bytes only; dependency and effective-policy equality are not established' });
    const selected = selections.filter((entry) => entry.name === wanted.name);
    if (!required.includes(wanted.name) && !selected.length) continue;
    if (!selected.length) { findings.push({ name: wanted.name, severity: 'block', code: 'required-selection-unknown' }); continue; }
    for (const selection of selected) {
      // Selection must be supplied by a trace with the same host, version and cwd.
      if (!bound || selection.runtime !== expected.runtime || selection.version !== expected.version || selection.cwd !== expected.cwd || !selection.evidence) {
        findings.push({ name: wanted.name, severity: 'block', code: 'selection-binding-mismatch' }); continue;
      }
      const actual = inspectSkill(selection.path);
      if (!actual.resource?.sha256 || actual.resource.sha256 !== wanted.resource?.sha256) findings.push({ name: wanted.name, severity: 'block', code: 'selected-unregistered-source' });
      else if (selection.dependency_digest !== wanted.dependency_digest || !wanted.dependency_digest || selection.effective_policy_digest !== wanted.effective_policy_digest || !wanted.effective_policy_digest) findings.push({ name: wanted.name, severity: 'block', code: 'effective-environment-unknown-or-different' });
    }
  }
  return { status: findings.some((item) => item.severity === 'block') ? 'blocked' : (bound && observation.status === 'observed' ? 'catalog-observed-only' : 'unknown'), findings };
}

export async function codexCatalog(binary, cwd, timeout = 30000) {
  return new Promise((resolve, reject) => {
    const process = spawn(binary, ['app-server', '--stdio'], { cwd, stdio: ['pipe', 'pipe', 'pipe'] });
    let buffer = '', bytes = 0, settled = false;
    const decoder = new StringDecoder('utf8');
    const finish = (error, result) => {
      if (settled) return;
      settled = true; clearTimeout(timer); process.kill('SIGTERM');
      const kill = setTimeout(() => process.kill('SIGKILL'), 1000); kill.unref();
      error ? reject(error) : resolve(result);
    };
    const timer = setTimeout(() => finish(new Error('skills/list timed out')), timeout);
    const send = (value) => process.stdin.write(JSON.stringify(value) + '\n');
    process.on('error', (error) => finish(error));
    process.stdin.on('error', (error) => finish(error));
    process.on('close', () => finish(new Error('app-server exited before skills/list')));
    process.stderr.on('data', () => {}); // No user config, credentials or diagnostics dumped.
    process.stdout.on('data', (chunk) => {
      bytes += chunk.length;
      if (bytes > 16 * 1024 * 1024) return finish(new Error('skills/list response exceeds limit'));
      buffer += decoder.write(chunk);
      let index;
      while ((index = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, index); buffer = buffer.slice(index + 1);
        if (!line.trim()) continue;
        try {
          const event = JSON.parse(line);
          if (event.id === 1) {
            if (event.error) throw new Error('app-server initialization rejected');
            send({ method: 'initialized', params: {} });
            send({ id: 2, method: 'skills/list', params: { cwds: [cwd], forceReload: true } });
          }
          if (event.id === 2) {
            const row = event.result?.data?.find((item) => item.cwd === cwd);
            if (!row || !Array.isArray(row.skills) || !Array.isArray(row.errors)) throw new Error('invalid skills/list response');
            if (row.skills.some((item) => typeof item.name !== 'string' || typeof item.path !== 'string' || !path.isAbsolute(item.path))) throw new Error('invalid skill identity');
            finish(null, { entries: row.skills.map((item) => ({ name: item.name, path: item.path, enabled: item.enabled, scope: item.scope, effective_policy: 'unknown' })), errors: row.errors, method: 'codex-app-server/skills-list', scope: 'configured catalog; selection and truncation unknown' });
          }
        } catch (error) { finish(error); }
      }
    });
    send({ id: 1, method: 'initialize', params: { clientInfo: { name: 'yss-skill-discovery', version: '1' }, capabilities: { experimentalApi: true } } });
  });
}

export async function observeRuntime({ runtime, binary, cwd, piLoader, piAgentDir }) {
  cwd = path.resolve(cwd);
  const result = spawnSync(binary, ['--version'], { encoding: 'utf8', timeout: 10000, maxBuffer: 1024 * 1024 });
  const version = result.status === 0 ? result.stdout.trim() : null;
  const base = { runtime, version, cwd, observed_at: new Date().toISOString(), entries: [], status: 'unknown', selection: 'unknown', truncation: 'unknown', configuration: 'not-inspected' };
  if (!version) return { ...base, reason: 'runtime-version-unavailable' };
  try {
    if (runtime === 'codex') return { ...base, ...await codexCatalog(binary, cwd), status: 'observed', configuration: 'current host configuration used by app-server' };
    if (runtime === 'pi') {
      if (!piLoader || !piAgentDir) throw new Error('Pi requires its installed core/skills.js and explicit agent directory');
      // Use the installed loader without package resolution, extension execution or writes.
      const probe = "import {pathToFileURL} from 'node:url'; const {loadSkills}=await import(pathToFileURL(process.argv[1]).href); process.stdout.write(JSON.stringify(loadSkills(JSON.parse(process.argv[2]))));";
      const loaded = spawnSync(process.execPath, ['--input-type=module', '-e', probe, path.resolve(piLoader), JSON.stringify({ cwd, agentDir: path.resolve(piAgentDir), skillPaths: [], includeDefaults: true })], { encoding: 'utf8', timeout: 30000, maxBuffer: 16 * 1024 * 1024 });
      if (loaded.status !== 0) throw new Error('Pi loader failed or exceeded its observation limit');
      const found = JSON.parse(loaded.stdout);
      return { ...base, status: 'observed', method: 'installed-pi-core/loadSkills', scope: 'default directories only; configured packages/extensions and CLI session unknown', loader_sha256: digest(readFileSync(piLoader)), entries: found.skills.map((item) => ({ name: item.name, path: item.filePath, enabled: true, scope: item.source, effective_policy: { allow_implicit: !item.disableModelInvocation, provenance: 'observed-loader' } })), errors: found.diagnostics };
    }
    if (runtime === 'cursor') return { ...base, reason: 'No read-only catalog API verified; use a version-bound actual invocation trace for required skills' };
    throw new Error('unsupported runtime');
  } catch (error) { return { ...base, reason: error.message }; }
}
