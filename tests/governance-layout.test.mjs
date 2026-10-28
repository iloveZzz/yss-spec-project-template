import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { chmodSync, existsSync, lstatSync, mkdtempSync, mkdirSync, readFileSync, rmSync, symlinkSync, unlinkSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { retainedTemplateSourceReferences, verifyGovernanceLayout } from "../scripts/lib/governance-layout.mjs";
import { createHash } from "node:crypto";

test("当前模板 AGENTS 必须有完整标记，历史兼容不能掩盖来源丢失", t => {
  const root = mkdtempSync(path.join(os.tmpdir(), "agents-layout-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  execFileSync("git", ["init", "-q", root]);
  writeFileSync(path.join(root, "yss-project.yaml"), "schema_version: 1\nrepository_mode: template-source\n");
  for (const ref of [".template-spec/agents/yss-skill-registry.yaml", ".template-spec/agents/digital-human-roles.yaml", ".template-spec/agents/issue-tracker.md", ".template-spec/process/lifecycle-registry.yaml", ".template-spec/process/lifecycle-artifact-map.md", ".template-source/process/maintenance-intensity.yaml", ".template-source/process/template-verification-profiles.yaml", ".template-source/agents/skills-maintenance.md"]) {
    mkdirSync(path.dirname(path.join(root, ref)), { recursive: true });
    writeFileSync(path.join(root, ref), "fixture\n");
  }
  const start = "<!-- YSS_TEMPLATE_SOURCE_ONLY_START -->", end = "<!-- YSS_TEMPLATE_SOURCE_ONLY_END -->";
  for (const invalid of ["## 模板源维护\n旧来源", start, end, end + start, start + start + end, start + end + end]) {
    writeFileSync(path.join(root, "AGENTS.md"), invalid);
    assert.throws(() => verifyGovernanceLayout(root, "template-source"), /AGENTS_SOURCE_ONLY_MARKERS/);
  }
  writeFileSync(path.join(root, "AGENTS.md"), `${start}\n任意标题\n${end}\n产品规则`);
  assert.equal(verifyGovernanceLayout(root, "template-source").mode, "template-source");
  const child = path.join(root, "profiles/backend/AGENTS.md");
  mkdirSync(path.dirname(child), { recursive: true });
  writeFileSync(child, "没有标记");
  assert.throws(() => verifyGovernanceLayout(root, "template-source"), /profiles\/backend\/AGENTS\.md/);
});

test("迁移项目仅保留已声明且未修改的受管模板参考，拒绝其他源文件", t => {
  const root = mkdtempSync(path.join(os.tmpdir(), "project-layout-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  writeFileSync(path.join(root, "yss-project.yaml"), "schema_version: 2\nrepository_mode: project-instance\n");
  for (const ref of [".template-spec/agents/yss-skill-registry.yaml", ".template-spec/agents/issue-tracker.md", ".template-spec/process/lifecycle-registry.yaml", ".template-spec/process/lifecycle-artifact-map.md"]) {
    mkdirSync(path.dirname(path.join(root, ref)), { recursive: true });
    writeFileSync(path.join(root, ref), "fixture\n");
  }
  const ref = ".template-source/process/MATT-POCOCK-ENGINEERING-SKILLS.md";
  mkdirSync(path.dirname(path.join(root, ref)), { recursive: true });
  writeFileSync(path.join(root, ref), "reference\n", {mode: 0o644});
  chmodSync(path.join(root, ref), 0o644);
  const descriptor = {type: "file", digest: createHash("sha256").update("reference\n").digest("hex"), mode: 0o644};
  const source = {templateCommit: 'a'.repeat(40), snapshotHash: 'b'.repeat(64), bundleHash: 'c'.repeat(64)};
  const managed = {baseline: descriptor, lastApplied: descriptor, ownership: "managed", baselineSource: {kind: "bundle", ...source, path: ref, variant: "initial", templateDigest: descriptor.digest}};
  const metadata = {schemaVersion: 5, protocolVersion: 1, profile: "spec", profileId: "harness.spec-template", templateSourceState: "committed", cliSourceState: "unknown", bundleSchemaVersion: 5, manifestHash: 'd'.repeat(64), ...source, variables: {}, distribution: {installation: "governed", retainedTemplateSourceReferences: [ref]}, managedFiles: {[ref]: managed}};
  const save = () => {
    metadata.baselineDigest = createHash('sha256').update(JSON.stringify(metadata.managedFiles)).digest('hex');
    writeFileSync(path.join(root, ".yss.json"), JSON.stringify(metadata));
  };
  save();
  assert.equal(verifyGovernanceLayout(root, "project-instance").mode, "project-instance");
  metadata.baselineDigest = '0'.repeat(64);
  writeFileSync(path.join(root, ".yss.json"), JSON.stringify(metadata));
  assert.throws(() => verifyGovernanceLayout(root, "project-instance"), /受管基线摘要/);
  save();
  metadata.managedFiles[ref].baselineSource.bundleHash = 'd'.repeat(64);
  save();
  assert.throws(() => verifyGovernanceLayout(root, "project-instance"), /参考|受管/);
  metadata.managedFiles[ref].baselineSource.bundleHash = source.bundleHash;
  save();
  writeFileSync(path.join(root, ref), "edited\n");
  assert.throws(() => verifyGovernanceLayout(root, "project-instance"), /参考|摘要|受管/);
  writeFileSync(path.join(root, ref), "reference\n");
  metadata.distribution.retainedTemplateSourceReferences = [];
  save();
  assert.throws(() => verifyGovernanceLayout(root, "project-instance"), /参考|受管|template-source/);
  metadata.distribution.retainedTemplateSourceReferences = [ref];
  save();
  const extra = path.join(root, ".template-source/process/extra.txt");
  writeFileSync(extra, "unmanaged\n");
  assert.throws(() => verifyGovernanceLayout(root, "project-instance"), /参考|受管/);
  unlinkSync(extra);
  unlinkSync(path.join(root, ref));
  symlinkSync("/dev/null", path.join(root, ref));
  assert.throws(() => verifyGovernanceLayout(root, "project-instance"), /参考|受管/);
});

test("模板源参考白名单与两个 Profile 的实际 skills 声明一致", () => {
  const root = path.resolve(import.meta.dirname, "..");
  for (const [profile, policyRef] of Object.entries({spec: ".template-source/distribution/bundle-profile.json", backend: "profiles/backend/.template-source/distribution/bundle-profile.json"})) {
    const policy = JSON.parse(readFileSync(path.join(root, policyRef), "utf8"));
    const cfg = policy.installations.skills;
    const referenced = skill => [...(cfg.skillReferences[skill] ?? []), ...(cfg.skillReferenceGroups[skill] ?? []).flatMap(group => cfg.referenceGroups[group] ?? [])];
    const skills = new Set([...Object.keys(cfg.skillReferences), ...Object.keys(cfg.skillReferenceGroups)]);
    const actual = [...new Set([...skills].flatMap(referenced).filter(ref => ref.startsWith(".template-source/")))].sort();
    assert.deepEqual(actual, retainedTemplateSourceReferences[profile]);
    for (const ref of actual) assert.ok(policy.manifest.allowFiles.includes(ref), `${profile}: ${ref} 未固定收录`);
    if (profile === 'spec') {
      const rules = policy.manifest.ownershipPolicy.rules;
      const protectedIndex = rules.findIndex(rule => rule.pattern === '.template-source/**' && rule.ownership === 'protected');
      assert.ok(protectedIndex >= 0, '未声明的模板源继续受保护');
      for (const ref of actual) assert.ok(rules.findIndex(rule => rule.pattern === ref && rule.ownership === 'managed') < protectedIndex && rules.some(rule => rule.pattern === ref && rule.ownership === 'managed'), `${ref} 必须先声明为受管参考`);
    }
    for (const skill of skills) {
      const refs = referenced(skill);
      assert.equal(new Set(refs).size, refs.length, `${profile}/${skill} 存在重复参考`);
      for (const ref of refs) {
        assert.ok(/^(\.template-source\/|\.template-spec\/|scripts\/)/.test(ref) && !ref.split('/').includes('..'), `${profile}/${skill} 非法参考 ${ref}`);
        const overlay = path.join(root, 'profiles/backend', ref);
        const source = profile === 'backend' && existsSync(overlay) ? overlay : path.join(root, ref);
        assert.ok(lstatSync(source).isFile() && !lstatSync(source).isSymbolicLink(), `${profile}/${skill} 参考须为存在的普通文件: ${ref}`);
      }
      if (refs.includes('.template-spec/process/orchestration-contract.yaml')) {
        const overlay = path.join(root, 'profiles/backend/.template-spec/process/orchestration-contract.yaml');
        const contract = readFileSync(profile === 'backend' ? overlay : path.join(root, '.template-spec/process/orchestration-contract.yaml'), 'utf8');
        const parts = [...contract.matchAll(/^\s+-\s+(orchestration\/[^\s]+\.yaml)\s*$/gm)].map(match => `.template-spec/process/${match[1]}`);
        assert.ok(parts.length > 0);
        for (const ref of parts) assert.ok(refs.includes(ref), `${profile}/${skill} 缺少合同分片 ${ref}`);
      }
    }
  }
});
