import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {parseArgs} from 'node:util';

const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
export function validateVerificationReportDirectory(root,directory) {
  const target=path.resolve(directory),realRoot=fs.realpathSync(root);
  if(fs.existsSync(target))throw new TypeError('report-dir 必须为新目录，防止覆盖历史证据');
  const parent=fs.realpathSync(path.dirname(target));
  if(parent===realRoot||parent.startsWith(realRoot+path.sep))throw new TypeError('report-dir 必须位于仓库外');
  fs.accessSync(parent,fs.constants.W_OK);
  return target;
}
export function verificationPreflight({root,plan,reportDir,environment=process.env,nodeVersion=process.version,probe=spawnSync}) {
  const observations=[],errors=[];
  const check=(name,operation)=>{try{observations.push({name,status:'passed',observed:operation()});}catch(error){errors.push({name,error:error.message});observations.push({name,status:'failed',error:error.message});}};
  const invoke=(file,args,cwd=root)=>{const result=probe(file,args,{cwd,env:environment,encoding:'utf8',timeout:30000,maxBuffer:4*1024*1024});if(result.status!==0||result.error||result.signal)throw new Error(result.error?.message||result.stderr||`${file}: exit=${result.status} signal=${result.signal}`);return result.stdout.trim();};
  check('node',()=>{if(!/^v24\./.test(nodeVersion))throw new Error(`发布主验证需要 Node 24，实际 ${nodeVersion}`);return nodeVersion;});
  if(reportDir)check('report-directory',()=>validateVerificationReportDirectory(root,reportDir));
  check('python-jsonschema',()=>{const value=JSON.parse(invoke('python3',['-c','import sys,json,importlib.metadata; print(json.dumps({"version":[sys.version_info.major,sys.version_info.minor],"executable":sys.executable,"jsonschema":importlib.metadata.version("jsonschema")}))']));if(value.version[0]!==3||value.version[1]!==12)throw new Error('需要 Python 3.12 和 jsonschema');return value;});
  const commands=plan.commands.map(item=>item.command).join('\n');
  if(/pnpm|\.template-source\/tooling\/node/.test(commands))check('pnpm-and-tooling-lock',()=>{
    const tooling=path.join(root,'.template-source/tooling/node'),pkg=JSON.parse(fs.readFileSync(path.join(tooling,'package.json'))),version=invoke('pnpm',['--version'],tooling);
    if(`pnpm@${version}`!==pkg.packageManager)throw new Error(`pnpm 版本需要 ${pkg.packageManager}，实际 ${version}`);
    const expected=fs.readFileSync(path.join(tooling,'pnpm-lock.yaml'));
    const installed=fs.readFileSync(path.join(tooling,'node_modules/.pnpm/lock.yaml'));
    // pnpm's installed lock omits settings that do not affect resolution. Compare
    // the authoritative resolution sections instead of requiring byte equality.
    const sections=bytes=>String(bytes).slice(String(bytes).indexOf('\nimporters:'));
    if(sections(expected)!==sections(installed))throw new Error('tooling 安装依赖与 frozen lock 不一致');
    return {version,lock_sha256:hash(expected)};
  });
  if(/verify-yss-prototype-contract-scenarios|build-shadcn-vue|verify-existing-ui-baseline-scenarios/.test(commands))check('vue-author-toolchain',()=>{
    if(!environment.YSS_VUE_TOOLCHAIN)throw new Error('选中原型场景需要 YSS_VUE_TOOLCHAIN');
    const assets=path.join(root,'.agents/skills/yss-prototype-stage/assets/shadcn-vue-authoring'),toolchain=fs.realpathSync(environment.YSS_VUE_TOOLCHAIN);
    const expected=JSON.parse(fs.readFileSync(path.join(assets,'package.json')));
    if(hash(fs.readFileSync(path.join(assets,'pnpm-lock.yaml')))!==hash(fs.readFileSync(path.join(toolchain,'pnpm-lock.yaml'))))throw new Error('作者工具 pnpm lock 与技能基线不匹配');
    for(const [name,version] of Object.entries({...expected.dependencies,...expected.devDependencies}))if(JSON.parse(fs.readFileSync(path.join(toolchain,'node_modules',name,'package.json'))).version!==version)throw new Error(`${name} 需要锁定 ${version}`);
    return {root:toolchain,package_manager:expected.packageManager,package_sha256:hash(fs.readFileSync(path.join(assets,'package.json'))),lock_sha256:hash(fs.readFileSync(path.join(toolchain,'pnpm-lock.yaml'))),packages:{...expected.dependencies,...expected.devDependencies}};
  });
  check('submodule-source',()=>{const status=invoke('git',['submodule','status','--recursive']);if(status.split('\n').some(line=>/^[-+U]/.test(line)))throw new Error('子模块未初始化或与 gitlink 不匹配');return status;});
  if(plan.source_requirement==='committed')check('committed-source',()=>{const head=invoke('git',['rev-parse','HEAD']);if(!/^[a-f0-9]{40}$/.test(head))throw new Error('模板 SHA 不是完整 40 位');if(invoke('git',['status','--porcelain','--untracked-files=all']))throw new Error('固定源候选工作树不干净');return head;});
  return {status:errors.length?'failed':'passed',observations,errors};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  try {
    const {values}=parseArgs({options:{root:{type:'string'},'plan-json':{type:'string'},purpose:{type:'string',default:'verification'}},strict:true});
    const root=path.resolve(values.root),plan=JSON.parse(values['plan-json']);
    const result=verificationPreflight({root,plan});
    if(values.purpose==='verification'||fs.existsSync(path.join(root,'.gitmodules')))try{const {collectReleaseSources}=await import('./verification-artifacts.mjs');result.sources_manifest=collectReleaseSources({root,commit:spawnSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).stdout.trim()});result.observations.push({name:'release-sources',status:'passed',observed:result.sources_manifest});}catch(error){result.status='failed';result.errors.push({name:'release-sources',error:error.message});}
    process.stdout.write(JSON.stringify(result)+'\n');process.exitCode=result.status==='passed'?0:1;
  }catch(error){process.stdout.write(JSON.stringify({status:'failed',errors:[{name:'preflight-input',error:error.message}],observations:[]})+'\n');process.exitCode=1;}
}
