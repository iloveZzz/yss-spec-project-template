import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const DEFAULT_PATTERNS_PATH = path.join(path.dirname(fileURLToPath(import.meta.url)), 'doc-facts-patterns.json');

const REVISION = /([\w.-]+\/[\w.-]+)?[^\s`]*?@([0-9a-f]{7,40})\b/g;

// 只支持精确路径和 `<目录>/*.md` 两种写法；目录不存在时跳过。
export function expandFiles(root, entries) {
  const files = [];
  for (const entry of entries) {
    if (!entry.includes('*')) {
      if (fs.existsSync(path.join(root, entry))) files.push(entry);
      continue;
    }
    const dir = path.posix.dirname(entry);
    const suffix = path.posix.basename(entry).replace('*', '');
    const absolute = path.join(root, dir);
    if (!fs.existsSync(absolute)) continue;
    for (const name of fs.readdirSync(absolute).sort()) {
      if (name.endsWith(suffix) && fs.statSync(path.join(absolute, name)).isFile()) files.push(path.posix.join(dir, name));
    }
  }
  return [...new Set(files)];
}

function lockSources(root) {
  const lockPath = path.join(root, 'skills-lock.json');
  if (!fs.existsSync(lockPath)) return {};
  return JSON.parse(fs.readFileSync(lockPath, 'utf8')).sources ?? {};
}

function revisionFindings(file, lines, sources) {
  const findings = [];
  lines.forEach((line, index) => {
    for (const match of line.matchAll(REVISION)) {
      const source = match[1] ?? Object.keys(sources).find((name) => (lines[index - 1] ?? '').includes(name));
      const locked = source ? sources[source]?.revision : undefined;
      const detail = locked && !locked.startsWith(match[2])
        ? `revision 与 skills-lock.json 不一致（lock: ${locked}）`
        : '说明文档硬编码上游 revision';
      findings.push({ file, line: index + 1, rule: 'upstream-revision', text: match[0], detail, authority: 'skills-lock.json#sources' });
    }
  });
  return findings;
}

// 反引号路径与 Markdown 链接目标；只检查含 `/`、带扩展名或以 `/` 结尾的路径形 token。
const PATH_TOKEN = /`([^`\s]+)`|\]\(([^)\s#]+)(?:#[^)]*)?\)/g;
const PATH_SHAPE = /^[\w.\-\/\u4e00-\u9fff]+$/u;

function pathCandidates(root, file, ref) {
  const candidates = [path.join(root, ref), path.join(root, path.dirname(file), ref)];
  const profile = /^profiles\/([^/]+)\//.exec(file);
  if (profile) candidates.push(path.join(root, 'profiles', profile[1], ref));
  return candidates;
}

// allow 项：`path` 精确匹配（以 `/` 结尾时按目录前缀），`prefix` 按字符串前缀。
function allowed(item, ref) {
  if (item.prefix) return ref.startsWith(item.prefix);
  return ref === item.path || (item.path.endsWith('/') && ref.startsWith(item.path));
}

function pathRefFindings(root, file, lines, allow) {
  const findings = [];
  lines.forEach((line, index) => {
    for (const match of line.matchAll(PATH_TOKEN)) {
      const ref = (match[1] ?? match[2]).replace(/^\.\//, '');
      if (/^[a-z]+:/i.test(ref) || !ref.includes('/') || !PATH_SHAPE.test(ref)) continue;
      if (!/\.[A-Za-z0-9]+$|\/$/.test(ref)) continue;
      if (allow.some((item) => allowed(item, ref))) continue;
      if (pathCandidates(root, file, ref).some((candidate) => fs.existsSync(candidate))) continue;
      findings.push({ file, line: index + 1, rule: 'path-ref', text: ref, detail: '引用路径不存在', authority: 'scripts/lib/doc-facts-patterns.json#pathRefs.allow' });
    }
  });
  return findings;
}

function pinFindings(root, entries = []) {
  const findings = [];
  for (const entry of entries) {
    if (!entry || !Array.isArray(entry.files) || typeof entry.regex !== 'string' || !entry.expected?.file || !entry.expected?.path) throw new TypeError('pinFacts 配置无效');
    const expectedPath = path.join(root, entry.expected.file);
    if (!fs.existsSync(expectedPath)) continue;
    const expected = JSON.parse(fs.readFileSync(expectedPath, 'utf8'))?.[entry.expected.path];
    if (expected === undefined) throw new TypeError('pinFacts 缺少期望值: ' + entry.expected.file + '#' + entry.expected.path);
    for (const file of expandFiles(root, entry.files)) {
      const lines = fs.readFileSync(path.join(root, file), 'utf8').split('\n');
      lines.forEach((line, index) => {
        let expression;
        try { expression = new RegExp(entry.regex, 'g'); } catch (error) { throw new TypeError('pinFacts regex 无效: ' + error.message); }
        for (const match of line.matchAll(expression)) {
          if (match[1] === String(expected)) continue;
          findings.push({ file, line: index + 1, rule: 'pin-fact', text: match[0], detail: '期望 ' + expected, authority: entry.authority ?? entry.expected.file + '#' + entry.expected.path });
        }
      });
    }
  }
  return findings;
}

export function checkDocFacts(root, { patternsPath = DEFAULT_PATTERNS_PATH } = {}) {
  const config = JSON.parse(fs.readFileSync(patternsPath, 'utf8'));
  const patterns = config.patterns.map((pattern) => ({ ...pattern, re: new RegExp(pattern.regex, 'g') }));
  const revisionFiles = new Set(config.revisionFiles ?? []);
  const sources = lockSources(root);
  const pathRefFiles = new Set(expandFiles(root, config.pathRefs?.files ?? []));
  const allow = config.pathRefs?.allow ?? [];
  const findings = [];
  for (const file of expandFiles(root, [...config.files, ...pathRefFiles])) {
    const lines = fs.readFileSync(path.join(root, file), 'utf8').split('\n');
    const fileFindings = [];
    lines.forEach((line, index) => {
      for (const pattern of patterns) {
        for (const match of line.matchAll(pattern.re)) {
          fileFindings.push({ file, line: index + 1, rule: pattern.id, text: match[0], detail: '说明文档复述可计数事实', authority: pattern.authority });
        }
      }
    });
    if (revisionFiles.has(file)) fileFindings.push(...revisionFindings(file, lines, sources));
    if (pathRefFiles.has(file)) fileFindings.push(...pathRefFindings(root, file, lines, allow));
    findings.push(...fileFindings.sort((left, right) => left.line - right.line));
  }
  findings.push(...pinFindings(root, config.pinFacts ?? []));
  return findings;
}

export function formatFinding(finding) {
  if (finding.rule === 'path-ref') return `${finding.file}:${finding.line}  ${finding.text}  ${finding.detail} → 修正路径，或在 ${finding.authority} 登记并写明原因`;
  return `${finding.file}:${finding.line}  ${finding.text}  ${finding.detail} → 应链接 ${finding.authority}`;
}
