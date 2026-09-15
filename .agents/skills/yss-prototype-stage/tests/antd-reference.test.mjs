import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,existsSync,rmSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {collectAntdReference} from '../scripts/collect-antd-reference.mjs';
test('reference collection distinguishes exact evidence from minor fallback and refuses fabricated coverage',()=>{
 const temp=mkdtempSync(path.join(os.tmpdir(),'antd-metadata-contract-'));
 try{
  const pkg=path.join(temp,'node_modules/@ant-design/cli');mkdirSync(path.join(pkg,'data'),{recursive:true});
  writeFileSync(path.join(pkg,'package.json'),JSON.stringify({name:'@ant-design/cli',version:'6.6.4'}));
  writeFileSync(path.join(pkg,'data/versions.json'),JSON.stringify({v6:{'6.6':'6.6.4'}}));
  writeFileSync(path.join(pkg,'data/v6.6.4.json'),JSON.stringify({version:'6.6.4',components:[{name:'Button',props:[{name:'disabled'}]}]}));
  const run=(version,name,components=['Button'])=>collectAntdReference({toolchain:temp,version,output:path.join(temp,name),components});
  assert.equal(run('6.6.4','exact').version_match,'exact');
  assert.equal(run('6.6.3','fallback').version_match,'minor-snapshot-only');
  assert.throws(()=>run('6.5.0','unavailable'),/未收录该 minor/);
  assert.throws(()=>run('6.6.4','util',['Util']),/不可补造 API/);
  assert.equal(existsSync(path.join(temp,'util')),false);
  assert.throws(()=>run('6.6.4','exact'),/输出已存在/);
  writeFileSync(path.join(pkg,'data/v6.6.4.json'),JSON.stringify({version:'6.6.3',components:[]}));
  assert.throws(()=>run('6.6.4','drift'),/版本不一致/);
 }finally{rmSync(temp,{recursive:true,force:true});}
});
