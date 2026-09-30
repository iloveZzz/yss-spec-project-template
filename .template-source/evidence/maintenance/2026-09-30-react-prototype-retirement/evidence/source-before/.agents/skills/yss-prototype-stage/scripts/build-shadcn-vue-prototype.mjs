#!/usr/bin/env node
import { existsSync, realpathSync, readFileSync, lstatSync } from 'node:fs';
// Author-side build; only the fully verified offline package is published.
import {readFile,writeFile,mkdir,mkdtemp,rm,cp,rename,lstat,realpath} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath,pathToFileURL} from 'node:url';
import path from 'node:path';
import {prepareOfflineHtml,sealOfflineHtml,resourceErrors,assertPrototypeTarget} from './offline-html.mjs';
import {localPath,parseScenarios} from './scenario-contract.mjs';
const assets=path.resolve(fileURLToPath(new URL('../assets/shadcn-vue-authoring/',import.meta.url)));
const sha=bytes=>`sha256:${createHash('sha256').update(bytes).digest('hex')}`;
const escape=text=>text.replace(/[<>&"]/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;'}[c]));
export async function verifyShadcnVueSources(){
 const registry=JSON.parse(await readFile(path.join(assets,'registry-manifest.json'),'utf8'));
 if(registry.repository!=='https://github.com/unovue/shadcn-vue'||!/^[a-f0-9]{40}$/.test(registry.revision))throw Error('缺少固定 shadcn-vue revision');
 for(const c of registry.components)if(!/^ui\/[a-z-]+\/[A-Za-z]+\.(?:vue|ts)$/.test(c.path)||sha(await readFile(path.join(assets,c.path)))!==c.digest)throw Error(`shadcn 组件源码摘要不匹配: ${c.path}`);
 return registry;
}
export async function buildShadcnVuePrototype({projectRoot,root,feature,toolchain,entry,config,density,profile='H2'}){
 if(!['H1','H2'].includes(profile))throw Error('profile 必须为 H1/H2');
 if(!toolchain)throw Error('需要独立作者工具目录 toolchain；不要在共享 Skill 内安装依赖');
 if(config&&entry)throw Error('--config 与 --entry 互斥');
 projectRoot=path.resolve(projectRoot);root=path.resolve(root);toolchain=await realpath(toolchain);
 await assertPrototypeTarget({projectRoot,root,feature});
 let authorRoot=entry?path.dirname(path.resolve(entry)):path.resolve(assets,'../vue-business-patterns'),entryRef=entry?path.basename(entry):'workbench.ts',title='查询与详情';
 let scenarios=fileURLToPath(new URL('../assets/vue-business-patterns/list-detail.scenarios.json',import.meta.url));
 if(config){config=path.resolve(config);authorRoot=path.dirname(config);const c=JSON.parse(await readFile(await localPath(authorRoot,path.basename(config)),'utf8'));
  if(c.schema_version!==1||!c.title?.trim()||Object.keys(c).some(k=>!['schema_version','title','entry','scenarios','density'].includes(k)))throw Error('作者配置需要 schema_version=1、title、entry、scenarios，可选 density');
  density ??= c.density;
  title=c.title;entryRef=c.entry;scenarios=await localPath(authorRoot,c.scenarios);
 }
 density ??= 'compact';
 if(!['compact','comfortable'].includes(density))throw Error('density 必须为 compact/comfortable');
 authorRoot=await realpath(authorRoot);
 const entryPath=await localPath(authorRoot,entryRef),source=await readFile(entryPath,'utf8'),scenarioBytes=await readFile(scenarios);parseScenarios(scenarioBytes);
 const expected=JSON.parse(await readFile(path.join(assets,'package.json'),'utf8')),packages={...expected.dependencies,...expected.devDependencies};
 for(const [name,version] of Object.entries(packages))if(JSON.parse(await readFile(path.join(toolchain,'node_modules',name,'package.json'),'utf8')).version!==version)throw Error(`${name} 需要锁定 ${version}`);
 const lock=await readFile(path.join(assets,'pnpm-lock.yaml'));
 if(sha(await readFile(path.join(toolchain,'pnpm-lock.yaml')))!==sha(lock))throw Error('作者工具 pnpm lock 与技能基线不匹配');
 const registry=await verifyShadcnVueSources(),theme=(await readFile(path.join(assets,'../prototype-theme.css'),'utf8'))+'\n'+await readFile(path.join(assets,'theme.css'),'utf8');
 const require=createRequire(path.join(toolchain,'package.json')),{build}=require('esbuild');
 const {parse,compileScript,compileTemplate,compileStyleAsync,registerTS}=require('@vue/compiler-sfc');
 registerTS(()=>require('typescript'));
 const typePath=p=>p.includes('/node_modules/')?path.join(toolchain,'node_modules',p.split('/node_modules/').slice(1).join('/node_modules/')):p;
 const authored=new Map(),vueStyles=new Map();
 // compiler-sfc reads type-only imports itself, outside esbuild's module hooks.
 // Apply the same source boundary and capture those inputs in provenance.
 function boundedTypeFile(request){
  const file=path.resolve(typePath(request));
  const base=[toolchain,assets,authorRoot].find(root=>file.startsWith(root+path.sep));
  if(!base||!existsSync(file))return null;
  const physical=realpathSync(file);if(!physical.startsWith(base+path.sep))return null;
  if(base!==toolchain)for(let cursor=file;cursor!==base;cursor=path.dirname(cursor))if(lstatSync(cursor).isSymbolicLink())return null;
  return {file,base};
 }
 const typeFs={fileExists:p=>!!boundedTypeFile(p),readFile:p=>{
  const item=boundedTypeFile(p);if(!item)throw Error('Vue 类型来源越出作者或锁定依赖目录');
  const bytes=readFileSync(item.file);
  if(item.base===authorRoot)authored.set(item.file,{rel:path.relative(authorRoot,item.file).split(path.sep).join('/'),bytes});
  return bytes.toString('utf8');
 }};
 const result=await build({absWorkingDir:authorRoot,entryPoints:[entryPath],outdir:path.join(authorRoot,'.bundle'),entryNames:'app',assetNames:'assets/[name]-[hash]',bundle:true,write:false,format:'iife',platform:'browser',target:['chrome110'],minify:true,metafile:true,legalComments:'eof',nodePaths:[path.join(toolchain,'node_modules')],loader:{'.png':'file','.jpg':'file','.jpeg':'file','.svg':'file','.webp':'file','.gif':'file'},define:{'process.env.NODE_ENV':'"production"',__VUE_OPTIONS_API__:'true',__VUE_PROD_DEVTOOLS__:'false',__VUE_PROD_HYDRATION_MISMATCH_DETAILS__:'false'},plugins:[{name:'bounded-authoring',setup(b){
  b.onResolve({filter:/^vue-style:/},args=>({path:args.path,namespace:'vue-style'}));
  b.onLoad({filter:/.*/,namespace:'vue-style'},args=>({...vueStyles.get(args.path),loader:'css'}));
  b.onResolve({filter:/^(?:@\/lib\/utils$|@\/(?:components|registry\/new-york-v4)\/ui\/)/},args=>{
   const file=args.path==='@/lib/utils'?'utils.ts':`ui/${args.path.split('/').at(-1)}/index.ts`;
   if(file!=='utils.ts'&&!registry.components.some(x=>x.path===file))throw Error(`未收录组件 ${file}`);
   return {path:path.join(assets,file)};
  });
  b.onResolve({filter:/^[^./]/},args=>{if(args.path.startsWith('@/'))throw Error(`未登记别名: ${args.path}`);if(!args.importer.includes('/node_modules/')){const name=args.path.startsWith('@')?args.path.split('/').slice(0,2).join('/'):args.path.split('/')[0];if(!Object.hasOwn(packages,name))throw Error(`未登记依赖: ${name}`);}return;});
  b.onLoad({filter:/.*/},async args=>{
   if(args.path.includes(`${path.sep}node_modules${path.sep}`))return;
   const trusted=args.path.startsWith(assets+path.sep),base=trusted?assets:authorRoot,rel=path.relative(base,args.path).split(path.sep).join('/');
   await localPath(base,rel);
   const bytes=await readFile(args.path),ext=path.extname(args.path);
   if(!/\.(?:vue|tsx?|jsx?|json|css|png|jpe?g|svg|webp|gif)$/.test(ext))throw Error(`未支持作者资源: ${rel}`);
   if(/\.(?:vue|tsx?|jsx?|css)$/.test(ext)){const errors=resourceErrors(rel,bytes.toString(),{}).filter(e=>!e.includes('资源缺失或越出交付包'));if(errors.length)throw Error(errors.join('\n'));}
   if(!trusted||args.path===entryPath)authored.set(args.path,{rel,bytes});
   if(ext==='.vue'){
    const {descriptor,errors}=parse(bytes.toString(),{filename:args.path});if(errors.length)throw errors[0];
    if(descriptor.customBlocks.length||[descriptor.script,descriptor.scriptSetup,descriptor.template,...descriptor.styles].some(x=>x?.src)||descriptor.template?.lang&&descriptor.template.lang!=='html'||descriptor.styles.some(x=>x.lang&&x.lang!=='css'||x.module))throw Error('Vue 作者仅支持本地内联 script/template/CSS；不执行预处理器或自定义块');
    const id='data-v-'+sha(bytes).slice(7,19),scoped=descriptor.styles.some(x=>x.scoped);
    let contents;
    if(descriptor.script||descriptor.scriptSetup){const compiled=compileScript(descriptor,{id,genDefaultAs:'__sfc__',inlineTemplate:true,fs:typeFs,templateOptions:{compilerOptions:{scopeId:scoped?id:undefined}}});contents=compiled.content;if(!descriptor.scriptSetup&&descriptor.template){const tpl=compileTemplate({source:descriptor.template.content,filename:args.path,id,scoped,compilerOptions:{bindingMetadata:compiled.bindings}});if(tpl.errors.length)throw tpl.errors[0];contents+='\n'+tpl.code.replace('export function render','function render')+'\n__sfc__.render=render;';}}
    else {const tpl=compileTemplate({source:descriptor.template?.content||'',filename:args.path,id,scoped});if(tpl.errors.length)throw tpl.errors[0];contents=tpl.code.replace('export function render','function render')+'\nconst __sfc__={render};';}
    for(let i=0;i<descriptor.styles.length;i++){const style=descriptor.styles[i];const result=await compileStyleAsync({source:style.content,filename:args.path,id,scoped:style.scoped});if(result.errors.length)throw result.errors[0];const key=`vue-style:${id}-${i}`;vueStyles.set(key,{contents:result.code,resolveDir:path.dirname(args.path)});contents+=`\nimport ${JSON.stringify(key)};`;}
    if(scoped)contents+=`\n__sfc__.__scopeId=${JSON.stringify(id)};`;
    return {contents:contents+'\nexport default __sfc__;',loader:'ts',resolveDir:path.dirname(args.path)};
   }
   return;
  });
 }}]});
 // Every resolved package must belong to the declared dependency closure.
 const roots=new Set();
 for(const input of Object.keys(result.metafile.inputs)){
  const absolute=path.resolve(authorRoot,input);if(!absolute.includes(`${path.sep}node_modules${path.sep}`))continue;
  if(!absolute.startsWith(toolchain+path.sep))throw Error('依赖必须来自锁定作者工具目录');
  let current=path.dirname(absolute);
  while(current!==path.dirname(current)){try{const pkg=JSON.parse(await readFile(path.join(current,'package.json'),'utf8'));if(pkg.name&&pkg.version){roots.add(current);break;}}catch{}current=path.dirname(current);}
 }
 const notices=[`shadcn-vue @ ${registry.revision}\n${await readFile(path.join(assets,'SHADCN-LICENSE.txt'),'utf8')}`];
 for(const base of [...roots].sort()){
  const pkg=JSON.parse(await readFile(path.join(base,'package.json'),'utf8'));let license;
  for(const name of ['LICENSE','LICENSE.md','LICENSE.txt','license','license.md'])try{license=await readFile(path.join(base,name),'utf8');break;}catch{}
  if(!license){const records=JSON.parse(await readFile(path.join(assets,'licenses/sources.json'),'utf8')),record=records.find(r=>r.package===pkg.name&&r.version===pkg.version);if(record){license=await readFile(path.join(assets,'licenses',record.file),'utf8');if(sha(license)!==record.digest)throw Error('补充许可证摘要不匹配');}}
  if(!license)throw Error(`缺少已打包依赖的许可文件 ${pkg.name}`);notices.push(`${pkg.name}@${pkg.version}\n${license}`);
 }
 const stagingParent=path.join(path.dirname(root),'build');await mkdir(stagingParent,{recursive:true});const temp=await mkdtemp(path.join(stagingParent,'.prototype-'));
 try{
  const project=path.join(temp,'project'),out=path.join(project,`docs/.scratch/${feature}/design/prototypes`);
  await mkdir(path.join(project,'.template-spec/design/tokens'),{recursive:true});for(const ref of ['DESIGN.md','.template-spec/design/tokens/variables.css'])await cp(path.join(projectRoot,ref),path.join(project,ref));
  await writeFile(path.join(temp,'scenarios.json'),scenarioBytes);
  const manifest=await prepareOfflineHtml({projectRoot:project,root:out,feature,profile,pattern:'workbench',scenarios:path.join(temp,'scenarios.json'),title,density});
  // Only files in the actual module closure participate in Tailwind scanning.
  let css=`@import ${JSON.stringify(path.join(toolchain,'node_modules/tailwindcss/index.css'))} source(none);\n@source ${JSON.stringify(path.join(assets,'ui'))};\n`;
  for(const [absolute,item] of authored)if(/\.(?:vue|[jt]sx?)$/.test(absolute))css+=`@source ${JSON.stringify(absolute)};\n`;
  await writeFile(path.join(temp,'input.css'),css+theme);
  const cli=JSON.parse(await readFile(path.join(toolchain,'node_modules/@tailwindcss/cli/package.json'),'utf8'));
  execFileSync(process.execPath,[path.join(toolchain,'node_modules/@tailwindcss/cli',cli.bin.tailwindcss),'-i',path.join(temp,'input.css'),'-o',path.join(temp,'styles.css'),'--minify'],{cwd:toolchain,stdio:'pipe'});
  let styles=await readFile(path.join(temp,'styles.css'),'utf8');
  for(const file of result.outputFiles){const ref=path.relative(path.join(authorRoot,'.bundle'),file.path);if(ref==='app.css'){styles+='\n'+file.text;continue;}const target=await localPath(out,ref);await mkdir(path.dirname(target),{recursive:true});await writeFile(target,file.contents);}
  await writeFile(path.join(out,'styles.css'),styles);
  await writeFile(path.join(out,'index.html'),`<!doctype html><html lang="zh-CN" data-density="${density}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(title)}</title><link rel="stylesheet" href="./tokens.css"><link rel="stylesheet" href="./styles.css"><script src="./scenarios.js"></script><script src="./scenario-runtime.js"></script><script defer src="./app.js"></script></head><body><div id="app"></div></body></html>`);
  const authoredFiles={};
  for(const {rel,bytes} of authored.values()){const ref=`authoring-sources/${rel}`,target=await localPath(out,ref);await mkdir(path.dirname(target),{recursive:true});await writeFile(target,bytes);authoredFiles[ref]=sha(bytes);}
  await mkdir(path.join(out,'component-sources'));
  for(const item of registry.components){const target=path.join(out,'component-sources',item.path);await mkdir(path.dirname(target),{recursive:true});await cp(path.join(assets,item.path),target);}
  await cp(path.join(assets,'utils.ts'),path.join(out,'component-sources/utils.ts'));await cp(path.join(assets,'registry-manifest.json'),path.join(out,'registry-manifest.json'));
  const buildBasis={packages,lock_digest:sha(lock),source_digest:sha(source),theme_digest:sha(theme),registry_digest:sha(await readFile(path.join(assets,'registry-manifest.json'))),registry_revision:registry.revision,component_groups:registry.component_groups,used_component_files:registry.components.filter(c=>Object.keys(result.metafile.inputs).some(p=>path.resolve(authorRoot,p)===path.join(assets,c.path))).map(c=>c.path),support_source_digests:{'utils.ts':sha(await readFile(path.join(assets,'utils.ts')))},authored_files:authoredFiles,format:'iife',browser_runtime:'vue',toolchain_required_by_recipient:false};
  await writeFile(path.join(out,'authoring-source.ts'),source);await writeFile(path.join(out,'token-theme.css'),theme);await writeFile(path.join(out,'build-provenance.json'),JSON.stringify(buildBasis,null,2)+'\n');await writeFile(path.join(out,'THIRD-PARTY-NOTICES.txt'),notices.join('\n\n'));
  await writeFile(path.join(out,'yss-prototype-adapter.json'),JSON.stringify({...manifest,component_basis:'vue-shadcn-prebuilt',build_provenance:buildBasis},null,2));
  const sealed=await sealOfflineHtml(out,profile);await assertPrototypeTarget({projectRoot,root,feature});await rename(out,root);return sealed;
 }finally{await rm(temp,{recursive:true,force:true});}
}
if(process.argv[1]&&existsSync(process.argv[1])&&pathToFileURL(realpathSync(process.argv[1])).href===import.meta.url){const args={};for(let i=2;i<process.argv.length;i+=2){if(!process.argv[i].startsWith('--')||!process.argv[i+1])throw Error('参数必须是 --key value');args[process.argv[i].slice(2)]=process.argv[i+1];}const projectRoot=path.resolve(args['project-root']||'.');const root=args.root||path.join(projectRoot,'docs/.scratch',args.feature||'','design/prototypes');console.log(JSON.stringify(await buildShadcnVuePrototype({projectRoot,root,feature:args.feature,profile:args.profile,toolchain:args.toolchain,entry:args.entry,config:args.config,density:args.density}),null,2));}
