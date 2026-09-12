import { ensure } from './io.mjs';
export function mergeGitignore(current, template, family) {
  const start = `# >>> ${family.packageName} managed rules`;
  const end = `# <<< ${family.packageName} managed rules`;
  const body = Buffer.from(`${start}\n${template.toString().replace(/\s*$/, '')}\n.yss-harness-state/\n${end}\n`);
  const before = current || Buffer.alloc(0);
  const a = before.indexOf(start), b = before.indexOf(end);
  ensure((a === -1 && b === -1) || (a >= 0 && b > a && before.indexOf(start, a + 1) === -1 && before.indexOf(end, b + 1) === -1), '.gitignore 受管标记损坏或重复', 'GITIGNORE');
  if (a === -1) return Buffer.concat([before, before.length && before.at(-1) !== 10 ? Buffer.from('\n') : Buffer.alloc(0), body]);
  ensure((a === 0 || before[a - 1] === 10) && [undefined, 10, 13].includes(before[b + Buffer.byteLength(end)]), '.gitignore 标记必须独占一行', 'GITIGNORE');
  let tail = b + Buffer.byteLength(end);
  if (before[tail] === 13) tail++;
  if (before[tail] === 10) tail++;
  return Buffer.concat([before.subarray(0, a), body, before.subarray(tail)]);
}
