import { AsyncLocalStorage } from 'node:async_hooks';
import { realpathSync } from 'node:fs';
import path from 'node:path';

// A validated v5 source snapshot keeps its glossary under this one fixed alias.
// Ordinary project readers continue to require the root CONTEXT.md.
const snapshots = new AsyncLocalStorage();
export function withSourceContextSnapshot(root, action) {
  const roots = new Set(snapshots.getStore() || []);
  roots.add(path.resolve(root));
  roots.add(realpathSync(root));
  return snapshots.run(roots, action);
}
export function sourceContextRef(root, ref) {
  return ref === 'CONTEXT.md' && snapshots.getStore()?.has(path.resolve(root))
    ? 'source-context.snapshot.md' : ref;
}
