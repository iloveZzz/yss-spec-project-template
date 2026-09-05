import { createHash } from 'node:crypto';
import { existsSync, lstatSync, readdirSync, readFileSync, mkdirSync, writeFileSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { parseDocument } from '../vendor/yaml.mjs';
export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const ensure = (condition, message) => { if (!condition) throw new TypeError(message); };
export const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(k => [k, canonical(value[k])])) : value;
export const hash = bytes => `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
export const digest = value => hash(JSON.stringify(canonical(value)));
export const json = value => `${JSON.stringify(canonical(value), null, 2)}\n`;
export function parse(bytes) {
  const doc = parseDocument(String(bytes), { uniqueKeys: true, maxAliasCount: 0 });
  ensure(!doc.errors.length, `YAML/JSON 无效: ${doc.errors[0]?.message}`);
  return doc.toJS({ maxAliasCount: 0 });
}
export const read = file => parse(readFileSync(file, 'utf8'));
export function relative(ref) {
  ensure(typeof ref === 'string' && ref.length > 0 && !/[\\\x00-\x1f:#?]/.test(ref) && !path.posix.isAbsolute(ref) && !ref.split('/').some(x => !x || x === '.' || x === '..') && !/[. ]$/.test(ref), `非法相对路径: ${ref}`);
  return ref;
}
export function safe(root, ref, { missing = false } = {}) {
  relative(ref);
  let current = path.resolve(root);
  ensure(!existsSync(current) || !lstatSync(current).isSymbolicLink(), `根目录不能是 symlink: ${root}`);
  for (const part of ref.split('/')) {
    current = path.join(current, part);
    if (existsSync(current)) ensure(!lstatSync(current).isSymbolicLink(), `禁止 symlink: ${ref}`);
    else ensure(missing, `文件不可读: ${ref}`);
  }
  return current;
}
export function files(root, prefix = '') {
  const base = prefix ? safe(root, prefix) : root;
  return readdirSync(base).sort().flatMap(name => {
    const ref = prefix ? `${prefix}/${name}` : name;
    const full = safe(root, ref), st = lstatSync(full);
    ensure(st.isFile() || st.isDirectory(), `不支持的文件类型: ${ref}`);
    return st.isDirectory() ? files(root, ref) : [ref];
  });
}
export const treeDigest = (root, prefix) => digest(files(root, prefix).map(ref => ({ path: path.posix.relative(prefix, ref), sha256: hash(readFileSync(safe(root, ref))) })));
export function write(root, ref, bytes) {
  const file = safe(root, ref, { missing: true });
  mkdirSync(path.dirname(file), { recursive: true }); writeFileSync(file, bytes, { flag: 'wx' });
}
export function project(root) {
  const value = read(safe(root, 'yss-project.yaml'));
  ensure(value.schema_version === 1 && value.repository_mode === 'project-instance', '只允许 project-instance 导出或导入业务包');
  return realpathSync(root);
}
export function schema(value, ref) {
  const program = 'import json,sys; from jsonschema import Draft202012Validator; s=json.load(open(sys.argv[1])); v=json.load(sys.stdin); errors=list(Draft202012Validator(s).iter_errors(v)); print("\\n".join(str(e) for e in errors)); sys.exit(bool(errors))';
  const out = spawnSync('python3', ['-c', program, safe(ROOT, ref)], { input: JSON.stringify(value), encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 });
  ensure(out.status === 0, `schema 校验失败: ${out.error?.message || out.stdout || out.stderr}`);
}
export function archive(command, source, destination) {
  const out = spawnSync('python3', [path.join(ROOT, 'scripts/lib/strategic-handoff-zip.py'), command, source, destination], { encoding: 'utf8' });
  ensure(out.status === 0, `ZIP 操作失败: ${out.error?.message || out.stderr}`);
}

// Preserve the source profile's legacy product-confirmation semantics when a newer
// receiver no longer has that bucket. This does not change source bytes or gates.
export function sourceApprovalPolicy(source) {
  const roles=structuredClone(source);
  roles.user_decision_policy ||= {gates:[]};
  const policy=roles.gate_policy;
  for(const gate of policy.product_digital_human_with_biological_veto || []) {
    if(!(policy.biological_human||[]).includes(gate) && !(policy.digital_human_review||[]).some(x=>x.gate===gate) && !(policy.dual_digital_human||[]).some(x=>x.gate===gate)) {
      policy.digital_human_review ||= [];policy.digital_human_review.push({gate,countersigners:['role.product-manager']});
    }
  }
  return roles;
}
