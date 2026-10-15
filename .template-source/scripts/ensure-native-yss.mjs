#!/usr/bin/env node
// 用法：eval "$(node .template-source/scripts/ensure-native-yss.mjs)"
// 在本机缓存里构建（或复用）yss-cli-pin.json 固定的 yss，并输出可 eval 的环境变量；进度写 stderr。
import path from "node:path";
import { ensureNativeYss, shellExports } from "./lib/ensure-native-yss.mjs";

try {
  const root = path.resolve(import.meta.dirname, "../..");
  const result = ensureNativeYss({ root, log: (message) => process.stderr.write(`[ensure-native-yss] ${message}\n`) });
  process.stderr.write(`[ensure-native-yss] yss ${result.version}（${result.cached ? "复用缓存" : "新构建"}）\n`);
  process.stdout.write(`${shellExports(result)}\n`);
} catch (error) {
  process.stderr.write(`ensure-native-yss 失败: ${error.message}\n`);
  process.exitCode = 1;
}
