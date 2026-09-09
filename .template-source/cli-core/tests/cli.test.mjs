import { test } from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
const entry = fileURLToPath(new URL("../cli.mjs", import.meta.url));
const hash = (b) => createHash("sha256").update(b).digest("hex");
const json = (x) => JSON.stringify(x, null, 2) + "\n";
function put(root, ref, content) {
  fs.mkdirSync(path.dirname(path.join(root, ref)), { recursive: true });
  fs.writeFileSync(path.join(root, ref), content);
}
function fixture(t, side = "backend") {
  const root = fs.realpathSync(
    fs.mkdtempSync(path.join(os.tmpdir(), "dedicated-cli-")),
  );
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const pkg = path.join(root, "package"),
    target = path.join(root, "project");
  const family = {
    side,
    packageName: `create-yss-harness-${side}`,
    profileId: `harness.${side}-delivery`,
    metadataFile: `.yss-harness-${side}.json`,
    templateName: `yss-harness-${side}-agent`,
    templateSource: `github:iloveZzz/yss-harness-${side}-agent`,
  };
  put(
    pkg,
    "package.json",
    json({ name: family.packageName, version: "0.1.0", type: "module" }),
  );
  put(pkg, "config/family.json", json(family));
  put(
    pkg,
    "bin.mjs",
    `import {main} from ${JSON.stringify("file://" + entry)}; await main(${JSON.stringify(pkg)});`,
  );
  const files = {
    "README.md": "# {{PROJECT_NAME}}\n",
    "CONTEXT.md": "# Context\n",
    "AGENTS.md": "Read CONTEXT.md\n",
    "yss-project.yaml": "schema_version: 1\nrepository_mode: template-source\n",
    "docs/process/harness-profile.yaml": `schema_version: 1\nprofile_id: ${family.profileId}\ninstantiation:\n  cli_package: ${family.packageName}\n  metadata_file: ${family.metadataFile}\n  template_source: ${family.templateSource}\n`,
    "docs/rule.md": "rule v1\n",
    "scripts/check": "#!/bin/sh\nexit 0\n",
  };
  function bundle(changes = {}) {
    Object.assign(files, changes);
    const entries = {};
    for (const [ref, content] of Object.entries(files).sort()) {
      if (content === null) continue;
      const digest = hash(content);
      entries[ref] = {
        type: "file",
        digest,
        mode: ref === "scripts/check" ? 493 : 420,
        blob: `blobs/${digest}`,
      };
      put(pkg, `template/blobs/${digest}`, content);
    }
    const manifest = {
      schemaVersion: 1,
      renderPaths: ["README.md", "yss-project.yaml"],
      exampleDocPaths: [],
    };
    put(pkg, "template.manifest.json", json(manifest));
    put(
      pkg,
      "template.snapshot.json",
      json({
        schemaVersion: 1,
        ...family,
        templateCommit: "a".repeat(40),
        manifestHash: hash(json(manifest)),
        files: entries,
        snapshotHash: hash(JSON.stringify(entries)),
      }),
    );
    put(
      pkg,
      "cli-core.lock.json",
      json({
        schemaVersion: 1,
        coreVersion: "0.1.0",
        protocolVersion: 1,
        sourceRevision: "b".repeat(40),
        digest: "c".repeat(64),
        files: {},
      }),
    );
  }
  bundle();
  const run = (...args) => {
    const r = spawnSync(
      process.execPath,
      [path.join(pkg, "bin.mjs"), ...args, "--target-dir", target, "--json"],
      { encoding: "utf8" },
    );
    return {
      ...r,
      data: (() => {
        try {
          return JSON.parse(r.stdout);
        } catch {
          return null;
        }
      })(),
    };
  };
  return { root, pkg, target, family, run, bundle, files };
}
test("两家族从离线固定包创建空目录实例，记录新版基线并保留可执行 mode", (t) => {
  for (const side of ["backend", "frontend"]) {
    const f = fixture(t, side);
    const r = f.run("init", "--project-name", "订单服务");
    assert.equal(r.status, 0, r.stderr);
    assert.equal(r.data.status, "applied");
    const meta = JSON.parse(
      fs.readFileSync(path.join(f.target, f.family.metadataFile)),
    );
    assert.equal(meta.metadataSchemaVersion, 2);
    assert.equal(meta.profileId, f.family.profileId);
    assert.match(
      fs.readFileSync(path.join(f.target, "README.md"), "utf8"),
      /订单服务/,
    );
    assert.match(
      fs.readFileSync(path.join(f.target, "yss-project.yaml"), "utf8"),
      /project-instance/,
    );
    assert.equal(
      fs.statSync(path.join(f.target, "scripts/check")).mode & 511,
      493,
    );
  }
});
export { fixture, put, json };
function tree(root) {
  if (!fs.existsSync(root)) return null;
  const result = {};
  for (const ent of fs.readdirSync(root, { withFileTypes: true })) {
    const p = path.join(root, ent.name);
    result[ent.name] = ent.isSymbolicLink()
      ? { link: fs.readlinkSync(p) }
      : ent.isDirectory()
        ? tree(p)
        : {
            bytes: fs.readFileSync(p).toString("base64"),
            mode: fs.statSync(p).mode & 511,
          };
  }
  return result;
}
test("attach 默认与 dry-run 零写入，碰撞整次暂停，force 备份且业务文件保持原样", (t) => {
  const f = fixture(t);
  put(f.target, "src/main.js", "business");
  put(f.target, "package.json", '{"name":"existing"}');
  put(f.target, "README.md", "local README");
  const before = tree(f.target);
  for (const args of [[], ["--dry-run"], ["--apply"]]) {
    const r = f.run("attach", ...args);
    assert.equal(r.status, 1);
    assert.equal(r.data.code, "CONFLICT");
    assert.deepEqual(tree(f.target), before);
  }
  const r = f.run("attach", "--apply", "--force");
  assert.equal(r.status, 0, r.stderr);
  assert.equal(
    fs.readFileSync(path.join(f.target, "src/main.js"), "utf8"),
    "business",
  );
  assert.equal(
    fs.readFileSync(path.join(f.target, "package.json"), "utf8"),
    '{"name":"existing"}',
  );
  assert.ok(r.data.backupPath);
  assert.ok(fs.existsSync(path.join(r.data.backupPath, "journal.json")));
  assert.equal(f.run("attach", "--apply", "--force").status, 1);
});
test("普通无碰撞仓 attach 预览可应用计划但不创建状态目录", (t) => {
  const f = fixture(t);
  put(f.target, "src/app.js", "business");
  const before = tree(f.target);
  const r = f.run("attach");
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.data.status, "preview");
  assert.deepEqual(tree(f.target), before);
});
test("旧格式、旧 profile、异族、多身份、未知schema和链接拒绝且 force 无法绕过", (t) => {
  for (const kind of [
    "legacy",
    "profile",
    "foreign",
    "mixed",
    "schema",
    "symlink",
  ]) {
    const f = fixture(t);
    put(f.target, "business.txt", "keep");
    if (kind === "legacy")
      put(
        f.target,
        f.family.metadataFile,
        json({
          schema_version: 1,
          profile_id: f.family.profileId,
          template_commit: "a".repeat(40),
        }),
      );
    if (kind === "profile")
      put(
        f.target,
        "docs/process/harness-profile.yaml",
        `schema_version: 1\nprofile_id: ${f.family.profileId}\ninstantiation:\n  cli_package: repository-local\n`,
      );
    if (kind === "foreign" || kind === "mixed")
      put(f.target, ".yss-harness-dev.json", "{}");
    if (kind === "mixed" || kind === "schema")
      put(f.target, f.family.metadataFile, json({ metadataSchemaVersion: 99 }));
    if (kind === "symlink") {
      put(f.root, "outside", "{}");
      fs.symlinkSync(
        path.join(f.root, "outside"),
        path.join(f.target, f.family.metadataFile),
      );
    }
    const before = tree(f.target);
    for (const cmd of ["attach", "sync"]) {
      const r = f.run(cmd, "--apply", "--force");
      assert.equal(r.status, 1, kind);
      assert.deepEqual(tree(f.target), before, kind);
    }
  }
});
test("sync 三方规则：本地保留、模板升级、新增、删除和冲突整次暂停", (t) => {
  const f = fixture(t);
  assert.equal(f.run("init").status, 0);
  put(f.target, "docs/rule.md", "local edit\n");
  const before = tree(f.target);
  let r = f.run("sync");
  assert.equal(r.status, 0, r.stderr);
  assert.ok(
    r.data.changes.some(
      (x) => x.path === "docs/rule.md" && x.action === "preserve",
    ),
  );
  assert.deepEqual(tree(f.target), before);
  f.bundle({
    "docs/rule.md": "upstream v2\n",
    "docs/new.md": "new\n",
    "scripts/check": null,
  });
  r = f.run("sync", "--apply");
  assert.equal(r.data.code, "CONFLICT");
  assert.deepEqual(tree(f.target), before);
  r = f.run("sync", "--apply", "--force");
  assert.equal(r.status, 0, r.stderr);
  assert.equal(
    fs.readFileSync(path.join(f.target, "docs/rule.md"), "utf8"),
    "upstream v2\n",
  );
  assert.equal(fs.existsSync(path.join(f.target, "scripts/check")), false);
  assert.ok(fs.existsSync(path.join(f.target, "docs/new.md")));
  const m = JSON.parse(
    fs.readFileSync(path.join(f.target, f.family.metadataFile)),
  );
  assert.equal(m.lastTransactionId, r.data.transactionId);
  r = f.run("sync");
  assert.equal(r.status, 0, r.stderr);
  assert.ok(r.data.changes.every((x) => x.action === "unchanged"));
});
test("init dry-run 无写入；非空目录、未知基线、目录碰撞、嵌套仓库和快照越界均拒绝", (t) => {
  const f = fixture(t);
  assert.equal(f.run("init", "--dry-run").status, 0);
  assert.equal(fs.existsSync(f.target), false);
  put(f.target, "keep", "x");
  assert.equal(f.run("init", "--force").status, 1);
  assert.equal(f.run("attach", "--apply").status, 0);
  let m = JSON.parse(
    fs.readFileSync(path.join(f.target, f.family.metadataFile)),
  );
  delete m.managedFiles;
  put(f.target, f.family.metadataFile, json(m));
  let before = tree(f.target);
  assert.equal(f.run("sync", "--apply", "--force").data.code, "BASELINE");
  assert.deepEqual(tree(f.target), before);
  for (const kind of ["dir", "link", "repo", "snapshot"]) {
    const x = fixture(t);
    put(x.target, "keep", "x");
    if (kind === "dir") fs.mkdirSync(path.join(x.target, "README.md"));
    if (kind === "link") {
      put(x.root, "external", "x");
      fs.symlinkSync(
        path.join(x.root, "external"),
        path.join(x.target, "README.md"),
      );
    }
    if (kind === "repo") put(x.target, "docs/.git", "gitdir: elsewhere");
    if (kind === "snapshot") x.bundle({ "../escape": "bad" });
    before = tree(x.target);
    const r = x.run("attach", "--apply", "--force");
    assert.equal(r.status, 1, kind);
    assert.deepEqual(tree(x.target), before);
  }
});
function injected(f, code, command = "sync") {
  const hook = path.join(f.root, "fault.mjs");
  fs.writeFileSync(
    hook,
    `import fs from 'node:fs';import {syncBuiltinESMExports} from 'node:module';\n${code}\nsyncBuiltinESMExports();`,
  );
  return spawnSync(
    process.execPath,
    [
      "--import",
      hook,
      path.join(f.pkg, "bin.mjs"),
      command,
      "--target-dir",
      f.target,
      "--apply",
      "--json",
    ],
    { encoding: "utf8" },
  );
}
test("写入失败自动恢复内容与 metadata，备份失败不应用计划", (t) => {
  for (const boundary of ["write", "backup"]) {
    const f = fixture(t);
    assert.equal(f.run("init").status, 0);
    f.bundle({ "docs/new.md": "new", "docs/rule.md": "v2" });
    const meta = fs.readFileSync(
      path.join(f.target, f.family.metadataFile),
      "utf8",
    );
    const r = injected(
      f,
      `const original=fs.renameSync;let failed=false;fs.renameSync=(a,b)=>{if(!failed&&String(b).includes(${JSON.stringify(boundary === "write" ? "/docs/rule.md" : "/backup/")})){failed=true;throw new Error('injected disk error')}return original(a,b)};`,
    );
    assert.equal(r.status, 1, r.stderr);
    assert.equal(
      fs.readFileSync(path.join(f.target, "docs/rule.md"), "utf8"),
      "rule v1\n",
    );
    assert.equal(
      fs.readFileSync(path.join(f.target, f.family.metadataFile), "utf8"),
      meta,
    );
    assert.equal(fs.existsSync(path.join(f.target, "docs/new.md")), false);
  }
});
test("进程中断后预览只诊断；下次 apply 恢复再允许重试", (t) => {
  const f = fixture(t);
  assert.equal(f.run("init").status, 0);
  f.bundle({ "docs/new.md": "new", "docs/rule.md": "v2" });
  const meta = fs.readFileSync(
    path.join(f.target, f.family.metadataFile),
    "utf8",
  );
  const r = injected(
    f,
    `const original=fs.renameSync;fs.renameSync=(a,b)=>{original(a,b);if(String(b).endsWith('/docs/new.md'))process.kill(process.pid,'SIGKILL')};`,
  );
  assert.equal(r.signal, "SIGKILL");
  const before = tree(f.target);
  assert.equal(f.run("sync").data.code, "INTERRUPTED");
  assert.deepEqual(tree(f.target), before);
  const recovered = f.run("sync", "--apply");
  assert.equal(recovered.status, 0, recovered.stderr);
  assert.equal(recovered.data.status, "recovered");
  assert.equal(fs.existsSync(path.join(f.target, "docs/new.md")), false);
  assert.equal(
    fs.readFileSync(path.join(f.target, f.family.metadataFile), "utf8"),
    meta,
  );
  assert.equal(f.run("sync", "--apply").status, 0);
});
test("update/upgrade 使用固定包名检查新版，源码安装仅输出指引且实例不变", (t) => {
  const f = fixture(t);
  assert.equal(f.run("init").status, 0);
  const before = tree(f.target);
  const bindir = path.join(f.root, "fake-bin");
  put(
    bindir,
    "npm",
    '#!/bin/sh\nif [ "$1" = "view" ]; then echo 0.2.0; elif [ "$1" = "prefix" ]; then echo /nonexistent; else exit 77; fi\n',
  );
  fs.chmodSync(path.join(bindir, "npm"), 0o755);
  for (const cmd of ["update", "upgrade"]) {
    const r = spawnSync(
      process.execPath,
      [path.join(f.pkg, "bin.mjs"), cmd, "--dry-run", "--json"],
      {
        cwd: f.target,
        env: {
          ...process.env,
          PATH: bindir + path.delimiter + process.env.PATH,
        },
        encoding: "utf8",
      },
    );
    assert.equal(r.status, 0, r.stderr);
    const d = JSON.parse(r.stdout);
    assert.equal(d.latestVersion, "0.2.0");
    assert.equal(d.packageName, f.family.packageName);
    assert.match(d.advice, /create-yss-harness-backend@latest/);
    assert.deepEqual(tree(f.target), before);
  }
});
test("init --git-init 创建独立 Git；非法参数不留下项目", (t) => {
  const f = fixture(t);
  assert.equal(f.run("init", "--git-init").status, 0);
  assert.ok(fs.existsSync(path.join(f.target, ".git/HEAD")));
  const x = fixture(t);
  assert.equal(x.run("attach", "--git-init").status, 1);
  assert.equal(x.run("init", "--issue-tracker", "bad").status, 1);
  assert.equal(fs.existsSync(x.target), false);
});
test("未检出的声明 gitlink、硬链接、未知状态目录和跨家族恢复保持零写入", (t) => {
  for (const kind of ["gitlink", "hardlink", "state"]) {
    const f = fixture(t);
    put(f.target, "keep", "x");
    if (kind === "gitlink")
      put(
        f.target,
        ".gitmodules",
        '[submodule "rules"]\n path = docs\n url = https://example.invalid/rules.git\n',
      );
    if (kind === "hardlink")
      fs.linkSync(
        path.join(f.target, "keep"),
        path.join(f.target, "README.md"),
      );
    if (kind === "state") put(f.target, ".yss-harness-state/unknown", "x");
    const before = tree(f.target);
    const r = f.run("attach", "--apply", "--force");
    assert.equal(r.status, 1, kind);
    assert.deepEqual(tree(f.target), before);
  }
});
test("并发修改和恢复失败保留外部修改，明确报告未恢复路径", (t) => {
  const f = fixture(t);
  assert.equal(f.run("init").status, 0);
  f.bundle({ "docs/new.md": "new", "docs/rule.md": "v2" });
  const r = injected(
    f,
    `const original=fs.renameSync;fs.renameSync=(a,b)=>{original(a,b);if(String(b).endsWith('/docs/new.md')){fs.writeFileSync(${JSON.stringify(path.join(f.target, "docs/new.md"))},'concurrent');throw new Error('injected verify failure')}};`,
  );
  assert.equal(r.status, 1);
  assert.equal(JSON.parse(r.stdout).code, "RECOVERY_FAILED");
  assert.equal(
    fs.readFileSync(path.join(f.target, "docs/new.md"), "utf8"),
    "concurrent",
  );
  assert.equal(
    fs.readFileSync(path.join(f.target, "docs/rule.md"), "utf8"),
    "rule v1\n",
  );
});
test("中断恢复前拒绝旧身份、嵌套仓库、声明gitlink及损坏备份，整次零写入", (t) => {
  for (const kind of ["legacy", "repo", "gitlink", "backup"]) {
    const f = fixture(t);
    assert.equal(f.run("init").status, 0);
    f.bundle({ "docs/new.md": "new", "docs/rule.md": "v2" });
    const r = injected(
      f,
      `const original=fs.renameSync;fs.renameSync=(a,b)=>{original(a,b);if(String(b).endsWith('/docs/rule.md'))process.kill(process.pid,'SIGKILL')};`,
    );
    assert.equal(r.signal, "SIGKILL");
    if (kind === "legacy")
      put(
        f.target,
        f.family.metadataFile,
        json({ schema_version: 1, profile_id: f.family.profileId }),
      );
    if (kind === "repo") put(f.target, "docs/.git", "gitdir: elsewhere");
    if (kind === "gitlink")
      put(
        f.target,
        ".gitmodules",
        '[submodule "rules"]\n path = docs\n url = https://example.invalid/repo.git\n',
      );
    if (kind === "backup") {
      const dir = path.join(
        f.target,
        ".yss-harness-state/backend/transactions",
      );
      for (const id of fs.readdirSync(dir)) {
        const j = JSON.parse(
          fs.readFileSync(path.join(dir, id, "journal.json")),
        );
        if (j.phase !== "committed")
          for (const file of fs.readdirSync(path.join(dir, id, "backup")))
            fs.writeFileSync(path.join(dir, id, "backup", file), "corrupt");
      }
    }
    const before = tree(f.target);
    const recovered = f.run("sync", "--apply", "--force");
    assert.equal(recovered.status, 1, kind);
    assert.deepEqual(tree(f.target), before, kind);
  }
});
test("实际入口尾斜杠的全局安装识别保留 -g，upgrade 不降级", (t) => {
  const f = fixture(t);
  const global = path.join(f.root, "global"),
    installed = path.join(global, "lib/node_modules", f.family.packageName);
  fs.cpSync(f.pkg, installed, { recursive: true });
  put(
    installed,
    "entry.mjs",
    `import {fileURLToPath} from 'node:url';import {main} from ${JSON.stringify("file://" + entry)};await main(fileURLToPath(new URL('.',import.meta.url)));`,
  );
  const bin = path.join(f.root, "bin");
  put(
    bin,
    "npm",
    `#!/bin/sh\nif [ "$1" = "view" ]; then echo 0.2.0; elif [ "$1" = "prefix" ]; then echo '${global}'; else exit 77; fi\n`,
  );
  fs.chmodSync(path.join(bin, "npm"), 0o755);
  const r = spawnSync(
    process.execPath,
    [path.join(installed, "entry.mjs"), "upgrade", "--dry-run", "--json"],
    {
      encoding: "utf8",
      env: { ...process.env, PATH: bin + path.delimiter + process.env.PATH },
    },
  );
  assert.equal(r.status, 0, r.stderr);
  const plan = JSON.parse(r.stdout);
  assert.equal(plan.installKind, "global");
  assert.deepEqual(plan.commandLine, [
    "npm",
    "install",
    "-g",
    f.family.packageName + "@latest",
  ]);
});
test("重复身份字段不能通过 force 同步", (t) => {
  const f = fixture(t);
  assert.equal(f.run("init").status, 0);
  const ref = path.join(f.target, f.family.metadataFile),
    meta = fs.readFileSync(ref, "utf8");
  fs.writeFileSync(
    ref,
    meta.replace(
      '"metadataSchemaVersion": 2',
      '"metadataSchemaVersion": 99, "metadataSchemaVersion": 2',
    ),
  );
  const before = tree(f.target);
  assert.equal(f.run("sync", "--apply", "--force").status, 1);
  assert.deepEqual(tree(f.target), before);
});
test("真实入口禁止在 CLI 包内子目录初始化，不破坏受锁核心", (t) => {
  const f = fixture(t);
  put(
    f.pkg,
    "actual.mjs",
    `import {fileURLToPath} from 'node:url';import {main} from ${JSON.stringify("file://" + entry)};await main(fileURLToPath(new URL('.',import.meta.url)));`,
  );
  const target = path.join(f.pkg, "vendor/cli-core/new-project"),
    before = tree(f.pkg);
  const r = spawnSync(
    process.execPath,
    [path.join(f.pkg, "actual.mjs"), "init", "--target-dir", target, "--json"],
    { encoding: "utf8" },
  );
  assert.equal(r.status, 1);
  assert.deepEqual(tree(f.pkg), before);
});
test("update --force 不把较新 CLI 降级到 registry 的旧版本", (t) => {
  const f = fixture(t);
  const bin = path.join(f.root, "bin");
  put(
    bin,
    "npm",
    '#!/bin/sh\nif [ "$1" = "view" ]; then echo 0.0.9; else exit 77; fi\n',
  );
  fs.chmodSync(path.join(bin, "npm"), 0o755);
  const r = spawnSync(
    process.execPath,
    [path.join(f.pkg, "bin.mjs"), "update", "--force", "--json"],
    {
      env: { ...process.env, PATH: bin + path.delimiter + process.env.PATH },
      encoding: "utf8",
    },
  );
  assert.equal(r.status, 0, r.stderr);
  assert.equal(JSON.parse(r.stdout).status, "current");
});

test("技能退役清理空目录，但保留用户文件；失败后恢复技能", (t) => {
  for (const rollback of [false, true]) {
    const f = fixture(t);
    const canonical = ".agents/skills/retired/SKILL.md";
    const projection = ".codex/skills/retired/SKILL.md";
    f.bundle({[canonical]: "old", [projection]: "old"});
    assert.equal(f.run("init").status, 0);
    put(f.target, ".codex/skills/retired/user-notes.md", "keep");
    f.bundle({[canonical]: null, [projection]: null});
    const result = rollback ? injected(f,
      `const original=fs.rmdirSync;let failed=false;fs.rmdirSync=(p,...args)=>{const result=original(p,...args);if(!failed&&String(p).endsWith('/.agents/skills/retired')){failed=true;throw new Error('after prune')}return result;};`
    ) : f.run("sync", "--apply");
    assert.equal(result.status, rollback ? 1 : 0, result.stderr);
    assert.equal(fs.existsSync(path.join(f.target, ".agents/skills/retired")), rollback);
    assert.equal(fs.readFileSync(path.join(f.target, ".codex/skills/retired/user-notes.md"), "utf8"), "keep");
    assert.equal(fs.existsSync(path.join(f.target, projection)), rollback);
    if (rollback) assert.equal(fs.readFileSync(path.join(f.target, canonical), "utf8"), "old");
  }
});

test('同步与接入保留已有业务词汇表，即使模板同时更新且传入 force', t => {
  for (const side of ['backend', 'frontend']) {
    const f = fixture(t, side);
    assert.equal(f.run('init').status, 0);
    put(f.target, 'CONTEXT.md', '# 真实业务词汇\n');
    f.bundle({ 'CONTEXT.md': '# 新模板流程词汇\n', 'docs/rule.md': 'rule v2\n' });
    const before = tree(f.target);
    const preview = f.run('sync', '--dry-run');
    assert.equal(preview.status, 0, preview.stderr);
    assert.equal(preview.data.changes.find(x => x.path === 'CONTEXT.md').action, 'preserve');
    assert.deepEqual(tree(f.target), before);
    const applied = f.run('sync', '--apply', '--force');
    assert.equal(applied.status, 0, applied.stderr);
    assert.equal(fs.readFileSync(path.join(f.target, 'CONTEXT.md'), 'utf8'), '# 真实业务词汇\n');
    assert.equal(fs.readFileSync(path.join(f.target, 'docs/rule.md'), 'utf8'), 'rule v2\n');
    const attached = fixture(t, side);
    put(attached.target, 'CONTEXT.md', '# 已有项目词汇\n');
    const adopted = attached.run('attach', '--apply');
    assert.equal(adopted.status, 0, adopted.stderr);
    assert.equal(fs.readFileSync(path.join(attached.target, 'CONTEXT.md'), 'utf8'), '# 已有项目词汇\n');
  }
});

test("WAL 兼容旧 progress 恢复，忽略未完成尾部且拒绝完整损坏记录", t => {
  for (const kind of ["legacy", "torn-tail", "corrupt-record"]) {
    const f = fixture(t);
    assert.equal(f.run("init").status, 0);
    f.bundle({ "docs/new.md": "new", "docs/rule.md": "v2" });
    const r = injected(f, `const original=fs.renameSync;fs.renameSync=(a,b)=>{original(a,b);if(String(b).endsWith('/docs/new.md'))process.kill(process.pid,'SIGKILL')};`);
    assert.equal(r.signal, "SIGKILL");
    const transactions = path.join(f.target, ".yss-harness-state/backend/transactions");
    const pending = fs.readdirSync(transactions).map(name => path.join(transactions,name)).find(dir => JSON.parse(fs.readFileSync(path.join(dir,"journal.json"))).phase === "apply");
    const journalPath=path.join(pending,"journal.json"), walPath=path.join(pending,"intent.wal");
    const journal=JSON.parse(fs.readFileSync(journalPath));
    assert.equal(journal.schemaVersion, 2);
    const records=fs.readFileSync(walPath,"utf8").trim().split("\n").map(JSON.parse);
    if(kind === "legacy") {
      journal.schemaVersion=1;for(const op of journal.operations){delete op.temporaryPath;delete op.temporaryCreated;}fs.writeFileSync(journalPath,json(journal));
      fs.writeFileSync(path.join(pending,"progress.json"),json({index:records.at(-1).index,createdDirectories:records.flatMap(x=>x.createdDirectories)}));
      fs.unlinkSync(walPath);
    } else fs.appendFileSync(walPath, kind === "torn-tail" ? '{"index":' : 'broken\n');
    const recovered=f.run("sync","--apply");
    assert.equal(recovered.status,kind === "corrupt-record" ? 1 : 0,recovered.stderr);
    if(kind !== "corrupt-record") {
      assert.equal(recovered.data.status,"recovered");
      assert.equal(fs.existsSync(path.join(f.target,"docs/new.md")),false);
      assert.equal(fs.readFileSync(path.join(f.target,"docs/rule.md"),"utf8"),"rule v1\n");
    }
  }
});

test("WAL 和目标持久化阶段失败均回滚且不推进 metadata", t => {
  const hooks = [
    `const open=fs.openSync,sync=fs.fsyncSync;let wal;fs.openSync=(p,...args)=>{const fd=open(p,...args);if(String(p).endsWith('/intent.wal')&&args[0]==='a')wal=fd;return fd};let hit=false;fs.fsyncSync=fd=>{if(fd===wal&&!hit){hit=true;throw Error('wal-fsync-fault')}return sync(fd)};`,
    `const rename=fs.renameSync;let hit=false;fs.renameSync=(a,b)=>{if(!hit&&String(b).endsWith('/docs/new.md')){hit=true;throw Error('rename-fault')}return rename(a,b)};`,
    `const open=fs.openSync,sync=fs.fsyncSync;let targetFd,hit=false;fs.openSync=(p,...args)=>{const fd=open(p,...args);if(String(p).includes('/docs/new.md.')&&String(p).endsWith('.tmp'))targetFd=fd;return fd};fs.fsyncSync=fd=>{if(fd===targetFd&&!hit){hit=true;throw Error('target-fsync-fault')}return sync(fd)};`,
    `const open=fs.openSync,sync=fs.fsyncSync;let dirFd,hit=false;fs.openSync=(p,...args)=>{const fd=open(p,...args);if(String(p).endsWith('/docs')&&args[0]==='r')dirFd=fd;return fd};fs.fsyncSync=fd=>{if(fd===dirFd&&!hit){hit=true;throw Error('directory-fsync-fault')}return sync(fd)};`,
  ];
  for(const hook of hooks) {
    const f=fixture(t);assert.equal(f.run("init").status,0);
    const before=tree(f.target); delete before[".yss-harness-state"];
    f.bundle({"docs/new.md":"new","docs/rule.md":"v2"});
    const failed=injected(f,hook);
    assert.equal(failed.status,1,failed.stderr);
    const after=tree(f.target); delete after[".yss-harness-state"];
    assert.deepEqual(after,before);
    const journals=fs.readdirSync(path.join(f.target,".yss-harness-state/backend/transactions")).map(id=>JSON.parse(fs.readFileSync(path.join(f.target,".yss-harness-state/backend/transactions",id,"journal.json"))));
    assert.equal(journals.filter(j=>j.phase === "rolled-back").length,1);
    assert.equal(f.run("sync","--apply").status,0);
  }
});

test("持久化模型：目录项未落盘时恢复接受 before/after 混合状态", t => {
  const f=fixture(t);assert.equal(f.run("init").status,0);
  const old=fs.readFileSync(path.join(f.target,"docs/rule.md"));
  f.bundle({"docs/new.md":"new","docs/rule.md":"v2"});
  const r=injected(f,`const original=fs.renameSync;fs.renameSync=(a,b)=>{original(a,b);if(String(b).endsWith('/docs/rule.md'))process.kill(process.pid,'SIGKILL')};`);
  assert.equal(r.signal,"SIGKILL");
  // Model the lost unflushed renames independently; this is not a physical power cut.
  fs.writeFileSync(path.join(f.target,"docs/rule.md"),old);
  fs.unlinkSync(path.join(f.target,"docs/new.md"));
  const recovered=f.run("sync","--apply");
  assert.equal(recovered.status,0,recovered.stderr);
  assert.deepEqual(fs.readFileSync(path.join(f.target,"docs/rule.md")),old);
});

test("持久化顺序：WAL 与文件 fsync 先于 rename，目录屏障先于 metadata", t => {
  const f=fixture(t);assert.equal(f.run("init").status,0);
  f.bundle({"docs/new.md":"new","docs/rule.md":"v2"});
  const log=path.join(f.root,"durability-events.json");
  const result=injected(f,`const opened=new Map(),events=[];const open=fs.openSync,sync=fs.fsyncSync,rename=fs.renameSync;fs.openSync=(p,...args)=>{const fd=open(p,...args);opened.set(fd,String(p));return fd};fs.fsyncSync=fd=>{sync(fd);events.push(['sync',opened.get(fd)])};fs.renameSync=(a,b)=>{rename(a,b);events.push(['rename',String(a),String(b)])};process.on('exit',()=>fs.writeFileSync(${JSON.stringify(log)},JSON.stringify(events)));`);
  assert.equal(result.status,0,result.stderr);
  const events=JSON.parse(fs.readFileSync(log));
  for(const ref of ['docs/new.md','docs/rule.md',f.family.metadataFile]) {
    const position=events.findIndex(e=>e[0]==='rename'&&e[2]===path.join(f.target,ref));
    assert.ok(position>0);
    assert.ok(events.slice(0,position).some(e=>e[0]==='sync'&&e[1]===events[position][1]),'目标临时文件须先 fsync');
    assert.ok(events.slice(0,position).some(e=>e[0]==='sync'&&e[1]?.endsWith('/intent.wal')),'WAL 须先 fsync');
  }
  const metadata=events.findIndex(e=>e[0]==='rename'&&e[2]===path.join(f.target,f.family.metadataFile));
  const child=events.findLastIndex((e,i)=>i<metadata&&e[0]==='sync'&&e[1]===path.join(f.target,'docs'));
  const parent=events.findLastIndex((e,i)=>i<metadata&&e[0]==='sync'&&e[1]===f.target);
  assert.ok(child>=0&&parent>child,'子目录持久化先于父目录和 metadata');
});

test("初始化先持久化新目标的父目录；父目录刷盘失败不写入业务文件", t => {
  for (const fail of [false, true]) {
    const f = fixture(t), log = path.join(f.root, "target-parent-events.json");
    const result = injected(f, `const opened=new Map(),events=[];let failed=false;const open=fs.openSync,sync=fs.fsyncSync,rename=fs.renameSync;fs.openSync=(p,...args)=>{const fd=open(p,...args);opened.set(fd,String(p));return fd};fs.fsyncSync=fd=>{const p=opened.get(fd);if(${fail}&&!failed&&p===${JSON.stringify(f.root)}){failed=true;throw Error('new-target-parent-fsync')};sync(fd);events.push(['sync',p])};fs.renameSync=(a,b)=>{rename(a,b);events.push(['rename',String(b)])};process.on('exit',()=>fs.writeFileSync(${JSON.stringify(log)},JSON.stringify(events)));`, "init");
    assert.equal(result.status, fail ? 1 : 0, result.stderr);
    const events = JSON.parse(fs.readFileSync(log));
    const firstWrite = events.findIndex(e => e[0] === "rename" && e[1] === path.join(f.target, "AGENTS.md"));
    if (fail) {
      assert.equal(firstWrite, -1);
      assert.equal(fs.existsSync(path.join(f.target, f.family.metadataFile)), false);
    } else {
      const parentSync = events.findIndex(e => e[0] === "sync" && e[1] === f.root);
      assert.ok(parentSync >= 0 && firstWrite > parentSync);
    }
  }
});

test("持久化边界矩阵：异常与进程中断都保留可证明的恢复状态", async t => {
  for (const boundary of ["backup", "wal-write", "wal-fsync", "target-fsync", "rename", "directory", "commit"]) {
    for (const fault of ["throw", "kill"]) await t.test(`${boundary}/${fault}`, () => {
      const f = fixture(t); assert.equal(f.run("init").status, 0);
      const before = tree(f.target); delete before[".yss-harness-state"];
      f.bundle({ "docs/new/nested.md": "new", "docs/rule.md": "v2" });
      const result = injected(f, `const opened=new Map();let fired=false;const hit=label=>{if(!fired&&label===${JSON.stringify(boundary)}){fired=true;${fault === "kill" ? "process.kill(process.pid,'SIGKILL')" : "throw Error('boundary-fault')"}}};const open=fs.openSync,write=fs.writeFileSync,sync=fs.fsyncSync,rename=fs.renameSync;fs.openSync=(p,...args)=>{const fd=open(p,...args);opened.set(fd,String(p));return fd};fs.writeFileSync=(fd,...args)=>{const r=write(fd,...args);if(opened.get(fd)?.endsWith('/intent.wal')&&String(args[0]).includes('index'))hit('wal-write');return r};fs.fsyncSync=fd=>{sync(fd);const p=opened.get(fd)||'';if(p.endsWith('/intent.wal'))hit('wal-fsync');if(p.includes('/docs/new/nested.md.')&&p.endsWith('.tmp'))hit('target-fsync');if(p===${JSON.stringify(path.join(f.target, "docs"))})hit('directory')};fs.renameSync=(a,b)=>{rename(a,b);b=String(b);if(b.includes('/backup/'))hit('backup');if(b.endsWith('/docs/new/nested.md'))hit('rename');if(b.endsWith('/journal.json')&&JSON.parse(fs.readFileSync(b)).phase==='committed')hit('commit')};`);
      if (fault === "kill") {
        assert.equal(result.signal, "SIGKILL", result.stderr);
        const recovered = f.run("sync", "--apply"); assert.equal(recovered.status, 0, recovered.stderr);
        if (boundary === "commit") {
          assert.equal(fs.readFileSync(path.join(f.target, "docs/rule.md"), "utf8"), "v2");
          return;
        }
        assert.equal(recovered.data.status, "recovered");
      } else assert.equal(result.status, 1, result.stderr);
      const after = tree(f.target); delete after[".yss-harness-state"];
      assert.deepEqual(after, before);
    });
  }
});

test("临时文件被用户修改或在独占创建前抢占时保留恢复清单", t => {
  for (const kind of ["after-kill", "open-race"]) {
    const f = fixture(t); assert.equal(f.run("init").status, 0);
    f.bundle({ "docs/new.md": "new" });
    const hook = kind === "after-kill"
      ? `const opened=new Map(),open=fs.openSync,sync=fs.fsyncSync;fs.openSync=(p,...args)=>{const fd=open(p,...args);opened.set(fd,String(p));return fd};fs.fsyncSync=fd=>{sync(fd);const p=opened.get(fd)||'';if(p.includes('/docs/new.md.')&&p.endsWith('.tmp'))process.kill(process.pid,'SIGKILL')};`
      : `const open=fs.openSync;let hit=false;fs.openSync=(p,...args)=>{if(!hit&&String(p).includes('/docs/new.md.')&&args[0]==='wx'){hit=true;fs.writeFileSync(p,'user edit')}return open(p,...args)};`;
    const failed = injected(f, hook);
    assert.equal(kind === "after-kill" ? failed.signal : JSON.parse(failed.stdout).code, kind === "after-kill" ? "SIGKILL" : "RECOVERY_FAILED", failed.stderr);
    const transactions = path.join(f.target, ".yss-harness-state/backend/transactions");
    const journal = fs.readdirSync(transactions).map(id => JSON.parse(fs.readFileSync(path.join(transactions, id, "journal.json")))).find(j => !["committed", "rolled-back"].includes(j.phase));
    const temp = path.join(f.target, journal.operations.find(op => op.path === "docs/new.md").temporaryPath);
    if (kind === "after-kill") fs.writeFileSync(temp, "user edit");
    const before = tree(f.target), recovered = f.run("sync", "--apply");
    assert.equal(recovered.status, 1); assert.equal(recovered.data.code, "RECOVERY_FAILED");
    assert.deepEqual(tree(f.target), before);
    assert.equal(fs.readFileSync(temp, "utf8"), "user edit");
  }
});
