#!/usr/bin/env node
// 安装位置：实例 scripts/check-stage-decision-schema.mjs。替换手写字段白名单。
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseArgs} from 'node:util';
import {spawnSync} from 'node:child_process';
import {readAsset} from './lib/structured-assets.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
try {
  const {values,positionals}=parseArgs({allowPositionals:true,strict:true,options:{'domain-strategy':{type:'string'}}});
  if(positionals.length!==1)throw Error('需要阶段决策包路径');
  const file=path.resolve(positionals[0]),{value}=readAsset(file,'stage-decision-package',{schemaRoot:root});
  if(values['domain-strategy']) {
    const domain=path.resolve(values['domain-strategy']);
    if(domain!==path.resolve(root,value.domain_strategy_ref.persisted_ref))throw Error('领域战略参数与包内权威引用不一致');
    readAsset(domain,'domain-strategy',{schemaRoot:root});
  }
  const result=spawnSync(process.execPath,[path.join(root,'.agents/skills/yss-stage-decision/scripts/validate-stage-decision-package.mjs'),file,'--root',root],{cwd:root,encoding:'utf8',timeout:60000,maxBuffer:4*1024*1024});
  if(result.error)throw result.error;
  process.stdout.write(result.stdout||'');process.stderr.write(result.stderr||'');process.exitCode=result.status===0?0:1;
} catch(error) {process.stderr.write(`阶段决策包校验失败: ${error.message}\n`);process.exitCode=1;}
