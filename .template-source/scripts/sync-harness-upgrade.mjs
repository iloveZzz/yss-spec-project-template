#!/usr/bin/env node
// 生成 setup-yss-harness 的操作合同参考；Profile 已并入本仓覆盖层，不再有需要同步的 Profile 副本。
import * as fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseDocument} from '../../scripts/vendor/yaml.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..'),check=process.argv.includes('--check');
const registry='.template-spec/agents/yss-skill-registry.yaml',protocol='.template-spec/process/harness-upgrade.md',guide='.template-spec/user-guide/unified-cli.md';
const source=parseDocument(fs.readFileSync(path.join(root,registry),'utf8')).toJS();
const skillId='setup-yss-harness',previousId='yss-harness-upgrade';
const skill=source.skills.find(s=>s.id===skillId);const differences=[];
if(!skill)throw new Error(`缺少技能注册: ${skillId}`);
const migrations='.template-spec/agents/skill-migrations.md',migrationHeading=`## \`${previousId}\` 更名`;
function migrationRange(text){const start=text.indexOf(migrationHeading);if(start<0)return null;const next=text.indexOf('\n## ',start+1);return[start,next<0?text.length:next+1];}
const sourceMigrations=fs.readFileSync(path.join(root,migrations),'utf8'),sourceRange=migrationRange(sourceMigrations);
if(!sourceRange)throw new Error(`缺少维护入口迁移说明: ${previousId}`);
const migrationSection=sourceMigrations.slice(...sourceRange);
function emit(ref,bytes){const p=path.join(root,ref);if(!fs.existsSync(p)||!fs.readFileSync(p).equals(Buffer.from(bytes))){differences.push(ref);if(!check){fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,bytes);}}}
emit(`.agents/skills/${skillId}/references/operation-contract.md`,'<!-- Generated from .template-spec/process/harness-upgrade.md by .template-source/scripts/sync-harness-upgrade.mjs; edit the source protocol. -->\n\n'+fs.readFileSync(path.join(root,protocol),'utf8'));
console.log(JSON.stringify({check,differences},null,2));if(check&&differences.length)process.exitCode=1;
