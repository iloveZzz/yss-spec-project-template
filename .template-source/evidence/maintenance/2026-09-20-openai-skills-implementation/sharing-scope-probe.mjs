import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdtempSync,rmSync,existsSync} from 'node:fs';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import os from 'node:os';
import vm from 'node:vm';
const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'../../../..');
const plugin=path.join(root,'.codex/skills/data-analytics');
const server=createRequire(import.meta.url)(path.join(plugin,'mcp/server.cjs'));
const tests=readFileSync(path.join(plugin,'tests/mcp-server.test.mjs'),'utf8');
const factory=tests.slice(tests.indexOf('function artifactPayload('),tests.indexOf('async function widgetResourceHtml('));
const fixture=vm.runInNewContext(factory+'; artifactPayload("report")');
const temp=mkdtempSync(path.join(os.tmpdir(),'yss-sharing-scope-'));
try {
  // JSON converts the VM object into the server realm without altering the fixture.
  const result=server.exportDataScienceArtifactPackage({...JSON.parse(JSON.stringify(fixture)),output_dir:path.join(temp,'package')});
  assert.equal(result.access_default,null);
  assert.equal(result.access_requirement,'explicit-user-selection-before-deployment');
  assert.ok(existsSync(result.archive_path));
  const source=readFileSync(path.join(plugin,'src/analytics-app/App.tsx'),'utf8');
  const code=source.slice(source.indexOf('function exportPrompt('),source.indexOf('function setOptionalCodexSearchParam('));
  const prompt=vm.runInNewContext(code+'; exportPrompt("site",{},{},{})',{appSurfaceLabel:()=> 'report',promptContext:()=> 'fixture only'});
  assert.ok(prompt.includes('keep the package local'));
  assert.ok(!prompt.includes('workspace_all'));
  writeFileSync(path.join(here,'sharing-scope-probe.json'),JSON.stringify({result:'passed',local_archive_created:true,access_default:result.access_default,access_requirement:result.access_requirement,cloud_calls:0,generated_prompt:prompt,scope:'Actual local export and generated prompt; no cloud deployment or browser UI test.'},null,2)+'\n');
  console.log('Local export and generated sharing prompt preserve explicit access selection');
} finally {rmSync(temp,{recursive:true,force:true});}
