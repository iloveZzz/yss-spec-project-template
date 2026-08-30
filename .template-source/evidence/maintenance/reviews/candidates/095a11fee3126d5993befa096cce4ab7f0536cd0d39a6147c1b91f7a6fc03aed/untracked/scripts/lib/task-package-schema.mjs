import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { ROOT } from "./lifecycle-registry.mjs";

export const TASK_PACKAGE_SCHEMA = path.join(ROOT, "docs/process/schemas/digital-human-task-package.schema.json");
export const LEGACY_TASK_PACKAGE_SCHEMA = path.join(ROOT, "docs/process/schemas/subagent-task-package.schema.json");

export function validateTaskPackageSchema(value, schemaPath = TASK_PACKAGE_SCHEMA) {
  const effectiveSchema = path.resolve(schemaPath) === path.resolve(LEGACY_TASK_PACKAGE_SCHEMA) ? TASK_PACKAGE_SCHEMA : schemaPath;
  if (!existsSync(effectiveSchema)) throw new TypeError(`缺少任务包 schema: ${effectiveSchema}`);
  const validator = String.raw`
import json
import sys
from jsonschema import Draft202012Validator
schema = json.load(open(sys.argv[1], encoding="utf-8"))
value = json.load(sys.stdin)
errors = sorted(Draft202012Validator(schema).iter_errors(value), key=lambda error: list(error.absolute_path))
for error in errors:
    location = ".".join(str(part) for part in error.absolute_path) or "<root>"
    print(f"{location}: {error.message}", file=sys.stderr)
sys.exit(1 if errors else 0)
`;
  const result = spawnSync("python3", ["-c", validator, effectiveSchema], { cwd: ROOT, encoding: "utf8", input: JSON.stringify(value) });
  if (result.status !== 0) throw new TypeError(`${result.stdout}${result.stderr}`.trim());
}
