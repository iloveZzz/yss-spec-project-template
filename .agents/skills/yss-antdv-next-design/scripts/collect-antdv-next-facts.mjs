#!/usr/bin/env node
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateFactPack } from "./validate-fact-pack.mjs";

const EXACT_SEMVER = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;
const DEFAULT_COMPONENTS = ["Button", "Form", "Table", "Modal", "Select", "DatePicker"];

function fail(message) {
  throw new TypeError(message);
}

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function parseArguments(argv) {
  const values = { components: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    if (!["--project-root", "--output", "--library-version", "--cli-version", "--component", "--profile"].includes(key)) fail(`未知参数: ${key}`);
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) fail(`${key} 缺少值`);
    index += 1;
    if (key === "--component") values.components.push(value);
    else values[key.slice(2).replaceAll("-", "_")] = value;
  }
  values.project_root ??= ".";
  values.profile ??= "selected-components";
  if (!values.output || !values.library_version || !values.cli_version) fail("必须提供 --output、--library-version 和 --cli-version");
  if (!EXACT_SEMVER.test(values.library_version) || !EXACT_SEMVER.test(values.cli_version)) fail("library/cli version 必须是精确 semver");
  if (!["selected-components", "p0-reference"].includes(values.profile)) fail("--profile 仅支持 selected-components 或 p0-reference");
  if (values.components.length === 0) values.components = [...DEFAULT_COMPONENTS];
  if (new Set(values.components).size !== values.components.length || values.components.some((item) => !/^[A-Z][A-Za-z0-9]*$/.test(item))) fail("--component 必须是不重复的 PascalCase 组件名");
  if (values.profile === "p0-reference" && JSON.stringify([...values.components].sort()) !== JSON.stringify([...DEFAULT_COMPONENTS].sort())) {
    fail(`p0-reference 必须覆盖 ${DEFAULT_COMPONENTS.join(", ")}`);
  }
  return values;
}

function run(file, args, { json = false, cwd } = {}) {
  let output;
  try {
    output = execFileSync(file, args, {
      cwd,
      encoding: "utf8",
      env: { ...process.env, ANTDV_NO_AUTO_REPORT: "1", NO_COLOR: "1" },
      maxBuffer: 32 * 1024 * 1024,
      stdio: ["ignore", "pipe", "pipe"]
    });
  } catch (error) {
    const detail = error.stderr?.toString().trim() || error.message;
    fail(`${file} ${args.join(" ")} 失败: ${detail}`);
  }
  if (!json) return output;
  try {
    return JSON.parse(output);
  } catch {
    fail(`${file} ${args.join(" ")} 未返回有效 JSON`);
  }
}

function npmMetadata(packageName, version, cwd) {
  const value = run("npm", ["view", `${packageName}@${version}`, "version", "dist.integrity", "dist.tarball", "--json"], { json: true, cwd });
  if (value.version !== version || typeof value["dist.integrity"] !== "string" || typeof value["dist.tarball"] !== "string") {
    fail(`${packageName}@${version} npm metadata 不完整`);
  }
  return { version, integrity: value["dist.integrity"], tarball: value["dist.tarball"] };
}

function npmDistTags(packageName, cwd) {
  return run("npm", ["view", packageName, "dist-tags", "--json"], { json: true, cwd });
}

function writeJson(root, ref, value) {
  const target = path.join(root, ref);
  mkdirSync(path.dirname(target), { recursive: true });
  const content = `${JSON.stringify(value, null, 2)}\n`;
  writeFileSync(target, content);
  return { ref: ref.split(path.sep).join("/"), sha256: sha256(Buffer.from(content)) };
}

function writeText(root, ref, value) {
  const target = path.join(root, ref);
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, value);
  return { ref: ref.split(path.sep).join("/"), sha256: sha256(Buffer.from(value)) };
}

function projectRelative(projectRoot, target, label) {
  const relative = path.relative(projectRoot, target);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) fail(`${label} 必须位于项目根内`);
  return relative.split(path.sep).join("/");
}

export function collectFactPack(argv = process.argv.slice(2)) {
  const options = parseArguments(argv);
  const projectRoot = path.resolve(options.project_root);
  const output = path.resolve(projectRoot, options.output);
  if (!existsSync(path.join(projectRoot, "yss-project.yaml"))) fail("--project-root 缺少 yss-project.yaml");
  const outputRef = projectRelative(projectRoot, output, "--output");
  const expectedOutput = options.profile === "p0-reference"
    ? `.template-source/evidence/maintenance/antdv-next-p0-facts/${options.library_version}`
    : `docs/design/facts/antdv-next/${options.library_version}`;
  if (outputRef !== expectedOutput) fail(`--output 必须为 ${expectedOutput}`);
  if (existsSync(output)) fail(`拒绝覆盖已有 fact pack: ${output}`);
  const canonicalDesignPath = path.join(projectRoot, "DESIGN.md");
  const designPath = path.join(projectRoot, "docs/design/design.md");
  const tokenPath = path.join(projectRoot, "docs/design/tokens/theme.json");
  for (const required of [canonicalDesignPath, designPath, tokenPath]) if (!existsSync(required)) fail(`缺少项目基线: ${required}`);

  const outputParent = path.dirname(output);
  mkdirSync(outputParent, { recursive: true });
  const staging = mkdtempSync(path.join(outputParent, ".antdv-next-facts-"));
  const cliSpec = `@antdv-next/cli@${options.cli_version}`;
  const cli = (...args) => run("npx", ["-y", cliSpec, ...args], { json: true, cwd: projectRoot });
  try {
    const libraryMetadata = npmMetadata("antdv-next", options.library_version, projectRoot);
    const cliMetadata = npmMetadata("@antdv-next/cli", options.cli_version, projectRoot);
    const help = run("npx", ["-y", cliSpec, "--help"], { cwd: projectRoot });
    if (!help.includes(`@antdv-next/cli v${options.cli_version}`)) fail("CLI help banner 与请求版本不一致");
    const helpArtifact = writeText(staging, "cli-help.txt", help);

    const probeValue = cli("changelog", options.library_version, options.library_version, "--format", "json");
    const probeArtifact = writeJson(staging, "resolution-probe.json", probeValue);
    if (probeValue.from !== options.library_version || probeValue.to !== options.library_version) {
      fail(`exact-version probe 失败: requested=${options.library_version}, resolved=${probeValue.from}->${probeValue.to}`);
    }

    const listArtifact = writeJson(staging, "component-list.json", cli("list", "--ver", options.library_version, "--format", "json"));
    const designValue = cli("design.md", "--ver", options.library_version, "--format", "json");
    const designArtifact = writeJson(staging, "design-md.json", designValue);
    const designVersion = typeof designValue.doc === "string" ? designValue.doc.match(/^version:\s*(\S+)$/m)?.[1] : null;
    if (designVersion !== "alpha") fail("design.md 未声明预期的 alpha 版本");

    const components = options.components.map((name) => ({
      name,
      info: writeJson(staging, `components/${name}/info.json`, cli("info", name, "--ver", options.library_version, "--format", "json")),
      demo: writeJson(staging, `components/${name}/demo-basic.json`, cli("demo", name, "basic", "--ver", options.library_version, "--format", "json")),
      token: writeJson(staging, `components/${name}/token.json`, cli("token", name, "--ver", options.library_version, "--format", "json")),
      semantic: writeJson(staging, `components/${name}/semantic.json`, cli("semantic", name, "--ver", options.library_version, "--format", "json"))
    }));

    const manifest = {
      schema_version: 1,
      provider_id: "vue-antdv-next",
      maturity: "supported",
      collection_profile: options.profile,
      generated_at: new Date().toISOString(),
      library: {
        package: "antdv-next",
        requested_version: options.library_version,
        resolved_snapshot_version: probeValue.to,
        integrity: libraryMetadata.integrity,
        tarball: libraryMetadata.tarball,
        observed_dist_tags: npmDistTags("antdv-next", projectRoot)
      },
      cli: {
        package: "@antdv-next/cli",
        version: options.cli_version,
        integrity: cliMetadata.integrity,
        tarball: cliMetadata.tarball,
        observed_dist_tags: npmDistTags("@antdv-next/cli", projectRoot),
        invocation: ["npx", "-y", cliSpec],
        help_ref: helpArtifact.ref,
        help_sha256: helpArtifact.sha256
      },
      resolution_probe: {
        command: ["changelog", options.library_version, options.library_version, "--format", "json"],
        from: probeValue.from,
        to: probeValue.to,
        exact_match: true,
        output: probeArtifact
      },
      component_list: listArtifact,
      design_baseline: {
        version_scope: "static-alpha-not-exact",
        declared_version: designVersion,
        output: designArtifact
      },
      project_baseline: {
        override_precedence: "project-first",
        canonical_design: { ref: projectRelative(projectRoot, canonicalDesignPath, "canonical design baseline"), sha256: sha256(readFileSync(canonicalDesignPath)) },
        design: { ref: projectRelative(projectRoot, designPath, "design baseline"), sha256: sha256(readFileSync(designPath)) },
        tokens: { ref: projectRelative(projectRoot, tokenPath, "token baseline"), sha256: sha256(readFileSync(tokenPath)) },
        override_reviewed: false
      },
      components
    };
    writeJson(staging, "manifest.json", manifest);
    const result = validateFactPack(path.join(staging, "manifest.json"));
    renameSync(staging, output);
    return { output, ...result };
  } catch (error) {
    if (existsSync(staging)) rmSync(staging, { recursive: true, force: true });
    throw error;
  }
}

async function main() {
  const result = collectFactPack();
  process.stdout.write(`Collected Antdv Next fact pack: ${result.output} (${result.components} components)\n`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  });
}
