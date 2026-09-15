#!/usr/bin/env node
// Author-side only. No package manager or build server is shipped to prototype recipients.
import {readFile,writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
import {prepareOfflineHtml,sealOfflineHtml} from './offline-html.mjs';
const assets=new URL('../assets/antd-authoring/',import.meta.url);
const sha=b=>`sha256:${createHash('sha256').update(b).digest('hex')}`;
export async function buildAntdPrototype({projectRoot,root,feature,toolchain,reason,entry}){
 if(!reason?.trim())throw new Error('真实 AntD 路线必须记录简化模拟影响评审结论的理由');
 if(!toolchain)throw new Error('需要独立作者工具目录 toolchain；不要在共享 Skill 内安装依赖');
 const expected=JSON.parse(await readFile(new URL('package.json',assets),'utf8'));
 const require=createRequire(path.join(path.resolve(toolchain),'package.json'));
 for(const [name,version]of Object.entries({...expected.dependencies,...expected.devDependencies})){
  const actual=require(`${name}/package.json`).version;if(actual!==version)throw new Error(`${name} 需要锁定 ${version}，实际 ${actual}`);
 }
 const lock=await readFile(new URL('pnpm-lock.yaml',assets));
 if(sha(await readFile(path.join(toolchain,'pnpm-lock.yaml')))!==sha(lock))throw new Error('作者工具 pnpm lock 与技能基线不匹配');
 const tokenCss=await readFile(path.join(projectRoot,'docs/design/tokens/variables.css'),'utf8');
 // This adapter targets the default light :root baseline, never the later dark-theme overrides.
 const lightCss=tokenCss.match(/^:root\s*\{([^}]+)\}/m)?.[1];
 if(!lightCss)throw new Error('缺少明确的 :root light Token 基线');
 const tokens=Object.fromEntries([...lightCss.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map(m=>[m[1],m[2].trim()]));
 const value=key=>{if(!tokens[key]||tokens[key].includes('var('))throw new Error(`需先派生实际 Token 值 ${key}`);return tokens[key];};
 const theme={colorPrimary:value('--yss-color-primary-control'),colorPrimaryHover:value('--yss-color-primary-control-hover'),fontFamily:value('--brand-font-family'),fontSize:parseFloat(value('--brand-font-size')),controlHeight:parseFloat(value('--yss-control-height')),borderRadius:parseFloat(value('--brand-border-radius')),colorText:value('--brand-color-text'),colorBgLayout:value('--brand-color-bg-layout'),colorBgContainer:value('--brand-color-bg-container'),colorBorder:value('--brand-color-border'),motion:false};
 const source=await readFile(entry?path.resolve(entry):new URL('workbench.jsx',assets),'utf8');
 if(/\b(?:fetch\s*\(|XMLHttpRequest|WebSocket|EventSource|import\s*\(|serviceWorker\s*\.)/.test(source))throw new Error('离线原型源不得依赖网络或动态模块');
 {
  const {build}=require('esbuild');
  const result=await build({stdin:{contents:source,loader:'jsx',resolveDir:path.resolve(toolchain)},bundle:true,write:false,format:'iife',platform:'browser',target:['chrome110'],minify:true,metafile:true,legalComments:'eof',define:{'process.env.NODE_ENV':'"production"',__PROTOTYPE_THEME__:JSON.stringify(theme)}});
  if(result.outputFiles.length!==1)throw new Error('此离线路线仅接受一个 JS bundle；额外 CSS/资源需明确本地打包支持');
  const packageRoots=new Set();
  for(const input of Object.keys(result.metafile.inputs)){
    let current=path.dirname(path.resolve(input));
    if(!current.includes('node_modules'))continue;
    while(current!==path.dirname(current)){
      try{const pkg=JSON.parse(await readFile(path.join(current,'package.json'),'utf8'));if(pkg.name&&pkg.version){packageRoots.add(current);break;}}catch{}current=path.dirname(current);
    }
  }
  const notices=[];
  for(const base of [...packageRoots].sort()){
    const pkg=JSON.parse(await readFile(path.join(base,'package.json'),'utf8'));
    let license;
    for(const file of ['LICENSE','LICENSE.md','LICENSE.txt','license','license.md']){try{license=await readFile(path.join(base,file),'utf8');break;}catch{}}
    if(!license){for(const file of ['README.md','Readme.md','readme.md']){try{const readme=await readFile(path.join(base,file),'utf8');const section=readme.match(/^##? License[^\n]*\n([\s\S]*?)(?=^##? |$(?![\s\S]))/im);if(section?.[1].includes('Permission is hereby granted')){license=section[1].trim();break;}}catch{}}}
    if(!license && pkg.name==='@ant-design/icons-svg' && pkg.version==='4.6.0' && pkg.license==='MIT'){
      const antdRequire=createRequire(require.resolve('antd/package.json'));
      const iconsRoot=path.dirname(antdRequire.resolve('@ant-design/icons/package.json'));
      const icons=JSON.parse(await readFile(path.join(iconsRoot,'package.json'),'utf8'));
      if(JSON.stringify(icons.repository).includes('ant-design-icons'))license=await readFile(path.join(iconsRoot,'LICENSE'),'utf8');
    }
    if(!license)throw new Error(`缺少已打包依赖的许可文件 ${pkg.name}`);
    notices.push(`${pkg.name}@${pkg.version}\n${license}`);
  }
  if(notices.length<3)throw new Error('无法确认已打包依赖许可');
  const manifest=await prepareOfflineHtml({projectRoot,root,feature,profile:'H2'});
  await writeFile(path.join(root,'app.js'),result.outputFiles[0].contents);
  await writeFile(path.join(root,'index.html'),'<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>资料维护</title><link rel="stylesheet" href="./tokens.css"><link rel="stylesheet" href="./styles.css"><script defer src="./app.js"></script></head><body><div id="app"></div></body></html>');
  await writeFile(path.join(root,'styles.css'),`:root{font-family:var(--brand-font-family);color:var(--brand-color-text);background:var(--brand-color-bg-layout)}*{box-sizing:border-box}body{margin:0}.ant-layout-header{height:auto;line-height:normal;padding:16px 24px;background:var(--brand-color-bg-container);display:flex;gap:32px;align-items:center}.ant-layout-content{width:100%;max-width:1440px;margin:auto;padding:24px}.heading{display:flex;justify-content:space-between;align-items:center}.surface{background:var(--brand-color-bg-container);padding:16px;border-radius:8px;margin-block:16px}.review-controls{margin-block:24px}select{min-height:var(--yss-control-height);color:var(--brand-color-text);border:1px solid var(--brand-color-border);background:var(--brand-color-bg-container)}:focus-visible{outline:2px solid var(--yss-color-primary-control);outline-offset:2px}@media(max-width:576px){.ant-layout-content{padding:12px}.ant-layout-header{padding:12px;gap:16px}.surface{padding:12px}.heading{align-items:start;gap:8px}}`);
  const buildBasis={reason,packages:{...expected.dependencies,...expected.devDependencies},lock_digest:sha(lock),source_digest:sha(source),theme_digest:sha(JSON.stringify(theme)),format:'iife',browser_runtime:'react',toolchain_required_by_recipient:false};
  await writeFile(path.join(root,'authoring-source.jsx'),source);
  await writeFile(path.join(root,'build-provenance.json'),JSON.stringify(buildBasis,null,2)+'\n');
  // Preserve bundled third-party notices alongside the generated resources.
  await writeFile(path.join(root,'THIRD-PARTY-NOTICES.txt'),notices.join('\n\n'));
  await writeFile(path.join(root,'yss-prototype-adapter.json'),JSON.stringify({...manifest,component_basis:'react-antd-prebuilt',build_provenance:buildBasis},null,2));
  return await sealOfflineHtml(root,'H2');
 }
}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url){const args={};for(let i=2;i<process.argv.length;i+=2){if(!process.argv[i].startsWith('--')||!process.argv[i+1])throw new Error('参数必须是 --key value');args[process.argv[i].slice(2)]=process.argv[i+1];}const projectRoot=path.resolve(args['project-root']||'.');const root=args.root||path.join(projectRoot,'docs/.scratch',args.feature||'','design/prototypes');console.log(JSON.stringify(await buildAntdPrototype({projectRoot,root,feature:args.feature,toolchain:args.toolchain,reason:args.reason,entry:args.entry}),null,2));}
