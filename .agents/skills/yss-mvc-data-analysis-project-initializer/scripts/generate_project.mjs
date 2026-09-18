#!/usr/bin/env node
import process from "node:process";
import { fileURLToPath } from "node:url";

export function deprecatedInitializerError() {
  const error = new Error("skill-deprecated: yss-mvc-data-analysis-project-initializer 已由 yss-layered-mvc-scaffold-generator 的 mvc-data-analysis-v1 Profile 替代；旧合同必须标记 stale 并重新编译");
  error.code = "skill-deprecated";
  return error;
}

export async function initialize() {
  throw deprecatedInitializerError();
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.stderr.write(`${deprecatedInitializerError().message}\n`);
  process.exitCode = 1;
}
