#!/usr/bin/env node
import { existsSync, realpathSync } from 'node:fs';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
import {exportVuePatterns} from './export-vue-patterns.mjs';
export const exportBusinessPatterns=exportVuePatterns;
if(process.argv[1]&&existsSync(process.argv[1])&&import.meta.url===pathToFileURL(realpathSync(process.argv[1])).href){const args={};for(let i=2;i<process.argv.length;i+=2)args[process.argv[i].slice(2)]=process.argv[i+1];console.log(JSON.stringify(await exportBusinessPatterns({projectRoot:path.resolve(args['project-root']||'.'),output:args.output,toolchain:args.toolchain})));}
