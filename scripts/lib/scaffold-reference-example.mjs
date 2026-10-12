/** One owned, independent teaching reactor; never part of the business reactor. */
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, lstatSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { fileURLToPath } from 'node:url';
import { parse } from '../vendor/yaml.mjs';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const ASSETS = path.join(ROOT, '.agents/skills/yss-ddd-scaffold-generator/assets/reference');
const WIRE_REF = '.agents/skills/yss-dto/references/openapi-wire-profile.yaml';
function files(root) {
  return readdirSync(root).sort().flatMap(name => {
    const full = path.join(root, name);
    const stat = lstatSync(full);
    if (stat.isSymbolicLink()) throw new Error('reference template must not be a symlink');
    return stat.isDirectory() ? files(full).map(ref => `${name}/${ref}`) : [name];
  });
}
export function referenceExample(enabled = true) {
  const hash = createHash('sha256');
  for (const ref of files(ASSETS)) hash.update(ref).update('\0').update(readFileSync(path.join(ASSETS, ref))).update('\0');
  hash.update(WIRE_REF).update('\0').update(readFileSync(path.join(ROOT, WIRE_REF))).update('\0');
  return { enabled, id: 'reference-entry', version: 1, path: 'examples/reference', template_digest: `sha256:${hash.digest('hex')}` };
}
export function assertReferenceExample(value, options = {}) {
  if (!value || typeof value.enabled !== 'boolean' || !isDeepStrictEqual(value, referenceExample(value.enabled))) throw new Error('reference_example 模板、路径或摘要无效/漂移');
  if (options.withExample !== undefined && options.withExample !== value.enabled) throw new Error('示例参数与批准合同不一致');
}
export function assertExampleFlags(argv) {
  if (argv.includes('--with-example') && argv.includes('--without-example')) throw new Error('--with-example 与 --without-example 不能同时使用');
}
export function assertContractExample(contract, options) {
  if (contract.schema_version >= 5) assertReferenceExample(contract.reference_example, options);
  else if (options.withExample === true || contract.reference_example !== undefined) throw new Error('历史 v4 合同不允许追加参考工程；请重新编译 v5 合同');
}
export async function renderReferenceExample(projectRoot, contract, platform, renderSkeleton) {
  if (!contract.reference_example?.enabled) return;
  assertReferenceExample(contract.reference_example);
  const referenceRoot = path.join(projectRoot, 'examples/reference');
  const project = `${contract.project_name}-reference`, base = `${contract.base_package}.reference`;
  const ddd = contract.architecture_family === 'domain-driven';
  const config = { ...contract, project_name: project, base_package: base, module_profile: { resolution_version: 1, requested_capabilities: [], resolved_modules: ddd ? ['domain','application','infrastructure','adapter','bootstrap'] : ['server','service','repository'] } };
  await renderSkeleton(referenceRoot, config);
  const wireBytes = readFileSync(path.join(ROOT, WIRE_REF));
  const wire = parse(wireBytes.toString());
  const fields = wire.common_response.fields;
  const vars = { project_name: project, project_version: contract.maven_coordinates.project_version, base_package: base, package_path: base.replaceAll('.', '/'),
    wire_profile: JSON.stringify({ ref: WIRE_REF, schema_version: wire.schema_version, digest: `sha256:${createHash('sha256').update(wireBytes).digest('hex')}` }),
    result_meta_schema: JSON.stringify({ type: 'object', required: Object.keys(fields).filter(key => fields[key].required), properties: Object.fromEntries(Object.entries(fields).map(([key, field]) => [key, { type: field.wire_types }])) }),
    web_module: ddd ? `${project}-adapter/${project}-web` : `${project}-server`,
    run_module: `${project}-${ddd ? 'bootstrap' : 'server'}`, app_module: `${project}-${ddd ? 'application' : 'service'}`,
    storage_module: `${project}-${ddd ? 'infrastructure' : 'repository'}`,
    app_package: ddd ? 'application' : 'service', storage_package: ddd ? 'infrastructure' : 'repository',
    web_package: ddd ? 'adapter.web' : 'server', web_path: ddd ? 'adapter/web' : 'server',
    validation_namespace: platform.validation_namespace,
    spring_boot_version: platform.spring_boot_version, java_version: platform.java_version };
  const render = text => text.replace(/\{\{([a-z_]+)\}\}/g, (match, key) => vars[key] ?? match);
  for (const family of ['common', contract.architecture_family]) {
    const source = path.join(ASSETS, family);
    for (const ref of files(source)) {
      const target = path.join(referenceRoot, render(ref).replace(/\.template$/, ''));
      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(target, render(await readFile(path.join(source, ref), 'utf8')));
    }
  }
  // The isolated runtime owns its demo-only H2 dependency and schema.
  if (!ddd) {
    const webPom = path.join(referenceRoot, vars.web_module, 'pom.xml');
    await writeFile(webPom, (await readFile(webPom, 'utf8')).replace('</dependencies>', '<dependency><groupId>com.yss.cloud</groupId><artifactId>yss-component-exception</artifactId></dependency></dependencies>'));
  }
  const pom = path.join(referenceRoot, vars.run_module, 'pom.xml');
  await writeFile(pom, (await readFile(pom, 'utf8')).replace(/(<artifactId>h2<\/artifactId>\s*)<scope>test<\/scope>/g, '$1<scope>runtime</scope>'));
}

export function assertReferenceInventory(manifest) {
  if (!manifest.reference_example?.enabled) return;
  const ddd = manifest.architecture_family === 'domain-driven';
  const project = `${manifest.project_name}-reference`;
  const vars = { project_name: project, package_path: `${manifest.base_package}.reference`.replaceAll('.', '/'),
    app_module: `${project}-${ddd ? 'application' : 'service'}`, app_package: ddd ? 'application' : 'service',
    storage_module: `${project}-${ddd ? 'infrastructure' : 'repository'}`, storage_package: ddd ? 'infrastructure' : 'repository',
    web_module: ddd ? `${project}-adapter/${project}-web` : `${project}-server`,
    web_path: ddd ? 'adapter/web' : 'server', run_module: `${project}-${ddd ? 'bootstrap' : 'server'}` };
  const expected = ['pom.xml', 'mvnw', 'mvnw.cmd', ...['common', manifest.architecture_family].flatMap(family => files(path.join(ASSETS, family)).map(ref => ref.replace(/\{\{([a-z_]+)\}\}/g, (_, key) => vars[key]).replace(/\.template$/, '')))];
  const owned = new Set(manifest.ownership?.generated_files?.map(entry => entry.path));
  for (const ref of expected) if (!owned.has(`examples/reference/${ref}`)) throw new Error(`reference_example 文件所有权缺失: ${ref}`);
}
