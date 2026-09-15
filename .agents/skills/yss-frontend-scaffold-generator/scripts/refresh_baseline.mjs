#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const skill = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repository = path.resolve(skill, '../../..');
const assets = path.join(skill, 'assets/data-quality-v1');
const sha = bytes => `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
const walk = root => readdirSync(root, { withFileTypes: true }).flatMap(item => item.isDirectory() ? walk(path.join(root, item.name)) : [path.join(root, item.name)]);
const design = readFileSync(path.join(repository, 'DESIGN.md'));
const theme = JSON.parse(readFileSync(path.join(repository, 'docs/design/tokens/theme.json')));
const css = readFileSync(path.join(repository, 'docs/design/tokens/variables.css'), 'utf8');
const token = name => css.match(new RegExp(`--${name}: ([^;]+);`))[1];
const projection = { ...theme, accessibility: { primaryControl: token('yss-color-primary-control'), primaryControlHover: token('yss-color-primary-control-hover') } };
const generated = { 'DESIGN.md': design, 'packages/src/config/theme.json': Buffer.from(JSON.stringify(projection, null, 2) + '\n') };
const write = process.argv.includes('--write');
for (const [relative, bytes] of Object.entries(generated)) {
 const file = path.join(assets, relative);
 if (write) { mkdirSync(path.dirname(file), { recursive: true }); writeFileSync(file, bytes); }
 else if (!readFileSync(file).equals(bytes)) throw new Error(`baseline theme drift: ${relative}`);
}
const files = Object.fromEntries(walk(assets).sort().map(file => [path.relative(assets, file), sha(readFileSync(file))]));
const manifest = { schema_version: 1, baseline_id: 'data-quality-v1', upstream: { project: 'next-gen-data-quality', commit: '532509a59856fc02f3b9bcb28a062663ce887d71', use: 'selected source patterns, reconstructed neutral scaffold; not a complete upstream Git tree', copied_and_adapted: ['packages/src/types/microAppBridge.ts', 'packages/src/utils/microAppRouterBridge.ts'] }, design_source: 'DESIGN.md', design_digest: sha(design), files };
const file = path.join(skill, 'references/data-quality-v1.manifest.json');
const bytes = Buffer.from(JSON.stringify(manifest, null, 2) + '\n');
if (write) { mkdirSync(path.dirname(file), { recursive: true }); writeFileSync(file, bytes); }
else if (!readFileSync(file).equals(bytes)) throw new Error('baseline manifest drift; review files before refresh_baseline.mjs --write');
console.log(sha(bytes));
