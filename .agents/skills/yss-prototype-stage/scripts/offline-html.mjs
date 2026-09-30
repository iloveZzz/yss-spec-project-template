import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile, readdir, lstat } from "node:fs/promises";
import path from "node:path";
import {writeScenarios,scenarioScript} from "./scenario-contract.mjs";

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

export function resourceErrors(file, text, files) {
  const errors = [];
  const refs = [];
  if (/\.(?:html?|vue)$/i.test(file)) {
    for (const tag of text.matchAll(/<(?:script|link|img|source|iframe|video|audio|object|embed)\b[^>]*>/gi)) {
      for (const attr of tag[0].matchAll(/(?<![:\w-])\b(?:src|href|poster|data)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi)) refs.push(attr[1] ?? attr[2] ?? attr[3]);
      if (/\bsrcset\s*=/i.test(tag[0])) errors.push(`${file}: 离线包请使用明确的本地 src，srcset 需先转换并复验`);
    }
    if (/<base\b/i.test(text) || /<script\b[^>]*\btype\s*=\s*["']?module\b/i.test(text)) errors.push(`${file}: file:// 交付不使用 base 或 module script`);
  }
  if (/\.(?:css|html?|vue)$/i.test(file)) {
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
  if (/\.(?:(?:jsx?|tsx?|vue)|html?)$/i.test(file) && /\b(?:fetch\s*\(|XMLHttpRequest|WebSocket|EventSource|import\s*\(|serviceWorker\s*\.)/.test(text)) errors.push(`${file}: 离线默认路线不依赖网络、动态模块或 Service Worker；使用随包场景数据`);
  return errors;
}

async function inspect(root, profile, checkDigests, allowLegacy = false) {
  const errors = [];
  let manifest, files;
  try {
    files = await inventory(root);
    manifest = JSON.parse(await readFile(path.join(root, manifestName), "utf8"));
  } catch (error) { return { errors: [error.message] }; }
  if (manifest.schema_version !== 4 || !["html-css-js", "vue-shadcn-prebuilt", ...(allowLegacy ? ["react-antd-prebuilt", "react-shadcn-prebuilt"] : [])].includes(manifest.component_basis) || manifest.runtime_build_required !== false) errors.push("原型必须使用 offline-html adapter schema v4 / html-css-js 或 vue-shadcn-prebuilt / runtime_build_required=false；React 作者路线已退役，仅允许只读 legacy 校验");
  if (manifest.prototype_profile !== profile || manifest.profile_kind !== (profile === "H1" ? "visual-review" : "flow-review")) errors.push("adapter 档位与验证档位不一致");
  if (manifest.entry !== "index.html" || !files[manifest.entry]) errors.push("缺少本地 index.html 入口");
  if (manifest.visual_preset) {
    if (manifest.visual_preset.name !== "yss-enterprise" || !["compact", "comfortable"].includes(manifest.visual_preset.density)) errors.push("未知原型视觉预设或密度");
    const entry = await readFile(path.join(root, "index.html"), "utf8").catch(() => "");
    if (!entry.includes(`data-density="${manifest.visual_preset.density}"`)) errors.push("视觉预设与页面密度不一致");
  }
  for (const file of ["styles.css", "tokens.css", "app.js", "scenarios.js"]) if (!files[file]) errors.push(`缺少 ${file}`);
  for (const file of Object.keys(files)) {
    if (/(^|\/)(node_modules|package\.json|(?:pnpm|package)-lock\.(?:yaml|json)|yarn\.lock)(\/|$)/.test(file)) errors.push(`交付包不得依赖 ${file}`);
    if (/\.(css|(?:jsx?|tsx?|vue)|html?)$/i.test(file)) {
      const content = await readFile(path.join(root, file), "utf8");
      // Compiled dependencies contain network API names; inspect authored code and require real offline browser evidence.
      if (!(["react-antd-prebuilt", "react-shadcn-prebuilt", "vue-shadcn-prebuilt"].includes(manifest.component_basis) && file === "app.js")) errors.push(...resourceErrors(file, content, files));
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
  if (["react-shadcn-prebuilt", "vue-shadcn-prebuilt"].includes(manifest.component_basis)) {
    const vue = manifest.component_basis === "vue-shadcn-prebuilt", runtime = vue ? "vue" : "react", helper = vue ? "utils.ts" : "cn.ts";
    const build = manifest.build_provenance;
    if (build?.format !== "iife" || build?.browser_runtime !== runtime || build?.toolchain_required_by_recipient !== false) errors.push("shadcn 必须离线预构建，接收者无需工具链");
    for (const [field, ref] of Object.entries({source_digest:vue?"authoring-source.ts":"authoring-source.tsx",theme_digest:"token-theme.css",registry_digest:"registry-manifest.json"})) if (!files[ref] || build?.[field] !== files[ref]) errors.push(`shadcn 源文件与构建来源摘要不一致: ${field}`);
    if (!files[`component-sources/${helper}`] || build?.support_source_digests?.[helper] !== files[`component-sources/${helper}`]) errors.push("shadcn 辅助源码摘要不匹配");
    if (!/^sha256:[a-f0-9]{64}$/.test(build?.lock_digest ?? "")) errors.push("缺少 shadcn lock_digest");
    for (const name of (vue ? ["vue", "@vue/compiler-sfc", "reka-ui", "esbuild", "tailwindcss", "@tailwindcss/cli"] : ["react", "react-dom", "esbuild", "radix-ui", "tailwindcss", "@tailwindcss/cli"])) if (!/^\d+\.\d+\.\d+$/.test(build?.packages?.[name] ?? "")) errors.push(`shadcn 作者工具需要精确版本 ${name}`);
    try {
      const registry = JSON.parse(await readFile(path.join(root, "registry-manifest.json"), "utf8"));
      if (registry.repository !== (vue ? "https://github.com/unovue/shadcn-vue" : "https://github.com/shadcn-ui/ui") || !/^[a-f0-9]{40}$/.test(registry.revision) || registry.revision !== build.registry_revision || !registry.components?.length) errors.push("shadcn 固定源码来源缺失或不一致");
      for (const item of registry.components ?? []) if (!(vue ? /^ui\/[a-z-]+\/[A-Za-z]+\.(?:vue|ts)$/ : /^ui\/[a-z-]+\.tsx$/).test(item.path) || item.digest !== files[`component-sources/${vue ? item.path : path.posix.basename(item.path)}`]) errors.push(`shadcn 组件源码摘要不匹配: ${item.path}`);
      if (vue && (build.packages.vue !== build.packages['@vue/compiler-sfc'] || !Array.isArray(build.used_component_files) || !build.used_component_files.length || build.used_component_files.some(p=>!registry.components.some(c=>c.path===p)))) errors.push("Vue 编译器版本或实际组件依赖闭包不匹配");
      if (JSON.stringify(JSON.parse(await readFile(path.join(root, "build-provenance.json"), "utf8"))) !== JSON.stringify(build)) errors.push("构建来源与 manifest 不匹配");
    } catch { errors.push("shadcn 构建来源不是有效 JSON"); }
    if (!files["THIRD-PARTY-NOTICES.txt"]) errors.push("缺少第三方许可");
  }
  if (files["scenarios.json"]) {try {if(await readFile(path.join(root,"scenarios.js"),"utf8")!==scenarioScript(await readFile(path.join(root,"scenarios.json"))))errors.push("场景 JSON 与派生脚本不一致");if(!files["scenario-runtime.js"])errors.push("缺少场景运行时");}catch(e){errors.push(e.message);}}
  if (manifest.build_provenance?.authored_files) for(const [ref,hash] of Object.entries(manifest.build_provenance.authored_files))if(files[ref]!==hash)errors.push(`作者来源摘要漂移: ${ref}`);
  if (files["styles.css"]) {
    const styles = await readFile(path.join(root, "styles.css"), "utf8");
    for (const token of ["--brand-font-family", "--brand-color-text", "--brand-color-bg-layout", "--brand-color-bg-container", "--yss-color-primary-control", "--yss-control-height"]) if (!styles.includes(token)) errors.push(`styles.css 未消费项目 Token ${token}`);
  }
  if (manifest.design_source?.path !== "DESIGN.md" || !/^sha256:[a-f0-9]{64}$/.test(manifest.design_source?.digest ?? "")) errors.push("缺少根 DESIGN.md 来源摘要");
  if (manifest.token_source?.path !== ".template-spec/design/tokens/variables.css" || manifest.token_source?.digest !== files["tokens.css"]) errors.push("tokens.css 与登记的 Token 来源摘要不一致");
  if (checkDigests && JSON.stringify(manifest.files) !== JSON.stringify(files)) errors.push("原型资源摘要或清单已变化，审查后重新 seal-project");
  return { errors, manifest, files };
}

export async function validateOfflineHtml(root, profile, { allowLegacy = false, projectRoot } = {}) {
  const { errors, manifest } = await inspect(root, profile, true, allowLegacy);
  if(projectRoot && manifest) for(const source of [manifest.design_source,manifest.token_source]) {try {if(sha(await readFile(path.join(projectRoot,source.path)))!==source.digest)errors.push(`当前项目来源已漂移: ${source.path}`);}catch(e){errors.push(e.message);}}
  return { errors };
}

export async function sealOfflineHtml(root, profile) {
  const result = await inspect(root, profile, false);
  if (result.errors.length) throw new Error(result.errors.join("\n"));
  const manifest = { ...result.manifest, files: result.files };
  await writeFile(path.join(root, manifestName), `${JSON.stringify(manifest, null, 2)}\n`);
  return manifest;
}

export async function prepareOfflineHtml({ projectRoot, root, feature, profile, pattern = "editor", scenarios, title, density = "compact" }) {
  await assertPrototypeTarget({projectRoot,root,feature,pattern});
  if (!["compact", "comfortable"].includes(density)) throw new Error("density 必须为 compact/comfortable");
  const design = await readFile(path.join(projectRoot, "DESIGN.md"));
  const tokens = await readFile(path.join(projectRoot, ".template-spec/design/tokens/variables.css"));
  await mkdir(root, { recursive: true });
  for (const file of ["index.html", "styles.css", "app.js"]) {
    const folder = pattern === "workbench" && file !== "scenarios.js" ? new URL("../assets/native-workbench/", import.meta.url) : assetRoot;
    const source = await readFile(new URL(file, folder), "utf8");
    let output=source.replaceAll("__FEATURE__", feature).replaceAll("__PROFILE__", profile);
    if (file === "index.html") output=output.replace('<html ', `<html data-density="${density}" `);
    if (file === "styles.css") output+='\n'+await readFile(new URL('../assets/prototype-theme.css',import.meta.url),'utf8');
    if(file==="index.html") {output=output.replace(/<script[^>]*src="\.\/scenarios.js"[^>]*><\/script>/g, "").replace("</head>", "<script src=\"./scenarios.js\"></script><script src=\"./scenario-runtime.js\"></script></head>");if(title)output=output.replace(/<title>.*?<\/title>/,`<title>${title.replace(/[<>&"]/g,c=>({"<":"&lt;",">":"&gt;","&":"&amp;",'"':"&quot;"})[c])}</title>`);}
    await writeFile(path.join(root, file), output);
  }
  await writeScenarios(root,scenarios?await readFile(scenarios):await readFile(new URL(`../assets/${pattern==="workbench"?"native-workbench":"offline-html"}/scenarios.json`,import.meta.url)));
  await writeFile(path.join(root, "tokens.css"), tokens);
  const manifest = { schema_version: 4, feature, pattern, prototype_profile: profile, profile_kind: profile === "H1" ? "visual-review" : "flow-review", component_basis: "html-css-js", runtime_build_required: false, entry: "index.html", design_source: { path: "DESIGN.md", digest: sha(design) }, token_source: { path: ".template-spec/design/tokens/variables.css", digest: sha(tokens) }, files: {} };
  manifest.visual_preset = { name: "yss-enterprise", density };
  await writeFile(path.join(root, manifestName), JSON.stringify(manifest));
  return sealOfflineHtml(root, profile);
}

export async function assertPrototypeTarget({projectRoot,root,feature,pattern="workbench"}) {
  if (!/^[a-z0-9][a-z0-9-]*$/.test(feature ?? "")) throw new TypeError("feature 必须是小写 kebab-case");
  if (!["editor", "workbench"].includes(pattern)) throw new Error("pattern 必须为 editor/workbench");
  const expected = path.resolve(projectRoot, "docs/.scratch", feature, "design/prototypes");
  if (path.resolve(root) !== expected) throw new TypeError(`原型目录必须精确匹配 ${expected}`);
  for (let current = path.resolve(root); current.startsWith(`${path.resolve(projectRoot)}${path.sep}`); current = path.dirname(current)) {
    if (existsSync(current) && (await lstat(current)).isSymbolicLink()) throw new Error(`原型路径不允许符号链接: ${current}`);
  }
  // Refuse an occupied destination instead of replacing an existing or frozen prototype.
  if (existsSync(root) && ((await lstat(root)).isSymbolicLink() || (await readdir(root)).length)) throw new Error("原型目录已存在内容；请在保留旧版本后选择新 feature 工作目录，不覆盖已有原型");
}
