import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {parseArgs} from 'node:util';
import {createRequire} from 'node:module';

const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const require=createRequire(import.meta.url);
export function validateVerificationReportDirectory(root,directory) {
  const target=path.resolve(directory),realRoot=fs.realpathSync(root);
  if(fs.existsSync(target))throw new TypeError('report-dir 必须为新目录，防止覆盖历史证据');
  const parent=fs.realpathSync(path.dirname(target));
  if(parent===realRoot||parent.startsWith(realRoot+path.sep))throw new TypeError('report-dir 必须位于仓库外');
  fs.accessSync(parent,fs.constants.W_OK);
  return target;
}
export function validateVerificationToolRequirements(value) {
  const keys=['schema_version','python','go','native_cli','tooling','vue','design_vue'];
  if(!value||Array.isArray(value)||typeof value!=='object'||Object.keys(value).some(key=>!keys.includes(key)&&key!=='plugin_candidate')||keys.some(key=>!Object.hasOwn(value,key))||value.schema_version!==1||!['none','runtime','jsonschema'].includes(value.python)||keys.slice(2).some(key=>typeof value[key]!=='boolean')||(Object.hasOwn(value,'plugin_candidate')&&typeof value.plugin_candidate!=='boolean'))throw new TypeError('VERIFICATION_TOOL_REQUIREMENTS_INVALID');
  return value;
}
export function verificationToolRequirements(plan,{reportValidation=false}={}) {
  const daily=plan.strategy==='daily-necessary',commands=plan.commands.map(item=>item.command).join('\n');
  return validateVerificationToolRequirements({schema_version:1,
    python:reportValidation||!daily||plan.commands.some(item=>item.resources?.includes('python-jsonschema'))?'jsonschema':/\bpython3?\s/.test(commands)?'runtime':'none',
    go:daily&&plan.commands.some(item=>/^go\s/.test(item.command)||item.resources?.includes('go')||item.resources?.includes('plugin-candidate')),
    native_cli:plan.commands.some(item=>item.resources?.includes('native-cli')),
    ...(plan.commands.some(item=>item.resources?.includes('plugin-candidate'))?{plugin_candidate:true}:{}),
    tooling:/\bpnpm\b/.test(commands)||!daily&&/\.template-source\/tooling\/node/.test(commands)||plan.commands.some(item=>item.resources?.includes('pnpm-tooling')),
    vue:/verify-yss-prototype-contract-scenarios|build-shadcn-vue|verify-existing-ui-baseline-scenarios/.test(commands),
    design_vue:/(?:^|\s)tests\/design-prototype-animation\.test\.mjs(?:\s|$)/m.test(commands),
  });
}
export function verificationPreflight({root,plan,reportDir,environment=process.env,nodeVersion=process.version,probe=spawnSync}) {
  const observations=[],errors=[];
  const needs=verificationToolRequirements(plan);
  const check=(name,operation)=>{try{observations.push({name,status:'passed',observed:operation()});}catch(error){errors.push({name,error:error.message});observations.push({name,status:'failed',error:error.message});}};
  const invoke=(file,args,cwd=root)=>{const result=probe(file,args,{cwd,env:environment,encoding:'utf8',timeout:30000,maxBuffer:4*1024*1024});if(result.status!==0||result.error||result.signal)throw new Error(result.error?.message||result.stderr||`${file}: exit=${result.status} signal=${result.signal}`);return result.stdout.trim();};
  check('node',()=>{if(!/^v24\./.test(nodeVersion))throw new Error(`验证运行器需要 Node 24，实际 ${nodeVersion}`);return nodeVersion;});
  if(reportDir)check('report-directory',()=>validateVerificationReportDirectory(root,reportDir));
  if(needs.python==='jsonschema')check('python-jsonschema',()=>{const value=JSON.parse(invoke('python3',['-c','import sys,json,importlib.metadata; print(json.dumps({"version":[sys.version_info.major,sys.version_info.minor],"executable":sys.executable,"jsonschema":importlib.metadata.version("jsonschema")}))']));if(value.version[0]!==3||value.version[1]!==12)throw new Error('需要 Python 3.12 和 jsonschema');return value;});
  else if(needs.python==='runtime')check('python',()=>{const value=JSON.parse(invoke('python3',['-c','import sys,json; print(json.dumps({"version":[sys.version_info.major,sys.version_info.minor],"executable":sys.executable}))']));if(value.version[0]!==3||value.version[1]!==12)throw new Error('需要 Python 3.12');return value;});
  if(needs.go)check('go',()=>invoke('go',['version']));
  if(plan.strategy==='daily-necessary'&&needs.native_cli)check('native-cli',()=>{
    const binary=require('./native-yss.mjs').nativeBinary(environment),pins=require('./yss-cli-pin.mjs'),pin=pins.readNativeYssPin(root,environment);
    // 本批显式 pin 优先；预检只核验固定输入，不重新查询 latest。
    return pin?{...binary,pin:pins.verifyPinnedBinary({digest:binary.digest,pin,environment})}:binary;
  });
  if(plan.commands.some(item=>item.resources?.includes('plugin-candidate')))check('plugin-candidate',()=>{
    if(plan.candidate_release)throw new Error('paired plugin candidate is not release evidence');
    return require('./plugin-candidate.mjs').candidateFromEnvironment(root,environment);
  });
  if(needs.tooling)check('pnpm-and-tooling-lock',()=>{
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
  if(needs.vue)check('vue-author-toolchain',()=>{
    if(!environment.YSS_VUE_TOOLCHAIN)throw new Error('选中原型场景需要 YSS_VUE_TOOLCHAIN');
    const assets=path.join(root,'.agents/skills/yss-prototype-stage/assets/shadcn-vue-authoring'),toolchain=fs.realpathSync(environment.YSS_VUE_TOOLCHAIN);
    const expected=JSON.parse(fs.readFileSync(path.join(assets,'package.json')));
    if(hash(fs.readFileSync(path.join(assets,'pnpm-lock.yaml')))!==hash(fs.readFileSync(path.join(toolchain,'pnpm-lock.yaml'))))throw new Error('作者工具 pnpm lock 与技能基线不匹配');
    for(const [name,version] of Object.entries({...expected.dependencies,...expected.devDependencies}))if(JSON.parse(fs.readFileSync(path.join(toolchain,'node_modules',name,'package.json'))).version!==version)throw new Error(`${name} 需要锁定 ${version}`);
    return {root:toolchain,package_manager:expected.packageManager,package_sha256:hash(fs.readFileSync(path.join(assets,'package.json'))),lock_sha256:hash(fs.readFileSync(path.join(toolchain,'pnpm-lock.yaml'))),packages:{...expected.dependencies,...expected.devDependencies}};
  });
  if(needs.design_vue)check('design-vue-toolchain',()=>{
    if(!environment.YSS_DESIGN_PROTOTYPE_TOOLCHAIN)throw new Error('选中设计原型动画构建需要 YSS_DESIGN_PROTOTYPE_TOOLCHAIN；请参考 .template-source/agents/skills-maintenance.md 准备固定工具链');
    const assets=path.join(root,'.agents/skills/yss-design-system/assets/prototype'),toolchain=fs.realpathSync(environment.YSS_DESIGN_PROTOTYPE_TOOLCHAIN);
    for(const file of ['package.json','pnpm-lock.yaml'])if(!fs.readFileSync(path.join(assets,file)).equals(fs.readFileSync(path.join(toolchain,file))))throw new Error(`设计原型工具链 ${file} 与技能基线不匹配`);
    const lock=fs.readFileSync(path.join(assets,'pnpm-lock.yaml'));
    if(!lock.equals(fs.readFileSync(path.join(toolchain,'node_modules/.pnpm/lock.yaml'))))throw new Error('设计原型已安装依赖锁与技能基线不匹配');
    const expected=JSON.parse(fs.readFileSync(path.join(assets,'package.json')));
    for(const [name,version] of Object.entries({...expected.dependencies,...expected.devDependencies}))if(JSON.parse(fs.readFileSync(path.join(toolchain,'node_modules',name,'package.json'))).version!==version)throw new Error(`${name} 需要锁定 ${version}`);
    return {root:toolchain,package_manager:expected.packageManager,lock_sha256:hash(lock)};
  });
  if(plan.source_requirement==='committed')check('committed-source',()=>{const head=invoke('git',['rev-parse','HEAD']);if(!/^[a-f0-9]{40}$/.test(head))throw new Error('模板 SHA 不是完整 40 位');if(invoke('git',['status','--porcelain','--untracked-files=all']))throw new Error('固定源候选工作树不干净');return head;});
  return {status:errors.length?'failed':'passed',observations,errors};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  try {
    const {values}=parseArgs({options:{root:{type:'string'},'plan-json':{type:'string'},purpose:{type:'string',default:'verification'}},strict:true});
    const root=path.resolve(values.root),plan=JSON.parse(values['plan-json']);
    const result=verificationPreflight({root,plan});
    if(plan.strategy!=='daily-necessary'&&values.purpose==='verification')try{const {collectReleaseSources}=await import('./verification-artifacts.mjs');result.sources_manifest=collectReleaseSources({root,commit:spawnSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).stdout.trim()});result.observations.push({name:'release-sources',status:'passed',observed:result.sources_manifest});}catch(error){result.status='failed';result.errors.push({name:'release-sources',error:error.message});}
    process.stdout.write(JSON.stringify(result)+'\n');process.exitCode=result.status==='passed'?0:1;
  }catch(error){process.stdout.write(JSON.stringify({status:'failed',errors:[{name:'preflight-input',error:error.message}],observations:[]})+'\n');process.exitCode=1;}
}
