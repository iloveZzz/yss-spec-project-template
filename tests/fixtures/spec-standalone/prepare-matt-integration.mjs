import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {prepareStandaloneSource} from './prepare.mjs';

const skills=['yss-product-lifecycle','grilling','yss-research','domain-modeling','to-spec','i-have-adhd','code-review','implement','tdd','diagnosing-bugs','codebase-design'];
const governedRefs=['AGENTS.md','CONTEXT.md','yss-project.yaml','.agents','.template-spec','scripts','.template-source/process','.template-source/distribution'];
const within=(root,target)=>{const rel=path.relative(root,target);return !rel||(!path.isAbsolute(rel)&&rel!=='..'&&!rel.startsWith('..'+path.sep));};

export function prepareMattIntegrationSource({sourceRoot,out,nativeSeed}) {
  sourceRoot=fs.realpathSync(sourceRoot);
  out=path.resolve(out);
  if(fs.existsSync(out))throw new Error('fixture output already exists');
  out=path.join(fs.realpathSync(path.dirname(out)),path.basename(out));
  if(within(sourceRoot,out)||within(out,sourceRoot))throw new Error('fixture output overlaps source');
  if(nativeSeed){
    nativeSeed=fs.realpathSync(nativeSeed);
    if(within(nativeSeed,out)||within(out,nativeSeed))throw new Error('fixture output overlaps native seed');
    if(fs.readdirSync(nativeSeed,{recursive:true}).some(ref=>fs.lstatSync(path.join(nativeSeed,ref)).isSymbolicLink()))throw new Error('linked native fixture seed');
  }
  const files=new Map();
  function collect(ref) {
    const source=path.join(sourceRoot,ref),stat=fs.lstatSync(source);
    if(stat.isSymbolicLink()||fs.realpathSync(source)!==source)throw new Error('linked fixture source: '+ref);
    if(stat.isDirectory())for(const name of fs.readdirSync(source).sort())collect(path.posix.join(ref,name));
    else if(stat.isFile())files.set(ref,{bytes:fs.readFileSync(source),mode:stat.mode&0o777});
    else throw new Error('fixture source must be ordinary: '+ref);
  }
  for(const ref of governedRefs)collect(ref);
  for(const skill of skills)if(!files.has(`.agents/skills/${skill}/SKILL.md`))throw new Error('required skill missing: '+skill);
  fs.mkdirSync(out);
  prepareStandaloneSource({sourceRoot,out:path.join(out,'standalone'),skills});
  for(const [ref,file] of files) {
    const target=path.join(out,'governed',ref);
    fs.mkdirSync(path.dirname(target),{recursive:true});
    fs.writeFileSync(target,file.bytes,{flag:'wx',mode:file.mode});
  }
  fs.copyFileSync(new URL('./matt-governed-setup.mjs',import.meta.url),path.join(out,'governed/eval-setup.mjs'));
  const chain='scripts/fixtures/role-independent-draft/worker-chain.test.mjs';
  const chainTarget=path.join(out,'governed',chain);fs.mkdirSync(path.dirname(chainTarget),{recursive:true});
  fs.copyFileSync(new URL('../../../'+chain,import.meta.url),chainTarget);
  if(nativeSeed){
    fs.cpSync(nativeSeed,path.join(out,'governed/native-backend-seed'),{recursive:true,filter:file=>!path.relative(nativeSeed,file).split(path.sep).includes('.git')&&!path.relative(nativeSeed,file).startsWith('.yss/transactions')});
  }
  const manifest={sourceRoot,files:{}};
  function inventory(dir) {
    for(const name of fs.readdirSync(dir).sort()) {
      const file=path.join(dir,name),stat=fs.statSync(file);
      if(stat.isDirectory())inventory(file);
      else manifest.files[path.relative(out,file)]={sha256:createHash('sha256').update(fs.readFileSync(file)).digest('hex'),mode:stat.mode&0o777};
    }
  }
  inventory(out);
  const manifestPath=path.join(out,'source-manifest.json');
  fs.writeFileSync(manifestPath,JSON.stringify(manifest,null,2)+'\n',{flag:'wx'});
  return {root:out,manifestPath};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const options={};
  for(let i=2;i<process.argv.length;i+=2) {
    const key=process.argv[i];
    if(!['--source','--out','--native-seed'].includes(key)||options[key]||!process.argv[i+1])throw new Error('usage: --source ROOT --out NEW_DIRECTORY [--native-seed INSTALLED_BACKEND]');
    options[key]=process.argv[i+1];
  }
  if(!options['--source']||!options['--out'])throw new Error('source and out required');
  process.stdout.write(JSON.stringify(prepareMattIntegrationSource({sourceRoot:options['--source'],out:options['--out'],nativeSeed:options['--native-seed']}))+'\n');
}
