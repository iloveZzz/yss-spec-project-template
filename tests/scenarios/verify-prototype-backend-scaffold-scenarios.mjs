import { runScenario } from "../helpers/scenario-checks.mjs";
try { runScenario("prototype"); } catch (error) { process.stderr.write(`${error.message}\n`); process.exitCode = 1; }
