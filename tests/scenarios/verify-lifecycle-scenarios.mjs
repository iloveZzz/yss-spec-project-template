import { runScenario } from "../helpers/scenario-checks.mjs";
// ROUTE_REGISTRY_IDS keeps the lifecycle-to-router stable-ID check discoverable.
try { runScenario("lifecycle"); } catch (error) { process.stderr.write(`${error.message}\n`); process.exitCode = 1; }
