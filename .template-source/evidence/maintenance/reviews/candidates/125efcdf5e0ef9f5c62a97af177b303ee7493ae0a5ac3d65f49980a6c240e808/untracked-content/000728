import path from "node:path";
import { parseArgs } from "node:util";
import { DEFAULT_REGISTRY, ROOT, loadRegistry, renderLifecycleStructure, renderWorkUnits, replaceRegion, validateRegistry } from "./lib/lifecycle-registry.mjs";
import { isTemplateSource } from "./lib/repository-mode.mjs";

try {
  const { values } = parseArgs({
    options: { check: { type: "boolean" }, write: { type: "boolean" }, registry: { type: "string" } },
    strict: true
  });
  if (values.check && values.write) throw new TypeError("--check 与 --write 不能同时使用");
  const registryPath = values.registry ? path.resolve(values.registry) : DEFAULT_REGISTRY;
  const registry = validateRegistry(loadRegistry(registryPath));
  const targets = [[
    path.join(ROOT, "docs/process/lifecycle-artifact-map.md"),
    "<!-- lifecycle-registry:structure:start -->",
    "<!-- lifecycle-registry:structure:end -->",
    renderLifecycleStructure(registry)
  ]];
  if (isTemplateSource(ROOT)) {
    targets.push([
      path.join(ROOT, ".template-source/derived/harness-work-unit-map.md"),
      "<!-- lifecycle-registry:work-units:start -->",
      "<!-- lifecycle-registry:work-units:end -->",
      renderWorkUnits(registry)
    ]);
  }
  for (const [target, start, end, rendered] of targets) replaceRegion(target, start, end, rendered, { check: Boolean(values.check) });
  process.stdout.write(`${values.check ? "生命周期派生产物与注册表一致" : "生命周期派生产物已更新"}\n`);
} catch (error) {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
}
