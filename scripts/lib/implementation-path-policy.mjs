const PROJECT_NAME = /^[a-z][a-z0-9-]*$/;
const IMPLEMENTATION_KINDS = new Set(["backend", "frontend"]);

export function normalizeImplementationPath(value) {
  if (typeof value !== "string" || value.length === 0) return null;
  const candidate = value.endsWith("/") ? value.slice(0, -1) : value;
  if (candidate.length === 0 || candidate.startsWith("/") || candidate.startsWith("../")) return null;
  const parts = candidate.split("/");
  if (parts.some((part) => part === "" || part === "." || part === "..")) return null;
  return candidate;
}

export function violation(value, { enforceHarness = true } = {}) {
  const clean = normalizeImplementationPath(value);
  if (!clean) return "implementation path must be a clean relative path";
  if (!enforceHarness) return null;
  const parts = clean.split("/");
  const root = parts.slice(0, 2).join("/");
  if (parts.length >= 2 && parts[0] === "app" && IMPLEMENTATION_KINDS.has(parts[1])) {
    return `singular app implementation root is forbidden: ${root}/`;
  }
  if (!(parts[0] === "apps" && IMPLEMENTATION_KINDS.has(parts[1]))) return null;
  if (parts.length < 3) return `implementation container root is not a project root: ${root}/`;
  if (!PROJECT_NAME.test(parts[2])) {
    return `implementation project segment must be a concrete project name: ${parts[2]}`;
  }
  return null;
}

export function validImplementationPath(value, options) {
  return violation(value, options) === null;
}
