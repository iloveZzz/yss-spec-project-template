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

export function checkDocFacts(root, { patternsPath = DEFAULT_PATTERNS_PATH } = {}) {
  const config = JSON.parse(fs.readFileSync(patternsPath, 'utf8'));
  const patterns = config.patterns.map((pattern) => ({ ...pattern, re: new RegExp(pattern.regex, 'g') }));
  const revisionFiles = new Set(config.revisionFiles ?? []);
  const sources = lockSources(root);
  const findings = [];
  for (const file of expandFiles(root, config.files)) {
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
    findings.push(...fileFindings.sort((left, right) => left.line - right.line));
  }
  return findings;
}

export function formatFinding(finding) {
  return `${finding.file}:${finding.line}  ${finding.text}  ${finding.detail} → 应链接 ${finding.authority}`;
}
