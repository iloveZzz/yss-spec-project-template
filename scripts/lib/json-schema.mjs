import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";

const validator = String.raw`
import json
import sys
import traceback
from jsonschema import Draft202012Validator, FormatChecker
validators = {}
results = []
expected_bytes = int(sys.argv[1])
payload = sys.stdin.buffer.read(expected_bytes)
if len(payload) != expected_bytes:
    raise ValueError(f"JSON_SCHEMA_PROTOCOL: truncated input frame: expected {expected_bytes} bytes, received {len(payload)}")
try:
    jobs = json.loads(payload.decode('utf-8'))
except (UnicodeDecodeError, json.JSONDecodeError) as error:
    raise ValueError(f"JSON_SCHEMA_PROTOCOL: invalid UTF-8 JSON input frame: {error}") from error
for item in jobs:
    try:
        key = (item['schemaPath'], item['formatChecker'])
        if key not in validators:
            with open(item['schemaPath'], encoding='utf-8') as source:
                schema = json.load(source)
            validators[key] = Draft202012Validator(schema, format_checker=FormatChecker() if key[1] else None)
        errors = list(validators[key].iter_errors(item['value']))
        if item['errorStyle'] == 'verbose':
            message = '\n'.join(str(error) for error in errors)
        else:
            errors.sort(key=lambda error: list(error.absolute_path))
            message = '\n'.join(f"{'.'.join(str(part) for part in error.absolute_path) or '<root>'}: {error.message}" for error in errors)
        results.append({'valid': not errors, 'error': message})
    except Exception:
        results.append({'valid': False, 'error': traceback.format_exc().strip()})
json.dump(results, sys.stdout)
`;

/** One immutable validation phase, never a cache of successful work units. */
export function validateJsonSchemas(items, { cwd = process.cwd(), timeoutMs = 30000 } = {}) {
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs <= 0) throw new TypeError("schema timeoutMs 必须是正整数毫秒数");
  if (!Array.isArray(items)) throw new TypeError("schema batch 必须是数组");
  if (!items.length) return [];
  const jobs = items.map(({ value, schemaPath, formatChecker = true, errorStyle = "compact", label = "JSON Schema" }) => {
    const effectiveSchema = path.resolve(schemaPath);
    if (!existsSync(effectiveSchema)) throw new TypeError(`缺少 ${label}: ${effectiveSchema}`);
    if (!["compact", "verbose"].includes(errorStyle)) throw new TypeError(`未知 schema errorStyle: ${errorStyle}`);
    return { value, schemaPath: effectiveSchema, formatChecker, errorStyle };
  });
  // readall waits for EOF even after the complete JSON has arrived. A known UTF-8
  // byte frame lets the validator finish when a transport keeps its write end open.
  const input = Buffer.from(JSON.stringify(jobs), "utf8");
  const result = spawnSync("python3", ["-c", validator, String(input.length)], { cwd, encoding: "utf8", input, timeout: timeoutMs, maxBuffer: 16 * 1024 * 1024 });
  if (result.error?.code === "ETIMEDOUT") throw new TypeError(`JSON_SCHEMA_TIMEOUT: schema validation exceeded ${timeoutMs}ms`);
  if (result.error || result.status !== 0) throw new TypeError(result.error?.message || `${result.stdout}${result.stderr}`.trim());
  let results;
  try { results = JSON.parse(result.stdout); } catch { throw new TypeError("JSON_SCHEMA_PROTOCOL: validator returned invalid JSON"); }
  if (!Array.isArray(results) || results.some(item => !item || typeof item.valid !== "boolean" || typeof item.error !== "string")) throw new TypeError("JSON_SCHEMA_PROTOCOL: validator returned invalid result records");
  if (results.length !== jobs.length) throw new TypeError("schema batch 返回数量不匹配");
  return results;
}

export function validateJsonSchema(value, schemaPath, options = {}) {
  const [result] = validateJsonSchemas([{ value, schemaPath, ...options }], options);
  if (!result.valid) throw new TypeError(result.error);
}
