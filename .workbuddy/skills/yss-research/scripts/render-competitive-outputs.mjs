#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { prepareCompetitiveOutputs } from './lib/competitive-analysis.mjs';

try {
  if (process.argv.length !== 3) throw new TypeError('usage: render-competitive-outputs.mjs <slug>-evidence.yaml');
  const evidenceFile = path.resolve(process.argv[2]);
  const data = JSON.parse(readFileSync(evidenceFile, 'utf8'));
  const outputs = prepareCompetitiveOutputs(data, evidenceFile);
  for (const output of outputs) writeFileSync(output.file, output.content, 'utf8');
  process.stdout.write(`YSS competitive outputs rendered (${outputs.map(output => output.filename).join(', ')})\n`);
} catch (error) {
  process.stderr.write(`YSS competitive outputs invalid: ${error.message}\n`);
  process.exitCode = 1;
}
