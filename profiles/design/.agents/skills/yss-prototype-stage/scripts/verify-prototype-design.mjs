#!/usr/bin/env node
// One strict entrypoint for source, build and actual browser evidence.
import {readFile,writeFile,mkdir,mkdtemp,readdir,realpath,cp} from 'node:fs/promises';
import {existsSync,realpathSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath,pathToFileURL} from 'node:url';
const skill=fileURLToPath(new URL('../',import.meta.url));
const repository=path.resolve(skill,'../../..');
const sha=bytes=>'sha256:'+createHash('sha256').update(bytes).digest('hex');
async function sourceSnapshot(){
 const files={};
 async function walk(target){const stat=await import('node:fs/promises').then(fs=>fs.lstat(target));if(stat.isSymbolicLink())throw Error(`来源不接受符号链接: ${target}`);if(stat.isDirectory()){for(const name of (await readdir(target)).sort())await walk(path.join(target,name));}else files[path.relative(repository,target)]=sha(await readFile(target));}
 for(const target of [skill,path.resolve(skill,'../yss-design-system'),path.resolve(skill,'../prototype-review'),...['DESIGN.md','.template-spec','scripts/lib','scripts/vendor'].map(ref=>path.join(repository,ref))])await walk(target);
 // Optional aliases are not inputs to the canonical entry. Bind their absence too.
 for(const ref of ['scripts/verify-prototype-design','tests/scenarios/verify-yss-prototype-contract-scenarios.mjs']){const target=path.join(repository,ref);if(existsSync(target))await walk(target);else files[ref]=null;}
 return {digest:sha(JSON.stringify(files)),files};
}
export async function verifyPrototypeDesign({scope='all',toolchain=process.env.YSS_VUE_TOOLCHAIN,browserTools=process.env.YSS_PLAYWRIGHT_MODULE,output}={}){
 if(!['contract','browser','all'].includes(scope))throw Error('scope 必须为 contract、browser 或 all');
 output=output?path.resolve(output):await mkdtemp(path.join(os.tmpdir(),'yss-prototype-design-'));
 await mkdir(output,{recursive:true});output=await realpath(output);
 const sourceRoot=await realpath(repository);if(output===sourceRoot||output.startsWith(sourceRoot+path.sep))throw Error('验证输出必须在仓库外');
 if((await readdir(output)).length)throw Error('验证输出非空，拒绝覆盖历史证据');
 const report={schema_version:1,scope,status:'running',started_at:new Date().toISOString(),output,source:null,tools:{node:process.version},checks:[],counts:{passed:0,failed:0,'not-executed':0,'not-applicable':0},limitations:['自动化结果不构成人工视觉批准、读屏结论或真实用户效果。']};
 const env={...process.env,TMPDIR:output,YSS_PROTOTYPE_EVIDENCE_DIR:output};
 delete env.NODE_TEST_CONTEXT; // 子进程独立输出 TAP，不继承父级 node --test 的内部传输协议。
 const add=(id,status,reason,extra={})=>report.checks.push({id,status,...(reason?{reason}:{}),...extra});
 async function run(id,args){
  const log=path.join(output,id+'.log'),command=[process.execPath,...args];
  const started=Date.now();let bytes='';
  const exitCode=await new Promise(resolve=>{const p=spawn(command[0],command.slice(1),{cwd:repository,env,stdio:['ignore','pipe','pipe']});for(const stream of [p.stdout,p.stderr])stream.on('data',d=>{bytes+=d;});p.on('error',e=>{bytes+=e.stack;resolve(-1);});p.on('close',code=>resolve(code??-1));});
  await writeFile(log,bytes);const skips=Number([...bytes.matchAll(/^# skipped (\d+)/gm)].reduce((n,m)=>n+Number(m[1]),0));
  const reports=bytes.split('\n').filter(line=>line.startsWith(output+path.sep)&&line.endsWith('.json'));
  const assertions=Object.fromEntries(['tests','pass','fail','skipped','cancelled'].map(key=>[key,[...bytes.matchAll(new RegExp('^# '+key+' (\\d+)','gm'))].reduce((n,m)=>n+Number(m[1]),0)]));
  const details=[];let evidenceError='';
  for(const file of reports){try{const item=JSON.parse(await readFile(file));const cases=item.cases||item.rows||item.results;details.push({report:file,status:item.status||item.result,count:Array.isArray(cases)?cases.length:0});}catch(e){evidenceError=e.message;}}
  if(['contracts','vue-workspace'].includes(id)&&!assertions.tests)evidenceError='所选合同检查没有测试计数';
  if(!['contracts','vue-workspace','build-browser-fixtures'].includes(id)&&(!details.length||details.some(d=>d.status!=='passed'||!d.count)))evidenceError='所选浏览器检查缺少已执行且通过的场景报告';
  const passed=exitCode===0&&skips===0&&!evidenceError;
  add(id,passed?'passed':'failed',evidenceError|| (skips?`所选检查跳过 ${skips} 项`:exitCode?`进程退出 ${exitCode}`:null),{command,exit_code:exitCode,elapsed_ms:Date.now()-started,log,reports,details,assertions,skipped:skips});
  process.stdout.write(`${id}: ${passed?'passed':'failed'} (${log})\n`);return passed;
 }
 try{
  report.source=await sourceSnapshot();
  let authorReady=false,browserReady=false;
  try{
   if(!toolchain)throw Error('缺少作者工具目录：--toolchain 或 YSS_VUE_TOOLCHAIN');
   toolchain=await realpath(toolchain);env.YSS_VUE_TOOLCHAIN=toolchain;
   const pkg=JSON.parse(await readFile(path.join(skill,'assets/shadcn-vue-authoring/package.json')));
   const lock=await readFile(path.join(skill,'assets/shadcn-vue-authoring/pnpm-lock.yaml'));
   if(sha(lock)!==sha(await readFile(path.join(toolchain,'pnpm-lock.yaml'))))throw Error('作者工具锁文件不符');
   const versions={};for(const [name,version]of Object.entries({...pkg.dependencies,...pkg.devDependencies})){const actual=JSON.parse(await readFile(path.join(toolchain,'node_modules',name,'package.json'))).version;if(actual!==version)throw Error(`${name} 版本不符：${actual} != ${version}`);versions[name]=actual;}
   report.tools.author={directory:toolchain,lock_digest:sha(lock),versions};authorReady=true;add('author-preflight','passed');
  }catch(error){add('author-preflight','failed',error.message);}
  if(scope!=='contract'){
   try{
    if(!browserTools)throw Error('缺少浏览器工具目录：--browser-tools 或 YSS_PLAYWRIGHT_MODULE');
    let module=path.resolve(browserTools);if(!/\.[cm]?js$/.test(module))module=path.join(module,'index.mjs');
    const pw=await import(pathToFileURL(module).href);const versions={};
    for(const name of ['chromium','webkit']){const b=await pw[name].launch();versions[name]=b.version();await b.close();}
    env.YSS_PLAYWRIGHT_MODULE=module;report.tools.browser={module,playwright:JSON.parse(await readFile(path.join(path.dirname(module),'package.json'))).version,versions};browserReady=true;add('browser-preflight','passed');
   }catch(error){add('browser-preflight','failed',error.message);}
  }
  const tests=path.join(skill,'tests');
  if(scope!=='browser'){
   if(authorReady){
    await run('contracts',['--test-reporter=tap',path.join(tests,'run-scenarios.mjs')]);
    await run('vue-workspace',['--test','--test-reporter=tap',path.join(tests,'shadcn-vue.test.mjs'),path.join(tests,'workspace.test.mjs'),path.join(tests,'retirement.test.mjs'),path.join(tests,'business-controls.test.mjs'),path.join(tests,'verification-entry.test.mjs')]);
   }else for(const id of ['contracts','vue-workspace'])add(id,'not-executed','作者工具前置检查未通过');
  }
  if(scope!=='contract'){
   if(authorReady&&browserReady){
    const bundle=path.join(output,'patterns'),portable=path.join(output,'independent-copy');
    if(await run('build-browser-fixtures',[path.join(skill,'scripts/export-vue-patterns.mjs'),'--project-root',repository,'--output',bundle,'--toolchain',toolchain])){
     await cp(bundle,portable,{recursive:true});
     const packageFiles={};async function walk(dir){for(const entry of (await readdir(dir,{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name))){const p=path.join(dir,entry.name);if(entry.isDirectory())await walk(p);else packageFiles[path.relative(portable,p)]=sha(await readFile(p));}}await walk(portable);
     report.package={directory:portable,digest:sha(JSON.stringify(packageFiles)),files:packageFiles};
     for(const name of ['patterns-browser','components-browser','compact-theme-browser','workspace-browser','business-controls-browser','zoom-browser'])await run(name,[path.join(tests,name+'.mjs'),portable]);
     for(const name of ['workbench-smoke','comparison-browser-smoke'])await run(name,[path.join(tests,name+'.mjs')]);
    }else add('browser-scenarios','not-executed','浏览器样例构建失败');
   }else add('browser-scenarios','not-executed','作者工具或浏览器前置检查未通过');
  }
  const after=await sourceSnapshot();report.source_after_digest=after.digest;add('input-drift',after.digest===report.source.digest?'passed':'failed',after.digest===report.source.digest?null:'验证期间输入发生漂移，请固定输入重新运行');
 }catch(error){add('runner','failed',error.stack);}
 for(const check of report.checks)report.counts[check.status]++;
 report.status=report.counts.failed||report.counts['not-executed']?'failed':'passed';report.finished_at=new Date().toISOString();
 await writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n');
 process.stdout.write(path.join(output,'report.json')+'\n');return report;
}
export async function main(argv=process.argv.slice(2)){
 const options={};const keys={'--scope':'scope','--toolchain':'toolchain','--browser-tools':'browserTools','--output':'output'};
 for(let i=0;i<argv.length;i+=2){if(argv[i]==='--help'){console.log('verify-prototype-design --scope contract|browser|all --toolchain DIR --browser-tools PLAYWRIGHT_DIR --output OUTSIDE_REPOSITORY');return;}if(!keys[argv[i]]||!argv[i+1]||argv[i+1].startsWith('--'))throw Error(`非法参数 ${argv[i]}`);options[keys[argv[i]]]=argv[i+1];}
 const result=await verifyPrototypeDesign(options);if(result.status!=='passed')process.exitCode=1;
}
if(process.argv[1]&&existsSync(process.argv[1])&&import.meta.url===pathToFileURL(realpathSync(process.argv[1])).href)await main();
