// Use clean, pinned CLI checkouts. No installation into the user's plugin directory.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
const [backendCli,designCli,output]=process.argv.slice(2);
if(!output)throw Error('plugin-smoke.mjs <pinned-backend-cli> <pinned-design-cli> <report.json>');
const root=path.resolve(import.meta.dirname,'../../..');
const scratch=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'contract-plugin-final-'))),rows=[];
function run(args,cwd=root){const result=spawnSync(process.execPath,args,{cwd,encoding:'utf8',timeout:180000,maxBuffer:16*1024*1024});if(result.status!==0)throw Error(`${args.join(' ')}: ${result.stderr||result.stdout}`);return JSON.parse(result.stdout);}
try{
 for(const [name,cli] of [['yss-backend-delivery',backendCli],['yss-product-design',designCli]]){
  const plugin=path.join(scratch,name),target=path.join(scratch,`${name}-fixture`),entry=path.join(plugin,'scripts/plugin.mjs');
  run([path.join(root,`.template-source/plugins/${name}/build.mjs`),'--output',plugin,'--cli-root',path.resolve(cli)]);
  const verified=run([entry,'verify']);
  const plan=run([entry,'project-plan','--target-dir',target,'--project-name','合同工具验收','--business-domain','模板维护',...(name==='yss-backend-delivery'?['--team-size','1','--issue-tracker','github']:[])]);
  const planFile=path.join(scratch,`${name}-plan.json`);fs.writeFileSync(planFile,JSON.stringify(plan));
  run([entry,'project-apply','--plan',planFile]);
  const checked=run([entry,'project-check','--target-dir',target]);
  fs.writeFileSync(path.join(target,'contract-smoke.md'),'# 合同工具验收\n\n约束：保留执行边界。\n');
  const view=run([path.join(target,'scripts/contract'),'view','contract-smoke.md','--kind','spec','--json'],target);
  if(view.execution_allowed!==false||!view.markdown.includes('保留执行边界'))throw Error('Reader did not preserve constraints');
  if(!fs.existsSync(path.join(target,'.template-spec/process/schemas/api-contract-decision-v2.schema.json')))throw Error('Missing API v2 schema');
  rows.push({plugin:name,build_verify_init_check_read:'passed',verify:verified.result,project_check:checked.result,release_ready:false});
  console.log(`${name}: build/verify/project-plan/apply/check/read passed`);
  fs.writeFileSync(output,JSON.stringify({kind:'development-only-plugin-smoke',release_ready:false,rows},null,2)+'\n');
 }
}finally{fs.rmSync(scratch,{recursive:true,force:true});}
