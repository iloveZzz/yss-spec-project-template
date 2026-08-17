import { build, version as esbuildVersion } from "esbuild";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import YAML from "yaml";

const toolingRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repositoryRoot = path.resolve(toolingRoot, "../../..");
const vendorRoot = path.join(repositoryRoot, "scripts/vendor");
const outputs = ["yaml.mjs", "xml.mjs"];
const EXPECTED_RUNTIME_PACKAGES = [
  "@nodable/entities", "anynum", "fast-xml-builder", "fast-xml-parser", "is-unsafe",
  "path-expression-matcher", "strnum", "xml-naming", "yaml"
];
const lockPath = path.join(toolingRoot, "pnpm-lock.yaml");
const checkOnly = process.argv.includes("--check");

function sha256(content) {
  return createHash("sha256").update(content).digest("hex");
}

async function dependencyIntegrity(lock, packageName, version) {
  const entry = lock.packages?.[`${packageName}@${version}`];
  if (!entry?.resolution?.integrity) {
    throw new Error(`pnpm lock 缺少 ${packageName}@${version} 的 integrity`);
  }
  return entry.resolution.integrity;
}

async function runtimeDependencies(meta, lock) {
  const packages = new Map();
  for (const source of Object.keys(meta.inputs)) {
    const match = source.replaceAll(path.sep, "/").match(/^node_modules\/\.pnpm\/([^/]+)\/node_modules\/((?:@[^/]+\/)?[^/]+)\//);
    if (!match) continue;
    const packageRoot = path.join(toolingRoot, "node_modules/.pnpm", match[1], "node_modules", match[2]);
    const packageJson = JSON.parse(await readFile(path.join(packageRoot, "package.json"), "utf8"));
    packages.set(packageJson.name, {
      name: packageJson.name,
      version: packageJson.version,
      license: packageJson.license ?? "UNKNOWN",
      source: typeof packageJson.repository === "string" ? packageJson.repository : packageJson.repository?.url ?? packageJson.homepage ?? `https://www.npmjs.com/package/${packageJson.name}/v/${packageJson.version}`,
      integrity: await dependencyIntegrity(lock, packageJson.name, packageJson.version)
    });
  }
  const dependencies = [...packages.values()].sort((left, right) => left.name.localeCompare(right.name));
  const actual = dependencies.map((dependency) => dependency.name);
  if (JSON.stringify(actual) !== JSON.stringify(EXPECTED_RUNTIME_PACKAGES)) {
    throw new Error(`vendor 运行时依赖闭包漂移: ${actual.join(", ")}`);
  }
  return dependencies;
}

function normalizedMetafile(meta, outdir) {
  return {
    inputs: Object.entries(meta.inputs)
      .map(([source, detail]) => ({
        source: path.relative(toolingRoot, path.resolve(toolingRoot, source)).replaceAll(path.sep, "/"),
        bytes: detail.bytes
      }))
      .sort((a, b) => a.source.localeCompare(b.source)),
    outputs: Object.entries(meta.outputs)
      .map(([output, detail]) => ({
        output: path.relative(outdir, path.resolve(toolingRoot, output)).replaceAll(path.sep, "/"),
        bytes: detail.bytes,
        entryPoint: detail.entryPoint
          ? path.relative(toolingRoot, path.resolve(toolingRoot, detail.entryPoint)).replaceAll(path.sep, "/")
          : null
      }))
      .sort((a, b) => a.output.localeCompare(b.output))
  };
}

async function buildInto(outdir) {
  const result = await build({
    absWorkingDir: toolingRoot,
    bundle: true,
    entryPoints: {
      yaml: "vendor-entry-yaml.mjs",
      xml: "vendor-entry-xml.mjs"
    },
    format: "esm",
    legalComments: "none",
    metafile: true,
    minify: false,
    outExtension: { ".js": ".mjs" },
    outdir,
    platform: "node",
    sourcemap: false,
    target: "node22",
    treeShaking: true
  });
  return result.metafile;
}

async function manifestFor(outdir, meta) {
  const lock = YAML.parse(await readFile(lockPath, "utf8"));
  const dependencies = await runtimeDependencies(meta, lock);
  const outputEntries = await Promise.all(outputs.map(async (name) => {
    const content = await readFile(path.join(outdir, name));
    return { name, bytes: content.length, sha256: sha256(content) };
  }));
  return {
    schema_version: 2,
    build: {
      esbuild: { version: esbuildVersion, integrity: await dependencyIntegrity(lock, "esbuild", "0.28.2") },
      format: "esm",
      platform: "node",
      target: "node22",
      minify: false,
      sourcemap: false
    },
    dependencies,
    metafile: normalizedMetafile(meta, outdir),
    outputs: outputEntries
  };
}

function notices(manifest) {
  const sources = manifest.dependencies.map((dependency) =>
    `- ${dependency.name}@${dependency.version}\n  - license: ${dependency.license}\n  - integrity: ${dependency.integrity}\n  - source: ${dependency.source}`
  );
  const outputs = manifest.outputs.map((output) => `- ${output.name}: sha256:${output.sha256}`).join("\n");
  return `# Node vendor notices\n\nThese generated Node runtime bundles contain the following packages:\n\n${sources.join("\n")}\n\n## Bundle SHA-256\n\n${outputs}\n`;
}

async function bytesEqual(left, right) {
  return (await readFile(left)).equals(await readFile(right));
}

async function main() {
  const temporaryRoot = await mkdtemp(path.join(tmpdir(), "yss-vendor-"));
  try {
    const meta = await buildInto(temporaryRoot);
    const manifest = await manifestFor(temporaryRoot, meta);
    await writeFile(path.join(temporaryRoot, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
    await writeFile(path.join(temporaryRoot, "NOTICES.md"), notices(manifest));
    if (checkOnly) {
      for (const name of [...outputs, "manifest.json", "NOTICES.md"]) {
        const target = path.join(vendorRoot, name);
        if (!(await bytesEqual(path.join(temporaryRoot, name), target))) {
          throw new Error(`vendor 产物漂移: scripts/vendor/${name}; 请在维护侧执行 pnpm --dir .template-source/tooling/node build:vendor`);
        }
      }
      return;
    }
    await mkdir(vendorRoot, { recursive: true });
    for (const name of [...outputs, "manifest.json", "NOTICES.md"]) {
      await writeFile(path.join(vendorRoot, name), await readFile(path.join(temporaryRoot, name)));
    }
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
}

main().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
});
