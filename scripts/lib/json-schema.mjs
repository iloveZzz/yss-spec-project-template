import { existsSync, readFileSync, validationCache } from './validation-phase.mjs';
import { spawnSync } from "node:child_process";
import path from "node:path";
import { pathToFileURL } from 'node:url';

const schemaCache=Symbol('schema-results');
const validator = String.raw`
import json
import sys
import traceback
from jsonschema import Draft202012Validator, FormatChecker
from referencing import Registry, Resource
from referencing.jsonschema import DRAFT202012
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
            schema = json.loads(item['schemaText'])
            Draft202012Validator.check_schema(schema)
            registry = Registry()
            for resource in item.get('resources', []):
                contents = json.loads(resource['text'])
                Draft202012Validator.check_schema(contents)
                registry = registry.with_resource(resource['uri'], Resource.from_contents(contents, default_specification=DRAFT202012))
            validators[key] = Draft202012Validator(schema, registry=registry, format_checker=FormatChecker() if key[1] else None)
        errors = list(validators[key].iter_errors(item['value']))
        if item['errorStyle'] == 'verbose':
            message = '\n'.join(str(error) for error in errors)
        else:
            errors.sort(key=lambda error: [str(part) for part in error.absolute_path])
            message = '\n'.join(f"{'.'.join(str(part) for part in error.absolute_path) or '<root>'}: {error.message}" for error in errors)
        results.append({'valid': not errors, 'error': message})
    except Exception:
        results.append({'valid': False, 'error': traceback.format_exc().strip()})
json.dump(results, sys.stdout)
`;

// Supply the complete local reference closure; never retrieve schemas over the network.
function schemaResources(schemaPath) {
  const resources = new Map(), visited = new Set();
  function load(file, uri) {
    const text = readFileSync(file, 'utf8'), schema = JSON.parse(text);
    const fileURI = pathToFileURL(file).href;
    for (const id of [uri, fileURI, schema.$id].filter(Boolean)) {
      if (resources.has(id) && resources.get(id) !== text) throw new TypeError(`JSON_SCHEMA_ID_CONFLICT: ${id}`);
      resources.set(id, text);
    }
    if (visited.has(file)) return;
    visited.add(file);
    const base = schema.$id || uri || fileURI;
    function refs(value) {
      if (!value || typeof value !== 'object') return;
      for (const [key, ref] of Object.entries(value)) {
        if (['$ref', '$dynamicRef'].includes(key) && typeof ref === 'string' && !ref.startsWith('#')) {
          const resource = ref.split('#')[0], resolved = new URL(resource, base).href;
          if (resources.has(resolved)) continue;
          if (/^[a-z][a-z0-9+.-]*:/i.test(resource) || path.isAbsolute(resource)) throw new TypeError(`JSON_SCHEMA_OFFLINE: unregistered schema ${ref}`);
          load(path.resolve(path.dirname(file), resource), resolved);
        } else refs(ref);
      }
    }
    refs(schema);
  }
  load(schemaPath);
  return [...resources].map(([uri, text]) => ({ uri, text }));
}

/** One immutable validation phase, never a cache of successful work units. */
export function validateJsonSchemas(items, { cwd = process.cwd(), timeoutMs = 30000 } = {}) {
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs <= 0) throw new TypeError("schema timeoutMs 必须是正整数毫秒数");
  if (!Array.isArray(items)) throw new TypeError("schema batch 必须是数组");
  if (!items.length) return [];
  const jobs = items.map(({ value, schemaPath, formatChecker = true, errorStyle = "compact", label = "JSON Schema" }) => {
    const effectiveSchema = path.resolve(schemaPath);
    if (!existsSync(effectiveSchema)) throw new TypeError(`缺少 ${label}: ${effectiveSchema}`);
    if (!["compact", "verbose"].includes(errorStyle)) throw new TypeError(`未知 schema errorStyle: ${errorStyle}`);
    return { value, schemaPath: effectiveSchema, schemaText: readFileSync(effectiveSchema, 'utf8'), resources: schemaResources(effectiveSchema), formatChecker, errorStyle };
  });
  // readall waits for EOF even after the complete JSON has arrived. A known UTF-8
  // byte frame lets the validator finish when a transport keeps its write end open.
  const run = jobs => {
  const input = Buffer.from(JSON.stringify(jobs), "utf8");
  const result = spawnSync("python3", ["-c", validator, String(input.length)], { cwd, encoding: "utf8", input, timeout: timeoutMs, maxBuffer: 16 * 1024 * 1024 });
  if (result.error?.code === "ETIMEDOUT") throw new TypeError(`JSON_SCHEMA_TIMEOUT: schema validation exceeded ${timeoutMs}ms`);
  if (result.error || result.status !== 0) throw new TypeError(result.error?.message || `${result.stdout}${result.stderr}`.trim());
  let results;
  try { results = JSON.parse(result.stdout); } catch { throw new TypeError("JSON_SCHEMA_PROTOCOL: validator returned invalid JSON"); }
  if (!Array.isArray(results) || results.some(item => !item || typeof item.valid !== "boolean" || typeof item.error !== "string")) throw new TypeError("JSON_SCHEMA_PROTOCOL: validator returned invalid result records");
  if (results.length !== jobs.length) throw new TypeError("schema batch 返回数量不匹配");
  return results;
  };
  // Batch identical jobs once and reuse only deterministic checks within this operation.
  // External references retain the uncached path: their dependency closure is not local here.
  const keys=jobs.map(job=>JSON.stringify([job.schemaPath,job.schemaText,job.resources,job.value,job.formatChecker,job.errorStyle,path.resolve(cwd),timeoutMs]));
  const pending=new Map(),cached=new Map();
  for(let i=0;i<jobs.length;i++){
    if(/"\$(?:ref|dynamicRef)"\s*:\s*"(?!#)/.test(jobs[i].schemaText)){pending.set(`${i}:${keys[i]}`,{job:jobs[i],indices:[i],cache:false});continue;}
    const existing=validationCache(schemaCache,keys[i]);
    if(existing!==undefined)cached.set(i,existing);
    else {const item=pending.get(keys[i])||{job:jobs[i],indices:[],key:keys[i],cache:true};item.indices.push(i);pending.set(keys[i],item);}
  }
  const entries=[...pending.values()],computed=entries.length?run(entries.map(x=>x.job)):[];
  entries.forEach((entry,index)=>{const result=computed[index];if(entry.cache&&!result.error.includes('Traceback (most recent call last)'))validationCache(schemaCache,entry.key,result);for(const i of entry.indices)cached.set(i,result);});
  return jobs.map((_,i)=>structuredClone(cached.get(i)));
}

export function validateJsonSchema(value, schemaPath, options = {}) {
  const [result] = validateJsonSchemas([{ value, schemaPath, ...options }], options);
  if (!result.valid) throw new TypeError(result.error);
}
