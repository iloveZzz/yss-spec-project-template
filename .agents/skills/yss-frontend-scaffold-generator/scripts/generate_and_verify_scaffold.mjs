#!/usr/bin/env node
import { generate } from "./generate_scaffold.mjs";
import { verify } from "./run_scaffold_verification.mjs";
function argsOf(argv) { const args = {}; for (let i = 0; i < argv.length; i += 2) args[argv[i].replace(/^--/, "")] = argv[i + 1]; return args; }
try {
  const args = argsOf(process.argv.slice(2));
  generate({ contractFile: args["contract-file"], templateCheckout: args["template-checkout"], outputDir: args["output-dir"] });
  const report = verify(args["output-dir"], args["evidence-dir"]);
  if (report.status !== "passed") process.exitCode = 1;
} catch (error) { process.stderr.write(`${error.message}\n`); process.exitCode = 1; }
