import { validImplementationPath, violation } from "../../scripts/lib/implementation-path-policy.mjs";

const validPaths = {
  "backend registered root": "app/backend/",
  "frontend registered root": "app/frontend/",
  "backend registered nested source": "app/backend/project1/src/main/java/",
  "frontend registered nested source": "app/frontend/project1/src/",
  "backend project 1": "apps/backend/project1/",
  "backend project 2 nested source": "apps/backend/project2/src/main/java/",
  "frontend project 1": "apps/frontend/project1/",
  "external repository native path": "src/main/java/",
  "registered singular backend": "app/backend/project1/",
  "registered singular frontend": "app/frontend/project1/",
  "registered custom layout": "services/billing/"
};

const invalidPaths = {
  "backend container root": "apps/backend/",
  "frontend container root": "apps/frontend/",
  "wildcard project root": "apps/backend/*/",
  traversal: "apps/backend/project1/../project2/",
  "custom traversal": "services/../billing/",
  "absolute Harness root": "/services/billing/",
  "wildcard custom root": "services/*/",
  "backslash alias": "services\\billing/"
};

const externalNativePaths = {
  "external repository app directory": "app/backend/src/main/java/",
  "external repository apps directory": "apps/backend/project1/src/"
};

const failures = [];
for (const [name, value] of Object.entries(validPaths)) {
  if (!validImplementationPath(value)) failures.push(`应允许 ${name}: ${violation(value)}`);
}
for (const [name, value] of Object.entries(invalidPaths)) {
  if (validImplementationPath(value)) failures.push(`应阻断 ${name}`);
}
for (const [name, value] of Object.entries(externalNativePaths)) {
  if (!validImplementationPath(value, { enforceHarness: false })) failures.push(`外部 native root 不应被 Harness 路径策略误伤 ${name}`);
}
if (failures.length > 0) {
  process.stderr.write(`${failures.join("\n")}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write("实现项目路径策略压力场景验证通过\n");
}
