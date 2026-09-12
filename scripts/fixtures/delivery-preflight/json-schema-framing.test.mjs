// Real Python validation through a transport fixture, never a product approval or mocked validator.
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {validateJsonSchemas} from '../../lib/json-schema.mjs';

const python=spawnSync('python3',['-c','import sys; print(sys.executable)'],{encoding:'utf8'}).stdout.trim();
function fixture(t,mode='hold-open') {
 const root=mkdtempSync(path.join(tmpdir(),'schema-frame-test-')),previousPath=process.env.PATH;
 t.after(()=>{process.env.PATH=previousPath;rmSync(root,{recursive:true,force:true});});
 const schemaPath=path.join(root,'schema.json');writeFileSync(schemaPath,JSON.stringify({type:'object',required:['name'],properties:{name:{type:'string',const:'真实 UTF-8 原字节'}}}));
 // Keep the actual validator's stdin write end open until it exits. This reproduces
 // the sampled readall/EOF wait while leaving schema evaluation entirely real.
 writeFileSync(path.join(root,'python3'),`#!${python}\nimport sys,subprocess\npayload=sys.stdin.buffer.read()\nchild=subprocess.Popen([${JSON.stringify(python)},*sys.argv[1:]],stdin=subprocess.PIPE)\nchild.stdin.write(payload${mode==='truncate'? '[:-1]':''})\nchild.stdin.flush()\n${mode==='truncate'?'child.stdin.close()':''}\ntry:\n    code=child.wait(timeout=2)\nexcept subprocess.TimeoutExpired:\n    print('SCHEMA_EOF_WAIT_REPRO: validator waited for EOF despite complete JSON bytes',file=sys.stderr)\n    child.kill()\n    child.wait()\n    code=73\nfinally:\n    if not child.stdin.closed: child.stdin.close()\nsys.exit(code)\n`,{mode:0o755});
 process.env.PATH=`${root}${path.delimiter}${previousPath}`;
 return {root,schemaPath};
}
test('real Python schema batch finishes without stdin EOF and preserves Unicode, large input and invalid results',t=>{
 const f=fixture(t),large='中文😀'.repeat(30000);
 const invalidSchema=path.join(f.root,'invalid-schema.json'),verboseSchema=path.join(f.root,'verbose-schema.json');
 writeFileSync(invalidSchema,JSON.stringify({type:'not-a-json-schema-type'}));writeFileSync(verboseSchema,JSON.stringify({const:'expected'}));
 const result=validateJsonSchemas([{value:{name:'真实 UTF-8 原字节',large},schemaPath:f.schemaPath},{value:{name:'错误值',large},schemaPath:f.schemaPath,errorStyle:'verbose'},{value:large,schemaPath:verboseSchema,errorStyle:'verbose'},{value:'value',schemaPath:invalidSchema}]);
 assert.equal(result[0].valid,true);assert.equal(result[0].error,'');assert.equal(result[1].valid,false);assert.match(result[1].error,/真实 UTF-8 原字节/);
 assert.equal(result[2].valid,false);assert.ok(result[2].error.length>100000,'large error output must be drained');assert.equal(result[3].valid,false);assert.match(result[3].error,/not-a-json-schema-type/);
});
test('truncated byte frame fails with an explicit protocol error',t=>{
 const f=fixture(t,'truncate');assert.throws(()=>validateJsonSchemas([{value:{name:'真实 UTF-8 原字节'},schemaPath:f.schemaPath}]),/JSON_SCHEMA_PROTOCOL.*truncated/);
});
test('a nonresponsive interpreter is bounded by the schema timeout',t=>{
 const f=fixture(t);writeFileSync(path.join(f.root,'python3'),`#!${python}\nimport time\ntime.sleep(10)\n`,{mode:0o755});
 assert.throws(()=>validateJsonSchemas([{value:{name:'真实 UTF-8 原字节'},schemaPath:f.schemaPath}],{timeoutMs:200}),/JSON_SCHEMA_TIMEOUT/);
});
