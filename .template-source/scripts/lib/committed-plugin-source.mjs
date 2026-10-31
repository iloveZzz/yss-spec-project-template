import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import os from 'node:os';

const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const sha1 = /^[a-f0-9]{40}$/;
const sha256 = /^[a-f0-9]{64}$/;
const ensure = (ok, message) => { if (!ok) throw new TypeError(`committed plugin: ${message}`); };

export function committedPluginOptionsFromEnvironment(templateRoot, env = process.env) {
  const options = {templateRoot, templateCommit:env.YSS_PLUGIN_COMMITTED_TEMPLATE_SHA,
    cliRoot:env.YSS_PLUGIN_COMMITTED_CLI_ROOT, cliCommit:env.YSS_PLUGIN_COMMITTED_CLI_SHA,
    cliRemote:env.YSS_PLUGIN_COMMITTED_CLI_REMOTE,cliRef:env.YSS_PLUGIN_COMMITTED_CLI_REF,
    binary:env.YSS_PLUGIN_COMMITTED_BINARY, binarySha256:env.YSS_PLUGIN_COMMITTED_BINARY_SHA256,
    buildReceipt:env.YSS_PLUGIN_COMMITTED_RECEIPT, buildReceiptSha256:env.YSS_PLUGIN_COMMITTED_RECEIPT_SHA256,
    go:env.YSS_PLUGIN_COMMITTED_GO, goSha256:env.YSS_PLUGIN_COMMITTED_GO_SHA256,sourceSnapshot:env.YSS_SOURCE_SNAPSHOT};
  for (const key of ['templateRoot','cliRoot','binary','buildReceipt','go','sourceSnapshot']) ensure(typeof options[key] === 'string' && path.isAbsolute(options[key]) && path.normalize(options[key]) === options[key], `${key} path missing or not absolute`);
  options.sourceSnapshotSha256=digest(fs.readFileSync(options.sourceSnapshot));
  for (const key of ['templateCommit','cliCommit']) ensure(sha1.test(options[key] || ''), `${key} must be a full SHA`);
  for (const key of ['binarySha256','buildReceiptSha256','goSha256']) ensure(sha256.test(options[key] || ''), `${key} must be a SHA-256`);
  ensure(options.cliRemote==='https://github.com/iloveZzz/yss-cli.git'&&/^refs\/heads\/[A-Za-z0-9._/-]+$/.test(options.cliRef||''),'official CLI remote/ref required');
  return options;
}

function gitFile(environment=process.env) {
  const names=process.platform==='win32'?['git.exe','git.cmd','git.bat']:['git'];
  for(const dir of (environment.PATH||'').split(path.delimiter).filter(Boolean)) for(const name of names) {
    const candidate=path.resolve(dir,name);try{const file=fs.realpathSync(candidate),stat=fs.lstatSync(file);if(stat.isFile()){fs.accessSync(file,fs.constants.X_OK);return file;}}catch{}
  }
  throw new TypeError('committed plugin: git executable missing');
}
function git(root, args, {encoding='utf8', allowed=[0], remote=false}={}) {
  const env = Object.fromEntries(Object.entries(process.env).filter(([key])=>!key.startsWith('GIT_')));
  Object.assign(env, {GIT_CONFIG_NOSYSTEM:'1',GIT_CONFIG_GLOBAL:osDevNull(),GIT_NO_REPLACE_OBJECTS:'1',GIT_TERMINAL_PROMPT:'0'});
  if(remote)Object.assign(env,{GIT_CEILING_DIRECTORIES:root,GIT_ALLOW_PROTOCOL:'https'});
  const r=spawnSync(gitFile(),args,{cwd:root,env,encoding,timeout:30000,maxBuffer:128*1024*1024});
  ensure(!r.error && !r.signal && allowed.includes(r.status),`git ${args[0]} failed: exit=${r.status} signal=${r.signal||'none'} error=${r.error?.code||'none'}`);
  return encoding ? r.stdout.trim() : r.stdout;
}
function osDevNull() { return process.platform==='win32'?'NUL':'/dev/null'; }
function regular(file, expected, label) {
  const stat=fs.lstatSync(file);
  ensure(stat.isFile()&&!stat.isSymbolicLink()&&stat.nlink===1&&fs.realpathSync(file)===file,`${label} must be an independent regular file`);
  const bytes=fs.readFileSync(file), actual=digest(bytes);
  ensure(actual===expected,`${label} digest mismatch`);
  return {bytes, stat, sha256:actual};
}
function repository(root, commit, label) {
  const stat=fs.lstatSync(root);
  ensure(stat.isDirectory()&&!stat.isSymbolicLink()&&fs.realpathSync(root)===root,`${label} root invalid`);
  ensure(git(root,['rev-parse','--show-toplevel'])===root && git(root,['rev-parse','HEAD'])===commit,`${label} commit mismatch`);
  ensure(!git(root,['status','--porcelain','--untracked-files=all','--ignore-submodules=none']),`${label} worktree changed`);
  return git(root,['rev-parse','HEAD^{tree}']);
}
function gitBytes(root, commit, name) {
  return git(root,['show',`${commit}:${name}`],{encoding:null});
}
function sourceFile(root, commit, name) {
  const file=path.join(root,name), stat=fs.lstatSync(file);
  ensure(stat.isFile()&&!stat.isSymbolicLink(),`${name} source is not a file`);
  const bytes=fs.readFileSync(file);
  ensure(bytes.equals(gitBytes(root,commit,name)),`${name} differs from committed source`);
  return bytes;
}

function generatedInputRefs(receipt) {
  const current='internal/bundle/assets/bundles.json.gz';
  if(receipt.trustedSources===undefined)return [current,'internal/bundle/assets/baseline-5.0.0.json.gz','internal/bundle/assets/baseline-delta.json.gz'];
  ensure(Array.isArray(receipt.trustedSources),'trusted source receipt invalid');
  const refs=receipt.trustedSources.map(row=>{
    ensure(row&&typeof row.path==='string'&&/^internal\/bundle\/assets\/trusted\/(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)\.delta\.gz$/.test(row.path)&&sha256.test(row.sha256||''),'trusted source receipt path invalid');
    return row.path;
  });
  ensure(new Set(refs).size===refs.length,'trusted source receipt contains duplicates');
  return [current,...refs];
}

export function observeCommittedPluginSource(options) {
  const o=options;
  for (const name of ['templateRoot','cliRoot','binary','buildReceipt','go','sourceSnapshot']) ensure(typeof o[name]==='string'&&path.isAbsolute(o[name])&&path.normalize(o[name])===o[name],`${name} path invalid`);
  for (const name of ['templateCommit','cliCommit']) ensure(sha1.test(o[name]||''),`${name} invalid`);
  for (const name of ['binarySha256','buildReceiptSha256','goSha256','sourceSnapshotSha256']) ensure(sha256.test(o[name]||''),`${name} invalid`);
  ensure(o.cliRemote==='https://github.com/iloveZzz/yss-cli.git'&&/^refs\/heads\/[A-Za-z0-9._/-]+$/.test(o.cliRef||''),'official CLI remote/ref invalid');
  const gitPath=gitFile(),gitSha256=digest(fs.readFileSync(gitPath));
  const templateTree=repository(o.templateRoot,o.templateCommit,'template'), cliTree=repository(o.cliRoot,o.cliCommit,'CLI');
  git(o.cliRoot,['check-ref-format',o.cliRef]);
  let remote;const remoteDir=fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()),'yss-plugin-remote-'));
  try{remote=git(remoteDir,['ls-remote','--refs','--exit-code',o.cliRemote,o.cliRef],{remote:true});}
  catch(error){throw new Error(`committed plugin: remote ref lookup failed (${error.message})`);}
  finally{fs.rmdirSync(remoteDir);}
  ensure(remote===`${o.cliCommit}\t${o.cliRef}`,'remote ref commit mismatch');
  const binary=regular(o.binary,o.binarySha256,'binary'), receiptFile=regular(o.buildReceipt,o.buildReceiptSha256,'receipt'), go=regular(o.go,o.goSha256,'go');
  for(const root of [o.templateRoot,o.cliRoot]) {const relative=path.relative(root,o.sourceSnapshot);ensure(relative&&relative!=='..'&&(relative.startsWith(`..${path.sep}`)||path.isAbsolute(relative)),'source snapshot must be outside both repositories');}
  const receipt=JSON.parse(receiptFile.bytes), lockBytes=regular(o.sourceSnapshot,o.sourceSnapshotSha256,'source snapshot').bytes, lock=JSON.parse(lockBytes);
  const release=JSON.parse(sourceFile(o.cliRoot,o.cliCommit,'docs/template-release.json'));
  ensure(typeof release.tag==='string'&&/^v(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)$/.test(release.tag),'template release tag invalid');
  const node=fs.realpathSync(process.execPath),nodeStat=fs.lstatSync(node);ensure(nodeStat.isFile()&&!nodeStat.isSymbolicLink(),'node executable invalid');
  const goMod=sourceFile(o.cliRoot,o.cliCommit,'go.mod').toString();
  ensure(/^module\s+github\.com\/iloveZzz\/yss-cli\s*$/m.test(goMod),'CLI module identity mismatch');
  const requiredGo=goMod.match(/^go\s+([0-9]+\.[0-9]+\.[0-9]+)\s*$/m)?.[1];ensure(requiredGo,'CLI Go version missing');
  ensure(lock.schemaVersion===5 && Object.keys(lock.profiles||{}).sort().join(',')==='backend,spec' && lock.producer?.sourceState==='committed' && sha1.test(lock.producer?.commit||''),'source lock identity invalid');
  ensure(git(o.cliRoot,['log','-1','--format=%H',o.cliCommit,'--','internal/bundle','tools/bundle',':(exclude)internal/bundle/assets',':(exclude)**/*.md'])===lock.producer.commit,'source producer commit mismatch');
  for (const name of ['spec','backend']) {
    const profile=lock.profiles[name];
    ensure(profile.profile===name&&profile.sourceState==='committed'&&profile.templateCommit===o.templateCommit,`${name} template source mismatch`);
    ensure(profile.sourcePath==='.'&&(name==='spec'?profile.overlayPaths===undefined:JSON.stringify(profile.overlayPaths)===JSON.stringify(['profiles/_specialist','profiles/backend'])),`${name} source composition mismatch`);
    ensure(profile.templateVersion===release.tag.slice(1),`${name} template version mismatch`);
    ensure(profile.templateTag===undefined||profile.templateTag===release.tag,`${name} template tag invalid`);
    ensure(typeof profile.policyPath==='string'&&profile.policyPath.length>0&&!path.posix.isAbsolute(profile.policyPath)&&!profile.policyPath.includes('\\')&&!profile.policyPath.split('/').some(part=>part==='..'||part===''||part==='.')&&sha256.test(profile.policyHash||''),`${name} policy path or digest invalid`);
    ensure(digest(sourceFile(o.templateRoot,o.templateCommit,profile.policyPath))===profile.policyHash,`${name} template policy digest mismatch`);
    if(profile.templateTag)ensure(git(o.templateRoot,['rev-parse',`refs/tags/${profile.templateTag}^{commit}`])===o.templateCommit,`${name} private tag mismatch`);
  }
  ensure(Boolean(lock.profiles.spec.templateTag)===Boolean(lock.profiles.backend.templateTag),'profile source modes mismatch');
  const builder=sourceFile(o.cliRoot,o.cliCommit,'tools/build-candidate.mjs'), helper=sourceFile(o.cliRoot,o.cliCommit,'tools/go-environment.mjs');
  ensure(receipt.schemaVersion===1&&receipt.kind==='cli-build-receipt'&&receipt.status==='built'&&receipt.root===o.cliRoot&&receipt.commit===o.cliCommit&&receipt.sourceState==='committed'&&receipt.inputDrift===false,'build receipt identity invalid');
  ensure(receipt.builderSha256===digest(builder)&&receipt.environmentHelperSha256===digest(helper),'builder digest mismatch');
  ensure(receipt.binary?.path===o.binary&&receipt.binary?.bytes===binary.stat.size&&receipt.binary?.sha256===o.binarySha256,'receipt binary mismatch');
  ensure(receipt.cgoEnabled==='0'&&receipt.goEnvironment?.CGO_ENABLED==='0'&&receipt.platform===`${process.platform==='darwin'?'darwin':process.platform==='linux'?'linux':process.platform==='win32'?'windows':process.platform}/${process.arch==='x64'?'amd64':process.arch}`,'build platform mismatch');
  ensure(receipt.goEnvironment.GOVERSION===`go${requiredGo}`&&`${receipt.goEnvironment.GOOS}/${receipt.goEnvironment.GOARCH}`===receipt.platform,'build Go environment mismatch');
  const goEnv=Object.fromEntries(Object.entries(process.env).filter(([key])=>!key.startsWith('GO')&&!key.startsWith('GIT_')));
  Object.assign(goEnv,{GOENV:'off',GOTOOLCHAIN:'local',GOWORK:'off',CGO_ENABLED:'0'});
  const goCall=args=>{const r=spawnSync(o.go,args,{cwd:o.cliRoot,env:goEnv,encoding:'utf8',timeout:30000});ensure(!r.error&&!r.signal&&r.status===0,'go tool identity failed');return r.stdout.trim();};
  ensure(goCall(['version'])===receipt.goVersion,'go version mismatch');
  const [goRoot,toolDir]=goCall(['env','GOROOT','GOTOOLDIR']).split(/\r?\n/);
  ensure(path.isAbsolute(goRoot||'')&&path.isAbsolute(toolDir||'')&&fs.realpathSync(goRoot)===goRoot&&fs.realpathSync(toolDir)===toolDir,'go root invalid');
  ensure(path.join(goRoot,'bin',process.platform==='win32'?'go.exe':'go')===o.go&&!path.relative(goRoot,toolDir).startsWith('..'),'go root or tool path mismatch');
  const goTools=Object.fromEntries(['compile','link'].map(name=>{const file=path.join(toolDir,`${name}${process.platform==='win32'?'.exe':''}`),stat=fs.lstatSync(file);ensure(stat.isFile()&&!stat.isSymbolicLink()&&fs.realpathSync(file)===file,`go ${name} invalid`);return [name,digest(fs.readFileSync(file))];}));
  const extras=generatedInputRefs(receipt);
  const refs=git(o.cliRoot,['ls-files','--cached','--others','--exclude-standard','-z'],{encoding:null}).toString().split('\0').filter(Boolean);
  const inputs=Object.fromEntries([...new Set([...refs,...extras])].sort().map(ref=>{
    ensure(!path.isAbsolute(ref)&&!ref.split('/').includes('..'),'unsafe input path');
    const file=path.join(o.cliRoot,ref);if(!fs.existsSync(file))return [ref,null];const stat=fs.lstatSync(file);ensure(stat.isFile()&&!stat.isSymbolicLink(),`build input ${ref} invalid`);
    return [ref,{sha256:digest(fs.readFileSync(file)),executable:!!(stat.mode&0o111)}];
  }));
  const inputDigest=digest(JSON.stringify(inputs));
  ensure(receipt.inputDigest===inputDigest&&JSON.stringify(receipt.inputs)===JSON.stringify(inputs),'build input digest mismatch');
  for(const row of receipt.trustedSources||[])ensure(inputs[row.path]?.sha256===row.sha256,'trusted source receipt digest mismatch');
  ensure(gitFile()===gitPath&&digest(fs.readFileSync(gitPath))===gitSha256,'git executable drifted');
  return {templateRoot:o.templateRoot,templateCommit:o.templateCommit,templateTree,cliRoot:o.cliRoot,cliCommit:o.cliCommit,cliTree,cliRemote:o.cliRemote,cliRef:o.cliRef,
    sourceSnapshot:o.sourceSnapshot,sourceLockSha256:digest(lockBytes),sourceMode:lock.profiles.spec.templateTag?'local-tag':'candidate-commit',binary:o.binary,binarySha256:binary.sha256,buildReceipt:o.buildReceipt,buildReceiptSha256:receiptFile.sha256,
    go:o.go,goSha256:go.sha256,goRoot,goTools,git:gitPath,gitSha256,node,nodeSha256:digest(fs.readFileSync(node)),inputDigest,builderSha256:receipt.builderSha256,environmentHelperSha256:receipt.environmentHelperSha256,
    platform:receipt.platform,goVersion:receipt.goVersion,producerCommit:lock.producer.commit,privateTemplateTag:lock.profiles.spec.templateTag||null};
}

export function verifyCommittedPluginRebuild(options,{evidenceDir}={}) {
  const before=observeCommittedPluginSource(options), o=options;
  ensure(typeof evidenceDir==='string'&&path.isAbsolute(evidenceDir)&&path.normalize(evidenceDir)===evidenceDir,'rebuild evidence path invalid');
  const parent=fs.realpathSync(path.dirname(evidenceDir));
  ensure(path.join(parent,path.basename(evidenceDir))===evidenceDir,'rebuild evidence parent invalid');
  for(const root of [o.templateRoot,o.cliRoot]) {const relative=path.relative(root,evidenceDir);ensure(relative&&relative!=='..'&&(relative.startsWith(`..${path.sep}`)||path.isAbsolute(relative)),'rebuild evidence must be outside sources');}
  ensure(path.basename(o.go)===(process.platform==='win32'?'go.exe':'go'),'go executable name invalid');
  fs.accessSync(o.go,fs.constants.X_OK);
  const original=JSON.parse(fs.readFileSync(o.buildReceipt)), env=Object.fromEntries(Object.entries(process.env).filter(([key])=>!key.startsWith('GIT_')&&!['NODE_OPTIONS','NODE_PATH'].includes(key)));
  Object.assign(env,{PATH:`${path.dirname(o.go)}${path.delimiter}${env.PATH||''}`,GOROOT:before.goRoot,CGO_ENABLED:'0',GOOS:original.goEnvironment.GOOS,GOARCH:original.goEnvironment.GOARCH,GIT_CONFIG_NOSYSTEM:'1',GIT_CONFIG_GLOBAL:osDevNull(),GIT_NO_REPLACE_OBJECTS:'1',GIT_TERMINAL_PROMPT:'0'});
  env.YSS_SOURCE_SNAPSHOT=o.sourceSnapshot;
  ensure(gitFile(env)===before.git,'git executable path differs during rebuild');fs.mkdirSync(evidenceDir);
  const records={};
  const run=(label,file,args,cwd)=>{
    const startedAt=new Date().toISOString();
    const r=spawnSync(file,args,{cwd,env,encoding:null,timeout:600000,maxBuffer:128*1024*1024});
    const stdout=r.stdout||Buffer.alloc(0),stderr=r.stderr||Buffer.alloc(0);
    fs.writeFileSync(path.join(evidenceDir,`${label}.stdout`),stdout,{flag:'wx'});
    fs.writeFileSync(path.join(evidenceDir,`${label}.stderr`),stderr,{flag:'wx'});
    const record={file,args,cwd,startedAt,finishedAt:new Date().toISOString(),actualExitCode:r.status,actualExitSignal:r.signal||null,error:r.error?.message||'',stdoutSha256:digest(stdout),stderrSha256:digest(stderr)};
    fs.writeFileSync(path.join(evidenceDir,`${label}.json`),`${JSON.stringify(record,null,2)}\n`,{flag:'wx'});records[label]=record;
    ensure(!r.error&&!r.signal&&r.status===0,`${label} failed: ${r.error?.message||`exit ${r.status}`}`);
    return r.stdout;
  };
  const isolated=path.join(evidenceDir,'cli-source');
  run('clone',before.git,['clone','--shared','--no-checkout',o.cliRoot,isolated],o.cliRoot);
  run('checkout',before.git,['-C',isolated,'checkout','--detach',o.cliCommit],o.cliRoot);
  ensure(git(isolated,['rev-parse','HEAD'])===o.cliCommit&&!git(isolated,['status','--porcelain','--untracked-files=all','--ignore-submodules=none']),'isolated CLI checkout mismatch');
  run('generate',process.execPath,[path.join(isolated,'tools/fetch-bundle.mjs'),'--force','--source-root',o.templateRoot],isolated);
  for(const ref of generatedInputRefs(original)) {
    const oldFile=path.join(o.cliRoot,ref),generated=path.join(isolated,ref),stat=fs.lstatSync(generated);
    ensure(stat.isFile()&&!stat.isSymbolicLink()&&fs.realpathSync(generated)===generated,`generated ${ref} invalid`);
    ensure(fs.readFileSync(generated).equals(fs.readFileSync(oldFile)),`generated ${ref} differs from committed source`);
  }
  ensure(!git(isolated,['status','--porcelain','--untracked-files=all','--ignore-submodules=none']),'isolated CLI source changed after generation');
  run('rebuild',process.execPath,[path.join(isolated,'tools/build-candidate.mjs'),'--root',isolated,'--out',path.join(evidenceDir,'rebuilt')],isolated);
  const file=path.join(evidenceDir,'rebuilt','build-receipt.json');ensure(fs.existsSync(file),'rebuild receipt missing');
  const rebuilt=JSON.parse(fs.readFileSync(file));
  ensure(rebuilt.root===isolated,'rebuild root mismatch');
  for(const key of ['schemaVersion','kind','status','commit','sourceState','builderSha256','environmentHelperSha256','inputDigest','inputs','goVersion','goEnvironment','platform','cgoEnabled','inputDrift','embeddedArchive','baselineArchive','baselineDelta','trustedSources'])ensure(JSON.stringify(original[key])===JSON.stringify(rebuilt[key]),`rebuild ${key} mismatch`);
  const binary=path.join(evidenceDir,'rebuilt',process.platform==='win32'?'yss.exe':'yss');
  ensure(rebuilt.binary?.path===binary&&rebuilt.binary?.sha256===o.binarySha256&&rebuilt.binary?.bytes===original.binary.bytes,'rebuild binary receipt mismatch');
  regular(binary,o.binarySha256,'rebuilt binary');
  const version=JSON.parse(run('version',o.binary,['version','--json'],o.cliRoot));
  ensure(version.status==='ok'&&version.code==='OK'&&version.result?.cliCommit===o.cliCommit&&version.result?.sourceState==='committed','binary version identity mismatch');
  const lock=JSON.parse(regular(o.sourceSnapshot,o.sourceSnapshotSha256,'source snapshot').bytes);
  for(const profile of ['spec','backend']){
    const result=JSON.parse(run(`inspect-${profile}`,o.binary,['bundle','inspect','--profile',profile,'--json'],o.cliRoot));const v=result.result, expected=lock.profiles[profile];
    ensure(result.status==='ok'&&result.code==='OK'&&v?.profile===profile&&v.schemaVersion===5&&v.sourceState==='committed'&&v.templateCommit===o.templateCommit&&v.templateVersion===expected.templateVersion&&v.sourcePolicy?.path===expected.policyPath&&v.sourcePolicy?.digest===expected.policyHash&&v.producer?.commit===lock.producer.commit&&v.producer?.sourceState==='committed',`${profile} inspect identity mismatch`);
  }
  const after=observeCommittedPluginSource(o);ensure(JSON.stringify(before)===JSON.stringify(after),'rebuild inputs drifted');
  const proof={kind:'committed-plugin-regression-rebuild',schemaVersion:1,scope:'local-regression-only',source:before,records,
    rebuiltReceiptSha256:digest(fs.readFileSync(file)),logs:Object.fromEntries(['clone','checkout','generate','rebuild','version','inspect-spec','inspect-backend'].flatMap(label=>['stdout','stderr'].map(stream=>{const name=`${label}.${stream}`;return [name,digest(fs.readFileSync(path.join(evidenceDir,name)))];})))};
  fs.writeFileSync(path.join(evidenceDir,'proof.json'),`${JSON.stringify(proof,null,2)}\n`,{flag:'wx'});return proof;
}

export function validateCommittedPluginProof(options,{evidenceDir,expectedProofSha256}={}) {
  ensure(typeof evidenceDir==='string'&&path.isAbsolute(evidenceDir)&&path.normalize(evidenceDir)===evidenceDir&&fs.realpathSync(evidenceDir)===evidenceDir,'proof evidence directory invalid');
  ensure(sha256.test(expectedProofSha256||''),'proof expected digest missing');
  const proof=JSON.parse(regular(path.join(evidenceDir,'proof.json'),expectedProofSha256,'proof').bytes);
  ensure(proof.kind==='committed-plugin-regression-rebuild'&&proof.schemaVersion===1&&proof.scope==='local-regression-only','proof identity invalid');
  const snapshot=observeCommittedPluginSource(options);
  ensure(JSON.stringify(proof.source)===JSON.stringify(snapshot),'proof source mismatch');
  const labels=['clone','checkout','generate','rebuild','version','inspect-spec','inspect-backend'];
  ensure(Object.keys(proof.records||{}).sort().join(',')===[...labels].sort().join(','),'proof records incomplete');
  ensure(Object.keys(proof.logs||{}).sort().join(',')===labels.flatMap(x=>[`${x}.stdout`,`${x}.stderr`]).sort().join(','),'proof logs incomplete');
  const isolated=path.join(evidenceDir,'cli-source'),rebuiltDir=path.join(evidenceDir,'rebuilt'),rebuiltBinary=path.join(rebuiltDir,process.platform==='win32'?'yss.exe':'yss');
  const expected={clone:{file:snapshot.git,args:['clone','--shared','--no-checkout',options.cliRoot,isolated],cwd:options.cliRoot},
    checkout:{file:snapshot.git,args:['-C',isolated,'checkout','--detach',options.cliCommit],cwd:options.cliRoot},
    generate:{file:process.execPath,args:[path.join(isolated,'tools/fetch-bundle.mjs'),'--force','--source-root',options.templateRoot],cwd:isolated},
    rebuild:{file:process.execPath,args:[path.join(isolated,'tools/build-candidate.mjs'),'--root',isolated,'--out',rebuiltDir],cwd:isolated},
    version:{file:options.binary,args:['version','--json'],cwd:options.cliRoot},'inspect-spec':{file:options.binary,args:['bundle','inspect','--profile','spec','--json'],cwd:options.cliRoot},'inspect-backend':{file:options.binary,args:['bundle','inspect','--profile','backend','--json'],cwd:options.cliRoot}};
  const outputs={};
  for(const label of labels){
    const record=proof.records[label],recordPath=path.join(evidenceDir,`${label}.json`),stat=fs.lstatSync(recordPath);
    ensure(stat.isFile()&&!stat.isSymbolicLink()&&stat.nlink===1&&fs.realpathSync(recordPath)===recordPath,'proof record invalid');
    ensure(JSON.stringify(JSON.parse(fs.readFileSync(recordPath)))===JSON.stringify(record),'proof record mismatch');
    ensure(record.file===expected[label].file&&JSON.stringify(record.args)===JSON.stringify(expected[label].args)&&record.cwd===expected[label].cwd&&record.actualExitCode===0&&record.actualExitSignal===null&&record.error===''&&Number.isFinite(Date.parse(record.startedAt))&&Number.isFinite(Date.parse(record.finishedAt))&&Date.parse(record.finishedAt)>=Date.parse(record.startedAt),`proof ${label} execution invalid`);
    for(const stream of ['stdout','stderr']){const name=`${label}.${stream}`,expectedHash=proof.logs[name];ensure(sha256.test(expectedHash||'')&&record[`${stream}Sha256`]===expectedHash,`proof ${name} digest missing`);const item=regular(path.join(evidenceDir,name),expectedHash,`proof ${name}`);if(stream==='stdout')outputs[label]=item.bytes;}
  }
  ensure(repository(isolated,options.cliCommit,'proof isolated CLI')===snapshot.cliTree,'proof isolated CLI tree mismatch');
  const original=JSON.parse(fs.readFileSync(options.buildReceipt));
  for(const ref of generatedInputRefs(original)){
    const file=path.join(isolated,ref),stat=fs.lstatSync(file);ensure(stat.isFile()&&!stat.isSymbolicLink()&&fs.realpathSync(file)===file,`proof generated ${ref} invalid`);
    ensure(fs.readFileSync(file).equals(fs.readFileSync(path.join(options.cliRoot,ref))),`proof generated ${ref} mismatch`);
  }
  const builtFile=path.join(rebuiltDir,'build-receipt.json');ensure(sha256.test(proof.rebuiltReceiptSha256||''),'proof rebuild receipt digest missing');
  const rebuilt=JSON.parse(regular(builtFile,proof.rebuiltReceiptSha256,'proof rebuild receipt').bytes);
  ensure(rebuilt.root===isolated,'proof rebuild root mismatch');
  for(const key of ['schemaVersion','kind','status','commit','sourceState','builderSha256','environmentHelperSha256','inputDigest','inputs','goVersion','goEnvironment','platform','cgoEnabled','inputDrift','embeddedArchive','baselineArchive','baselineDelta','trustedSources'])ensure(JSON.stringify(original[key])===JSON.stringify(rebuilt[key]),`proof rebuild ${key} mismatch`);
  ensure(rebuilt.binary?.path===rebuiltBinary&&rebuilt.binary?.sha256===options.binarySha256&&rebuilt.binary?.bytes===original.binary.bytes,'proof rebuilt binary identity mismatch');regular(rebuiltBinary,options.binarySha256,'proof rebuilt binary');
  const buildOutput=JSON.parse(outputs.rebuild),version=JSON.parse(outputs.version),lock=JSON.parse(regular(options.sourceSnapshot,options.sourceSnapshotSha256,'source snapshot').bytes);
  ensure(buildOutput.status==='built'&&buildOutput.platform===rebuilt.platform&&buildOutput.binary?.path===rebuiltBinary&&buildOutput.binary?.sha256===options.binarySha256,'proof build output mismatch');
  ensure(version.status==='ok'&&version.code==='OK'&&version.result?.cliCommit===options.cliCommit&&version.result?.sourceState==='committed','proof binary version mismatch');
  for(const profile of ['spec','backend']){const result=JSON.parse(outputs[`inspect-${profile}`]),v=result.result,expectedProfile=lock.profiles[profile];ensure(result.status==='ok'&&result.code==='OK'&&v?.profile===profile&&v.schemaVersion===5&&v.sourceState==='committed'&&v.templateCommit===options.templateCommit&&v.templateVersion===expectedProfile.templateVersion&&v.sourcePolicy?.path===expectedProfile.policyPath&&v.sourcePolicy?.digest===expectedProfile.policyHash&&v.producer?.commit===lock.producer.commit&&v.producer?.sourceState==='committed',`proof ${profile} inspect mismatch`);}
  ensure(JSON.stringify(snapshot)===JSON.stringify(observeCommittedPluginSource(options)),'proof source drifted');
  return snapshot;
}
