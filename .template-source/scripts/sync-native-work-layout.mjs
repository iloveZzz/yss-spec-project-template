#!/usr/bin/env node
// Canonical template modules are copied into reviewed native compatibility inputs.
// Fixed template snapshots stay distinct from these CLI-generated outputs.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
const source=path.resolve(import.meta.dirname,'../..');
const args=process.argv.slice(2),at=args.indexOf('--cli-root');
if(at<0||!args[at+1])throw Error('--cli-root 必须显式指定 CLI 源仓');
const cli=fs.realpathSync(args[at+1]),check=args.includes('--check');
const refs=[
  ...['work-layout','stage-tracking','stage-tracking-migration','reading-view-policy','reading-view-bundle','approval-checkpoint-discovery','asset-transactions','runtime-store','lifecycle-transition','feature-assets','project-governance','native-context','openapi-draft-validation'].map(id=>`scripts/lib/${id}.mjs`),
  ...['build-shadcn-vue-prototype','export-vue-patterns','prototype-contract','offline-html','prototype-comparison'].map(id=>`.agents/skills/yss-prototype-stage/scripts/${id}.mjs`),
  '.template-spec/process/schemas/reading-policy.schema.json',
  '.template-spec/process/schemas/openapi-draft-validation-record.schema.json',
  '.template-spec/process/work-layout.md','.gitignore'
];
const records=[];let stale=false;
for(const ref of refs.sort()) {
  const data=fs.readFileSync(path.join(source,ref)),target=path.join(cli,'internal/bundle/work-layout-assets',ref);
  const current=fs.existsSync(target)?fs.readFileSync(target):null;
  if(!current?.equals(data)) { stale=true;if(!check){fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,data);} }
  records.push({ref,sha256:createHash('sha256').update(data).digest('hex')});
}
if(check&&stale)throw Error('native work-layout 输入未同步');
console.log(JSON.stringify({status:'passed',mode:check?'check':'sync',files:records}));
