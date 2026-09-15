import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile, readdir, lstat } from "node:fs/promises";
import path from "node:path";

const manifestName = "yss-prototype-adapter.json";
const sha = (bytes) => `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
const assetRoot = new URL("../assets/offline-html/", import.meta.url);

async function inventory(root, relative = "") {
  const result = {};
  if ((await lstat(path.join(root, relative))).isSymbolicLink()) throw new Error(`原型资源不允许符号链接: ${relative || "."}`);
  for (const entry of await readdir(path.join(root, relative), { withFileTypes: true })) {
    const name = path.posix.join(relative, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`原型资源不允许符号链接: ${name}`);
    if (entry.isDirectory()) Object.assign(result, await inventory(root, name));
    else if (!entry.isFile()) throw new Error(`原型资源不是普通文件: ${name}`);
    else if (name !== manifestName) result[name] = sha(await readFile(path.join(root, name)));
  }
  return Object.fromEntries(Object.entries(result).sort(([a], [b]) => a.localeCompare(b, "en")));
}

function resourceErrors(file, text, files) {
  const errors = [];
  const refs = [];
  if (/\.html?$/i.test(file)) {
    for (const tag of text.matchAll(/<(?:script|link|img|source|iframe|video|audio|object|embed)\b[^>]*>/gi)) {
      for (const attr of tag[0].matchAll(/\b(?:src|href|poster|data)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi)) refs.push(attr[1] ?? attr[2] ?? attr[3]);
      if (/\bsrcset\s*=/i.test(tag[0])) errors.push(`${file}: 离线包请使用明确的本地 src，srcset 需先转换并复验`);
    }
    if (/<base\b/i.test(text) || /<script\b[^>]*\btype\s*=\s*["']?module\b/i.test(text)) errors.push(`${file}: file:// 交付不使用 base 或 module script`);
  }
  if (/\.(?:css|html?)$/i.test(file)) {
    for (const match of text.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)|@import\s+["']([^"']+)["']/gi)) refs.push((match[1] ?? match[2]).trim());
  }
  for (const ref of refs) {
    if (/^(?:data:|#)/i.test(ref)) continue;
    let decoded;
    try { decoded = decodeURIComponent(ref.split(/[?#]/)[0]); } catch { errors.push(`${file}: 非法资源 URL ${ref}`); continue; }
    if (/^(?:[a-z][\w+.-]*:|\/|\\)/i.test(decoded) || decoded.includes("\\")) { errors.push(`${file}: 非本地相对资源 ${ref}`); continue; }
    const target = path.posix.normalize(path.posix.join(path.posix.dirname(file), decoded));
    if (target.startsWith("../") || !Object.hasOwn(files, target)) errors.push(`${file}: 资源缺失或越出交付包 ${ref}`);
  }
  if (/\.(?:jsx?|html?)$/i.test(file) && /\b(?:fetch\s*\(|XMLHttpRequest|WebSocket|EventSource|import\s*\(|serviceWorker\s*\.)/.test(text)) errors.push(`${file}: 离线默认路线不依赖网络、动态模块或 Service Worker；使用随包场景数据`);
  return errors;
}

async function inspect(root, profile, checkDigests) {
  const errors = [];
  let manifest, files;
  try {
    files = await inventory(root);
    manifest = JSON.parse(await readFile(path.join(root, manifestName), "utf8"));
  } catch (error) { return { errors: [error.message] }; }
  if (manifest.schema_version !== 4 || !["html-css-js", "react-antd-prebuilt"].includes(manifest.component_basis) || manifest.runtime_build_required !== false) errors.push("原型必须使用 offline-html adapter schema v4 / html-css-js / runtime_build_required=false");
  if (manifest.prototype_profile !== profile || manifest.profile_kind !== (profile === "H1" ? "visual-review" : "flow-review")) errors.push("adapter 档位与验证档位不一致");
  if (manifest.entry !== "index.html" || !files[manifest.entry]) errors.push("缺少本地 index.html 入口");
  for (const file of ["styles.css", "tokens.css", "app.js", "scenarios.js"]) if (!files[file]) errors.push(`缺少 ${file}`);
  for (const file of Object.keys(files)) {
    if (/(^|\/)(node_modules|package\.json|(?:pnpm|package)-lock\.(?:yaml|json)|yarn\.lock)(\/|$)/.test(file)) errors.push(`交付包不得依赖 ${file}`);
    if (/\.(css|jsx?|html?)$/i.test(file)) {
      const content = await readFile(path.join(root, file), "utf8");
      // Compiled dependencies contain network API names; inspect authored code and require real offline browser evidence.
      if (!(manifest.component_basis === "react-antd-prebuilt" && file === "app.js")) errors.push(...resourceErrors(file, content, files));
    }
  }
  if (manifest.component_basis === "react-antd-prebuilt") {
    const build = manifest.build_provenance;
    if (profile !== "H2" || build?.format !== "iife" || build?.browser_runtime !== "react" || build?.toolchain_required_by_recipient !== false || !build?.reason?.trim()) errors.push("真实 AntD 必须是 H2 离线预构建并记录选择理由");
    for (const field of ["source_digest", "lock_digest", "theme_digest"]) if (!/^sha256:[a-f0-9]{64}$/.test(build?.[field] ?? "")) errors.push(`缺少 AntD ${field}`);
    if (build?.source_digest !== files["authoring-source.jsx"]) errors.push("AntD 源文件与构建来源摘要不一致");
    for (const name of ["antd", "react", "react-dom", "esbuild"]) if (!/^\d+\.\d+\.\d+$/.test(build?.packages?.[name] ?? "")) errors.push(`AntD 作者工具需要精确版本 ${name}`);
    if (!files["THIRD-PARTY-NOTICES.txt"] || !files["build-provenance.json"]) errors.push("缺少构建来源或第三方许可");
    else { try { if (JSON.stringify(JSON.parse(await readFile(path.join(root, "build-provenance.json"), "utf8"))) !== JSON.stringify(build)) errors.push("构建来源与 manifest 不匹配"); } catch { errors.push("构建来源不是有效 JSON"); } }
  }
  if (files["styles.css"]) {
    const styles = await readFile(path.join(root, "styles.css"), "utf8");
    for (const token of ["--brand-font-family", "--brand-color-text", "--brand-color-bg-layout", "--brand-color-bg-container", "--yss-color-primary-control", "--yss-control-height"]) if (!styles.includes(token)) errors.push(`styles.css 未消费项目 Token ${token}`);
  }
  if (manifest.design_source?.path !== "DESIGN.md" || !/^sha256:[a-f0-9]{64}$/.test(manifest.design_source?.digest ?? "")) errors.push("缺少根 DESIGN.md 来源摘要");
  if (manifest.token_source?.path !== "docs/design/tokens/variables.css" || manifest.token_source?.digest !== files["tokens.css"]) errors.push("tokens.css 与登记的 Token 来源摘要不一致");
  if (checkDigests && JSON.stringify(manifest.files) !== JSON.stringify(files)) errors.push("原型资源摘要或清单已变化，审查后重新 seal-project");
  return { errors, manifest, files };
}

export async function validateOfflineHtml(root, profile) {
  const { errors } = await inspect(root, profile, true);
  return { errors };
}

export async function sealOfflineHtml(root, profile) {
  const result = await inspect(root, profile, false);
  if (result.errors.length) throw new Error(result.errors.join("\n"));
  const manifest = { ...result.manifest, files: result.files };
  await writeFile(path.join(root, manifestName), `${JSON.stringify(manifest, null, 2)}\n`);
  return manifest;
}

export async function prepareOfflineHtml({ projectRoot, root, feature, profile, pattern = "editor" }) {
  if (!/^[a-z0-9][a-z0-9-]*$/.test(feature ?? "")) throw new TypeError("feature 必须是小写 kebab-case");
  if (!["editor", "workbench"].includes(pattern)) throw new Error("pattern 必须为 editor/workbench");
  const expected = path.resolve(projectRoot, "docs/.scratch", feature, "design/prototypes");
  if (path.resolve(root) !== expected) throw new TypeError(`原型目录必须精确匹配 ${expected}`);
  for (let current = path.resolve(root); current.startsWith(`${path.resolve(projectRoot)}${path.sep}`); current = path.dirname(current)) {
    if (existsSync(current) && (await lstat(current)).isSymbolicLink()) throw new Error(`原型路径不允许符号链接: ${current}`);
  }
  // Refuse an occupied destination instead of replacing an existing or frozen prototype.
  if (existsSync(root) && ((await lstat(root)).isSymbolicLink() || (await readdir(root)).length)) throw new Error("原型目录已存在内容；请在保留旧版本后选择新 feature 工作目录，不覆盖已有原型");
  const design = await readFile(path.join(projectRoot, "DESIGN.md"));
  const tokens = await readFile(path.join(projectRoot, "docs/design/tokens/variables.css"));
  await mkdir(root, { recursive: true });
  for (const file of ["index.html", "styles.css", "app.js", "scenarios.js"]) {
    const folder = pattern === "workbench" && file !== "scenarios.js" ? new URL("../assets/native-workbench/", import.meta.url) : assetRoot;
    const source = await readFile(new URL(file, folder), "utf8");
    await writeFile(path.join(root, file), source.replaceAll("__FEATURE__", feature).replaceAll("__PROFILE__", profile));
  }
  await writeFile(path.join(root, "tokens.css"), tokens);
  const manifest = { schema_version: 4, feature, pattern, prototype_profile: profile, profile_kind: profile === "H1" ? "visual-review" : "flow-review", component_basis: "html-css-js", runtime_build_required: false, entry: "index.html", design_source: { path: "DESIGN.md", digest: sha(design) }, token_source: { path: "docs/design/tokens/variables.css", digest: sha(tokens) }, files: {} };
  await writeFile(path.join(root, manifestName), JSON.stringify(manifest));
  return sealOfflineHtml(root, profile);
}
