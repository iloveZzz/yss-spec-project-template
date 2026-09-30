// Refresh only the three shared design skills against their actual profile source trees.
// Keep the existing revision and truthful working-tree status; no commit or publish.
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import path from 'node:path';
import {treeHash} from '../../../../scripts/lib/skill-supply-chain.mjs';
const root=path.resolve(import.meta.dirname,'../../../..');
const ids=new Set(['prototype-review','yss-prototype-stage','yss-design-system']);
// Frontend retains its own committed upstream baseline plus effective adaptation hash.
for(const [name,base] of [['root',root]]) {
 const file=path.join(base,'.agents/skills/.strategic-design-skills-manifest.json');
 const bytes=readFileSync(file); const doc=JSON.parse(bytes);
 if(doc.source!=='iloveZzz/yss-harness-design-agent'||doc.source_state!=='working-tree')throw Error('Unexpected source contract');
 const backup=path.join(import.meta.dirname,'evidence',`${name}-strategic-manifest-before.json`);
 if(!existsSync(backup))writeFileSync(backup,bytes,{flag:'wx'});
 for(const item of doc.skills) if(ids.has(item.canonical))item.upstream_hash=treeHash(path.join(root,'submodules/yss-harness-design-agent',doc.source_root,item.upstream));
 const rendered=JSON.stringify(doc,null,2)+'\n';if(rendered!==bytes.toString())writeFileSync(file,rendered);
}
console.log('Three source-tree digests refreshed; source_state remains working-tree');
