#!/usr/bin/env node
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateFactPack } from "../scripts/validate-fact-pack.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SKILL_ROOT = path.resolve(HERE, "..");
const COMPONENTS = ["Button", "Form", "Table", "Modal", "Select", "DatePicker"];

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function writeJson(root, ref, value) {
  const target = path.join(root, ref);
  mkdirSync(path.dirname(target), { recursive: true });
  const content = `${JSON.stringify(value, null, 2)}\n`;
  writeFileSync(target, content);
  return { ref, sha256: sha256(content) };
}

function fixture() {
  const projectRoot = mkdtempSync(path.join(os.tmpdir(), "yss-antdv-next-provider-"));
  writeFileSync(path.join(projectRoot, "yss-project.yaml"), "schema_version: 1\nrepository_mode: template-source\n");
  mkdirSync(path.join(projectRoot, "docs/design/tokens"), { recursive: true });
  writeFileSync(path.join(projectRoot, "DESIGN.md"), "---\nversion: alpha\n---\n");
  writeFileSync(path.join(projectRoot, "docs/design/design.md"), "# Design\n");
  writeFileSync(path.join(projectRoot, "docs/design/tokens/theme.json"), "{}\n");
  const packRoot = path.join(projectRoot, ".template-source/evidence/maintenance/antdv-next-p0-facts/1.5.2");
  mkdirSync(packRoot, { recursive: true });
  const help = "@antdv-next/cli v0.0.0-beta.5\n";
  writeFileSync(path.join(packRoot, "cli-help.txt"), help);
  const probe = writeJson(packRoot, "resolution-probe.json", { from: "1.5.2", to: "1.5.2", diffs: [] });
  const design = writeJson(packRoot, "design-md.json", { doc: "---\nversion: alpha\nname: Antdv Next\n---\n" });
  const componentList = writeJson(packRoot, "component-list.json", COMPONENTS.map((name) => ({ name })));
  const components = COMPONENTS.map((name) => ({
    name,
    info: writeJson(packRoot, `components/${name}/info.json`, { name, props: [] }),
    demo: writeJson(packRoot, `components/${name}/demo-basic.json`, { component: name, name: "basic", code: "<template><div /></template>" }),
    token: writeJson(packRoot, `components/${name}/token.json`, { token: [] }),
    semantic: writeJson(packRoot, `components/${name}/semantic.json`, { name, semanticStructure: [] })
  }));
  const manifest = {
    schema_version: 1,
    provider_id: "vue-antdv-next",
    maturity: "supported",
    collection_profile: "p0-reference",
    library: {
      package: "antdv-next",
      requested_version: "1.5.2",
      resolved_snapshot_version: "1.5.2",
      integrity: "sha512-library",
      tarball: "https://registry.example/antdv-next.tgz"
    },
    cli: {
      package: "@antdv-next/cli",
      version: "0.0.0-beta.5",
      integrity: "sha512-cli",
      tarball: "https://registry.example/cli.tgz",
      help_ref: "cli-help.txt",
      help_sha256: sha256(help)
    },
    resolution_probe: { exact_match: true, from: "1.5.2", to: "1.5.2", output: probe },
    component_list: componentList,
    design_baseline: { version_scope: "static-alpha-not-exact", output: design },
    project_baseline: {
      override_precedence: "project-first",
      canonical_design: { ref: "DESIGN.md", sha256: sha256("---\nversion: alpha\n---\n") },
      design: { ref: "docs/design/design.md", sha256: sha256("# Design\n") },
      tokens: { ref: "docs/design/tokens/theme.json", sha256: sha256("{}\n") },
      override_reviewed: false
    },
    components
  };
  writeFileSync(path.join(packRoot, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  return { projectRoot, packRoot, manifest };
}

function expectFailure(change, pattern) {
  const data = fixture();
  try {
    change(data);
    writeFileSync(path.join(data.packRoot, "manifest.json"), `${JSON.stringify(data.manifest, null, 2)}\n`);
    assert.throws(() => validateFactPack(path.join(data.packRoot, "manifest.json")), pattern);
  } finally {
    rmSync(data.projectRoot, { recursive: true, force: true });
  }
}

const skill = readFileSync(path.join(SKILL_ROOT, "SKILL.md"), "utf8");
assert.match(skill, /^---\nname: yss-antdv-next-design\ndescription: .+\n---/);
for (const marker of ["默认组件事实 Provider", "yss-prototype-stage", "yss-ui", "禁止 `antdv setup`", "npx skills add antdv-next/cli"]) assert.ok(skill.includes(marker), `SKILL.md 缺少 ${marker}`);

const valid = fixture();
try {
  const result = validateFactPack(path.join(valid.packRoot, "manifest.json"));
  assert.deepEqual(result, { provider_id: "vue-antdv-next", library_version: "1.5.2", cli_version: "0.0.0-beta.5", components: 6, profile: "p0-reference" });
} finally {
  rmSync(valid.projectRoot, { recursive: true, force: true });
}

expectFailure(({ packRoot }) => {
  const output = `${JSON.stringify({ from: "1.5.2", to: "1.5.1", diffs: [] }, null, 2)}\n`;
  writeFileSync(path.join(packRoot, "resolution-probe.json"), output);
}, /digest 不匹配/);

expectFailure(({ packRoot, manifest }) => {
  const output = `${JSON.stringify({ from: "1.5.1", to: "1.5.1", diffs: [] }, null, 2)}\n`;
  writeFileSync(path.join(packRoot, "resolution-probe.json"), output);
  manifest.resolution_probe.from = "1.5.1";
  manifest.resolution_probe.to = "1.5.1";
  manifest.resolution_probe.output.sha256 = sha256(output);
}, /resolution probe 发生版本回退/);

expectFailure(({ manifest }) => {
  manifest.library.resolved_snapshot_version = "1.5.1";
}, /resolved snapshot/);

expectFailure(({ manifest }) => {
  manifest.components.pop();
}, /p0-reference 必须恰好覆盖/);

expectFailure(({ manifest }) => {
  manifest.components[0].info.ref = "../../../../../../outside.json";
}, /路径越界/);

expectFailure(({ manifest }) => {
  delete manifest.project_baseline.canonical_design;
}, /canonical_design/);

expectFailure(({ projectRoot }) => {
  writeFileSync(path.join(projectRoot, "DESIGN.md"), "---\nversion: changed\n---\n");
}, /canonical_design digest 不匹配/);

process.stdout.write("yss-antdv-next-design scenarios passed\n");
