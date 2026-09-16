#!/usr/bin/env node
// Test/maintenance harness. CLI production generators never accept an unverified catalog.
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { fixtureCatalog } from "./platform-fixture.mjs";
const [script, ...args] = process.argv.slice(2);
try {
  const generator = await import(pathToFileURL(script));
  const options = generator.parseArgs(args);
  let contract;
  try { contract = JSON.parse(readFileSync(options.contractFile, "utf8")); } catch { contract = null; }
  const platformOptions = contract ? { catalog: fixtureCatalog(contract), candidate: true } : {};
  if (generator.ScaffoldGenerator) await new generator.ScaffoldGenerator(options, platformOptions).generate();
  else await generator.generate(options, { platformOptions });
} catch (error) {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
}
