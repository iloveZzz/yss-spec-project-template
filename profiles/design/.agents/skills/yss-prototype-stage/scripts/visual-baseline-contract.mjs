#!/usr/bin/env node
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { parseDocument, stringify } from "../../../../scripts/vendor/yaml.mjs";

const SHA256 = /^sha256:[a-f0-9]{64}$/;
const CASE_ID = /^[a-z0-9][a-z0-9-]*$/;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_BUNDLE_BYTES = 100 * 1024 * 1024;

const object = (value) => value && typeof value === "object" && !Array.isArray(value);
const nonEmpty = (value) => typeof value === "string" && value.trim().length > 0;
const digest = (value) => `sha256:${createHash("sha256").update(value).digest("hex")}`;

function required(data, field, parent, errors) {
  if (!object(data) || data[field] === undefined || data[field] === null) errors.push(`${parent}.${field} 缺失`);
}

function requiredString(data, field, parent, errors) {
  required(data, field, parent, errors);
  if (object(data) && data[field] !== undefined && !nonEmpty(data[field])) errors.push(`${parent}.${field} 必须是非空字符串`);
}

function placeholder(value) {
  return typeof value === "string" && /<[^>]+>/.test(value);
}

function safeRelativeRef(value, prefix, suffix, field, errors, allowTemplate) {
  if (allowTemplate && placeholder(value)) return;
  if (!nonEmpty(value) || path.isAbsolute(value) || value.split("/").includes("..") || !value.startsWith(prefix) || !value.endsWith(suffix)) {
    errors.push(`${field} 必须是 ${prefix} 下的相对 ${suffix} 文件`);
  }
}

async function listPayloadFiles(root, relative = "") {
  const files = [];
  for (const entry of await readdir(path.join(root, relative), { withFileTypes: true })) {
    const ref = relative ? `${relative}/${entry.name}` : entry.name;
    if (entry.isSymbolicLink()) throw new TypeError(`Bundle 不允许符号链接: ${ref}`);
    if (entry.isDirectory()) files.push(...await listPayloadFiles(root, ref));
    else if (entry.isFile() && ref !== "visual-baseline.yaml") files.push(ref);
  }
  return files.sort();
}

function validateDigest(value, field, errors, allowTemplate) {
  if (!(allowTemplate && placeholder(value)) && !SHA256.test(value ?? "")) errors.push(`${field} 必须为 sha256 摘要`);
}

function canonicalDigestPayload(data) {
  return {
    schema_version: data.schema_version,
    baseline_id: data.baseline_id,
    feature: data.feature,
    version: data.version,
    prototype_ref: data.source?.prototype_ref,
    prototype_digest: data.source?.prototype_digest,
    interaction_spec_ref: data.source?.interaction_spec_ref,
    interaction_spec_digest: data.source?.interaction_spec_digest,
    state_matrix_ref: data.source?.state_matrix_ref,
    state_matrix_digest: data.source?.state_matrix_digest,
    capture_script_ref: data.capture_environment?.capture_script_ref,
    capture_script_digest: data.capture_environment?.capture_script_digest,
    capture_result_ref: data.capture_environment?.capture_result_ref,
    capture_result_digest: data.capture_environment?.capture_result_digest,
    cases: (data.cases ?? []).map((item) => ({
      case_id: item.case_id,
      route: item.route,
      page: item.page,
      state: item.state,
      viewport: item.viewport,
      theme: item.theme,
      locale: item.locale,
      data_scenario: item.data_scenario,
      image_ref: item.image_ref,
      image_digest: item.image_digest,
      image_size_bytes: item.image_size_bytes,
      mask_ref: item.mask_ref,
      mask_digest: item.mask_digest,
      mask_size_bytes: item.mask_size_bytes,
      semantic_refs: item.semantic_refs,
      allowed_differences: item.allowed_differences,
    })),
  };
}

export function computeVisualBaselineDigest(data) {
  return digest(JSON.stringify(canonicalDigestPayload(data)));
}

function pngDimensions(buffer) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (buffer.length < 24 || !buffer.subarray(0, 8).equals(signature) || buffer.toString("ascii", 12, 16) !== "IHDR") {
    throw new TypeError("文件不是有效 PNG");
  }
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

export async function validateVisualBaseline(data, { allowTemplate = false, bundleRoot } = {}) {
  const errors = [];
  if (!object(data)) return { errors: ["Visual Baseline 必须是对象"] };
  for (const field of ["schema_version", "baseline_id", "feature", "version", "status", "bundle", "source", "capture_environment", "cases"]) required(data, field, "root", errors);
  if (data.schema_version !== 1) errors.push("schema_version 必须为 1");
  requiredString(data, "baseline_id", "root", errors);
  requiredString(data, "feature", "root", errors);
  requiredString(data, "version", "root", errors);
  if (!(allowTemplate && placeholder(data.feature)) && !CASE_ID.test(data.feature ?? "")) errors.push("feature 必须是小写 kebab-case");
  if (!(allowTemplate && placeholder(data.baseline_id)) && data.baseline_id !== `visual-baseline.${data.feature}`) errors.push("baseline_id 必须为 visual-baseline.<feature>");
  if (!(allowTemplate && placeholder(data.version)) && !/^v[1-9][0-9]*$/.test(data.version ?? "")) errors.push("version 必须形如 v1");
  if (!['draft', 'ready-for-human', 'approved', 'stale', 'blocked'].includes(data.status)) errors.push("status 非法");

  const bundle = data.bundle;
  for (const field of ["format", "root_ref", "digest", "size_bytes", "max_image_bytes", "max_bundle_bytes"]) required(bundle, field, "bundle", errors);
  if (bundle?.format !== "portable-directory") errors.push("bundle.format 必须为 portable-directory");
  requiredString(bundle, "root_ref", "bundle", errors);
  validateDigest(bundle?.digest, "bundle.digest", errors, allowTemplate);
  if (!(allowTemplate && placeholder(bundle?.size_bytes)) && (!Number.isInteger(bundle?.size_bytes) || bundle.size_bytes < 0 || bundle.size_bytes > MAX_BUNDLE_BYTES)) errors.push("bundle.size_bytes 必须是不超过 100 MiB 的非负整数");
  if (bundle?.max_image_bytes !== MAX_IMAGE_BYTES) errors.push(`bundle.max_image_bytes 必须为 ${MAX_IMAGE_BYTES}`);
  if (bundle?.max_bundle_bytes !== MAX_BUNDLE_BYTES) errors.push(`bundle.max_bundle_bytes 必须为 ${MAX_BUNDLE_BYTES}`);

  const source = data.source;
  for (const field of ["prototype_ref", "prototype_digest", "interaction_spec_ref", "interaction_spec_digest", "state_matrix_ref", "state_matrix_digest"]) requiredString(source, field, "source", errors);
  for (const field of ["prototype_digest", "interaction_spec_digest", "state_matrix_digest"]) validateDigest(source?.[field], `source.${field}`, errors, allowTemplate);
  safeRelativeRef(source?.prototype_ref, "sources/", "", "source.prototype_ref", errors, allowTemplate);
  safeRelativeRef(source?.interaction_spec_ref, "sources/", "", "source.interaction_spec_ref", errors, allowTemplate);
  safeRelativeRef(source?.state_matrix_ref, "sources/", "", "source.state_matrix_ref", errors, allowTemplate);

  const environment = data.capture_environment;
  for (const field of ["browser", "browser_version", "operating_system", "fonts_digest", "device_scale_factor", "color_space", "locale", "timezone", "animations_disabled", "cursor_hidden", "capture_script_ref", "capture_script_digest", "capture_result_ref", "capture_result_digest"]) required(environment, field, "capture_environment", errors);
  if (environment?.browser !== "chromium") errors.push("capture_environment.browser 必须为 chromium");
  if (environment?.device_scale_factor !== 1) errors.push("capture_environment.device_scale_factor 必须为 1");
  if (environment?.color_space !== "srgb") errors.push("capture_environment.color_space 必须为 srgb");
  if (environment?.animations_disabled !== true || environment?.cursor_hidden !== true) errors.push("截图必须关闭动画并隐藏光标");
  for (const field of ["browser_version", "operating_system", "locale", "timezone"]) requiredString(environment, field, "capture_environment", errors);
  for (const field of ["fonts_digest", "capture_script_digest", "capture_result_digest"]) validateDigest(environment?.[field], `capture_environment.${field}`, errors, allowTemplate);
  safeRelativeRef(environment?.capture_script_ref, "capture/", "", "capture_environment.capture_script_ref", errors, allowTemplate);
  safeRelativeRef(environment?.capture_result_ref, "capture/", "", "capture_environment.capture_result_ref", errors, allowTemplate);

  if (!Array.isArray(data.cases) || data.cases.length === 0) errors.push("cases 必须是非空数组");
  const ids = new Set();
  const viewportSizes = new Set();
  const referencedFiles = new Set();
  const fileCache = new Map();
  const readBundleFile = async (ref, field) => {
    if (!bundleRoot || (allowTemplate && placeholder(ref))) return null;
    const resolvedRoot = path.resolve(bundleRoot);
    const filePath = path.resolve(resolvedRoot, ref);
    if (!filePath.startsWith(`${resolvedRoot}${path.sep}`) || !existsSync(filePath)) {
      errors.push(`${field} 不可读或越界`);
      return null;
    }
    referencedFiles.add(ref);
    if (!fileCache.has(ref)) fileCache.set(ref, await readFile(filePath));
    return fileCache.get(ref);
  };
  if (bundleRoot) {
    for (const [refField, digestField] of [["prototype_ref", "prototype_digest"], ["interaction_spec_ref", "interaction_spec_digest"], ["state_matrix_ref", "state_matrix_digest"]]) {
      const bytes = await readBundleFile(source?.[refField], `source.${refField}`);
      if (bytes && digest(bytes) !== source?.[digestField]) errors.push(`source.${digestField} 与文件不一致`);
    }
    for (const [refField, digestField] of [["capture_script_ref", "capture_script_digest"], ["capture_result_ref", "capture_result_digest"]]) {
      const bytes = await readBundleFile(environment?.[refField], `capture_environment.${refField}`);
      if (bytes && digest(bytes) !== environment?.[digestField]) errors.push(`capture_environment.${digestField} 与文件不一致`);
    }
  }
  for (const [index, item] of (data.cases ?? []).entries()) {
    const parent = `cases.${index}`;
    for (const field of ["case_id", "route", "page", "state", "viewport", "theme", "locale", "data_scenario", "image_ref", "image_digest", "image_size_bytes", "mask_ref", "mask_digest", "mask_size_bytes", "semantic_refs", "allowed_differences", "result"]) required(item, field, parent, errors);
    if (!(allowTemplate && placeholder(item?.case_id)) && !CASE_ID.test(item?.case_id ?? "")) errors.push(`${parent}.case_id 必须是小写 kebab-case`);
    if (ids.has(item?.case_id)) errors.push(`${parent}.case_id 重复`);
    ids.add(item?.case_id);
    for (const field of ["route", "page", "state", "theme", "locale", "data_scenario"]) requiredString(item, field, parent, errors);
    const viewport = item?.viewport;
    for (const field of ["name", "width", "height", "scroll_mode", "scroll_position"]) required(viewport, field, `${parent}.viewport`, errors);
    if (!(allowTemplate && (placeholder(viewport?.width) || placeholder(viewport?.height))) && (!Number.isInteger(viewport?.width) || !Number.isInteger(viewport?.height) || viewport.width <= 0 || viewport.height <= 0)) errors.push(`${parent}.viewport 尺寸必须是正整数`);
    if (!["viewport", "segment"].includes(viewport?.scroll_mode)) errors.push(`${parent}.viewport.scroll_mode 必须为 viewport/segment`);
    if (viewport?.scroll_mode === "viewport" && viewport?.scroll_position !== 0) errors.push(`${parent}.viewport.scroll_position 在 viewport 模式必须为 0`);
    viewportSizes.add(`${viewport?.width}x${viewport?.height}`);
    safeRelativeRef(item?.image_ref, "images/", ".png", `${parent}.image_ref`, errors, allowTemplate);
    validateDigest(item?.image_digest, `${parent}.image_digest`, errors, allowTemplate);
    if (!(allowTemplate && placeholder(item?.image_size_bytes)) && (!Number.isInteger(item?.image_size_bytes) || item.image_size_bytes <= 0 || item.image_size_bytes > MAX_IMAGE_BYTES)) errors.push(`${parent}.image_size_bytes 必须为 1..${MAX_IMAGE_BYTES}`);
    if (item?.mask_ref === "not-applicable") {
      if (item?.mask_digest !== "not-applicable" || item?.mask_size_bytes !== 0) errors.push(`${parent} 无 mask 时 digest 必须为 not-applicable 且 size 为 0`);
    } else {
      safeRelativeRef(item?.mask_ref, "masks/", ".png", `${parent}.mask_ref`, errors, allowTemplate);
      validateDigest(item?.mask_digest, `${parent}.mask_digest`, errors, allowTemplate);
      if (!(allowTemplate && placeholder(item?.mask_size_bytes)) && (!Number.isInteger(item?.mask_size_bytes) || item.mask_size_bytes <= 0 || item.mask_size_bytes > MAX_IMAGE_BYTES)) errors.push(`${parent}.mask_size_bytes 必须为 1..${MAX_IMAGE_BYTES}`);
    }
    const allowedSemanticRefs = new Set([source?.prototype_ref, source?.interaction_spec_ref, source?.state_matrix_ref]);
    if (!Array.isArray(item?.semantic_refs) || item.semantic_refs.length === 0 || item.semantic_refs.some((ref) => !nonEmpty(ref) || !allowedSemanticRefs.has(ref))) errors.push(`${parent}.semantic_refs 必须引用 source 中的可移植快照`);
    if (!Array.isArray(item?.allowed_differences)) errors.push(`${parent}.allowed_differences 必须是数组`);
    if (!(allowTemplate && placeholder(item?.result)) && item?.result !== "passed") errors.push(`${parent}.result 必须为 passed`);

    if (bundleRoot && !(allowTemplate && placeholder(item?.image_ref))) {
      const bytes = await readBundleFile(item.image_ref, `${parent}.image_ref`);
      if (bytes) {
        try {
          const dimensions = pngDimensions(bytes);
          if (dimensions.width !== viewport.width || dimensions.height !== viewport.height) errors.push(`${parent}.image_ref PNG 尺寸与 viewport 不一致`);
        } catch (error) { errors.push(`${parent}.image_ref ${error.message}`); }
        if (digest(bytes) !== item.image_digest) errors.push(`${parent}.image_digest 与文件不一致`);
        if (bytes.length !== item.image_size_bytes) errors.push(`${parent}.image_size_bytes 与文件不一致`);
      }
      if (item?.mask_ref !== "not-applicable") {
        const mask = await readBundleFile(item.mask_ref, `${parent}.mask_ref`);
        if (mask) {
          try {
            const dimensions = pngDimensions(mask);
            if (dimensions.width !== viewport.width || dimensions.height !== viewport.height) errors.push(`${parent}.mask_ref PNG 尺寸与 viewport 不一致`);
          } catch (error) { errors.push(`${parent}.mask_ref ${error.message}`); }
          if (digest(mask) !== item.mask_digest) errors.push(`${parent}.mask_digest 与文件不一致`);
          if (mask.length !== item.mask_size_bytes) errors.push(`${parent}.mask_size_bytes 与文件不一致`);
        }
      }
    }
  }
  if (!allowTemplate && (!viewportSizes.has("1440x900") || !viewportSizes.has("390x844"))) errors.push("Visual Baseline 至少覆盖 1440x900 与 390x844");
  if (!allowTemplate && data.status !== "approved") errors.push("正式 Visual Baseline 必须达到 approved");
  if (!allowTemplate && computeVisualBaselineDigest(data) !== bundle?.digest) errors.push("bundle.digest 与 manifest 内容不一致");
  if (bundleRoot) {
    let payloadFiles = [];
    try { payloadFiles = await listPayloadFiles(path.resolve(bundleRoot)); } catch (error) { errors.push(error.message); }
    for (const ref of payloadFiles) if (!referencedFiles.has(ref)) errors.push(`Bundle 包含未登记 payload: ${ref}`);
    const actualBundleBytes = [...fileCache.values()].reduce((sum, bytes) => sum + bytes.length, 0);
    if (actualBundleBytes !== bundle?.size_bytes) errors.push("bundle.size_bytes 与全部已登记 payload 大小不一致");
  }
  return { errors };
}

async function loadYaml(file) {
  const document = parseDocument(await readFile(file, "utf8"), { uniqueKeys: true });
  if (document.errors.length) throw new TypeError(document.errors[0].message);
  return document.toJS({ maxAliasCount: 0 });
}

export async function sealVisualBaseline(file, bundleRoot) {
  const data = await loadYaml(file);
  const referencedFiles = new Set();
  const payloads = new Map();
  const consume = async (ref) => {
    if (!nonEmpty(ref) || path.isAbsolute(ref) || ref.split("/").includes("..")) throw new TypeError(`Bundle 引用越界: ${ref}`);
    referencedFiles.add(ref);
    if (!payloads.has(ref)) payloads.set(ref, await readFile(path.resolve(bundleRoot, ref)));
    return payloads.get(ref);
  };
  for (const [refField, digestField] of [["prototype_ref", "prototype_digest"], ["interaction_spec_ref", "interaction_spec_digest"], ["state_matrix_ref", "state_matrix_digest"]]) {
    data.source[digestField] = digest(await consume(data.source[refField]));
  }
  for (const [refField, digestField] of [["capture_script_ref", "capture_script_digest"], ["capture_result_ref", "capture_result_digest"]]) {
    data.capture_environment[digestField] = digest(await consume(data.capture_environment[refField]));
  }
  for (const item of data.cases ?? []) {
    const bytes = await consume(item.image_ref);
    const dimensions = pngDimensions(bytes);
    if (dimensions.width !== item.viewport.width || dimensions.height !== item.viewport.height) throw new TypeError(`${item.case_id} PNG 尺寸与 viewport 不一致`);
    if (bytes.length > MAX_IMAGE_BYTES) throw new TypeError(`${item.case_id} PNG 超过 5 MiB`);
    item.image_digest = digest(bytes);
    item.image_size_bytes = bytes.length;
    item.result = "passed";
    if (item.mask_ref === "not-applicable") {
      item.mask_digest = "not-applicable";
      item.mask_size_bytes = 0;
    } else {
      const mask = await consume(item.mask_ref);
      const maskDimensions = pngDimensions(mask);
      if (maskDimensions.width !== item.viewport.width || maskDimensions.height !== item.viewport.height) throw new TypeError(`${item.case_id} mask PNG 尺寸与 viewport 不一致`);
      if (mask.length > MAX_IMAGE_BYTES) throw new TypeError(`${item.case_id} mask PNG 超过 5 MiB`);
      item.mask_digest = digest(mask);
      item.mask_size_bytes = mask.length;
    }
  }
  const payloadFiles = await listPayloadFiles(path.resolve(bundleRoot));
  for (const ref of payloadFiles) if (!referencedFiles.has(ref)) throw new TypeError(`Bundle 包含未登记 payload: ${ref}`);
  const sizeBytes = [...payloads.values()].reduce((sum, bytes) => sum + bytes.length, 0);
  if (sizeBytes > MAX_BUNDLE_BYTES) throw new TypeError("Visual Baseline Bundle 超过 100 MiB");
  data.bundle.size_bytes = sizeBytes;
  data.bundle.digest = computeVisualBaselineDigest(data);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, stringify(data));
  return data;
}

function args(argv) {
  const result = { _: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];
    if (!item.startsWith("--")) { result._.push(item); continue; }
    const key = item.slice(2);
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) result[key] = true;
    else { result[key] = value; index += 1; }
  }
  return result;
}

async function main(argv) {
  const parsed = args(argv);
  const [command, file] = parsed._;
  if (!file || !["validate", "seal"].includes(command)) throw new TypeError("usage: visual-baseline-contract.mjs validate|seal <visual-baseline.yaml> [--bundle-root <dir>] [--allow-template]");
  const bundleRoot = parsed["bundle-root"] ? path.resolve(parsed["bundle-root"]) : undefined;
  if (command === "seal") {
    if (!bundleRoot) throw new TypeError("seal 必须提供 --bundle-root");
    await sealVisualBaseline(path.resolve(file), bundleRoot);
  }
  const data = await loadYaml(path.resolve(file));
  const result = await validateVisualBaseline(data, { allowTemplate: Boolean(parsed["allow-template"]), bundleRoot });
  if (result.errors.length) throw new TypeError(result.errors.join("\n"));
  process.stdout.write(`Visual Baseline ${command} passed\n`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) main(process.argv.slice(2)).catch((error) => { process.stderr.write(`${error.message}\n`); process.exitCode = 1; });
