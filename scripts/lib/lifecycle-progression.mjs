// The sidecar owns intent only. Native completion evaluation reuses current gates
// and original validators; this transport cannot approve or rewrite a route.
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {parseDocument} from '../vendor/yaml.mjs';
import {digest, orchestrationRef, safeFile} from './governance-io.mjs';
import {readWorkLayout, TRACKER_REF} from './work-layout.mjs';
import {contextBinary} from './native-context.mjs';
import {readInstanceMetadata} from './instance-metadata.mjs';

export const PROGRESSION_CAPABILITY = 'lifecycle-target-v1';
const check = (ok, message) => {if (!ok) throw new TypeError(`progression-target-blocked: ${message}`);};
const parse = bytes => {
  const document = parseDocument(String(bytes), {uniqueKeys: true, maxAliasCount: 0});
  check(!document.errors.length, document.errors[0]?.message ?? 'schema parse');
  return document.toJS({maxAliasCount: 0});
};
const read = (root, ref) => fs.readFileSync(safeFile(root, ref));
const object = value => value && typeof value === 'object' && !Array.isArray(value);
const keys = (value, allowed) => object(value) && Object.keys(value).every(key => allowed.includes(key));

function declaredProgressionPolicy(contract) {
  if (!Object.hasOwn(contract, 'progression_target')) return null;
  const policy = contract.progression_target;
  check(object(policy) && policy.schema_version === 1 && Array.isArray(policy.required_capabilities)
    && policy.required_capabilities.includes(PROGRESSION_CAPABILITY)
    && policy.required_capabilities.every(capability => capability === PROGRESSION_CAPABILITY)
    && policy.config_file === 'progression-target.json' && Array.isArray(policy.writer_profiles), 'CAPABILITY: 当前合同不支持 lifecycle-target-v1');
  return policy;
}

/** Select the native local policy; current approval and execution still require their validators. */
export function hasLocalImplementationInputs(root) {
  const metadata = readInstanceMetadata(root);
  if (metadata?.kind !== 'native' || !['spec','frontend'].includes(metadata.profile)) return false;
  const identity = parse(read(root, 'yss-project.yaml'));
  if (identity.schema_version !== 1 || identity.repository_mode !== 'project-instance') return false;
  check(parse(read(root, '.template-spec/process/harness-profile.yaml')).profile_id === metadata.metadata.profileId, 'native Spec 与 Harness Profile 不一致');
  const policy = parse(read(root, orchestrationRef(root))).progression_target;
  if (policy?.local_implementation_inputs === undefined) return false;
  check(policy.schema_version === 1 && Array.isArray(policy.required_capabilities) && policy.required_capabilities.includes(PROGRESSION_CAPABILITY)
    && Array.isArray(policy.writer_profiles)
    && ((metadata.profile === 'spec' && policy.writer_profiles.includes('spec') && policy.local_implementation_inputs === 'native-spec-current-feature-approved-assets')
      || (metadata.profile === 'frontend' && policy.local_implementation_inputs === 'native-profile-current-feature-approved-assets')), 'CAPABILITY: 不支持的本地前端输入政策');
  return true;
}

function registeredMaps(root, layout) {
  const maps = [];
  if (!fs.existsSync(safeFile(root, layout.root))) return maps;
  for (const entry of fs.readdirSync(safeFile(root, layout.root), {withFileTypes: true})) {
    const child = `${layout.root}/${entry.name}`;
    check(!entry.isSymbolicLink(), `map 路径不能为符号链接: ${child}`);
    if (!entry.isDirectory()) continue;
    const mapRef = `${child}/map.md`;
    if (!fs.existsSync(safeFile(root, mapRef))) continue;
    const mapFile=safeFile(root,mapRef),directory=safeFile(root,child);
    check(path.dirname(mapFile) === directory && fs.statSync(mapFile).isFile(), `非法活动 feature map: ${mapRef}`);
    const bytes = read(root, mapRef), match = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(String(bytes));
    const registration = match ? parse(match[1]) : null;
    if (registration?.checkpoint_ref) {
      const checkpointBytes = read(root, registration.checkpoint_ref), checkpoint = parse(checkpointBytes);
      maps.push({map_ref: mapRef, checkpoint_ref: registration.checkpoint_ref, checkpoint, checkpoint_digest: digest(checkpointBytes)});
    }
  }
  return maps;
}

/** Locate only the feature explicitly bound by a checkpoint or its registered asset. */
export function readProgressionTarget({root, checkpointRef, assetRef, includeDefault = false} = {}) {
  root = fs.realpathSync(root);
  if (!fs.existsSync(safeFile(root, TRACKER_REF))) {
    if (checkpointRef) check(!fs.existsSync(safeFile(root, path.posix.join(path.posix.dirname(checkpointRef), 'progression-target.json'))), '目标配置缺 tracker.root 绑定');
    return null;
  }
  const layout = readWorkLayout(root), maps = registeredMaps(root, layout);
  let checkpoint = checkpointRef ? parse(read(root, checkpointRef)) : null;
  if (!checkpointRef && assetRef) {
    const bound = maps.filter(({checkpoint: cp}) => {
      const implementation = cp.human_review?.implementation;
      const refs = [
        ...Object.values(cp.artifacts ?? {}).map(asset => asset?.ref),
        ...Object.values(cp.gates ?? {}).map(gate => gate?.subject_ref),
        implementation?.slice_contract_ref, implementation?.vertical_slice_ticket_ref,
        cp.slice_contract_ref, cp.vertical_slice_ticket_ref, cp.spec_ref,
        cp.business_ticket_set_ref, cp.stage_decision_package_ref,
      ];
      return refs.includes(assetRef);
    });
    if (bound.length) {
      check(bound.length === 1, 'asset 的 map 多重登记');
      checkpointRef = bound[0].checkpoint_ref; checkpoint = bound[0].checkpoint;
    }
  }
  const configs = maps.filter(item => fs.existsSync(safeFile(root, `${path.posix.dirname(item.map_ref)}/progression-target.json`)));
  if (!configs.length && !includeDefault) return null; // Reading never creates an intent.
  if (!configs.length && (!checkpointRef || !checkpoint?.feature_id || !maps.some(item => item.checkpoint_ref === checkpointRef))) return null;
  check(checkpointRef && checkpoint?.feature_id, '目标准入需要显式 feature checkpoint 或已登记资产引用');
  const matching = maps.filter(item => item.checkpoint.feature_id === checkpoint.feature_id);
  check(matching.length === 1, `同 feature 的 map 多重登记 (multiple maps): ${checkpoint.feature_id}`);
  check(matching[0].checkpoint_ref === checkpointRef, '目标 checkpoint 与 map 登记不一致');
  const map = matching[0], configRef = `${path.posix.dirname(map.map_ref)}/progression-target.json`;
  const exists = fs.existsSync(safeFile(root, configRef));
  if (!exists && !includeDefault) return null;
  const contractRef = orchestrationRef(root), contractBytes = read(root, contractRef), policy = declaredProgressionPolicy(parse(contractBytes));
  if (!exists && policy === null) return null; // An undeclared legacy policy retains its prior route.
  check(policy !== null, 'CAPABILITY: 当前合同不支持 lifecycle-target-v1');
  if (!exists) {
    let target = policy.default_target;
    if (fs.existsSync(safeFile(root, '.yss-execution-scope.yaml'))) target = policy.scope_defaults?.[parse(read(root, '.yss-execution-scope.yaml')).scope_id];
    check(object(policy.completion_policy?.[target]), `CAPABILITY: 未登记默认目标 ${target}`);
    return {enabled: true, root, config_ref: configRef, schema_version: 1, kind: 'lifecycle-progression-target', feature_id: checkpoint.feature_id, checkpoint_ref: checkpointRef, target, intent_source: 'profile-default', consumers: [], map_ref: map.map_ref, config_digest: null, checkpoint_digest: digest(read(root, checkpointRef)), contract_ref: contractRef, contract_digest: digest(contractBytes), policy: policy.completion_policy[target]};
  }
  check(policy.writer_profiles.includes('spec'), 'CAPABILITY: 专职 Profile 不写综合推进意图');
  const bytes = read(root, configRef), config = JSON.parse(String(bytes));
  check(keys(config, ['schema_version', 'kind', 'feature_id', 'checkpoint_ref', 'target', 'intent_source', 'consumers']) && config.schema_version === 1 && config.kind === 'lifecycle-progression-target', '目标 schema 或未知字段');
  check(config.feature_id === checkpoint.feature_id && config.checkpoint_ref === checkpointRef, '目标 feature/checkpoint 绑定不一致');
  check(typeof config.intent_source === 'string' && config.intent_source.trim(), '意图来源缺失');
  check(Array.isArray(config.consumers), 'consumers 消费者必须为数组');
  const seen = new Set();
  for (const consumer of config.consumers) {
    check(keys(consumer, ['profile', 'root', 'checkpoint_ref']) && ['design', 'backend', 'frontend'].includes(consumer.profile) && path.isAbsolute(consumer.root ?? '') && typeof consumer.checkpoint_ref === 'string' && consumer.checkpoint_ref, 'consumer 消费者缺显式 Profile、root 或 checkpoint');
    safeFile(consumer.root, consumer.checkpoint_ref);
    check(!seen.has(consumer.profile), 'consumer Profile 消费者重复'); seen.add(consumer.profile);
  }
  check(object(policy.completion_policy?.[config.target]), `CAPABILITY: 未登记目标 ${config.target}`);
  return {enabled: true, root, config_ref: configRef, ...config, map_ref: map.map_ref, config_digest: digest(bytes), checkpoint_digest: digest(read(root, checkpointRef)), contract_ref: contractRef, contract_digest: digest(contractBytes), policy: policy.completion_policy[config.target]};
}

export function evaluateProgressionTarget(options = {}) {
  const intent = readProgressionTarget({...options, includeDefault: true});
  if (!intent) return null;
  const environment = options.env ?? process.env;
  let native;
  try {native = contextBinary(environment);} catch (error) {check(false, `CAPABILITY: ${error.message}`);}
  const result = spawnSync(native.binary, ['lifecycle', 'target', '--root', intent.root, '--checkpoint', intent.checkpoint_ref, '--json'], {cwd: intent.root, env: {...environment, NODE_OPTIONS: '', NODE_PATH: ''}, encoding: 'utf8', timeout: 60000, maxBuffer: 8 * 1024 * 1024});
  contextBinary({...environment, YSS_NATIVE_BINARY: native.binary, YSS_NATIVE_BINARY_SHA256: native.digest});
  let envelope;
  try {envelope = JSON.parse(result.stdout);} catch {check(false, 'CAPABILITY: 原生目标核验未返回 JSON');}
  check(!result.error && !result.signal && result.status === 0 && envelope.status === 'ok' && envelope.code === 'OK' && envelope.outputVersion === 1 && envelope.protocolVersion === 1 && envelope.command === 'lifecycle' && envelope.result?.action === 'target', `TARGET: 原生目标核验失败: ${envelope.code ?? result.error?.message ?? result.stderr}`);
  const current = readProgressionTarget({...options, includeDefault: true}), projection = envelope.result?.progression;
  check(current?.config_digest === intent.config_digest && current?.checkpoint_digest === intent.checkpoint_digest && current?.contract_digest === intent.contract_digest, 'TARGET: 核验期间来源漂移');
  check(projection?.enabled === true && projection.target === intent.target && projection.feature_id === intent.feature_id && projection.checkpoint_ref === intent.checkpoint_ref && projection.config_ref === intent.config_ref && projection.root === intent.root, 'TARGET: 原生投影缺当前 root/feature/checkpoint/target 绑定');
  check(projection.config_digest === intent.config_digest && projection.checkpoint_digest === intent.checkpoint_digest && projection.contract_digest === intent.contract_digest, 'TARGET: 原生投影来源摘要不一致');
  check(projection.read_only === true && projection.execution_authorization === 'not-evaluated' && projection.inputs_current === true, 'TARGET: 原生投影未证明当前输入或混淆执行权限');
  check(['pending', 'reached', 'not-applicable', 'blocked'].includes(projection.status), 'CAPABILITY: 原生目标投影状态不支持');
  return projection;
}

// An absent binding is a legacy no-op only when the actual instance does not
// declare the native Spec target capability. This is formal-write admission;
// readonly intake and the daily path do not call it.
function requiresGovernedFeatureBinding(root) {
  root = fs.realpathSync(root);
  const metadata = readInstanceMetadata(root);
  if (metadata?.kind !== 'native' || metadata.profile !== 'spec') return false;
  const identity = parse(read(root, 'yss-project.yaml'));
  if (identity.schema_version === 1 && identity.repository_mode === 'template-source') return false;
  check(identity.schema_version === 1 && identity.repository_mode === 'project-instance', '正式目标准入缺少合法项目身份');
  const policy = declaredProgressionPolicy(parse(read(root, orchestrationRef(root))));
  if (policy === null) return false;
  check(policy.schema_version === 1 && policy.config_file === 'progression-target.json' && policy.writer_profiles?.includes('spec'), 'CAPABILITY: 当前 native Spec 目标政策不完整');
  return true;
}

/** This restriction only stops dispatch. Existing scope, approval and readiness still apply. */
export function assertProgressionEntry(workUnit, options = {}) {
  const intent = readProgressionTarget({...options, includeDefault: true});
  if (!intent) check(!requiresGovernedFeatureBinding(options.root), '当前正式 feature 缺少活动 map/checkpoint 绑定，不能跳过本次目标核验');
  const projection = evaluateProgressionTarget(options);
  if (!projection) return null;
  check(projection.status === 'pending', ['reached', 'not-applicable'].includes(projection.status) ? `本次目标 ${projection.target} 已达到；保留 next，改变意图后再恢复 ${workUnit}` : `本次目标尚不可验证: ${projection.target}`);
  return projection;
}
