#!/usr/bin/env node
import { existsSync, realpathSync } from 'node:fs';
import {mkdtemp,mkdir,cp,writeFile,readdir,rename,rm} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {buildShadcnVuePrototype} from './build-shadcn-vue-prototype.mjs';
const catalog={workspace:'企业多页工作区','component-states':'组件状态展示'};
const patterns={'list-detail':'查询与详情','multi-step':'分步表单','approval':'审批与权限',conflict:'冲突与恢复',analysis:'高密度分析','combined-query':'组合查询','owner-validity':'负责人及有效期表单'};
export async function exportVuePatterns({projectRoot,output,toolchain}){
 output=path.resolve(output);try{if((await readdir(output)).length)throw Error('目标非空，拒绝覆盖');}catch(e){if(e.code!=='ENOENT')throw e;}
 await mkdir(path.dirname(output),{recursive:true});const temp=await mkdtemp(path.join(path.dirname(output),'.business-patterns-'));
 try{
  const fixture=path.join(temp,'fixture'),bundle=path.join(temp,'bundle');await mkdir(path.join(fixture,'.template-spec/design/tokens'),{recursive:true});await mkdir(bundle);
  for(const ref of ['DESIGN.md','.template-spec/design/tokens/variables.css'])await cp(path.join(projectRoot,ref),path.join(fixture,ref));
  for(const name of Object.keys({...patterns,...catalog})){const root=path.join(fixture,`docs/.scratch/${name}/design/prototypes`);await buildShadcnVuePrototype({projectRoot:fixture,root,feature:name,toolchain,config:new URL(`../assets/vue-business-patterns/${name}-standard.config.json`,import.meta.url).pathname});await cp(root,path.join(bundle,name),{recursive:true});}
  await cp(path.join(projectRoot,'.template-spec/design/tokens/variables.css'),path.join(bundle,'tokens.css'));
  await writeFile(path.join(bundle,'index.html'),`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Vue 企业页面模式</title><link rel="stylesheet" href="tokens.css"><style>body{font-family:var(--brand-font-family);color:var(--brand-color-text);background:var(--brand-color-bg-layout);padding:var(--brand-size-lg)}a{color:var(--yss-color-primary-control)}li{margin-block:var(--brand-size)}</style><h1>Vue 企业页面模式</h1><p>维护教学示例；场景及保存结果为本地模拟，不代表已批准产品。</p><ul>${Object.entries({...patterns,...catalog}).map(([id,label])=>`<li><a href="${id}/index.html">${label}</a></li>`).join('')}</ul></html>`);
  await rename(bundle,output);return {root:output,entry:path.join(output,'index.html'),patterns:Object.keys(patterns)};
 }finally{await rm(temp,{recursive:true,force:true});}
}
if(process.argv[1]&&existsSync(process.argv[1])&&import.meta.url===pathToFileURL(realpathSync(process.argv[1])).href){const args={};for(let i=2;i<process.argv.length;i+=2)args[process.argv[i].slice(2)]=process.argv[i+1];console.log(JSON.stringify(await exportVuePatterns({projectRoot:path.resolve(args['project-root']||'.'),output:args.output,toolchain:args.toolchain})));}
