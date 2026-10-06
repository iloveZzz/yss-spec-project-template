import { runScenario } from "../../scripts/lib/scenario-checks.mjs";
try { runScenario("matt"); } catch (error) { process.stderr.write(`${error.message}\n`); process.exitCode = 1; }
