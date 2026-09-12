// Maintainer entry: create only an empty thin CLI working directory.
import * as fs from "node:fs";
import path from "node:path";
import { ensure, write, json, stat } from "./io.mjs";
const [side, output] = process.argv.slice(2);
ensure(
  ["backend", "frontend"].includes(side) && output,
  "usage: node scaffold.mjs backend|frontend <empty-directory>",
);
const root = path.resolve(output),
  name = `create-yss-harness-${side}`;
ensure(
  !stat(root) || fs.readdirSync(root).length === 0,
  "薄包目标必须不存在或为空",
);
write(
  root,
  "package.json",
  json({
    name,
    version: "0.1.0",
    description: `创建和同步 YSS ${side} 专职 Harness 治理项目`,
    type: "module",
    license: "UNLICENSED",
    engines: { node: ">=22 <27" },
    packageManager: "pnpm@10.15.0",
    repository: {
      type: "git",
      url: `git+https://github.com/iloveZzz/${name}.git`,
    },
    bin: { [name]: `bin/${name}.js` },
    files: [
      "bin",
      "config",
      "vendor/cli-core",
      "cli-core.lock.json",
      "template",
      "template.manifest.json",
      "template.snapshot.json",
    ],
    scripts: {
      "sync-core": "node scripts/sync-core.mjs",
      "sync-template": "node scripts/sync-template.mjs",
      "verify-bundle": "node scripts/verify-bundle.mjs",
      test: "node --test tests/*.test.mjs",
      prepack: "node scripts/verify-bundle.mjs",
    },
  }),
);
write(
  root,
  `bin/${name}.js`,
  `#!/usr/bin/env node\nimport {fileURLToPath} from 'node:url';\nimport {main} from '../vendor/cli-core/cli.mjs';\nawait main(fileURLToPath(new URL('..',import.meta.url)));\n`,
  0o755,
);
for (const kind of ["core", "template"])
  write(
    root,
    `scripts/sync-${kind}.mjs`,
    `import {fileURLToPath} from 'node:url';\nimport {sync${kind[0].toUpperCase() + kind.slice(1)}} from '../vendor/cli-core/build.mjs';\nconst args=process.argv.slice(2),check=args.includes('--check'),values=args.filter(x=>x!=='--check');\nif(values.length!==2)throw new Error('usage: pnpm sync-${kind} <source-repo> <commit> [--check]');\nconsole.log(JSON.stringify(sync${kind[0].toUpperCase() + kind.slice(1)}(values[0],values[1],fileURLToPath(new URL('..',import.meta.url)),check),null,2));\n`,
  );
write(
  root,
  "scripts/verify-bundle.mjs",
  `import {fileURLToPath} from 'node:url';\nimport {verifyCore} from '../vendor/cli-core/build.mjs';\nimport {loadBundle} from '../vendor/cli-core/bundle.mjs';\nconst root=fileURLToPath(new URL('..',import.meta.url));\nconst core=verifyCore(root),bundle=loadBundle(root);\nconsole.log(JSON.stringify({package:bundle.pkg.name,core:core.digest,template:bundle.snapshot.snapshotHash,files:bundle.files.size}));\n`,
);
write(
  root,
  "tests/package.test.mjs",
  `import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
const root=fileURLToPath(new URL('..',import.meta.url));
test('固定包契约、真实模板计划零写入和旧实例拒绝',t=>{
 const scratch=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'${name}-')));t.after(()=>fs.rmSync(scratch,{recursive:true,force:true}));
 const target=path.join(scratch,'project');
 const run=(...args)=>spawnSync(process.execPath,[path.join(root,'bin/${name}.js'),...args,'--json'],{encoding:'utf8',maxBuffer:32*1024*1024});
 const verify=spawnSync(process.execPath,[path.join(root,'scripts/verify-bundle.mjs')],{encoding:'utf8'});assert.equal(verify.status,0,verify.stderr);
 let r=run('init','--target-dir',target,'--project-name','验收实例','--dry-run');assert.equal(r.status,0,r.stderr);
 const plan=JSON.parse(r.stdout);assert.equal(plan.status,'preview');assert.equal(fs.existsSync(target),false);
 assert.ok(plan.changes.some(x=>x.path==='scripts/repository-mode'));assert.ok(plan.changes.some(x=>x.path==='docs/process/harness-profile.yaml'));assert.ok(!plan.changes.some(x=>x.path==='scripts/instantiate-harness'));
 fs.mkdirSync(target);const metadata=path.join(target,'.yss-harness-${side}.json');fs.writeFileSync(metadata,'{"schema_version":1}');
 r=run('attach','--target-dir',target,'--apply','--force');assert.equal(r.status,1);assert.equal(JSON.parse(r.stdout).code,'LEGACY');assert.deepEqual(fs.readdirSync(target),['.yss-harness-${side}.json']);
});
`,
);
write(
  root,
  ".github/workflows/ci.yml",
  `name: CLI\non: [push, pull_request, workflow_dispatch]\njobs:\n  verify:\n    runs-on: ubuntu-latest\n    strategy:\n      matrix:\n        node: [22, 24, 26]\n    steps:\n      - uses: actions/checkout@v4\n      - uses: actions/setup-node@v4\n        with:\n          node-version: \u0024{{ matrix.node }}\n      - uses: pnpm/action-setup@v4\n        with:\n          version: 10.15.0\n      - run: pnpm test\n      - run: pnpm verify-bundle\n      - run: npm pack\n      - run: |\n          mkdir -p /tmp/cli-consumer\n          npm install --prefix /tmp/cli-consumer --ignore-scripts ./\u0024(npm pkg get name | tr -d '\"')-\u0024(npm pkg get version | tr -d '\"').tgz\n          /tmp/cli-consumer/node_modules/.bin/${name} init --target-dir /tmp/harness-instance --project-name ci --json\n          /tmp/cli-consumer/node_modules/.bin/${name} sync --target-dir /tmp/harness-instance --json\n`,
);
write(root, ".gitignore", "node_modules/\n*.tgz\n.DS_Store\n");
write(
  root,
  "yss-project.yaml",
  "schema_version: 1\nrepository_mode: template-source\n",
);
write(
  root,
  "AGENTS.md",
  "# CLI 维护入口\n\n本仓是模板工具链薄包，不生成产品 Spec / Ticket。公共实现权威位于综合模板 `.template-source/cli-core/`；`vendor/cli-core/` 和 `template/` 只通过同步脚本生成。修改身份时先更新来源 profile。日常 implementation-ready 可显式使用 `WORKTREE` 并在锁中记录来源状态；candidate/release 必须从完整提交重建。验证使用 `pnpm test`、`pnpm verify-bundle`，测试结束后才执行 `npm pack`。npm 发布和旧入口退役独立执行发布流程。\n",
);
write(
  root,
  "README.md",
  `# ${name}\n\n创建、接入和同步 \`harness.${side}-delivery\` 的治理资产。CLI 包内包含固定模板与公共核心，init / attach / sync 离线运行。不会生成业务运行时代码。当前安装版本和 npm 发布状态分别以 \`${name} --version\` 与 registry 为准；本地候选可用 \`npm pack\` 后的实际 tgz 验收。\n\n\`\`\`sh\nnpx ${name}@latest init --target-dir ./my-project --project-name 我的项目\nnpx ${name}@latest attach --target-dir ./existing-project\nnpx ${name}@latest attach --target-dir ./existing-project --apply\nnpx ${name}@latest sync --target-dir ./my-project --plan --prune\nnpx ${name}@latest sync --target-dir ./my-project --apply --prune\nnpx ${name}@latest recover --target-dir ./my-project\n${name} update --dry-run\n\`\`\`\n\ninit 只接受不存在或空目录；\`--dry-run\` 不写入。attach / sync 默认预览，写入要求 \`--apply\`。治理冲突整次暂停，确认备份覆盖后可用 \`--apply --force\`。业务源码、构建文件、Git、子模块与越界路径不能强制接管。\n\n仓内旧脚本生成的实例不受支持，不转换旧 metadata 或重建基线；其他 Harness 家族同样拒绝。已有 metadata v2 实例使用同家族 sync。普通 sync 保留退出分发文件；显式 \`--prune\` 只删除内容和 mode 仍等于可信旧 baseline 的文件，用户修改过的旧副本继续保留并报告。\n\n参数：\`--project-name\`、\`--business-domain\`、\`--team-size\`、\`--issue-tracker local-markdown|github|gitlab\`、\`--git-init\`（仅 init）、\`--include-example-docs\` / \`--no-example-docs\`、\`--json\`。程序升级命令 \`update\` / \`upgrade\` 只更新 CLI；npx、源码或未知安装方式输出安装指引。\n\n每次应用保存 \`.yss-harness-state/${side}/transactions/<id>/journal.json\` 和原文件备份。失败自动恢复；进程中断后先用 \`recover\` 诊断，带 \`--apply\` 才执行恢复。恢复遇到后续修改会停下并保留恢复清单。成功事务保留备份，但不提供历史 rollback。状态目录应由项目自行排除 Git；CLI 不改已有 Git 配置。\n\nJSON 协议版本 1：成功返回 \`preview\`、\`applied\`、\`recovered\`；错误退出码 1，含 \`code\` / \`message\`，冲突含完整 \`changes\` / \`conflicts\`。存在普通可应用更新的预览退出码为 0。\n\n维护：日常 implementation-ready 可运行 \`pnpm sync-core <source-repo> WORKTREE\` 和 \`pnpm sync-template <source-repo> WORKTREE\`，来源状态会写入锁和快照；candidate/release 必须改用完整 40 位提交。加 \`--check\` 只核验。\`pnpm test\` 完成后依次 \`pnpm verify-bundle\`、\`npm pack\` 和干净目录安装验收。来源锁和 blob 编码随包携带；不要手改生成文件。\n`,
);
write(
  root,
  "LICENSE",
  "UNLICENSED\n\n本包遵循现有 YSS CLI 的分发许可标识。随包第三方资产保留各自的许可证与来源声明。\n",
);
console.log(root);
