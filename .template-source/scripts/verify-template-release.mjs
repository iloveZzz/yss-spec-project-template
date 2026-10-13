#!/usr/bin/env node
import path from 'node:path';
import { parseArgs } from 'node:util';
import { verifyTemplateRelease } from './lib/template-release.mjs';
try {
  const { values } = parseArgs({ options: { commit: { type: 'string' }, output: { type: 'string' }, 'runtime-store': { type: 'string', default: 'off' },'cli-family':{type:'string',default:'all-four'},base:{type:'string'},'baseline-report':{type:'string'},'baseline-report-sha256':{type:'string'},concurrency:{type:'string',default:'1'},'tooling-mode':{type:'string',default:'legacy'},'native-input':{type:'string'},'native-input-sha256':{type:'string'},'required-platforms':{type:'string'},'source-evidence-dir':{type:'string'} }, strict: true });
  if (!['sqlite', 'off'].includes(values['runtime-store'])) throw new Error('--runtime-store 必须为 sqlite 或 off');
  if (!values.commit || !values.output) throw new Error('用法: node .template-source/scripts/verify-template-release.mjs --commit <40位SHA> --output <仓库外新绝对目录>');
  for(const [argument,key]of Object.entries({'native-input':'YSS_RELEASE_NATIVE_INPUT','native-input-sha256':'YSS_RELEASE_NATIVE_INPUT_SHA256','required-platforms':'YSS_RELEASE_REQUIRED_PLATFORMS','source-evidence-dir':'YSS_RELEASE_SOURCE_EVIDENCE_DIR'}))if(values[argument]!==undefined)process.env[key]=values[argument];
  const result = verifyTemplateRelease({ root: path.resolve(import.meta.dirname, '../..'), commit: values.commit, output: values.output, runtimeStore: values['runtime-store'],cliFamily:values['cli-family'],base:values.base,baselineReport:values['baseline-report'],baselineReportDigest:values['baseline-report-sha256'],concurrency:Number(values.concurrency),toolingMode:values['tooling-mode'] });
  process.stdout.write(`模板全量与生成器集成通过: ${result.template_commit}；兼容性结果须按验证合同另行记录，尚未发布。\n`);
} catch (error) {
  process.stderr.write(`发布前验证失败: ${error.message}\n`);
  process.exitCode = 1;
}
