import path from "node:path";
import { ROOT } from "./lifecycle-registry.mjs";
import { validateJsonSchema } from "./json-schema.mjs";

export const TASK_PACKAGE_SCHEMA = path.join(ROOT, "docs/process/schemas/digital-human-task-package.schema.json");
export const LEGACY_TASK_PACKAGE_SCHEMA = path.join(ROOT, "docs/process/schemas/subagent-task-package.schema.json");

export function validateTaskPackageSchema(value, schemaPath = TASK_PACKAGE_SCHEMA) {
  const effectiveSchema = path.resolve(schemaPath) === path.resolve(LEGACY_TASK_PACKAGE_SCHEMA) ? TASK_PACKAGE_SCHEMA : schemaPath;
  validateJsonSchema(value, effectiveSchema, { cwd: ROOT, label: "任务包 schema" });
}
