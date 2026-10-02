#!/usr/bin/env node
import path from 'node:path';
import { parseArgs } from 'node:util';
import { verifyTemplateRelease } from './lib/template-release.mjs';
try {
  const { values } = parseArgs({ options: { commit: { type: 'string' }, output: { type: 'string' }, 'runtime-store': { type: 'string', default: 'off' } }, strict: true });
  if (!['sqlite', 'off'].includes(values['runtime-store'])) throw new Error('--runtime-store 必须为 sqlite 或 off');
  if (!values.commit || !values.output) throw new Error('用法: node .template-source/scripts/verify-template-release.mjs --commit <40位SHA> --output <仓库外新绝对目录>');
  const result = verifyTemplateRelease({ root: path.resolve(import.meta.dirname, '../..'), commit: values.commit, output: values.output, runtimeStore: values['runtime-store'] });
  process.stdout.write(`模板全量与生成器集成通过: ${result.template_commit}；兼容矩阵由 workflow 汇总，尚未发布。\n`);
} catch (error) {
  process.stderr.write(`发布前验证失败: ${error.message}\n`);
  process.exitCode = 1;
}
