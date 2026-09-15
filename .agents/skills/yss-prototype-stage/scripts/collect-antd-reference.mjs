#!/usr/bin/env node
import{readFileSync,existsSync,mkdirSync,writeFileSync}from'node:fs';
import{createRequire}from'node:module';
import{createHash}from'node:crypto';
import{gunzipSync}from'node:zlib';
import path from'node:path';
import{pathToFileURL}from'node:url';
const core=['Layout','Menu','Breadcrumb','Tabs','Button','Typography','Form','Input','InputNumber','Select','Checkbox','Radio','Switch','Table','Pagination','Tag','Descriptions','Empty','Modal','Drawer','Alert','Spin','Message'];
const digest=b=>`sha256:${createHash('sha256').update(b).digest('hex')}`;
export function collectAntdReference({toolchain,version,output,components=core}){
 if(!/^6\.\d+\.\d+$/.test(version||''))throw new Error('明确指定 --version 6.x.y；不自动检测或静默回退');
 if(existsSync(output))throw new Error('输出已存在，保留历史快照，请选新目录');
 const require=createRequire(path.join(path.resolve(toolchain),'package.json'));
 const cliPath=require.resolve('@ant-design/cli/package.json'),cli=JSON.parse(readFileSync(cliPath));
 if(cli.version!=='6.6.4')throw new Error('此采集器只适配已核验的 CLI 6.6.4 数据布局');
 const dataRoot=path.join(path.dirname(cliPath),'data');const index=JSON.parse(readFileSync(path.join(dataRoot,'versions.json')));
 const snapshot=index.v6?.[version.split('.').slice(0,2).join('.')];if(!snapshot)throw new Error('CLI 未收录该 minor；须补充固定源码证据');
 const ref=`v${snapshot}.json`;const source=existsSync(path.join(dataRoot,ref))?readFileSync(path.join(dataRoot,ref)):gunzipSync(readFileSync(path.join(dataRoot,ref+'.gz')));const data=JSON.parse(source);
 if(data.version!==snapshot)throw new Error('CLI 索引与实际数据版本不一致');
 const selected=components.map(name=>{const c=data.components.find(c=>c.name.toLowerCase()===name.toLowerCase());if(!c)throw new Error(`CLI 不含 ${name}，请读取固定官方源码；不可补造 API`);return c;});
 const manifest={schema_version:1,requested_version:version,resolved_snapshot_version:snapshot,version_match:snapshot===version?'exact':'minor-snapshot-only',cli_version:cli.version,cli_snapshot_digest:digest(source),components_covered:selected.map(c=>c.name),design_doc_scope:'major-v6/default-light; reference only, project DESIGN.md is authoritative',runtime_compatibility_verified:false,files:{}};
 const files={};for(const c of selected)files[`${c.name}.json`]=JSON.stringify(c,null,2)+'\n';
 for(const[ref,bytes]of Object.entries(files))manifest.files[ref]=digest(bytes);
 mkdirSync(output,{recursive:true});for(const[ref,bytes]of Object.entries(files))writeFileSync(path.join(output,ref),bytes);writeFileSync(path.join(output,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');return manifest;
}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url){const a={};for(let i=2;i<process.argv.length;i+=2)a[process.argv[i].slice(2)]=process.argv[i+1];console.log(JSON.stringify(collectAntdReference({toolchain:a.toolchain,version:a.version,output:a.output,components:a.components?.split(',')}),null,2));}
