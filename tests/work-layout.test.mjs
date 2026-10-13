import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { NATIVE_PROFILES, nativeDigest as hash, runNative } from '../.template-source/scripts/lib/native-yss.mjs';
import { assertNoTemplateReferences, readWorkLayout, workLayout } from '../scripts/lib/work-layout.mjs';

test('工作包路径遵循可移植合同用例', t => {
  const suite=JSON.parse(fs.readFileSync(new URL('./fixtures/work-layout-cases.json',import.meta.url)));
  const root=project(t);
  for(const item of suite.cases) {
    const build=()=>workLayout(root,{platform:'local-markdown',root:item.root});
    if(!item.valid) { assert.throws(build,`${item.root}`);continue; }
    const layout=build();assert.equal(layout.root,item.normalized);
    assert.equal(layout.checkpointFeature(item.checkpoint),item.feature);assert.equal(layout.isTicket(item.ticket),true);
  }
});

function project(t, rootRef = '.work') {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'yss-work-layout-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, '.template-spec/agents'), { recursive: true });
  fs.writeFileSync(path.join(root, '.template-spec/agents/issue-tracker.md'), `---\ntracker:\n  platform: local-markdown\n  root: ${rootRef}\n---\n`);
  return root;
}

test('配置选择工作包根，旧项目继续原路径，新旧路径不能互相冒充', t => {
  for (const base of ['.work', 'docs/.scratch', 'docs/custom-work']) {
    const layout = readWorkLayout(project(t, base));
    assert.equal(layout.featureRoot('report'), `${base}/report`);
    assert.equal(layout.checkpointFeature(`${base}/report/checkpoint.yaml`), 'report');
    assert.equal(layout.isTicket(`${base}/report/issues/01-export.md`), true);
    assert.throws(() => layout.checkpointFeature(`${base === '.work' ? 'docs/.scratch' : '.work'}/report/checkpoint.yaml`));
    assert.ok(layout.scanRoots.includes('.work'));
    assert.ok(layout.scanRoots.includes('docs/.scratch'));
  }
});

test('非法、保留或历史根不能成为当前写入配置', t => {
  const root = project(t);
  for (const base of ['', '../outside', '/outside', '.git', '.yss/work', '.agents/work', '.scratch', 'docs/requirements/tickets']) {
    assert.throws(() => workLayout(root, { root: base, platform: 'local-markdown' }), base);
  }
  assert.throws(() => readWorkLayout(project(t, 'null')));
  const missing=fs.mkdtempSync(path.join(os.tmpdir(), 'yss-work-layout-missing-'));
  t.after(()=>fs.rmSync(missing,{recursive:true,force:true}));
  assert.throws(() => readWorkLayout(missing));
});

test('配置根不能通过符号链接越过项目边界', t => {
  const root = project(t);
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'yss-work-layout-outside-'));
  t.after(() => fs.rmSync(outside, { recursive: true, force: true }));
  fs.symlinkSync(outside, path.join(root, '.work'));
  assert.throws(() => readWorkLayout(root), /symlink/);
});

test('正式引用拒绝当前、自定义和历史布局的模板占位路径，说明文字不作为路径', t => {
  for (const base of ['.work', 'docs/custom-work', 'docs/.scratch']) {
    const root = project(t, base);
    for (const ref of [`./${base}/example/spec.md`, `${base}//example/spec.md`, `${base}/reports/../example/spec.md`, path.join(root, base, 'example/spec.md')]) {
      assert.throws(() => assertNoTemplateReferences({ spec_ref: ref }, { root }), /模板占位/);
    }
    assert.doesNotThrow(() => assertNoTemplateReferences({ spec_ref: `https://example.org/${base}/example/spec.md` }, { root }));
    for (const ref of [`${base}/example/spec.md`, '.work/example/spec.md', 'docs/.scratch/example/spec.md', `${base}/<feature>/spec.md`]) {
      assert.throws(() => assertNoTemplateReferences({ spec_ref: ref }, { root }), /模板占位/);
      assert.throws(() => assertNoTemplateReferences({ evidence_refs: [ref] }, { root }), /模板占位/);
      assert.throws(() => assertNoTemplateReferences({ implementation_plan: { ref } }, { root }), /模板占位/);
    }
    assert.doesNotThrow(() => assertNoTemplateReferences({ spec_ref: `${base}/reports/spec.md`, explanation: '历史说明 docs/.scratch/example/spec.md' }, { root }));
  }
});

test('遗留检查覆盖所有子模块、文档、Schema、无扩展脚本、转义及文件名，并拒绝过期例外', t => {
  const root = project(t);
  const checker = new URL('../scripts/verify-work-layout', import.meta.url).pathname;
  const git = (cwd, ...args) => {
    const result = spawnSync('git', ['-C', cwd, ...args], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
  };
  git(root, 'init', '-q');
  const write = (ref, text) => { fs.mkdirSync(path.dirname(path.join(root, ref)), { recursive: true }); fs.writeFileSync(path.join(root, ref), text); };
  const policyRef = '.template-source/process/work-layout-exceptions.json';
  const save = exceptions => write(policyRef, JSON.stringify({ schema_version: 1, exceptions }));
  save([]);
  const run = (...args) => spawnSync(process.execPath, [checker, '--root', root, ...args], { encoding: 'utf8' });
  assert.equal(run().status, 0);
  for (const profile of ['design', 'backend', 'frontend']) {
    const ref = `submodules/${profile}`;
    fs.mkdirSync(path.join(root, ref), { recursive: true });
    git(path.join(root, ref), 'init', '-q');
    git(root, 'update-index', '--add', '--cacheinfo', `160000,${'1'.repeat(40)},${ref}`);
  }
  const refs = ['policy.yaml', 'schema.json', 'issue-tracker.md', 'scripts/check', 'tests/ordinary.mjs', 'profiles/design/scripts/lib/consumer.mjs', 'profiles/backend/.template-spec/agents/issue-tracker.md', 'submodules/design/contract.yaml', 'submodules/backend/work-layout.md', 'submodules/frontend/scripts/check'];
  for (const ref of refs) write(ref, 'root: docs/.scratch\n');
  write('escaped.json', JSON.stringify({ pattern: String.raw`^docs\/\.scratch` }));
  write('docs/.scratch/empty.md', '');
  const failed = run();
  assert.notEqual(failed.status, 0);
  for (const ref of [...refs, 'escaped.json', 'docs/.scratch/empty.md']) assert.ok(failed.stderr.includes(ref), failed.stderr);
  const inspected = run('--inventory');
  assert.equal(inspected.status, 0, inspected.stderr);
  const rules = JSON.parse(inspected.stdout).map(({ line, ...item }) => ({ ...item, category: 'compatibility-test', reason: '显式旧布局回归用例' }));
  save(rules);
  assert.equal(run().status, 0, run().stderr);
  write('policy.yaml', 'root: docs/.scratch\nroot: docs/.scratch\n');
  assert.match(run().stderr, /次数变化/);
  write('policy.yaml', 'root: .work\n');
  assert.match(run().stderr, /失效例外/);
  fs.rmSync(path.join(root, 'submodules/backend/.git'), { recursive: true });
  assert.match(run().stderr, /子模块未初始化/);
});

test('独立 CLI 扫描不依赖已删除的 Go 测试目录', t => {
  const root = project(t), cli = project(t);
  for (const cwd of [root, cli]) assert.equal(spawnSync('git', ['-C', cwd, 'init', '-q']).status, 0);
  fs.mkdirSync(path.join(root, '.template-source/process'), { recursive: true });
  fs.writeFileSync(path.join(root, '.template-source/process/work-layout-exceptions.json'), JSON.stringify({ schema_version: 1, exceptions: [] }));
  const run = () => spawnSync(process.execPath, [new URL('../scripts/verify-work-layout', import.meta.url).pathname, '--root', root, '--cli-root', cli], { encoding: 'utf8' });
  assert.equal(run().status, 0, run().stderr);
  fs.writeFileSync(path.join(cli, 'layout.go'), 'const root = "docs/.scratch"');
  assert.notEqual(run().status, 0);
  assert.match(run().stderr, /cli\/layout.go/);
});

test('固定模板从 CI 环境扫描独立 CLI，并拒绝缺失、错提交和脏来源', t => {
  const root = project(t), cli = fs.realpathSync(project(t));
  const git = (cwd, ...args) => {
    const result = spawnSync('git', ['-C', cwd, ...args], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    return result.stdout.trim();
  };
  for (const cwd of [root, cli]) git(cwd, 'init', '-q');
  git(cli, 'add', '.');
  git(cli, '-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid', 'commit', '-qm', 'Synthetic CLI source');
  const commit = git(cli, 'rev-parse', 'HEAD');
  fs.mkdirSync(path.join(root, '.template-source/distribution'), { recursive: true });
  fs.mkdirSync(path.join(root, '.template-source/process'), { recursive: true });
  const pinFile = path.join(root, '.template-source/distribution/yss-cli-pin.json');
  const pin = { schema_version: 1, repository: 'https://example.invalid/cli.git', version: '1.0.0', commit, go_version: '1.27.1', build: 'synthetic fixture only', binaries: { 'linux-amd64': { sha256: '1'.repeat(64) } } };
  fs.writeFileSync(pinFile, JSON.stringify(pin));
  const policyFile = path.join(root, '.template-source/process/work-layout-exceptions.json');
  fs.writeFileSync(policyFile, JSON.stringify({ schema_version: 1, exceptions: [] }));
  const run = (source = cli) => spawnSync(process.execPath, [new URL('../scripts/verify-work-layout', import.meta.url).pathname, '--root', root], { encoding: 'utf8', env: { ...process.env, YSS_NATIVE_SOURCE_ROOT: source } });
  const valid = run();
  assert.equal(valid.status, 0, valid.stderr);
  assert.equal(JSON.parse(valid.stdout).repositories, 2);
  assert.notEqual(run(path.join(cli, 'absent')).status, 0);
  fs.writeFileSync(pinFile, JSON.stringify({ ...pin, commit: '0'.repeat(40) }));
  assert.match(run().stderr, /pin 不一致/);
  fs.writeFileSync(pinFile, JSON.stringify(pin));
  fs.writeFileSync(path.join(cli, 'uncommitted.txt'), 'source drift');
  assert.match(run().stderr, /来源工作树不干净/);
  fs.rmSync(path.join(cli, 'uncommitted.txt'));
  fs.writeFileSync(policyFile, JSON.stringify({ schema_version: 1, exceptions: [{ repository: 'cli', file: 'absent.txt', kind: 'content', text: 'legacy-reference', category: 'history', count: 1, reason: 'Synthetic absent repository guard' }] }));
  assert.match(run('').stderr, /失效仓库例外: cli/);
});


test('发行 CLI 与维护 pin 不同须经真实来源装配认证，扫描实际来源并拒绝伪证据与错配',t=>{
 // Reuse the existing synthetic native-release fixture and adapter assembler pattern.
 // This tests the public checker and source authority seam, never native release qualification.
 const base=fs.realpathSync(project(t)),cli=path.join(base,'cli'),root=path.join(base,'template'),evidence=path.join(base,'source-evidence');fs.mkdirSync(cli);fs.mkdirSync(root);
 const git=(cwd,...args)=>{const r=spawnSync('git',args,{cwd,encoding:'utf8'});assert.equal(r.status,0,r.stderr);return r.stdout.trim();};
 const put=(cwd,ref,bytes)=>{const file=path.join(cwd,ref);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,bytes);return file;};
 const commit=cwd=>{git(cwd,'add','.');git(cwd,'-c','user.name=source fixture','-c','user.email=fixture@example.invalid','commit','-qm','source fixture');return git(cwd,'rev-parse','HEAD');};
 for(const cwd of [cli,root])git(cwd,'init','-q');
 put(cli,'go.mod','module github.com/iloveZzz/yss-cli\n\ngo 1.27.1\n');
 put(cli,'main.go',fs.readFileSync(new URL('../.template-source/scripts/tests/fixtures/native-release.go',import.meta.url)));
 put(cli,'tools/package/main.go',`package main
import("archive/tar";"compress/gzip";"crypto/sha256";"encoding/json";"fmt";"os";"path/filepath";"sort";"strings")
func main(){if len(os.Args)!=6||os.Args[1]!="--native-manifest"||os.Args[3]!="--required-platforms"{panic("wrong assembler invocation")};if os.Getenv("GOFLAGS")!=""||os.Getenv("GOWORK")!="off"{panic("unfixed Go environment")};raw,e:=os.ReadFile(os.Args[2]);if e!=nil{panic(e)};var v map[string]any;if e=json.Unmarshal(raw,&v);e!=nil{panic(e)};if v["fixtureFail"]==true{panic("synthetic assembler refusal")};out:=os.Args[5];if e=os.Mkdir(out,0700);e!=nil{panic(e)};platforms:=strings.Split(os.Args[4],",");sort.Strings(platforms);manifest:=v["fixtureManifest"];b,_:=json.Marshal(manifest);archive:="fixture.tar.gz";f,e:=os.Create(filepath.Join(out,archive));if e!=nil{panic(e)};g:=gzip.NewWriter(f);w:=tar.NewWriter(g);w.WriteHeader(&tar.Header{Name:"release-manifest.json",Mode:0644,Size:int64(len(b))});w.Write(b);w.Close();g.Close();f.Close();a,_:=os.ReadFile(filepath.Join(out,archive));m:=manifest.(map[string]any);proof:=map[string]any{"schemaVersion":2,"version":v["cliVersion"],"cliCommit":v["cliCommit"],"sourceState":"committed","stableReady":true,"qualificationScope":"local-platform-impacted-consumers","inputManifestSha256":fmt.Sprintf("%x",sha256.Sum256(raw)),"sourceLockSha256":v["sourceLockSha256"],"requiredPlatforms":platforms,"pending":[]string{},"artifacts":[]any{map[string]any{"platform":m["platform"],"archive":archive,"sha256":fmt.Sprintf("%x",sha256.Sum256(a)),"binarySha256":m["binarySha256"]}}};b,_=json.Marshal(proof);os.WriteFile(filepath.Join(out,"checksums.json"),b,0600);if v["fixtureDrift"]==true{os.WriteFile(os.Args[2],append(raw,' '),0600)}}`);
 const legacyRoot=JSON.parse(fs.readFileSync(new URL('./fixtures/work-layout-cases.json',import.meta.url))).cases.find(item=>item.valid&&item.root.endsWith('scratch')).root;
 const legacyLine=`root: ${legacyRoot}`;put(cli,'layout.txt',legacyLine+'\n');
 put(root,'.template-source/process/work-layout-exceptions.json',JSON.stringify({schema_version:1,exceptions:[{repository:'cli',file:'layout.txt',kind:'content',text:legacyLine,count:1,category:'compatibility-test',reason:'Synthetic release source scanning guard'}]}));
 const cliCommit=commit(cli),pinCommit='f'.repeat(40),platform=`${process.platform==='win32'?'windows':process.platform}/${process.arch==='x64'?'amd64':process.arch}`;
 put(root,'.template-source/distribution/yss-cli-pin.json',JSON.stringify({schema_version:1,repository:'https://example.test/yss-cli.git',version:'1.3.5',commit:pinCommit,go_version:'1.27.1',build:'go build',binaries:{[platform.replace('/','-')]:{sha256:'0'.repeat(64)}}}));
 const templateCommit=commit(root),binary=path.join(base,'yss-fixture'),built=spawnSync('go',['build','-trimpath','-ldflags',`-X main.cliCommit=${cliCommit} -X main.templateCommit=${templateCommit} -X main.designCommit=${templateCommit} -X main.backendCommit=${templateCommit}`,'-o',binary,'.'],{cwd:cli,env:{...process.env,CGO_ENABLED:'0'},encoding:'utf8'});assert.equal(built.status,0,built.stderr);
 const environment={...process.env,YSS_NATIVE_BINARY:binary,YSS_NATIVE_BINARY_SHA256:hash(fs.readFileSync(binary)),YSS_NATIVE_SOURCE_ROOT:cli};delete environment.YSS_NATIVE_BINARY_OVERRIDE;
 for(const key of Object.keys(environment))if(key.startsWith('YSS_RELEASE_'))delete environment[key];
 const version=runNative(['version'],{environment}),inspections=Object.fromEntries(NATIVE_PROFILES.map(p=>[p,runNative(['bundle','inspect','--profile',p],{environment})]));
 const descriptor=(ref,bytes)=>{put(base,ref,bytes);return {path:ref,sha256:hash(bytes)};};
 const versionRef=descriptor('version.json',JSON.stringify(version)),receipt={version:versionRef,bundleCommands:NATIVE_PROFILES.map(p=>({id:`native-inspect-${p}`,report:descriptor(`${p}.json`,JSON.stringify(inspections[p]))}))};
 const receiptRef=descriptor('receipt.json',JSON.stringify(receipt)),gateRef=descriptor('gate.json','synthetic adapter gate'),inputFile=path.join(base,'native-input.json');
 const manifest={cliCommit,cliVersion:version.result.version,protocolVersion:version.result.protocolVersion,binarySha256:environment.YSS_NATIVE_BINARY_SHA256,sourceLockSha256:'1'.repeat(64),nativeReceiptSha256:receiptRef.sha256,releaseGateSha256:gateRef.sha256,stableReady:true,platform,requiredPlatforms:[platform],bundles:Object.fromEntries(NATIVE_PROFILES.map(p=>[p,inspections[p].result]))};
 const original={cliCommit,cliVersion:version.result.version,sourceLockSha256:manifest.sourceLockSha256,releaseGate:gateRef,artifacts:[{platform,binary:{path:path.basename(binary),sha256:manifest.binarySha256},receipt:receiptRef}],fixtureManifest:manifest};
 const env={...environment,YSS_RELEASE_NATIVE_INPUT:inputFile,YSS_RELEASE_NATIVE_INPUT_SHA256:'',YSS_RELEASE_REQUIRED_PLATFORMS:platform,YSS_RELEASE_SOURCE_EVIDENCE_DIR:evidence};
 const persist=value=>{fs.writeFileSync(inputFile,JSON.stringify(value));env.YSS_RELEASE_NATIVE_INPUT_SHA256=hash(fs.readFileSync(inputFile));};
 persist(original);
 const checker=new URL('../scripts/verify-work-layout',import.meta.url).pathname;
 const run=(overrides={},args=[])=>spawnSync(process.execPath,[checker,'--root',root,...args],{encoding:'utf8',env:{...env,...overrides},maxBuffer:16*1024*1024});
 const accepted=run();assert.equal(accepted.status,0,accepted.stderr);
 assert.deepEqual(JSON.parse(accepted.stdout),{status:'passed',repositories:2,references:1,exceptions:1},'必须扫描已认证 C 的实际工作布局引用');
 const unauthenticated=run(Object.fromEntries(Object.keys(env).filter(key=>key.startsWith('YSS_RELEASE_')).map(key=>[key,undefined])));
 assert.notEqual(unauthenticated.status,0);assert.match(unauthenticated.stderr,/pin 不一致|与固定版本不符/);
 const forged=run({YSS_RELEASE_NATIVE_INPUT_SHA256:'0'.repeat(64)});assert.notEqual(forged.status,0);assert.match(forged.stderr,/原始字节摘要/);
 const absent=run({YSS_RELEASE_NATIVE_INPUT:path.join(base,'absent-input.json')});assert.notEqual(absent.status,0);assert.match(absent.stderr,/ENOENT/);
 const wrongCli=path.join(base,'other-cli');git(base,'clone','--no-hardlinks','-q',cli,wrongCli);put(wrongCli,'different-commit.txt','another clean source');commit(wrongCli);
 const mismatch=run({},['--cli-root',wrongCli]);assert.notEqual(mismatch.status,0);assert.match(mismatch.stderr,/认证.*扫描.*来源|扫描.*认证.*来源/);
 put(cli,'uncommitted.txt','source drift');const dirty=run();assert.notEqual(dirty.status,0);assert.match(dirty.stderr,/干净|不干净/);fs.rmSync(path.join(cli,'uncommitted.txt'));
 const tampered=structuredClone(original);tampered.fixtureManifest.bundles.spec.bundleHash='0'.repeat(64);persist(tampered);
 const invalidInspect=run();assert.notEqual(invalidInspect.status,0);assert.match(invalidInspect.stderr,/完整 inspect/);
});
