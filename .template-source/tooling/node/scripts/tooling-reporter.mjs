// Machine-readable test identities, separate from the normal Node spec reporter.
export default async function* report(source) {
  const parents = new Map();
  for await (const { type, data } of source) {
    if (type === 'test:start') parents.set(data.nesting, data.name);
    if (['test:pass', 'test:fail'].includes(type)) {
      yield JSON.stringify({ event: type, file: data.file, name: data.name, nesting: data.nesting,
        parents: [...parents].filter(([depth]) => depth < data.nesting).sort(([a], [b]) => a - b).map(([, name]) => name),
        line: data.line, column: data.column, testNumber: data.testNumber, skip: data.skip || false, todo: data.todo || false,
        duration_ms: data.details?.duration_ms, error: data.details?.error?.message }) + '\n';
    }
    if (type === 'test:summary') yield JSON.stringify({ event: type, ...data }) + '\n';
  }
}
