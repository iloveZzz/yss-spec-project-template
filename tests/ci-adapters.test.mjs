import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const WORKFLOW = ".github/workflows/template-gate.yml";
const ACTION = ".github/actions/setup-template/action.yml";
const GITLAB = ".gitlab-ci.yml";
const ADAPTERS = [WORKFLOW, ACTION, GITLAB];
const read = (relative) => fs.readFileSync(path.join(ROOT, relative), "utf8");
const code = (relative) => read(relative).split("\n").filter((line) => !line.trim().startsWith("#")).join("\n");
// yaml 只在 pnpm 安装过工具依赖后可用；缺失时跳过解析类断言，文本类断言照常执行。
const YAML = (() => {
  try { return createRequire(path.join(ROOT, ".template-source/tooling/node/package.json"))("yaml"); } catch { return null; }
})();
const parsed = (relative) => YAML.parse(read(relative));
const versions = () => Object.fromEntries(spawnSync(path.join(ROOT, "scripts/ci-setup"), ["--print-versions"], { encoding: "utf8" }).stdout.trim().split("\n").map((line) => line.split("=")));

test("适配器只调用 scripts/ci-setup 与 scripts/ci-gate，不含检查逻辑（AC-005）", () => {
  for (const file of ADAPTERS) {
    const called = new Set([...code(file).matchAll(/scripts\/([A-Za-z0-9_.-]+)/g)].map((match) => match[1]));
    assert.deepEqual([...called].filter((name) => !["ci-setup", "ci-gate"].includes(name)), [], file);
  }
  assert.match(code(WORKFLOW), /scripts\/ci-gate --mode pr/);
  assert.match(code(GITLAB), /scripts\/ci-setup --submodules/);
});

test("GitHub：PR 与 main 推送触发，只读权限，完整历史，base 经环境变量传入", () => {
  const text = code(WORKFLOW);
  assert.match(text, /^name: template-gate$/m);
  assert.match(text, /^on:\n  pull_request:\n  push:\n    branches: \[main\]$/m);
  assert.match(text, /^permissions:\n  contents: read$/m);
  assert.match(text, /fetch-depth: 0/);
  assert.match(text, /persist-credentials: false/);
  assert.match(text, /BASE_SHA: \$\{\{ github\.event\.pull_request\.base\.sha \}\}/);
  assert.match(text, /scripts\/ci-gate --mode pr --base "\$BASE_SHA" --report-dir "\$REPORT_DIR"/);
  assert.match(text, /scripts\/ci-gate --mode push --report-dir "\$REPORT_DIR"/);
});

test("GitHub：run 脚本里不内联表达式，避免把事件字段拼进 shell", { skip: !YAML }, () => {
  const workflow = parsed(WORKFLOW);
  const job = workflow.jobs["template-gate"];
  assert.equal(job.name, "template-gate");
  assert.ok(job["timeout-minutes"] > 0);
  for (const step of job.steps) if (step.run) assert.doesNotMatch(step.run, /\$\{\{/, step.name);
  const action = parsed(ACTION);
  for (const step of action.runs.steps) if (step.run) assert.doesNotMatch(step.run, /\$\{\{/, step.id ?? "run");
});

test("GitLab：MR 与默认分支推送触发，完整历史，MR 模式用目标分支 diff base", () => {
  const text = code(GITLAB);
  assert.match(text, /\$CI_PIPELINE_SOURCE == "merge_request_event"/);
  assert.match(text, /\$CI_COMMIT_BRANCH == \$CI_DEFAULT_BRANCH/);
  assert.match(text, /^template-gate:$/m);
  assert.match(text, /GIT_DEPTH: "0"/);
  assert.match(text, /scripts\/ci-gate --mode pr --base "\$CI_MERGE_REQUEST_DIFF_BASE_SHA" --report-dir \/tmp\/ci-gate/);
  assert.match(text, /scripts\/ci-gate --mode push --report-dir \/tmp\/ci-gate/);
  assert.match(text, /when: always/);
});

test("GitLab 与 GitHub 使用同一报告目录，两份报告里的命令字符串才可逐步比对（AC-023）", () => {
  assert.match(code(WORKFLOW), /REPORT_DIR: \/tmp\/ci-gate$/m);
  assert.match(code(GITLAB), /--report-dir \/tmp\/ci-gate/);
});

test("GitLab 镜像主版本与 scripts/ci-setup 的目标 Node 一致", () => {
  const image = /^\s+image: node:(\d+)$/m.exec(code(GITLAB));
  assert.ok(image, ".gitlab-ci.yml 必须固定 node:<主版本> 镜像");
  assert.equal(image[1], versions().node);
});

test("setup-template 是薄封装：运行时版本取自 ci-setup，不在 YAML 里再写一份", () => {
  const text = code(ACTION);
  assert.match(text, /scripts\/ci-setup --print-versions >> "\$GITHUB_OUTPUT"/);
  assert.match(text, /node-version: \$\{\{ steps\.versions\.outputs\.node \}\}/);
  assert.match(text, /python-version: \$\{\{ steps\.versions\.outputs\.python \}\}/);
  assert.doesNotMatch(text, /(node|python)-version: '?\d/);
  assert.match(text, /YSS_CI_ENV_FILE: \$\{\{ github\.env \}\}/);
  assert.match(text, /scripts\/ci-setup /);
  assert.match(text, /actions\/setup-go@v5/);
  const printed = versions();
  assert.match(printed.node, /^\d+$/);
  assert.match(printed.python, /^\d+\.\d+$/);
});

test("两个平台都不跳过子模组，并都用固定 gitlink 构建 yss（fast 的部分测试需要原生二进制）", () => {
  assert.match(code(WORKFLOW), /submodules: 'true'\n\s+yss-commit: gitlink/);
  assert.match(code(GITLAB), /scripts\/ci-setup --submodules --yss-commit gitlink/);
  assert.match(read("scripts/ci-setup"), /git -c protocol\.version=2 submodule update --init/);
});

test("GitLab 适配器与 CI 用的环境文件不进仓库，并排除出实例分发", () => {
  const profile = JSON.parse(read(".template-source/distribution/bundle-profile.json"));
  assert.ok(profile.manifest.excludeRootFiles.includes(".gitlab-ci.yml"));
  assert.ok(profile.manifest.excludeRootEntries.includes(".github"));
  assert.match(code(GITLAB), /YSS_CI_ENV_FILE: \/tmp\//);
});

test("AC-006：github-workflows.md 登记 template-gate，不再声明已移除，发布段落保持", () => {
  const doc = read(".template-source/process/github-workflows.md");
  assert.doesNotMatch(doc, /已移除/);
  assert.doesNotMatch(doc, /不再自动运行/);
  assert.match(doc, /`template-gate`/);
  assert.match(doc, /scripts\/ci-gate/);
  assert.match(doc, /必需检查/);
  assert.match(doc, /不得跳过/);
  assert.match(doc, /node \.template-source\/scripts\/verify-template-release\.mjs --commit <40位SHA> --output <仓库外绝对目录> --cli-family all-four/);
});
