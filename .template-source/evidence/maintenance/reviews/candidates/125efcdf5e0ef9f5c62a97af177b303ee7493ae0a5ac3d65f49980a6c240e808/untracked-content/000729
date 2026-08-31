import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { parseArgs } from "node:util";
import { DEFAULT_REGISTRY, ROOT, loadRegistry, validateRegistry } from "./lib/lifecycle-registry.mjs";
import { isTemplateSource } from "./lib/repository-mode.mjs";

const schemaValidator = String.raw`
import json
import sys
from jsonschema import Draft202012Validator

with open(sys.argv[1], encoding="utf-8") as schema_file:
    schema = json.load(schema_file)
registry = json.load(sys.stdin)
errors = sorted(Draft202012Validator(schema).iter_errors(registry), key=lambda error: list(error.absolute_path))
if errors:
    for error in errors:
        location = ".".join(str(part) for part in error.absolute_path) or "<root>"
        print(f"{location}: {error.message}", file=sys.stderr)
    sys.exit(1)
`;

function run(command, args, options = {}) {
  return spawnSync(command, args, { cwd: ROOT, encoding: "utf8", ...options });
}

try {
  const { values } = parseArgs({ options: { registry: { type: "string" } }, strict: true });
  const registryPath = values.registry ? path.resolve(values.registry) : DEFAULT_REGISTRY;
  const schemaPath = path.join(ROOT, "docs/process/schemas/lifecycle-registry.schema.json");
  const schema = JSON.parse(readFileSync(schemaPath, "utf8"));
  if (schema.properties?.schema_version?.const !== 1) throw new TypeError("生命周期注册表 JSON Schema 缺少 schema_version 约束");
  const registry = loadRegistry(registryPath);
  const schemaResult = run("python3", ["-c", schemaValidator, schemaPath], { input: JSON.stringify(registry) });
  if (schemaResult.status !== 0) throw new TypeError(`JSON Schema 校验失败: ${schemaResult.stdout}${schemaResult.stderr}`);
  validateRegistry(registry);
  if (registryPath === DEFAULT_REGISTRY) {
    const generated = run("node", ["scripts/node-generate-lifecycle-artifacts.mjs", "--check"]);
    if (generated.status !== 0) throw new TypeError(`${generated.stdout}${generated.stderr}`.trim());
    for (const relativePath of ["docs/process/lifecycle-registry.yaml", "docs/process/lifecycle-registry-baseline.json", "docs/process/schemas/lifecycle-registry.schema.json"]) {
      const ignored = run("git", ["check-ignore", "-q", relativePath]);
      if (ignored.status === 0) throw new TypeError(`权威注册表资产不得被 Git 忽略: ${relativePath}`);
    }
    const stalePaths = ["AGENTS.md", "README.md", ".agents/skills/yss-strategic-design/SKILL.md", "docs/process/lifecycle-artifact-map.md"];
    if (isTemplateSource(ROOT)) {
      stalePaths.push("docs/user-guide/产品生命周期工作流.md", ".template-source/derived/harness-work-unit-map.md");
    }
    for (const relativePath of stalePaths) {
      const filePath = path.join(ROOT, relativePath);
      if (!existsSync(filePath)) continue;
      if (/\d+\s*个(?:主阶段|门禁|工作单元|职责点)/.test(readFileSync(filePath, "utf8"))) {
        throw new TypeError(`${relativePath} 不得手工声明生命周期对象数量；请引用 lifecycle-registry.yaml`);
      }
    }
    if (isTemplateSource(ROOT)) {
      const publicSkills = JSON.parse(readFileSync(path.join(ROOT, "yss-public-skills.json"), "utf8"));
      const groups = new Map(publicSkills.groupings.map((group) => [group.title, group.skills]));
      if (groups.get("战略设计")?.includes("yss-strategic-design") !== true) throw new TypeError("yss-strategic-design 必须在战略设计分组");
      if (JSON.stringify(publicSkills.skills).includes("yss-web-controller")) throw new TypeError("当前分支不得导出 yss-web-controller");
    }
  }
  process.stdout.write(`生命周期注册表验证通过（${registry.status}）\n`);
} catch (error) {
  process.stderr.write(`生命周期注册表验证失败: ${error.message}\n`);
  process.exitCode = 1;
}
