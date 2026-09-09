import {mkdtempSync,rmSync,readFileSync} from 'node:fs';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {pathToFileURL} from 'node:url';
const [implementation,source,revision]=process.argv.slice(2);
const {syncCore}=await import(pathToFileURL(path.join(implementation,'.template-source/cli-core/build.mjs')));
const output=mkdtempSync(path.join(tmpdir(),'yss-archive-benchmark-'));
try{const started=performance.now();const lock=syncCore(source,revision,output);console.log(JSON.stringify({duration_ms:performance.now()-started,digest:lock.digest,files:Object.keys(lock.files).length}));}finally{rmSync(output,{recursive:true,force:true});}
