import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "../..");
const skill = readFileSync(path.join(root, ".agents/skills/yss-product-lifecycle/references/plan-requirements.md"), "utf8");
for (const marker of ["yss context check --root . --json", "domain-modeling/CONTEXT-FORMAT.md", "<ContextId>/<EnglishIdentifier>", "context_reconciliation", "referenced_terms_digest", "template-source", "not-applicable", "yss-product-lifecycle"]) {
  if (!skill.includes(marker)) throw new Error(`plan-requirements 缺少统一 Context Contract 标记: ${marker}`);
}
for (const script of ["tests/scenarios/verify-context-contract-scenarios.mjs", "tests/scenarios/verify-context-reconciliation-scenarios.mjs"]) {
  const result = spawnSync(process.execPath, [path.join(root, script)], { cwd: root, encoding: "utf8" });
  if (result.status !== 0) throw new Error(`${script} failed\n${result.stdout}${result.stderr}`);
}
process.stdout.write("plan-requirements Context Contract scenarios passed\n");
