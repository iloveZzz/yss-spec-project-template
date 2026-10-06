#!/usr/bin/env node
// Generate only upgrade-owned profile additions; preserve profile-local routing.
import * as fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseDocument} from '../../scripts/vendor/yaml.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..'),check=process.argv.includes('--check');
const registry='.template-spec/agents/yss-skill-registry.yaml',protocol='.template-spec/process/harness-upgrade.md',guide='.template-spec/user-guide/unified-cli.md';
const source=parseDocument(fs.readFileSync(path.join(root,registry),'utf8')).toJS();
const skill=source.skills.find(s=>s.id==='yss-harness-upgrade');const differences=[];
function emit(ref,bytes){const p=path.join(root,ref);if(!fs.existsSync(p)||!fs.readFileSync(p).equals(Buffer.from(bytes))){differences.push(ref);if(!check){fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,bytes);}}}
for(const profile of ['design','backend','frontend']){
 const base=`submodules/yss-harness-${profile}-agent`,p=path.join(root,base,registry),doc=parseDocument(fs.readFileSync(p,'utf8'));
 if(doc.errors.length)throw doc.errors[0];
 const entries=doc.get('skills');const existing=entries.items.find(n=>n.get('id')==='yss-harness-upgrade');
 if(existing){for(const [key,value]of Object.entries(skill))existing.set(key,value);}else entries.add(skill);
 if(!doc.has('skill_dependencies'))doc.set('skill_dependencies',{});
 doc.setIn(['skill_dependencies','yss-harness-upgrade'],source.skill_dependencies['yss-harness-upgrade']);
 const orchestrator=`${base}/.agents/skills/harness-orchestrator/SKILL.md`;
 if(fs.existsSync(path.join(root,orchestrator))){
  const marker='<!-- HARNESS_UPGRADE_ROUTE -->',old=fs.readFileSync(path.join(root,orchestrator),'utf8');
  const route=marker+'\nYSS CLI 安装与升级、治理工程新建与接管、实例模板同步、旧身份迁移、资源补装及事务恢复回退使用 `yss-harness-upgrade`，遵循 `.template-spec/process/harness-upgrade.md`；默认查询 GitHub 最新正式 Release 后固定来源，不推进阶段或改写历史批准。\n';
  const previous=marker+'\n既有实例的同家族模板升级、旧身份迁移和事务恢复使用 `yss-harness-upgrade`，遵循 `.template-spec/process/harness-upgrade.md`；升级不推进阶段或改写历史批准。\n';
  if(old.includes(marker)&&!old.includes(previous)&&!old.includes(route))throw new Error(`升级路由标记内容不明: ${orchestrator}`);
  emit(orchestrator,old.includes(marker)?old.replace(previous,route):old.trimEnd()+'\n\n'+route);
 }
 emit(`${base}/${registry}`,doc.toString());emit(`${base}/${protocol}`,fs.readFileSync(path.join(root,protocol)));emit(`${base}/${guide}`,fs.readFileSync(path.join(root,guide)));
}
console.log(JSON.stringify({check,differences},null,2));if(check&&differences.length)process.exitCode=1;
