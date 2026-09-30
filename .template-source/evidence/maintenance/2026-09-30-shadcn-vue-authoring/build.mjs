import {readFile,writeFile,mkdir,cp,mkdtemp} from 'node:fs/promises';
import path from 'node:path';import os from 'node:os';import {fileURLToPath,pathToFileURL} from 'node:url';
const here=path.dirname(fileURLToPath(import.meta.url)),repo=path.resolve(here,'../../../..');
const {buildShadcnVuePrototype}=await import(pathToFileURL(path.join(repo,'.agents/skills/yss-prototype-stage/scripts/build-shadcn-vue-prototype.mjs')));
const {prepareComparison,validateComparison}=await import(pathToFileURL(path.join(repo,'.agents/skills/yss-prototype-stage/scripts/prototype-comparison.mjs')));
const toolchain=process.argv[2];if(!toolchain)throw Error('Provide existing locked author toolchain path');
const temp=await mkdtemp(path.join(os.tmpdir(),'yss-vue-build-')),fixture=path.join(temp,'fixture');
await mkdir(path.join(fixture,'.template-spec/design/tokens'),{recursive:true});
for(const ref of ['DESIGN.md','.template-spec/design/tokens/variables.css'])await cp(path.join(repo,ref),path.join(fixture,ref));
const results=[];
for(const [page,title] of [['list-detail','查询与详情'],['multi-step','分步表单']]){
 const cases=JSON.parse(await readFile(path.join(repo,'.agents/skills/yss-prototype-stage/assets/vue-business-patterns',page+'.scenarios.json'),'utf8')).scenarios.map(s=>({id:s.id,label:s.label,scenario:s.id}));
 const base='docs/.scratch/vue-study/design';await mkdir(path.join(fixture,base),{recursive:true});
 await cp(path.join(repo,'.agents/skills/yss-prototype-stage/assets/vue-business-patterns',page+'.scenarios.json'),path.join(fixture,base,page+'.scenarios.json'));
 await cp(path.join(here,'comparison-record.md'),path.join(fixture,base,'comparison-record.md'));
 const variants=[];
 for(const [mode,label] of [['standard','标准精修'],['glass','轻玻璃']]){
  const feature=page+'-'+mode,ref=`docs/.scratch/${feature}/design/prototypes`;
  await buildShadcnVuePrototype({projectRoot:fixture,root:path.join(fixture,ref),feature,toolchain,config:path.join(repo,'.agents/skills/yss-prototype-stage/assets/vue-business-patterns',`${feature}.config.json`)});
  variants.push({id:mode,label,root:ref,entry:'index.html',cases:cases.map(c=>c.id)});
 }
 const input={schema_version:2,comparison_id:page,title:title+' · 外观对照',comparison_ref:base+'/comparison-record.md',scenario_ref:base+'/'+page+'.scenarios.json',cases,variants};
 await writeFile(path.join(fixture,base,page+'.comparison.json'),JSON.stringify(input,null,2));
 const output=await prepareComparison({projectRoot:fixture,feature:'vue-study',input:base+'/'+page+'.comparison.json'});
 const target=path.join(here,'comparisons',page);await mkdir(path.dirname(target),{recursive:true});
 await cp(output.root,target,{recursive:true,errorOnExist:true,force:false});
 results.push({page,root:target,result:await validateComparison(target)});
}
await writeFile(path.join(here,'evidence/build.json'),JSON.stringify({fixture,toolchain,results},null,2));console.log(JSON.stringify({fixture,results},null,2));
