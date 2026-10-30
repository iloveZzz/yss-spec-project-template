#!/usr/bin/env node
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
import {committedPluginOptionsFromEnvironment, observeCommittedPluginSource} from './lib/committed-plugin-source.mjs';

const tests={
  'check.plugin-entry-migration': {tooling:true,args:['scripts/test-with-plugin-clis.mjs','test/plugin-entry-migration.test.mjs','test/plugin-project.test.mjs']},
  'check.plugin-backend-profile': {args:['--test','--test-concurrency=1','.template-source/tooling/node/test/backend-plugin-profile.test.mjs','.template-source/tooling/node/test/plugin-build.test.mjs']},
  'check.plugin-supported-scope': {args:['--test','--test-concurrency=1','--test-skip-pattern=当前主机真实公开打包','.template-source/plugins/yss-backend-delivery/tests/permissions.test.mjs','.template-source/tooling/node/test/plugin-native-schema.test.mjs']},
};
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
try {
  const task=tests[process.argv[2]];
  if(!task||process.argv.length!==3)throw new Error('committed plugin task not supported');
  const root=process.cwd(),options=committedPluginOptionsFromEnvironment(root,process.env),before=observeCommittedPluginSource(options);
  if(hash(before)!==process.env.YSS_PLUGIN_COMMITTED_SNAPSHOT_SHA256)throw new Error('committed plugin input drift before test');
  const env={...process.env,YSS_NATIVE_BINARY:options.binary,YSS_NATIVE_BINARY_SHA256:options.binarySha256,YSS_PLUGIN_TEST_BINARY:options.binary,YSS_PLUGIN_BINARY:options.binary};
  const result=spawnSync(process.execPath,task.args,{cwd:task.tooling?path.join(root,'.template-source/tooling/node'):root,env,stdio:'inherit'});
  const after=observeCommittedPluginSource(options);
  if(hash(after)!==process.env.YSS_PLUGIN_COMMITTED_SNAPSHOT_SHA256)throw new Error('committed plugin input drift after test');
  if(result.error||result.signal||!Number.isInteger(result.status))throw new Error('committed plugin test did not exit normally');
  process.exitCode=result.status;
} catch(error) {console.error(error.message);process.exitCode=1;}
