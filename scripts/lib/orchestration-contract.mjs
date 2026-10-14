import { createHash } from 'node:crypto';
import { parseDocument, YAMLMap, YAMLSeq } from '../vendor/yaml.mjs';

// 编排合同可以是单个文件，也可以是「清单 + parts」：清单的顶层 `parts` 列出同目录下的部件文件，
// 每个部件是顶层策略的映射。合并结果与把所有部件顺序拼成一个文件等价。
// 只有 MERGED_KEYS 里的顶层键允许跨部件合并（子键不得重复），其余同名键视为错误。
export const MERGED_KEYS = ['work_unit_routes'];

const parse = (text, ref) => {
  const document = parseDocument(text, { maxAliasCount: 0, uniqueKeys: true });
  if (document.errors.length || document.warnings.length) throw new Error(`${ref}: ${(document.errors[0] || document.warnings[0]).message}`);
  const visit = (node, depth = 0) => {
    if (!node) return;
    if (depth > 512 || node.anchor || node.tag) throw new Error(`${ref}: 禁止过深嵌套、锚点或显式标签`);
    if (node instanceof YAMLMap) for (const pair of node.items) {
      if (!pair.key || typeof pair.key.value !== 'string' || pair.key.value === '<<') throw new Error(`${ref}: 映射键必须为字符串且不得合并`);
      visit(pair.key, depth + 1); visit(pair.value, depth + 1);
    }
    else if (node instanceof YAMLSeq) node.items.forEach(item => visit(item, depth + 1));
    else if (!Object.hasOwn(node, 'value')) throw new Error(`${ref}: 禁止别名`);
  };
  visit(document.contents);
  const value = document.toJS({ maxAliasCount: 0 });
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${ref}: 编排合同必须是对象`);
  return value;
};
const bytesOf = (value) => (typeof value === 'string' ? Buffer.from(value, 'utf8') : Buffer.from(value));
const dirname = (ref) => ref.slice(0, ref.lastIndexOf('/') + 1);

function partRef(rootRef, part) {
  if (typeof part !== 'string' || !part || part.startsWith('/') || /[\\\x00-\x1f:#?]/.test(part) || part.split('/').some((item) => !item || item === '.' || item === '..')) {
    throw new Error(`${rootRef}: 非法的合同部件路径 ${JSON.stringify(part)}`);
  }
  return `${dirname(rootRef)}${part}`;
}

/**
 * 读取并合并编排合同。`read(ref)` 返回仓库相对路径的字节或字符串，由调用方决定如何做路径与符号链接防护。
 * 返回 { value, refs, digest }：refs 是清单加全部部件（按清单顺序），digest 覆盖这些文件的字节。
 * 不含 parts 的单文件合同，digest 与该文件的 SHA-256 完全相同。
 */
export function loadOrchestrationContract(read, rootRef) {
  let source;
  try { source = read(rootRef); }
  catch(error) {
    if(error.code !== 'ENOENT' || rootRef !== '.template-spec/process/orchestration-contract.yaml') throw error;
    let owner = 'yss-product-lifecycle';
    try {
      const profile = parse(String(read('.template-spec/process/harness-profile.yaml')), 'harness-profile').profile_id;
      owner = {'harness.spec-template':'yss-product-lifecycle','harness.backend-delivery':'harness-orchestrator','harness.business-ddd-strategy-handoff':'yss-strategic-design'}[profile];
      if(!owner) throw new Error('未知合同 Profile');
    } catch(profileError) { if(profileError.code !== 'ENOENT') throw profileError; }
    rootRef = `.agents/skills/${owner}/references/orchestration-contract.yaml`;
    source = read(rootRef);
  }
  const rootBytes = bytesOf(source);
  const decode = bytes => new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  const root = parse(decode(rootBytes), rootRef);
  if (!Object.hasOwn(root, 'parts')) {
    return { value: root, refs: [rootRef], digest: createHash('sha256').update(rootBytes).digest('hex') };
  }
  const { parts, ...value } = root;
  if (!Array.isArray(parts) || parts.length === 0) throw new Error(`${rootRef}: parts 必须是非空数组`);
  const refs = [rootRef];
  const hash = createHash('sha256');
  const frame = (ref, bytes) => hash.update(`${ref}\0${bytes.length}\0`).update(bytes).update('\0');
  frame(rootRef, rootBytes);
  const seen = new Set();
  for (const part of parts) {
    const ref = partRef(rootRef, part);
    if (seen.has(ref)) throw new Error(`${rootRef}: 合同部件重复 ${part}`);
    seen.add(ref);
    const bytes = bytesOf(read(ref));
    frame(ref, bytes);
    refs.push(ref);
    for (const [key, item] of Object.entries(parse(decode(bytes), ref))) {
      if (key === 'parts') throw new Error(`${ref}: 部件不得再声明 parts`);
      if (!Object.hasOwn(value, key)) { Object.defineProperty(value, key, {value: item, enumerable: true, writable: true, configurable: true}); continue; }
      const mergeable = MERGED_KEYS.includes(key) && item && typeof item === 'object' && !Array.isArray(item)
        && value[key] && typeof value[key] === 'object' && !Array.isArray(value[key]);
      if (!mergeable) throw new Error(`${ref}: 顶层策略 ${key} 重复定义`);
      for (const [child, body] of Object.entries(item)) {
        if (Object.hasOwn(value[key], child)) throw new Error(`${ref}: ${key}.${child} 重复定义`);
        Object.defineProperty(value[key], child, {value: body, enumerable: true, writable: true, configurable: true});
      }
    }
  }
  return { value, refs, digest: hash.digest('hex') };
}

export const orchestrationContractValue = (read, rootRef) => loadOrchestrationContract(read, rootRef).value;
