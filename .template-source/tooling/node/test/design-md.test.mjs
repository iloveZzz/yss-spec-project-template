import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { execFileSync } from "node:child_process";
import { readFileSync, cpSync, mkdtempSync, mkdirSync, readdirSync, writeFileSync, rmSync, unlinkSync } from "node:fs";
import os from "node:os";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const toolingRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repositoryRoot = path.resolve(toolingRoot, "../../..");
const command = path.join(repositoryRoot, ".agents/skills/yss-design-system/scripts/design-md.mjs");

test("DESIGN.md passes local and pinned upstream lint", () => {
  const source = readFileSync(path.join(repositoryRoot, "DESIGN.md"), "utf8");
  for (const section of ["Overview", "Colors", "Typography", "Layout", "Elevation & Depth", "Shapes", "Components", "Do's and Don'ts"]) {
    assert.match(source, new RegExp(`^## ${section.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")}$`, "m"));
  }
  const output = execFileSync("node", [command, "lint", "DESIGN.md"], {
    cwd: repositoryRoot,
    encoding: "utf8"
  });
  const report = JSON.parse(output);
  assert.equal(report.summary.errors, 0);
  assert.equal(report.summary.warnings, 0);
});

test("DESIGN.md projection manifest is current", () => {
  const output = execFileSync("node", [command, "drift"], {
    cwd: repositoryRoot,
    encoding: "utf8"
  });
  assert.match(output, /无漂移/);
  const manifest = JSON.parse(readFileSync(path.join(repositoryRoot, ".template-spec/design/tokens/.design-md-projection.json"), "utf8"));
  assert.equal(manifest.source, "DESIGN.md");
  assert.equal(Object.keys(manifest.files).length, 6);
  const css = readFileSync(path.join(repositoryRoot, ".template-spec/design/tokens/variables.css"), "utf8");
  for (const declaration of ["--yss-color-primary-control: #245bdb", "--yss-color-primary-control-hover: #2f68eb", "--yss-color-on-primary: #ffffff", "--yss-control-height: 32px", "--yss-card-padding: 20px"]) assert.match(css, new RegExp(declaration));
});

test("cross-repository design sync digest matches DESIGN.md", () => {
  const source = readFileSync(path.join(repositoryRoot, "DESIGN.md"));
  const sync = readFileSync(path.join(repositoryRoot, ".template-source/design/design-system-sync.yaml"), "utf8");
  const digest = createHash("sha256").update(source).digest("hex");
  assert.match(sync, new RegExp(`baseline_sha256: ${digest}`));
});


function isolated(t) {
  const root=mkdtempSync(path.join(os.tmpdir(),'yss design-md space '));
  t.after(()=>rmSync(root,{recursive:true,force:true}));
  const ref='.agents/skills/yss-design-system/scripts/design-md.mjs';
  mkdirSync(path.dirname(path.join(root,ref)),{recursive:true});cpSync(command,path.join(root,ref));
  mkdirSync(path.join(root,'scripts'),{recursive:true});cpSync(path.join(repositoryRoot,'scripts/vendor'),path.join(root,'scripts/vendor'),{recursive:true});
  cpSync(path.join(repositoryRoot,'DESIGN.md'),path.join(root,'DESIGN.md'));
  mkdirSync(path.join(root,'.template-spec/design'),{recursive:true});cpSync(path.join(repositoryRoot,'.template-spec/design/tokens'),path.join(root,'.template-spec/design/tokens'),{recursive:true});
  mkdirSync(path.join(root,'.template-source/design'),{recursive:true});cpSync(path.join(repositoryRoot,'.template-source/design/design-system-sync.yaml'),path.join(root,'.template-source/design/design-system-sync.yaml'));
  return {root,file:path.join(root,ref)};
}
function state(root){
  const entries={};function scan(dir){for(const e of readdirSync(dir,{withFileTypes:true})){const f=path.join(dir,e.name);if(e.isDirectory())scan(f);else if(e.isFile())entries[path.relative(root,f)]=createHash('sha256').update(readFileSync(f)).digest('hex');}}scan(root);return entries;
}
function run(data,args,options={}){const r=spawnSync(process.execPath,[data.file,...args],{cwd:data.root,encoding:'utf8',...options});assert.equal(r.error,undefined);return r;}

test('canonical导入无副作用，空格路径下lint/diff/export/drift保持只读',t=>{
  const data=isolated(t),before=state(data.root);
  for(const extra of [[],['not-a-file'],['DESIGN.md'],[data.file]]) {
    const imported=spawnSync(process.execPath,['--input-type=module','-e',`await import(${JSON.stringify(new URL('file://'+data.file).href)})`,...extra],{cwd:data.root,encoding:'utf8'});
    assert.equal(imported.status,0,imported.stderr);assert.equal(imported.stdout,'');assert.equal(imported.stderr,'');
  }
  for(const args of [['lint','DESIGN.md'],['diff','DESIGN.md','DESIGN.md'],['export','dtcg'],['drift']]){const r=run(data,args);assert.equal(r.status,0,r.stderr);assert.ok(r.stdout.trim(),args.join(' ')+' must actually execute');assert.deepEqual(state(data.root),before);}
});

test('CSS角色单独导出不改主题算法JSON，完整导出使用真实锁定antd', {skip:!process.env.YSS_DESIGN_MD_ANTD_TOOLCHAIN},t=>{
  const data=isolated(t),before=state(data.root);
  let r=run(data,['export','dtcg','--write-css','--write-manifest']);assert.equal(r.status,0,r.stderr);
  const after=state(data.root);for(const name of ['theme.json','tokens.default.json','tokens.dark.json','tokens.compact.json'])assert.equal(after['.template-spec/design/tokens/'+name],before['.template-spec/design/tokens/'+name]);
  assert.match(readFileSync(path.join(data.root,'.template-spec/design/tokens/variables.css'),'utf8'),/--yss-colors-primary:/);
  r=run(data,['export','dtcg','--write','--write-manifest','--antd-toolchain',process.env.YSS_DESIGN_MD_ANTD_TOOLCHAIN]);assert.equal(r.status,0,r.stderr);
  r=run(data,['drift']);assert.equal(r.status,0,r.stderr);
});

test('悬空token、同步摘要错、投影漂移、缺工具与错antd版本不能放行',t=>{
  for(const kind of ['token','sync','projection','tool','version','dependency']){
    const data=isolated(t);let args=['drift'];
    if(kind==='token'){const f=path.join(data.root,'DESIGN.md');writeFileSync(f,readFileSync(f,'utf8').replace('{colors.primary}','{colors.absent}'));}
    if(kind==='sync'){const f=path.join(data.root,'.template-source/design/design-system-sync.yaml');writeFileSync(f,readFileSync(f,'utf8').replace(/baseline_sha256: [a-f0-9]+/,'baseline_sha256: '+ '0'.repeat(64)));}
    if(kind==='projection'){const f=path.join(data.root,'.template-spec/design/tokens/variables.css');writeFileSync(f,readFileSync(f,'utf8')+'\n/* drift */');}
    if(kind==='dependency')unlinkSync(path.join(data.root,'scripts/vendor/yaml.mjs'));
    if(kind==='tool')args=['export','dtcg','--write'];
    if(kind==='version'){const author=path.join(data.root,'wrong-author');mkdirSync(path.join(author,'node_modules/antd'),{recursive:true});writeFileSync(path.join(author,'package.json'),'{}');writeFileSync(path.join(author,'node_modules/antd/package.json'),' {"version":"0.0.0"}');args=['export','dtcg','--write','--antd-toolchain',author];}
    const r=run(data,args);assert.equal(r.status,1,kind+': '+r.stderr);
    const diagnostic={token:/悬空 token/,sync:/baseline_sha256/,projection:/派生文件漂移/,tool:/缺少 --antd-toolchain/,version:/antd 6.6.4/,dependency:/ERR_MODULE_NOT_FOUND/}[kind];assert.match(r.stderr,diagnostic);
  }
  const missing=isolated(t),r=run(missing,['lint'],{env:{...process.env,PATH:missing.root}});assert.equal(r.status,1);assert.match(r.stderr,/design.md CLI 执行失败/);
});
