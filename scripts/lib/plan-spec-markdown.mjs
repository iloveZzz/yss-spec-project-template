import { parseMarkdown } from '../vendor/markdown.mjs';
import { parseDocument } from '../vendor/yaml.mjs';

export const PROFILE = 'plan-spec-v1';
export const ID_PATTERN = /^(?:FR|NFR|AC|Q|SC)-[A-Za-z0-9][A-Za-z0-9._-]*$|^success-criterion\.[A-Za-z0-9][A-Za-z0-9._-]*$/;
const sectionKinds = new Map([
  ['功能需求', 'FR'], ['Functional Requirements', 'FR'],
  ['非功能需求', 'NFR'], ['Non-functional Requirements', 'NFR'],
  ['验收标准', 'AC'], ['Acceptance Criteria', 'AC'],
  ['未决项', 'Q'], ['Open Questions', 'Q'], ['成功标准', 'SC']
]);
export const requiredFields = {
  FR: ['需求', '优先级', '来源引用', '验收引用', '未决项'],
  NFR: ['需求', '适用条件/负载', '指标及单位', '目标', '确认状态', '验证方法', '来源引用', '验收引用', '未决项'],
  AC: ['需求引用', '前提', '触发', '可观察结果', '场景类型', '未决项'],
  Q: ['问题', '判断依据', '责任人', '解决时点', '接收方 / 解决证据'],
  SC: ['指标定义', '基线或未知原因', '目标', '确认状态', '观测窗口', '数据来源', '验证方式', '未决项']
};
export function plain(node) {
  if (node.value !== undefined) return node.value;
  return (node.children ?? []).map(plain).join('');
}
export function ids(value, kinds = ['FR', 'NFR', 'AC', 'Q', 'SC']) {
  return [...new Set((value ?? '').match(/\b(?:FR|NFR|AC|Q|SC)-[A-Za-z0-9][A-Za-z0-9._-]*\b/g) ?? [])].filter(id => kinds.includes(id.split('-')[0]));
}
export function yamlValue(text) {
  const doc = parseDocument(text, { uniqueKeys: true });
  if (doc.errors.length) throw new Error(doc.errors.map(e => e.message).join('; '));
  return doc.toJS({ maxAliasCount: 0 });
}
export function parseContent(text, file) {
  let frontmatter = {}, body = text;
  if (/^\uFEFF?---\r?\n/.test(text)) {
    const match = text.match(/^\uFEFF?---\r?\n([\s\S]*?)\r?\n(?:---|\.\.\.)(?:\r?\n|$)/);
    if (!match) throw new Error('frontmatter 未闭合');
    frontmatter = yamlValue(match[1]);
    if (!frontmatter || Array.isArray(frontmatter) || typeof frontmatter !== 'object') throw new Error('frontmatter 必须为 mapping');
    body = match[0].replace(/[^\r\n]/g, ' ') + text.slice(match[0].length);
  }
  const tree = parseMarkdown(body), entries = [], sections = [], locators = [], headings = [], conditions = [];
  let section = null, exampleDepth = null;
  for (const node of tree.children) {
    if (node.type === 'heading') {
      const title = plain(node).trim();
      if (exampleDepth !== null && node.depth <= exampleDepth) exampleDepth = null;
      if (/示例|虚构|example/i.test(title)) exampleDepth = node.depth;
      if (exampleDepth !== null) { section = null; continue; }
      headings.push({ value: title, position: node.position });
      const kind = sectionKinds.get(title.replace(/^\d+[.、]\s*/, ''));
      if (kind) {
        section = { kind, position: node.position, count: 0, depth: node.depth, text: '' };
        sections.push(section);
      } else if (section && node.depth <= section.depth) section = null;
      continue;
    }
    if (exampleDepth !== null) continue;
    // Root tables only: quoted, fenced and nested examples are not requirements.
    if (node.type === 'paragraph') {
      conditions.push({ value: plain(node).trim(), position: node.position });
      if (section) section.text += `${plain(node)}\n`;
    }
    if (node.type !== 'table') continue;
    const headers = node.children[0].children.map(cell => plain(cell).trim());
    for (const row of node.children.slice(1)) {
      const values = row.children.map(cell => plain(cell).trim());
      row.children.forEach((cell, index) => conditions.push({ value: values[index], position: cell.position, id: values[0] }));
      if (values[0]) locators.push({ value: values[0], position: row.position });
      if (!section || headers[0] !== 'ID') continue;
      const cells = Object.fromEntries(headers.map((header, i) => [header, {
        text: values[i] ?? '',
        raw: row.children[i]?.children.length ? text.slice(row.children[i].children[0].position.start.offset, row.children[i].children.at(-1).position.end.offset).trim() : '',
        position: row.children[i]?.position ?? row.position
      }]));
      section.count++;
      entries.push({ id: values[0] ?? '', kind: section.kind, fields: Object.fromEntries(headers.map((header, i) => [header, values[i] ?? ''])), cells, file, position: row.position });
    }
  }
  return { file, frontmatter, supported: frontmatter.content_profile === PROFILE, entries, sections, headings, locators, conditions };
}

// Explicit references only; paths here are relative to --root, never discovered by scanning.
export function sourceRefs(value) {
  if (!value?.trim()) return [];
  return value.split(/\s*[;；]\s*/).map(part => {
    const explicit = part.match(/^`?(.+?)`?\s*::\s*(id|heading):(.+)$/);
    if (explicit) return { path: explicit[1].replace(/^`|`$/g, '').trim(), type: explicit[2], locator: explicit[3].replace(/^`|`$/g, '').trim() };
    const link = part.match(/^\[([^\]]+)\]\(([^\s)]+)\)$/);
    if (link) {
      const [target, ...fragment] = link[2].split('#');
      let locator;
      try { locator = decodeURIComponent(fragment.join('#') || link[1]); } catch { return { invalid: part }; }
      const kind = locator.startsWith('heading:') ? 'heading' : 'id';
      return { path: target, type: kind, locator: locator.replace(/^(?:id|heading):/, '') };
    }
    return { invalid: part };
  });
}
