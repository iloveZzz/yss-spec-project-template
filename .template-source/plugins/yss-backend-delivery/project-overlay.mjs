import { readFileSync, lstatSync, existsSync } from 'node:fs';
import path from 'node:path';
import { gzipSync } from 'node:zlib';
import { hash, safe } from './runtime.mjs';
import { corePath } from './pack-cli.mjs';

/** A declared development overlay; never rewrites the committed CLI archive or its provenance. */
export function projectOverlay(root, cli, refs, source) {
  const base = new Map(cli.binding.map(file => [file.ref, file]));
  const entries = [];
  for (const ref of [...new Set([...base.keys(), ...refs.filter(corePath)])].sort()) {
    const sourceRef = ref.replace(/^\.(codex|cursor|pi)\/skills\//, '.agents/skills/');
    if (!existsSync(path.join(root, sourceRef))) continue;
    const file = safe(root, sourceRef), bytes = readFileSync(file), mode = lstatSync(file).mode & 0o777;
    if (base.get(ref)?.sha256 === hash(bytes) && base.get(ref)?.mode === mode) continue;
    entries.push({ ref, content: bytes.toString('base64'), sha256: hash(bytes), mode });
    base.set(ref, { ref, sha256: hash(bytes), mode });
  }
  const config = Buffer.from('schema_version: 1\nscope_id: plan-to-backend\n');
  const scope = { ref: '.yss-execution-scope.yaml', sha256: hash(config), mode: 0o644 };
  entries.push({ ...scope, content: config.toString('base64') }); base.set(scope.ref, scope);
  return { archive: gzipSync(Buffer.from(JSON.stringify({ schema_version: 1, source, files: entries }))),
    binding: [...base.values()].sort((a, b) => a.ref.localeCompare(b.ref)) };
}
