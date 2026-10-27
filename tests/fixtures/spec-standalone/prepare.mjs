import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';

const fixtureSkills=['yss-product-lifecycle','grilling','yss-research','domain-modeling','to-spec','i-have-adhd','code-review','implement'];
const within=(root,file)=>{const ref=path.relative(root,file);return ref===''||!path.isAbsolute(ref)&&ref!=='..'&&!ref.startsWith('..'+path.sep);};

export function prepareStandaloneSource({sourceRoot,out,skills}) {
  sourceRoot=fs.realpathSync(sourceRoot);
  out=path.resolve(out);
  if(fs.existsSync(out))throw new Error('fixture output already exists');
  out=path.join(fs.realpathSync(path.dirname(out)),path.basename(out));
  if(within(sourceRoot,out)||within(out,sourceRoot))throw new Error('fixture output overlaps source');
  if(!Array.isArray(skills)||!skills.length||new Set(skills).size!==skills.length)throw new Error('nonempty unique skills required');
  const files=new Map();
  function collect(source,ref) {
    const stat=fs.lstatSync(source);
    if(stat.isSymbolicLink()||fs.realpathSync(source)!==source)throw new Error('linked fixture source is not allowed');
    if(!within(sourceRoot,source))throw new Error('fixture source escapes root');
    if(stat.isDirectory()) {
      for(const entry of fs.readdirSync(source).sort())collect(path.join(source,entry),path.posix.join(ref,entry));
    } else if(stat.isFile())files.set(ref,{bytes:fs.readFileSync(source),mode:stat.mode&0o777});
    else throw new Error('fixture source must be an ordinary file or directory');
  }
  for(const name of skills) {
    if(typeof name!=='string'||!/^([a-z0-9]+-)*[a-z0-9]+$/.test(name))throw new Error('unsafe skill path');
    const ref=`.agents/skills/${name}`;
    if(!fs.existsSync(path.join(sourceRoot,ref,'SKILL.md')))throw new Error('fixture skill missing: '+name);
    collect(path.join(sourceRoot,ref),ref);
  }
  collect(path.join(sourceRoot,'.template-source/distribution/entries/spec-skills-AGENTS.md'),'AGENTS.md');
  const manifest={sourceRoot,skills:[...skills],files:{}};
  fs.mkdirSync(out);
  for(const [ref,file] of files) {
    const target=path.join(out,ref);
    fs.mkdirSync(path.dirname(target),{recursive:true});
    fs.writeFileSync(target,file.bytes,{flag:'wx',mode:file.mode});
    fs.chmodSync(target,file.mode);
    manifest.files[ref]={sha256:createHash('sha256').update(file.bytes).digest('hex'),mode:file.mode};
  }
  const manifestPath=path.join(out,'source-manifest.json');
  fs.writeFileSync(manifestPath,JSON.stringify(manifest,null,2)+'\n',{flag:'wx'});
  return {root:out,manifestPath};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const options={};
  for(let i=2;i<process.argv.length;i+=2) {
    const key=process.argv[i];
    if(!['--source','--out'].includes(key)||options[key]||!process.argv[i+1])throw new Error('usage: prepare.mjs --source ROOT --out NEW_DIRECTORY');
    options[key]=process.argv[i+1];
  }
  if(!options['--source']||!options['--out'])throw new Error('source and out required');
  process.stdout.write(JSON.stringify(prepareStandaloneSource({sourceRoot:options['--source'],out:options['--out'],skills:fixtureSkills}))+'\n');
}
