#!/usr/bin/env node
// 用法：eval "$(node .template-source/scripts/ensure-native-yss.mjs)"
// 默认每批固定最新正式 Release；--version X.Y.Z 或 --pin/--pin-file 可复现指定输入。
import path from "node:path";
import { parseArgs } from "node:util";
import { ensureNativeYss, shellExports } from "./lib/ensure-native-yss.mjs";

try {
  const root = path.resolve(import.meta.dirname, "../..");
  const {values} = parseArgs({options:{version:{type:'string'},pin:{type:'boolean'},'pin-file':{type:'string'},json:{type:'boolean'}}});
  const result = ensureNativeYss({ root, version:values.version, pinned:values.pin, pinFile:values['pin-file'], log: (message) => process.stderr.write(`[ensure-native-yss] ${message}\n`) });
  process.stderr.write(`[ensure-native-yss] yss ${result.version}（${result.cached ? "复用缓存" : "新构建"}）\n`);
  process.stdout.write(`${values.json ? JSON.stringify(result) : shellExports(result)}\n`);
} catch (error) {
  process.stderr.write(`ensure-native-yss 失败: ${error.message}\n`);
  process.exitCode = 1;
}
