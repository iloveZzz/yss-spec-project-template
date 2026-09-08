import path from 'node:path';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { ROOT, read, safe, ensure, hash } from './strategic-handoff-io.mjs';

// The compiler's synchronous boundary reruns the design verifier against current files.
export function enforceTechnicalDesign(state = {}, { root = ROOT } = {}) {
  const binding = state.technical_design;
  const affected = (state.conditions || []).some(value => ['backend-technical-design-impact','tactical-domain','tactical-domain-impact','aggregate-impact','state-machine-impact','invariant-impact','consistency-impact','domain-event-impact','gateway-boundary-impact','persistence-mapping-impact'].includes(value));
  if (!binding && !affected) return;
  ensure(binding?.ref && binding?.digest && binding?.version, '缺少已批准技术设计绑定');
  ensure(state.slice_id, '技术设计消费必须绑定切片 ID');
  const file = safe(root, binding.ref);
  ensure(hash(readFileSync(file)) === binding.digest, '技术设计绑定摘要漂移');
  const data = read(file);
  ensure(data.status === 'approved' && data.version === binding.version, '技术设计必须为批准且绑定版本');
  const family = data.schema_version === 1 && binding.legacy_ddd === true ? 'domain-driven' : data.architecture?.family;
  ensure(family && family === state.architecture_identity?.architecture_family, '技术设计与实现架构不匹配');
  const args = [path.join(ROOT, '.agents/skills/yss-technical-design/scripts/validate-technical-design.mjs'), file, '--root', root, '--slice', state.slice_id];
  if (binding.legacy_ddd === true) args.push('--legacy-ddd');
  const verified = spawnSync(process.execPath, args, { cwd: root, encoding: 'utf8', timeout: 60000, maxBuffer: 2 * 1024 * 1024 });
  ensure(verified.status === 0, `技术设计不可消费: ${verified.error?.message || verified.stderr}`);
}
