import {readInstanceMetadata} from './instance-metadata.mjs';
import { loadExecutionScope, assertScopeWorkUnit, scopedNextRoutes } from './lifecycle-execution-scope.mjs';
import { createHash } from "node:crypto";
import { readFileSync, existsSync, lstatSync, readdirSync, withValidationPhase, validationDependencies } from "./validation-phase.mjs";
import { realpathSync } from "node:fs";
import { OBSOLETE } from "./skill-supply-chain.mjs";
import path from "node:path";
import { parseDocument } from "../vendor/yaml.mjs";
import { ROOT, loadRegistry, semanticDigest, validateRegistry } from "./lifecycle-registry.mjs";
import { loadSkillRegistry } from "./skill-registry.mjs";
import { loadLifecyclePresenter } from './lifecycle-presentation.mjs';

const LIFECYCLE_REGISTRY_REF = ".template-spec/process/lifecycle-registry.yaml";
const ORCHESTRATION_CONTRACT_REF = ".agents/skills/harness-orchestrator/references/orchestration-contract.yaml";
const SKILL_REGISTRY_REF = ".template-spec/agents/yss-skill-registry.yaml";
// Governed projections retain the specialist query's existing output contract.
const QUERY_PROFILE = 'specialist';

function read(relativePath) {
  return readFileSync(path.join(ROOT, relativePath), "utf8");
}

function sha256(source) {
  return createHash("sha256").update(source).digest("hex");
}

function loadYaml(relativePath, label) {
  const document = parseDocument(read(relativePath), { maxAliasCount: 0, uniqueKeys: true });
  if (document.errors.length) throw new TypeError(`无法解析${label}: ${document.errors[0].message}`);
  const value = document.toJS({ maxAliasCount: 0 });
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new TypeError(`${label}必须是对象`);
  return value;
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]));
  }
  return value;
}

function selectById(records, id, label) {
  if (!id) return null;
  const selected = records.find((record) => record.id === id);
  if (!selected) throw new TypeError(`未知${label}: ${id}`);
  return selected;
}

function collectPathReferences(value, references = new Set()) {
  if (Array.isArray(value)) {
    for (const item of value) collectPathReferences(item, references);
  } else if (value && typeof value === "object") {
    for (const item of Object.values(value)) collectPathReferences(item, references);
  } else if (typeof value === "string" && /(?:^|\/)[^\s]+\.(?:md|ya?ml|json|mjs)(?:#.*)?$/.test(value)) {
    references.add(value);
  }
  return references;
}

function selectedSkills(route, skillRegistry) {
  if (!route) return [];
  const ids = new Set([
    route.primary_skill,
    route.native?.skill,
    ...(route.supporting_skills ?? []),
    ...(route.skills ?? []),
  ].filter(Boolean));
  return skillRegistry.skills.filter((skill) => ids.has(skill.id));
}

export function queryLifecycleContext(options = {}) {
  return withValidationPhase({ root: ROOT, purpose: "lifecycle-context-query", readOnly: true }, () => querySnapshot(options));
}

// Availability is an observation, not permission to install, invoke or approve.
export function inspectWorkUnitSkills({ root = ROOT, registry, route, agentRuntime, when = [] }) {
  const issues = [], missing = [], required = new Set();
  const report = (code, skill, ref, message) => issues.push({ code, skill: skill ?? null, ref, message });
  const definitions = [...(registry.skills ?? []), ...(registry.external_skills ?? [])];
  const externalIds = new Set((registry.external_skills ?? []).map(skill => skill.id));
  const aliases = new Map(definitions.flatMap(skill => (skill.aliases ?? []).map(alias => [alias, skill.id])));
  const roots = registry.agent_runtime_roots ?? registry.instance_distribution?.projection_roots ?? {};
  const dependencies = registry.skill_dependencies ?? {};
  function visit(requested) {
    const id = aliases.get(requested) ?? requested;
    if (required.has(id)) return;
    required.add(id);
    const definition = definitions.find(skill => skill.id === id);
    if (OBSOLETE.has(id) || definition?.maturity === 'deprecated') {
      report('skill-retired', id, '.template-spec/agents/skill-migrations.md',
        definition?.replacement_skill ? '技能已停止新用法；请使用 ' + definition.replacement_skill : '技能已退役；按迁移说明重新路由');
      return;
    }
    if (!definition || (!externalIds.has(id) && !/^[a-z][a-z0-9-]+$/.test(id))) {
      report('skill-unknown', id, SKILL_REGISTRY_REF, '路由使用未登记的技能');
      return;
    }
    if (externalIds.has(id)) {
      report('external-skill-required', id, SKILL_REGISTRY_REF, '外部技能须核验实际运行时能力，不能通过共享技能补装代替');
      return;
    }
    for (const dependency of dependencies[id] ?? []) {
      if (dependency.type === 'context-required' ||
          (dependency.type === 'context-conditional' && when.includes(dependency.when))) visit(dependency.skill);
    }
  }
  [
    route?.primary_skill,
    route?.native?.invocation_mode === 'reference' ? null : route?.native?.skill,
    ...(route?.supporting_skills ?? []), ...(route?.skills ?? []),
  ].filter(Boolean).forEach(visit);
  function readJson(ref) {
    const file = path.join(root, ref);
    if (!existsSync(file)) return null;
    const value = JSON.parse(readFileSync(file, 'utf8'));
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError(ref + ' 必须是 JSON 对象');
    return value;
  }
  const lock = readJson('skills-lock.json');
  const instance = readInstanceMetadata(root);
  const metadata = instance?.metadata;
  const metadataRef = instance?.metadataRef ?? '.yss.json';
  const selected = metadata?.distribution?.mode === 'selected' ? metadata.distribution : null;
  const registeredRuntimes = selected?.runtimes ??
    Object.keys(roots).filter(runtime => lock?.projectionRoots?.includes(roots[runtime]));
  if (!agentRuntime && registeredRuntimes.length === 1) agentRuntime = registeredRuntimes[0];
  if (agentRuntime && !Object.hasOwn(roots, agentRuntime)) throw new TypeError('未知 Agent 运行时: ' + agentRuntime);
  if (!agentRuntime) report('runtime-required', null, metadataRef, '请用 --agent-runtime 明确指定运行时；只在登记了唯一运行时时自动选择');
  else if (!registeredRuntimes.includes(agentRuntime)) report('runtime-not-installed', null, metadataRef, '所选运行时未登记；先核对运行时安装范围');
  if (!lock?.skills?.shared || !Array.isArray(lock.projectionRoots)) report('skill-lock-invalid', null, 'skills-lock.json', '技能锁缺失或结构不支持；先恢复锁文件或规划迁移');
  if (selected && (!Array.isArray(selected.installedSkills) || !Array.isArray(selected.runtimes) ||
      JSON.stringify([...selected.runtimes.map(runtime => roots[runtime])].sort()) !== JSON.stringify([...(lock?.projectionRoots ?? [])].sort()))) {
    report('distribution-lock-drift', null, metadataRef, '实例元数据与技能锁的运行时或安装清单不一致');
  }
  const inside = (file, directory) => file === directory || file.startsWith(directory + path.sep);
  const realRoot = realpathSync(root);
  function stat(file) {
    // existsSync observes absence; lstat also identifies occupied dangling links.
    existsSync(file);
    return lstatSync(file, { throwIfNoEntry: false });
  }
  function checkedTreeHash(directory, canonical, projection = false) {
    const info = stat(directory);
    if (!info) return null;
    const resolved = realpathSync(directory);
    if (!inside(resolved, realRoot) || (projection && info.isSymbolicLink() && resolved !== realpathSync(canonical)) ||
        (!projection && info.isSymbolicLink()) || (!info.isDirectory() && !info.isSymbolicLink())) {
      throw new TypeError('技能目录或投影链接无效: ' + directory);
    }
    const files = [];
    function walk(current, prefix = '') {
      for (const entry of readdirSync(current, { withFileTypes: true })) {
        if (entry.name === '.DS_Store' || entry.name === '__pycache__' || /\.(iml|pyc|pyo)$/.test(entry.name)) continue;
        const file = path.join(current, entry.name), ref = prefix ? prefix + '/' + entry.name : entry.name;
        const entryInfo = stat(file), real = realpathSync(file);
        if (!inside(real, resolved)) throw new TypeError('技能文件链接越界: ' + ref);
        if (entryInfo.isDirectory()) walk(file, ref);
        else if (entryInfo.isFile() || entryInfo.isSymbolicLink()) files.push([ref, file]);
        else throw new TypeError('技能包含不支持的文件类型: ' + ref);
      }
    }
    walk(directory);
    const digest = createHash('sha256');
    for (const [ref, file] of files.sort(([left], [right]) => left.localeCompare(right))) {
      const bytes = readFileSync(file);
      const normalized = bytes.includes(0) ? bytes : Buffer.from(bytes.toString('utf8').replaceAll('\r\n', '\n'));
      digest.update(ref).update('\0').update(normalized).update('\0');
    }
    return digest.digest('hex');
  }
  for (const id of [...required].sort()) {
    if (issues.some(issue => issue.skill === id)) continue;
    const canonicalRef = '.agents/skills/' + id;
    const canonical = path.join(root, canonicalRef);
    const record = lock?.skills?.shared?.[id];
    const declared = selected?.installedSkills?.includes(id);
    if (!stat(canonical)) {
      const managed = Object.keys(metadata?.managedFiles ?? {}).some(ref => ref.startsWith(canonicalRef + '/'));
      if (record || declared || managed) report('managed-skill-missing', id, canonicalRef, '已登记或受管技能文件丢失；先核对 sync 计划，不能当作未安装补装');
      else {
        const occupied = Object.entries(roots).find(([runtime, ref]) => registeredRuntimes.includes(runtime) && stat(path.join(root, ref, id)));
        if (occupied) report('skill-path-conflict', id, occupied[1] + '/' + id, '同名投影路径已存在但未登记，拒绝覆盖');
        else missing.push(id);
      }
      continue;
    }
    if (!record) {
      report('skill-path-conflict', id, canonicalRef, '同名技能路径存在但未登记，拒绝覆盖');
      continue;
    }
    if (selected && !declared) report('distribution-lock-drift', id, metadataRef, '技能锁与实例安装清单不一致');
    try {
      const hash = checkedTreeHash(canonical, canonical);
      if (!existsSync(path.join(canonical, 'SKILL.md'))) report('managed-skill-missing', id, canonicalRef + '/SKILL.md', '已登记技能缺少入口文件');
      if (hash !== record.effectiveHash) report('skill-hash-drift', id, canonicalRef, 'canonical 技能内容与锁定有效哈希不一致');
      const projectionRef = agentRuntime && roots[agentRuntime];
      if (projectionRef) {
        if (!lock.projectionRoots.includes(projectionRef) || !record.targets?.includes(projectionRef) || !record.targets?.includes('.agents/skills')) {
          report('projection-lock-drift', id, 'skills-lock.json', '所选运行时投影目标与技能锁不一致');
        }
        const projection = path.join(root, projectionRef, id);
        if (checkedTreeHash(projection, canonical, true) !== hash) report('projection-drift', id, projectionRef + '/' + id, '运行时投影缺失或与 canonical 内容不一致');
      }
    } catch (error) {
      report('skill-path-invalid', id, canonicalRef, error.message);
    }
  }
  const native = instance?.kind === 'native';
  const canEnsure = selected && (native || (metadata?.metadataSchemaVersion === 3 && metadata.templateName === 'create-yss-spec'));
  const commandArgs = native ? ['yss','skills','ensure',...missing.sort(),'--root',root] : ['create-yss-spec', 'skills', 'ensure', ...missing.sort(), ...when.flatMap(trigger => ['--when', trigger]), '--target-dir', root];
  const quote = value => /^[a-zA-Z0-9_./:-]+$/.test(value) ? value : "'" + value.replaceAll("'", "'\\''") + "'";
  const planFile=path.join(root,'.yss/plans/skills-ensure.json');
  const command = mode => (native ? [...commandArgs,...(mode==='--plan'?['--plan','--out',planFile]:['--apply','--plan-file',planFile])] : [...commandArgs,mode]).map(quote).join(' ');
  return {
    read_only: true, execution_allowed: false, agent_runtime: agentRuntime ?? null,
    required_skills: [...required].sort(), missing_skills: missing,
    status: issues.length ? 'blocked' : missing.length ? 'missing' : 'ready',
    issues,
    remediation: missing.length && !issues.length ? canEnsure
      ? { plan_command: command('--plan'), apply_command: command('--apply'), authorization: 'existing-task-scope-required', recheck_required: true }
      : { plan_command: null, apply_command: null, message: '此实例没有可用的 v3 按需补装元数据；按本家族 CLI 规划同步或迁移，保持现有分发模式' }
      : null,
  };
}

function querySnapshot({ mode, stageId, workUnitId, include = [], checkSkills = false, agentRuntime, when = [] } = {}) {
  if (checkSkills && !workUnitId) throw new TypeError('--check-skills 必须指定 --work-unit');
  if (!checkSkills && (agentRuntime !== undefined || when.length)) throw new TypeError('--agent-runtime 和 --when 必须与 --check-skills 一起使用');
  if (!Array.isArray(when) || when.some(trigger => typeof trigger !== 'string' || !/^[a-z][a-z0-9-]+$/.test(trigger))) throw new TypeError('--when 必须是有效的条件触发项');
  if (!mode && !stageId && !workUnitId && include.length === 0) {
    throw new TypeError("至少提供 --mode、--stage、--work-unit 或 --include 之一");
  }

  const identity = loadYaml("yss-project.yaml", "仓库身份");
  if (identity.schema_version !== 1 || !["template-source", "project-instance"].includes(identity.repository_mode)) {
    throw new TypeError("仓库身份或版本无效");
  }
  const scope = QUERY_PROFILE === 'lifecycle' ? loadExecutionScope() : null;
  if (workUnitId && QUERY_PROFILE === 'lifecycle') assertScopeWorkUnit(workUnitId, { readOnly: true });
  const lifecycle = validateRegistry(loadRegistry());
  const orchestration = loadYaml(ORCHESTRATION_CONTRACT_REF, "生命周期编排合同");
  const skillRegistry = loadSkillRegistry();
  const planUnit = ['work-unit.plan-opportunity', 'work-unit.plan-requirements', 'work-unit.domain-strategy-design', 'work-unit.stage-decision', 'work-unit.spec-synthesis'].includes(workUnitId);
  const loadPlan = ['stage.plan', 'stage.spec-architecture'].includes(stageId) || planUnit;
  stageId ??= planUnit ? 'stage.plan' : undefined;
  if (QUERY_PROFILE === 'lifecycle') include = [...include, 'gate_consolidation'];
  if (loadPlan) include = [...include, 'planning', 'grill_exit'];
  const stage = selectById(lifecycle.stages, stageId, "阶段");
  const workUnit = selectById(lifecycle.work_units, workUnitId, "工作单元");

  if (mode && !(mode in orchestration.modes)) throw new TypeError(`未知模式: ${mode}`);
  const normalizedIncludes = [...new Set(include.flatMap((value) => value.split(",")).map((value) => value.trim()).filter(Boolean))].sort();
  for (const key of normalizedIncludes) {
    if (!(key in orchestration)) throw new TypeError(`未知编排合同子树: ${key}`);
  }

  const route = workUnitId ? orchestration.work_unit_routes?.[workUnitId] ?? null : null;
  if (QUERY_PROFILE === 'lifecycle' && workUnit?.scope === "project-instance" && workUnit.id !== "work-unit.entry-triage" && !route) {
    throw new TypeError(`项目工作单元缺少执行路由: ${workUnit.id}`);
  }
  if (QUERY_PROFILE === 'lifecycle' && workUnit?.scope === "project-instance" && workUnit.id !== "work-unit.entry-triage" && !Object.hasOwn(orchestration.transition_graph?.routes ?? {}, workUnit.id)) {
    throw new TypeError(`项目工作单元缺少流转路由: ${workUnit.id}`);
  }
  const gates = lifecycle.gates.filter((gate) => gate.stage === stageId || (loadPlan && gate.stage === 'stage.plan'));
  const checks = QUERY_PROFILE === 'lifecycle' ? lifecycle.checks.filter(check => check.stage === stageId || gates.some(gate => gate.requires_checks?.includes(check.id))) : [];
  const artifacts = lifecycle.artifacts.filter((artifact) => artifact.stage === stageId || (loadPlan && artifact.stage === 'stage.plan'));
  const evidenceIds = new Set([...gates, ...checks].flatMap((gate) => gate.evidence ?? []));
  const selected = Object.fromEntries(normalizedIncludes.map((key) => [key, orchestration[key]]));
  const transition = workUnitId ? {
    next: QUERY_PROFILE === 'lifecycle' ? scopedNextRoutes(workUnitId, orchestration.transition_graph?.routes?.[workUnitId] ?? []) : orchestration.transition_graph?.routes?.[workUnitId] ?? [],
    forbidden_shortcuts: (orchestration.transition_graph?.forbidden_shortcuts ?? [])
      .filter((edge) => edge.from === workUnitId || edge.to === workUnitId),
  } : null;

  const result = {
    schema_version: 1,
    query: {
      include: normalizedIncludes,
      mode: mode ?? null,
      stage: stageId ?? null,
      work_unit: workUnitId ?? null,
    },
    sources: {
      repository_identity: { ref: "yss-project.yaml", sha256: sha256(read("yss-project.yaml")) },
      lifecycle_registry: {
        ref: LIFECYCLE_REGISTRY_REF,
        semantic_sha256: semanticDigest(lifecycle),
        sha256: sha256(read(LIFECYCLE_REGISTRY_REF)),
        status: lifecycle.status,
      },
      orchestration_contract: {
        ref: ORCHESTRATION_CONTRACT_REF,
        sha256: sha256(read(ORCHESTRATION_CONTRACT_REF)),
      },
      skill_registry: {
        ref: SKILL_REGISTRY_REF,
        sha256: sha256(read(SKILL_REGISTRY_REF)),
        status: skillRegistry.status,
      },
    },
    lifecycle: {
      artifacts,
      evidence: lifecycle.evidence.filter((item) => evidenceIds.has(item.id)).map(({ public_description, ...item }) => ({
        ...item, ...(QUERY_PROFILE === 'lifecycle' ? { description: public_description ?? item.description } : public_description ? { public_description } : {})
      })),
      gates,
      ...(QUERY_PROFILE === 'lifecycle' ? { checks } : {}),
      stage,
      work_unit: workUnit,
    },
    execution: {
      ...(scope ? { responsibility_scope: scope } : {}),
      mode: mode ? orchestration.modes[mode] : null,
      selected,
      ...(loadPlan ? { plan_checks: lifecycle.stages.find(stage => stage.id === 'stage.plan').spec_entry.required_checks.map(id => ({ id, status: 'pending', evidence_refs: [] })) } : {}),
      transition,
      work_unit_route: route,
    },
    skills: selectedSkills(route, skillRegistry),
  };
  if (checkSkills) {
    result.query.check_skills = true;
    result.query.when = [...new Set(when)].sort();
    result.skill_readiness = inspectWorkUnitSkills({ registry: skillRegistry, route, agentRuntime, when: result.query.when });
  }
  if (QUERY_PROFILE === 'lifecycle') {
  const presenter = loadLifecyclePresenter(ROOT);
  result.presentation = { read_only: true, execution_allowed: false, approval_validity: 'not-checked',
    names: presenter.catalog(result.lifecycle), sources: presenter.sources, warnings: presenter.warnings };
  // Include role and transition references from the requested contract subtrees as well.
  Object.assign(result.presentation.names, presenter.catalog(result.execution));
  Object.assign(result.presentation.names, presenter.catalog(presenter.roleIds));
  }
  result.references = [...collectPathReferences(result), LIFECYCLE_REGISTRY_REF, ORCHESTRATION_CONTRACT_REF, SKILL_REGISTRY_REF]
    .filter((value, index, all) => all.indexOf(value) === index)
    .sort();
  result.sources.read_set = validationDependencies().files.map(row=>({ref:path.relative(ROOT,row.file).split(path.sep).join("/"),sha256:row.digest})).sort((a,b)=>a.ref.localeCompare(b.ref,"en"));
  const canonical = canonicalize(result);
  return { ...canonical, context_sha256: sha256(JSON.stringify(canonical)) };
}
