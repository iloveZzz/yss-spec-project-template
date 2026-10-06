#!/usr/bin/env node
import path from 'node:path';
import { parseArgs } from 'node:util';
import identity from './identity.json' with { type: 'json' };
import { buildNative } from '../yss-backend-delivery/native-build.mjs';
export function build(options = {}) { return buildNative({ ...options, binary: options.binary || process.env.YSS_PLUGIN_BINARY, profile: 'design', identity, pluginRoot: import.meta.dirname }); }
if (process.argv[1] && path.resolve(process.argv[1]) === import.meta.filename) {
  try { const { values } = parseArgs({ options: { output: { type: 'string' }, binary: { type: 'string' }, 'binary-commit': { type: 'string' } } });
    console.log(JSON.stringify(build({ output: values.output, binary: values.binary, binaryCommit: values['binary-commit'] }), null, 2));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
