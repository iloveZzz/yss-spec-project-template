#!/usr/bin/env node
// Run the same public-entrypoint contract against source or installed packages.
// This command never rebuilds the supplied package or changes its snapshot.
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {spawn} from 'node:child_process';
const root=path.resolve(import.meta.dirname,'../..');
const profiles=[['DESIGN','create-yss-strategic-design'],['BACKEND','create-yss-harness-backend'],['FRONTEND','create-yss-harness-frontend']];
const results=await Promise.allSettled(profiles.map(async ([key,folder])=>{
 const pkg=path.resolve(process.env[`YSS_CLI_${key}_ROOT`] || path.join(root,'submodules',folder));
 const source=`import {packageContract} from ${JSON.stringify(pathToFileURL(path.join(pkg,'vendor/cli-core/tests/package-contract.mjs')).href)};import {boundaryContract} from ${JSON.stringify(new URL('./cli-boundaries.mjs',import.meta.url).href)};packageContract(${JSON.stringify(pkg)});boundaryContract(${JSON.stringify(pkg)});`;
 await new Promise((resolve,reject)=>{
  const child=spawn(process.execPath,['--input-type=module','-e',source],{stdio:'inherit'});
  child.on('error',reject);child.on('close',code=>code===0?resolve():reject(new Error(`${key} 包验收失败: ${code}`)));
 });
}));
for(const r of results) if(r.status==='rejected'){console.error(r.reason.message);process.exitCode=1;}
