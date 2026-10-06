#!/usr/bin/env node
// Fixed native binary public entrypoint acceptance. No source rebuild or global install.
import {spawnSync} from 'node:child_process';
import path from 'node:path';
import {nativeBinary} from './lib/native-yss.mjs';
nativeBinary();
const root=path.resolve(import.meta.dirname,'../..');
const result=spawnSync(process.execPath,['--test','--test-concurrency=1','tests/cli-retirement.test.mjs'],{cwd:root,env:process.env,stdio:'inherit'});
if(result.error||result.signal||!Number.isInteger(result.status))throw new Error('原生 CLI 验收未观察到正常退出');
process.exitCode=result.status;
