import { AsyncLocalStorage } from 'node:async_hooks';
import { realpathSync } from 'node:fs';
import path from 'node:path';

// A validated v5 source snapshot keeps its glossary under this one fixed alias.
// Ordinary project readers continue to require the root CONTEXT.md.
const snapshots = new AsyncLocalStorage();
export function withSourceContextSnapshot(root, action) {
  const previous=snapshots.getStore();
  const roots = new Set(previous?.roots || []);
  roots.add(path.resolve(root));
  roots.add(realpathSync(root));
  return snapshots.run({roots,layouts:previous?.layouts || new Map()}, action);
}

// Only openBundle installs this inventory after authenticating the complete
// legacy package and its fixed export layout. No source files are materialized.
export function withSourceSnapshotLayout(root, inventory, action) {
  const previous=snapshots.getStore(),layouts=new Map(previous?.layouts || []);
  const refs=new Map(inventory.map(row=>[row.original_ref,row.path]));
  const directories=new Map();
  for(const [ref,target]of refs) {
    let source=path.posix.dirname(ref),destination=path.posix.dirname(target);
    while(source!=='.') {
      if(!directories.has(source))directories.set(source,destination);
      else if(directories.get(source)!==destination)directories.set(source,null);
      source=path.posix.dirname(source);destination=path.posix.dirname(destination);
    }
  }
  const layout={refs,directories};
  layouts.set(path.resolve(root),layout);layouts.set(realpathSync(root),layout);
  return snapshots.run({roots:new Set(previous?.roots || []),layouts},action);
}
export function sourceSnapshotFiles(root,prefix='') {
  const layout=snapshots.getStore()?.layouts.get(path.resolve(root));
  if(!layout)return undefined;
  return [...layout.refs.keys()].filter(ref=>!prefix||ref.startsWith(`${prefix}/`)).sort();
}
export function sourceContextRef(root, ref) {
  const current=snapshots.getStore(),layout=current?.layouts.get(path.resolve(root));
  if(layout)return layout.refs.get(ref)||layout.directories.get(ref)||ref;
  return ref === 'CONTEXT.md' && current?.roots.has(path.resolve(root))
    ? 'source-context.snapshot.md' : ref;
}
