import { runScenario } from "../../scripts/lib/scenario-checks.mjs";

try { runScenario("yssDtoWire"); } catch (error) { process.stderr.write(`${error.message}\n`); process.exitCode = 1; }
