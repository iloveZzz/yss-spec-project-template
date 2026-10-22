import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {parse as parseYaml} from "../scripts/vendor/yaml.mjs";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const WORKFLOW = ".github/workflows/template-gate.yml";
const ACTION = ".github/actions/setup-template/action.yml";
const GITLAB = ".gitlab-ci.yml";
const SLOW_WORKFLOW = ".github/workflows/template-slow-checks.yml";
const ADAPTERS = [WORKFLOW, ACTION, GITLAB, SLOW_WORKFLOW];
const read = (relative) => fs.readFileSync(path.join(ROOT, relative), "utf8");
const code = (relative) => read(relative).split("\n").filter((line) => !line.trim().startsWith("#")).join("\n");
const YAML={parse:parseYaml};
const parsed = (relative) => YAML.parse(read(relative));
const versions = () => Object.fromEntries(spawnSync(path.join(ROOT, "scripts/ci-setup"), ["--print-versions"], { encoding: "utf8" }).stdout.trim().split("\n").map((line) => line.split("=")));

test("适配器只调用 scripts/ci-setup 与 scripts/ci-gate，不含检查逻辑（AC-005）", () => {
  for (const file of ADAPTERS) {
    const called = new Set([...code(file).replaceAll(".template-source/scripts/lib/yss-cli-pin.mjs", "").matchAll(/scripts\/([A-Za-z0-9_.-]+)/g)].map((match) => match[1]));
    assert.deepEqual([...called].filter((name) => !["ci-setup", "ci-gate"].includes(name)), [], file);
  }
  assert.match(code(WORKFLOW), /scripts\/ci-gate --mode pr/);
  assert.match(code(GITLAB), /scripts\/ci-gate .*--prepare-tools/);
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

test("慢检查工作流保留准备和报告预算，验证 1000 秒由公共 gate 独立计时", () => {
  const text = code(SLOW_WORKFLOW);
  assert.match(text, /^on:\n  schedule:\n    - cron: '[^']+'\n  workflow_dispatch:$/m);
  assert.doesNotMatch(text, /pull_request|push:/);
  assert.match(text, /timeout-minutes: 32/);
  assert.doesNotMatch(text,/timeout-minutes: 5/);
  assert.match(text,/run: scripts\/ci-gate --mode slow .*--prepare-tools/);
});

test("慢检查只有只读权限，固定发布恢复器已退出活动树", () => {
  const workflow = parsed(SLOW_WORKFLOW);
  assert.deepEqual(workflow.permissions, { contents: "read" });
  assert.equal(workflow.name, "template-slow-checks");
  assert.doesNotMatch(code(SLOW_WORKFLOW), /\.release-recovery|gh release|GH_TOKEN/);
  assert.equal(fs.existsSync(path.join(ROOT, ".release-recovery")), false);
});

test(".nvmrc 主版本与 scripts/ci-setup 的目标 Node 一致，本地与 CI 使用同一主版本", () => {
  assert.equal(read(".nvmrc").trim().split(".")[0], versions().node);
});

test("setup-template 是薄封装：先供给 Node，再从现有 pin reader 读取 Go 版本", (t) => {
  const text = code(ACTION);
  assert.match(text, /scripts\/ci-setup --print-versions >> "\$GITHUB_OUTPUT"/);
  assert.match(text, /node-version: \$\{\{ steps\.versions\.outputs\.node \}\}/);
  assert.match(text, /python-version: \$\{\{ steps\.versions\.outputs\.python \}\}/);
  assert.doesNotMatch(text, /(node|python)-version: '?\d/);
  assert.match(text, /YSS_CI_ENV_FILE: \$\{\{ github\.env \}\}/);
  assert.match(text, /scripts\/ci-setup /);
  assert.match(text, /actions\/setup-go@v5/);
  assert.match(text, /go-version: \$\{\{ steps\.go_version\.outputs\.go \}\}/);
  assert.doesNotMatch(text, /go-version: stable/);
  const printed = versions();
  assert.match(printed.node, /^\d+$/);
  assert.match(printed.python, /^\d+\.\d+$/);
  assert.equal(printed.go, undefined);
  const nodeAt = text.indexOf("uses: actions/setup-node@v4"), readerAt = text.indexOf("id: go_version"), goAt = text.indexOf("uses: actions/setup-go@v5");
  assert.ok(nodeAt >= 0 && readerAt > nodeAt && goAt > readerAt, "Go pin reader 必须位于 Node 安装后、Go 安装前");
  const run = /    - id: go_version\n      shell: bash\n      run: \|\n((?:        .*\n)+)/.exec(text)?.[1].replace(/^        /gm, "");
  assert.ok(run, "通过 bash 独立步骤读取 Go 版本");
  assert.match(run, /go_version="\$\(node \.template-source\/scripts\/lib\/yss-cli-pin\.mjs go_version\)"\n/);
  assert.match(run, /printf 'go=%s\\n' "\$go_version" >> "\$GITHUB_OUTPUT"/);
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "yss-ci-go-output-"));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const output = path.join(directory, "output"), noNode = path.join(directory, "no-node");
  fs.mkdirSync(noNode);
  const refused = spawnSync("/bin/bash", ["-e", "-c", run], { cwd: ROOT, encoding: "utf8", env: { ...process.env, PATH: noNode, GITHUB_OUTPUT: output } });
  assert.equal(refused.status, 127, refused.stderr);
  assert.equal(fs.existsSync(output), false, "pin reader 失败不能写出空 go= 或假成功");
  const passed = spawnSync("/bin/bash", ["-e", "-c", run], { cwd: ROOT, encoding: "utf8", env: { ...process.env, GITHUB_OUTPUT: output } });
  assert.equal(passed.status, 0, passed.stderr);
  assert.equal(fs.readFileSync(output, "utf8"), `go=${JSON.parse(read(".template-source/distribution/yss-cli-pin.json")).go_version}\n`);
});

test('适配器仅供给基础运行时，按需准备统一交给 gate',()=>{
 for(const file of [WORKFLOW,SLOW_WORKFLOW]){
  assert.match(code(file),/runtime-only: 'true'/);assert.match(code(file),/scripts\/ci-gate .*--prepare-tools/);
  assert.doesNotMatch(code(file),/toolchain: 'true'|yss-commit: pin/);
 }
 const action=parsed(ACTION);assert.equal(action.inputs['runtime-only'].default,'false');
 const setup=action.runs.steps.find(step=>step.run?.includes('scripts/ci-setup ${args'));
 assert.equal(setup.if,"inputs.runtime-only != 'true'");
 assert.doesNotMatch(code(GITLAB),/scripts\/ci-setup|set -a|YSS_CI_ENV_FILE/);
 assert.doesNotMatch(read('scripts/ci-setup'),/submodule update|sync-profile-skills/);
});

test("GitLab 适配器与 CI 用的环境文件不进仓库，并排除出实例分发", () => {
  const profile = JSON.parse(read(".template-source/distribution/bundle-profile.json"));
  assert.ok(profile.manifest.excludeRootFiles.includes(".gitlab-ci.yml"));
  assert.ok(profile.manifest.excludeRootEntries.includes(".github"));
  assert.doesNotMatch(code(GITLAB), /YSS_CI_ENV_FILE|set -a/);
});

test("AC-006：github-workflows.md 登记 template-gate，不再声明已移除，发布段落保持", () => {
  const doc = read(".template-source/process/github-workflows.md");
  assert.doesNotMatch(doc, /已移除/);
  assert.doesNotMatch(doc, /不再自动运行/);
  assert.match(doc, /`template-gate`/);
  assert.match(doc, /scripts\/ci-gate/);
  assert.match(doc, /必需检查/);
  assert.match(doc, /不得跳过/);
  assert.match(doc, /node \.template-source\/scripts\/verify-template-release\.mjs --commit <40位SHA> --base <上一正式发行完整SHA> --output <仓库外绝对目录> --cli-family all`/);
  assert.match(doc, /Spec\/Backend/);
  assert.doesNotMatch(doc, /all-four|三 Profile|三个 Profile|固定四源提交/);
});
