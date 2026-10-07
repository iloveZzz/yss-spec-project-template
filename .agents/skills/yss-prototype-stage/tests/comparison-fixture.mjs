import { fixtureTracker } from './work-layout-fixture.mjs';
import { mkdtemp, mkdir, writeFile, cp } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { prepareFlowPrototype } from '../scripts/prototype-contract.mjs';
import { prepareComparison } from '../scripts/prototype-comparison.mjs';

export async function comparisonFixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), 'yss-comparison-'));
  await mkdir(path.join(root,'.template-spec/design/tokens'),{recursive:true});
  for (const ref of ['DESIGN.md','.template-spec/design/tokens/variables.css']) await cp(new URL(`../../../../${ref}`,import.meta.url),path.join(root,ref));
  await fixtureTracker(root);
  for (const feature of ['a','b']) await prepareFlowPrototype({projectRoot:root,root:path.join(root,`docs/.scratch/${feature}/design/prototypes`),feature});
  await writeFile(path.join(root,'interaction.md'),'# 比较记录\n问题：页面组织。共同任务、输入、保真度保持。此文件仅为维护 fixture。\n');
  const input = {schema_version:2,comparison_id:'options',title:'方案比较',comparison_ref:'interaction.md',scenario_ref:'docs/.scratch/a/design/prototypes/scenarios.json',cases:[{id:'normal',label:'正常',scenario:'primary'},{id:'retry',label:'恢复',scenario:'failure'}],variants:['a','b'].map(id=>({id,label:`方案 ${id}`,root:`docs/.scratch/${id}/design/prototypes`,entry:'index.html',cases:['normal','retry']}))};
  await writeFile(path.join(root,'input.json'),JSON.stringify(input));
  return {root,input,prepare:()=>prepareComparison({projectRoot:root,feature:'fixture',input:'input.json'})};
}
