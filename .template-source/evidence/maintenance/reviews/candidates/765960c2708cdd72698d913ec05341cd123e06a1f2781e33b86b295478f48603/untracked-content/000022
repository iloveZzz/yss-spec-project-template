import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";

export function validateJsonSchema(value, schemaPath, { cwd = process.cwd(), label = "JSON Schema" } = {}) {
  const effectiveSchema = path.resolve(schemaPath);
  if (!existsSync(effectiveSchema)) throw new TypeError(`缺少 ${label}: ${effectiveSchema}`);
  const validator = String.raw`
import json
import sys
from jsonschema import Draft202012Validator, FormatChecker
schema = json.load(open(sys.argv[1], encoding="utf-8"))
value = json.load(sys.stdin)
errors = sorted(Draft202012Validator(schema, format_checker=FormatChecker()).iter_errors(value), key=lambda error: list(error.absolute_path))
for error in errors:
    location = ".".join(str(part) for part in error.absolute_path) or "<root>"
    print(f"{location}: {error.message}", file=sys.stderr)
sys.exit(1 if errors else 0)
`;
  const result = spawnSync("python3", ["-c", validator, effectiveSchema], { cwd, encoding: "utf8", input: JSON.stringify(value) });
  if (result.status !== 0) throw new TypeError(`${result.stdout}${result.stderr}`.trim());
}
