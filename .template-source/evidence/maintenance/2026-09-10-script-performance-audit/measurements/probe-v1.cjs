// Analysis-only preload. Baselines run without this instrumentation.
const fs = require('node:fs');
const cp = require('node:child_process');
const path = require('node:path');
const {syncBuiltinESMExports} = require('node:module');
const stats = new Map();
const record = (key, ms) => {const row=stats.get(key)||{count:0,duration_ms:0};row.count++;row.duration_ms+=ms;stats.set(key,row);};
const started=performance.now();
for(const name of ['readFileSync','readdirSync','lstatSync','statSync','existsSync','realpathSync','cpSync','copyFileSync','mkdirSync','writeFileSync']) {
 const original=fs[name]; fs[name]=function(...args){const t=performance.now();try{return original.apply(this,args);}finally{record(`fs.${name}`,performance.now()-t);}};
}
function label(args){const [exe,argv=[]]=args;const base=path.basename(String(exe)); if(base.startsWith('python'))return `${base}:${path.basename(String(argv.at(-1)||''))}`;return `${base}:${String(argv.find(x=>typeof x==='string'&&!x.startsWith('-'))||'').slice(0,180)}`;}
for(const name of ['spawnSync','execFileSync','execSync']){const original=cp[name];cp[name]=function(...args){const t=performance.now();try{return original.apply(this,args);}finally{record(`${name}:${label(args)}`,performance.now()-t);}};}
for(const name of ['spawn','fork']){const original=cp[name];cp[name]=function(...args){const t=performance.now();const child=original.apply(this,args);child.once('close',()=>record(`${name}:${label(args)}`,performance.now()-t));return child;};}
syncBuiltinESMExports();
const rawWrite=fs.writeFileSync;
process.on('exit',()=>{const dir=process.env.YSS_PERF_TRACE_DIR;if(!dir)return;rawWrite(path.join(dir,`${process.pid}.json`),JSON.stringify({pid:process.pid,ppid:process.ppid,entry:process.argv[1],wall_ms:performance.now()-started,exit_code:process.exitCode??0,operations:Object.fromEntries(stats)},null,2));});
