#!/usr/bin/env node
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export function planPlugin() { throw new Error('legacy-spec-plugin-preparation-unsupported: use the Backend native plugin build'); }
export function checkProject() { throw new Error('legacy-spec-plugin-preparation-unsupported: use the Backend native plugin project-check'); }

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { planPlugin(); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
