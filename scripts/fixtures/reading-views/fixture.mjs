import {mkdtempSync,mkdirSync,readFileSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {stringify} from '../../vendor/yaml.mjs';

export const repo = path.resolve(import.meta.dirname,'../../..');
export function readingFixture(){
  const root=mkdtempSync(path.join(tmpdir(),'yss-reading-'));
  const put=(ref,value)=>{const file=path.join(root,ref);mkdirSync(path.dirname(file),{recursive:true});writeFileSync(file,typeof value==='string'?value:stringify(value));};
  put('yss-project.yaml',{schema_version:1,repository_mode:'project-instance'});
  put('CONTEXT.md','# 业务上下文\n');
  const strategy=JSON.parse(readFileSync(path.join(repo,'scripts/fixtures/strategic-handoff/base-strategy.json'),'utf8'));
  strategy.status='draft';
  strategy.context_snapshot.document_digest='sha256:'+ '0'.repeat(64);
  strategy.context_snapshot.referenced_terms_digest='sha256:'+ '0'.repeat(64);
  strategy.scenarios[0].failure_results=['被任务引用时不得删除；须先解除引用。'];
  strategy.scenarios[0].success_results=['无引用时删除成功。'];
  strategy.extra_constraint={exception:'仅管理员可以修改口令；开发者不可读取明文。',threshold:0,enabled:false};
  put('docs/.scratch/demo/plan/domain-strategy.yaml',strategy);
  const cli=(...args)=>spawnSync(process.execPath,[path.join(repo,'scripts/contract'),...args,'--root',root],{encoding:'utf8'});
  return {root,put,cli,strategy,cleanup:()=>rmSync(root,{recursive:true,force:true})};
}
