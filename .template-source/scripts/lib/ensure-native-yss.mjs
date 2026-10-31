import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import { readYssCliPin, validateYssCliPin, platformKey, PIN_FILE } from "./yss-cli-pin.mjs";

// 每批解析一次正式 Release，随后只消费固定提交、来源锁与摘要；显式 pin 保留离线缓存入口。
const fail = (message) => { throw new TypeError(message); };
const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const verifySourceLock = (source, expected, release, root, run) => {
  const committed = path.join(source, 'docs/source-lock.json');
  const file = fs.existsSync(committed) ? committed : path.join(path.dirname(source), 'source-snapshot.json');
  checkCacheNode(file, false);
  if (!fs.existsSync(file)) {
    if (!release.sourceSnapshotArtifact) fail('正式 Release 缺少来源记录归档');
    const result = run('python3', [path.join(root, '.template-source/scripts/lib/resolve-yss-release.py'), '--source-snapshot', JSON.stringify(release.sourceSnapshotArtifact)]);
    let envelope;
    try { envelope = JSON.parse(result.stdout); } catch { fail('无法读取正式发行包的来源记录'); }
    if (result.status !== 0 || envelope.status !== 'ok' || typeof envelope.snapshot !== 'string' || !/^[A-Za-z0-9+/]*={0,2}$/.test(envelope.snapshot)) fail('无法读取正式发行包的来源记录');
    const bytes = Buffer.from(envelope.snapshot, 'base64');
    if (sha256(bytes) !== expected || JSON.parse(bytes).schemaVersion !== 5) fail('正式发行包的来源记录摘要或合同不符');
    fs.writeFileSync(file, bytes, {flag:'wx',mode:0o600});
  }
  const bytes = fs.readFileSync(file);
  if (sha256(bytes) !== expected) fail('固定源码与正式 Release 的来源锁摘要不符');
  if (JSON.parse(bytes).schemaVersion !== 5) fail('来源锁合同不支持；停止回归构建');
  return file === committed ? undefined : file;
};
const checkCacheNode = (file, directory = true) => {
  let stat;
  try { stat = fs.lstatSync(file); } catch (error) { if (error.code === 'ENOENT') return; throw error; }
  if (stat.isSymbolicLink() || (directory ? !stat.isDirectory() : !stat.isFile() || stat.nlink !== 1 || stat.size > 65536)) fail('回归缓存包含链接或非法节点；保留现场');
};

export function defaultCacheRoot(environment = process.env) {
  return environment.YSS_PIN_CACHE || path.join(os.homedir(), ".yss-harness", "pinned-yss");
}

export function defaultRun(command, args, { cwd, env } = {}) {
  const result = spawnSync(command, args, { cwd, env: env ?? process.env, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  return { status: result.status ?? 1, stdout: (result.stdout ?? "").trim(), stderr: (result.stderr ?? "").trim() };
}

// 新版 CLI 仅用发行标签作配置；显式源码构建时在仓外生成一次兼容记录。
export function prepareExplicitSourceSnapshot({source, run = defaultRun, environment = process.env} = {}) {
  if (!fs.existsSync(path.join(source,'tools/resolve-template.mjs'))) return undefined;
  if (environment.YSS_SOURCE_SNAPSHOT) {
    const file=environment.YSS_SOURCE_SNAPSHOT;
    if (!path.isAbsolute(file)) fail('YSS_SOURCE_SNAPSHOT 必须是绝对路径');
    checkCacheNode(file,false);
    if (!fs.existsSync(file)) fail('来源记录不存在');
    return file;
  }
  const tag=JSON.parse(fs.readFileSync(path.join(source,'docs/template-release.json'),'utf8')).tag;
  if (!/^v(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(tag)) fail('模板发行标签非法');
  const step=(command,args,options={})=>{const result=run(command,args,options);if(result.status!==0) fail(`准备模板来源失败: ${result.stderr||result.stdout}`);return result.stdout;};
  const shallow=step('git',['rev-parse','--is-shallow-repository'],{cwd:source});
  if (shallow==='true') step('git',['fetch','--unshallow','origin'],{cwd:source});
  else if(shallow!=='false') fail('无法确认 CLI Git 历史完整性');
  const templateRoot=`${source}-template`,file=`${source}-snapshot.json`;
  if (fs.existsSync(templateRoot)||fs.existsSync(file)) fail('模板来源准备目录已存在；保留现场');
  step('git',['clone','--quiet','--depth','1','--branch',tag,'https://github.com/iloveZzz/yss-spec-project-template.git',templateRoot]);
  step('node',[path.join(source,'tools/resolve-template.mjs'),'--source-root',templateRoot,'--out',file],{cwd:source,env:environment});
  checkCacheNode(file,false);
  if (!fs.existsSync(file)) fail('未生成来源记录');
  return file;
}

/** 缓存命中条件：二进制摘要等于固定值，源码目录是干净的、提交等于固定提交。 */
export function lookupCache({ cacheRoot, pin, platform = platformKey(), run = defaultRun }) {
  const dir = path.join(cacheRoot, pin.commit), source = path.join(dir, "source"), binary = path.join(dir, "build", "yss");
  const expected = pin.binaries[platform]?.sha256;
  if (!expected || !fs.existsSync(binary) || !fs.existsSync(source)) return null;
  const stat = fs.lstatSync(binary);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1) return null;
  if (sha256(fs.readFileSync(binary)) !== expected) return null;
  const head = run("git", ["rev-parse", "HEAD"], { cwd: source });
  const dirty = run("git", ["status", "--porcelain", "--untracked-files=normal"], { cwd: source });
  if (head.status !== 0 || head.stdout !== pin.commit || dirty.status !== 0 || dirty.stdout !== "") return null;
  return { binary, source, sha256: expected, cached: true };
}

export function buildPinned({ cacheRoot, pin, platform = platformKey(), run = defaultRun, log = () => {}, preparedSource, regressionOnly = false, sourceSnapshot }) {
  const expected = pin.binaries[platform]?.sha256;
  if (!expected && !regressionOnly) fail(`yss-cli 固定文件没有登记 ${platform} 平台的二进制，无法在本机构建固定版本`);
  const dir = path.join(cacheRoot, pin.commit), source = path.join(dir, "source"), out = path.join(dir, "build");
  const environment = { ...process.env, CGO_ENABLED: "0", GOTOOLCHAIN: "local", ...(sourceSnapshot ? {YSS_SOURCE_SNAPSHOT:sourceSnapshot} : {}) };
  let go = run("go", ["version"], { env: environment });
  if (go.status !== 0) fail("本机没有 go；固定版本的 yss 需要 Go " + pin.go_version);
  if (preparedSource && !go.stdout.includes(`go${pin.go_version} `)) {
    log(`使用 Go 缓存中的精确工具链 go${pin.go_version}（缺失时由 Go 下载）`);
    const toolchain = run('go', ['env', 'GOROOT'], { cwd: source, env: { ...environment, GOTOOLCHAIN: `go${pin.go_version}` } });
    if (toolchain.status !== 0 || !path.isAbsolute(toolchain.stdout)) fail(`无法取得固定源码要求的 go${pin.go_version} 工具链；保留现场`);
    environment.GOROOT = toolchain.stdout;
    environment.PATH = `${path.join(toolchain.stdout, 'bin')}${path.delimiter}${environment.PATH || ''}`;
    go = run('go', ['version'], { env: environment });
  }
  if (go.status !== 0 || !go.stdout.includes(`go${pin.go_version} `)) fail(`本机 Go 为「${go.stdout}」，固定版本要求 go${pin.go_version}；摘要只在同一 Go 版本下可复现`);
  const step = (command, args, message, options = {}) => { const result = run(command, args, options); if (result.status !== 0) fail(`${message}: ${result.stderr || result.stdout}`); return result; };
  if (!preparedSource) {
    fs.rmSync(dir, { recursive: true, force: true });
    fs.mkdirSync(source, { recursive: true });
    log(`拉取 ${pin.repository} @ ${pin.commit.slice(0, 8)}`);
    step("git", ["init", "-q", source], "git init 失败");
    step("git", ["remote", "add", "origin", pin.repository], "git remote 失败", { cwd: source });
    step("git", ["-c", "protocol.version=2", "fetch", "-q", "--depth", "1", "origin", pin.commit], "拉取固定提交失败", { cwd: source });
    step("git", ["checkout", "-q", "--detach", "FETCH_HEAD"], "检出失败", { cwd: source });
  } else if (preparedSource !== source || fs.existsSync(out)) fail('回归构建目录已存在或源码目录不匹配；保留现场');
  if (step("git", ["rev-parse", "HEAD"], "读取提交失败", { cwd: source }).stdout !== pin.commit) fail("检出的提交与固定提交不一致");
  const goMod = /^go (\d+\.\d+\.\d+)$/m.exec(fs.readFileSync(path.join(source, "go.mod"), "utf8"))?.[1];
  if (goMod !== pin.go_version) fail(`固定提交的 go.mod 要求 Go ${goMod}，与固定文件的 go_version ${pin.go_version} 不一致`);
  if (!sourceSnapshot) sourceSnapshot=prepareExplicitSourceSnapshot({source,run,environment});
  if (sourceSnapshot) environment.YSS_SOURCE_SNAPSHOT=sourceSnapshot;
  // 内嵌 Bundle 归档自 yss-cli 78cf81a 起不入库：构建前按其来源锁生成，并核对入库摘要。
  if (fs.existsSync(path.join(source, "tools/fetch-bundle.mjs"))) {
    log("生成内嵌 Bundle（tools/fetch-bundle.mjs）");
    step("node", [path.join(source, "tools/fetch-bundle.mjs")], "生成内嵌 Bundle 失败", { cwd: source, env: environment });
  }
  log("构建（tools/build-candidate.mjs）");
  step("node", [path.join(source, "tools/build-candidate.mjs"), "--root", source, "--out", out], "构建失败", { cwd: source, env: environment });
  const binary = path.join(out, "yss"), actual = sha256(fs.readFileSync(binary));
  if (expected && actual !== expected) { if (!preparedSource) fs.rmSync(dir, { recursive: true, force: true }); fail(`构建出的 yss 与固定文件摘要不符：期望 ${expected}，实际 ${actual}`); }
  return { binary, source, sha256: actual, cached: false };
}

export function ensureNativeYss({ root, cacheRoot = defaultCacheRoot(), run = defaultRun, log = () => {}, platform = platformKey(), version, pinned = false, pinFile } = {}) {
  if ([Boolean(version), pinned, Boolean(pinFile)].filter(Boolean).length > 1) fail('version、pin 与 pin-file 不能混用');
  if (pinned || pinFile) {
    const file = pinFile ? path.resolve(pinFile) : path.join(root, PIN_FILE);
    const pin = pinFile ? validateYssCliPin(JSON.parse(fs.readFileSync(file))) : readYssCliPin(root);
    if (!pin) fail('仓库没有 yss-cli 固定文件');
    const hit = lookupCache({ cacheRoot, pin, platform, run });
    if (pinFile && !hit) fail('显式 pin-file 的缓存缺失或漂移；保留现场');
    return { ...(hit ?? buildPinned({ cacheRoot, pin, platform, run, log })), version: pin.version, pinFile: file, pinSha256: sha256(fs.readFileSync(file)) };
  }
  const resolved = run('python3', [path.join(root, '.template-source/scripts/lib/resolve-yss-release.py'), ...(version ? [version] : [])]);
  let release;
  try { const envelope = JSON.parse(resolved.stdout); if (resolved.status !== 0 || envelope.status !== 'ok') fail('release'); release = envelope.result; }
  catch { fail('无法核验官方正式 Release；检查网络、Python 或发行合同，不回退仓内旧 pin'); }
  if (!/^\d+\.\d+\.\d+$/.test(release?.version ?? '') || !/^[a-f0-9]{40}$/.test(release?.commit ?? '') || !/^[a-f0-9]{64}$/.test(release?.sourceLockSha256 ?? '') || !release.binaries || (version && version.replace(/^v/,'') !== release.version)) fail('Release 固定来源不完整');
  fs.mkdirSync(cacheRoot, {recursive:true}); cacheRoot = fs.realpathSync(cacheRoot);
  const dir = path.join(cacheRoot, release.commit), source = path.join(dir, 'source');
  const file = path.join(dir, `regression-pin-${platform}.json`);
  for (const directory of [dir, source, path.join(dir,'build')]) checkCacheNode(directory);
  checkCacheNode(file, false);
  const qualified = Boolean(release.binaries[platform]);
  const build = `${qualified ? 'release-verified-source-build' : 'regression-only'}:source-lock:${release.sourceLockSha256}`;
  if (fs.existsSync(file)) {
    const pin = validateYssCliPin(JSON.parse(fs.readFileSync(file)));
    if (pin.version !== release.version || pin.commit !== release.commit || pin.build !== build || (qualified && pin.binaries[platform]?.sha256 !== release.binaries[platform].sha256)) fail('本批 Release 与缓存 pin 来源不一致');
    const hit = lookupCache({cacheRoot,pin,platform,run});
    if (!hit) fail('已固定回归缓存发生漂移；保留现场');
    verifySourceLock(source, release.sourceLockSha256, release, root, run);
    return {...hit,version:pin.version,pinFile:file,pinSha256:sha256(fs.readFileSync(file))};
  }
  const step = (command,args,options={}) => { const result=run(command,args,options); if(result.status!==0) fail('固定源码检出失败；检查网络与 Git，保留缓存诊断'); return result.stdout; };
  if (!fs.existsSync(source)) {
    fs.mkdirSync(source,{recursive:true});
    log(`固定正式 Release ${release.version} @ ${release.commit}`);
    step('git',['init','-q',source]);
    step('git',['remote','add','origin','https://github.com/iloveZzz/yss-cli.git'],{cwd:source});
    step('git',['-c','protocol.version=2','fetch','-q','--depth','1','origin',release.commit],{cwd:source});
    step('git',['checkout','-q','--detach','FETCH_HEAD'],{cwd:source});
  }
  if (fs.realpathSync(source)!==source || step('git',['rev-parse','HEAD'],{cwd:source})!==release.commit || step('git',['status','--porcelain','--untracked-files=normal'],{cwd:source})!=='') fail('固定源码缓存身份不符或有本地修改');
  const sourceSnapshot = verifySourceLock(source, release.sourceLockSha256, release, root, run);
  const goVersion = /^go (\d+\.\d+\.\d+)$/m.exec(fs.readFileSync(path.join(source,'go.mod'),'utf8'))?.[1];
  if (!goVersion) fail('固定源码缺少精确 Go 版本');
  const pin = {schema_version:1,repository:'https://github.com/iloveZzz/yss-cli.git',version:release.version,commit:release.commit,go_version:goVersion,build,binaries:{...release.binaries}};
  if (!qualified) log(`${platform} 无官方原生安装资格；仅从固定源码构建回归执行器，不作为稳定安装验收`);
  const result = lookupCache({cacheRoot,pin,platform,run}) ?? buildPinned({cacheRoot,pin,platform,run,log,preparedSource:source,regressionOnly:!qualified,sourceSnapshot});
  pin.binaries[platform] = {sha256:result.sha256}; validateYssCliPin(pin);
  fs.writeFileSync(file, JSON.stringify(pin,null,2)+'\n', {flag:'wx',mode:0o600});
  return {...result,version:pin.version,pinFile:file,pinSha256:sha256(fs.readFileSync(file))};
}

export function shellExports(result) {
  const quote = (value) => `'${value.replace(/'/g, `'\\''`)}'`;
  return [`export YSS_NATIVE_BINARY=${quote(result.binary)}`, `export YSS_NATIVE_BINARY_SHA256=${quote(result.sha256)}`, `export YSS_NATIVE_SOURCE_ROOT=${quote(result.source)}`,
    ...(result.pinFile ? [`export YSS_NATIVE_PIN_FILE=${quote(result.pinFile)}`, `export YSS_NATIVE_PIN_SHA256=${quote(result.pinSha256)}`] : [])].join("\n");
}
