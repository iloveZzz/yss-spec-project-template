import * as fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
export const hash = (b) => createHash("sha256").update(b).digest("hex");
export const json = (x) => JSON.stringify(x, null, 2) + "\n";
export function ensure(ok, message, code = "INVALID") {
  if (!ok) throw Object.assign(new Error(message), { code });
}
export function stat(p) {
  try {
    return fs.lstatSync(p);
  } catch (e) {
    if (e.code === "ENOENT") return null;
    throw e;
  }
}
export function relative(ref) {
  ensure(
    typeof ref === "string" &&
      ref.length > 0 &&
      !ref.includes("\\") &&
      !/[\x00-\x1f\x7f:]/.test(ref) &&
      !path.posix.isAbsolute(ref) &&
      ref.split("/").every((x) => x && x !== "." && x !== ".."),
    `非法路径: ${ref}`,
    "PATH",
  );
  return ref;
}
export function safe(root, ref) {
  relative(ref);
  let cursor = root;
  const parts = ref.split("/");
  for (let i = 0; i < parts.length; i++) {
    cursor = path.join(cursor, parts[i]);
    const s = stat(cursor);
    ensure(!s?.isSymbolicLink(), `路径不允许符号链接: ${ref}`, "PATH");
    if (i < parts.length - 1)
      ensure(!s || s.isDirectory(), `父路径不是目录: ${ref}`, "PATH");
  }
  return cursor;
}
export function targetPath(p) {
  const resolved = path.resolve(p);
  let cursor = path.parse(resolved).root;
  for (const part of resolved.slice(cursor.length).split("/").filter(Boolean)) {
    cursor = path.join(cursor, part);
    const s = stat(cursor);
    ensure(
      !s || (!s.isSymbolicLink() && s.isDirectory()),
      `目标路径不是普通目录: ${cursor}`,
      "PATH",
    );
  }
  return resolved;
}
const protectedRoots = new Set([
  ".git",
  ".gitmodules",
  "node_modules",
  "src",
  "app",
  "apps",
  "backend",
  "frontend",
  "target",
  "dist",
  "build",
  "deploy",
  "Dockerfile",
  "docker-compose.yml",
  "package.json",
  "package-lock.json",
  "pnpm-lock.yaml",
  "yarn.lock",
  "bun.lock",
  "bun.lockb",
  "pom.xml",
  "mvnw",
  "mvnw.cmd",
  ".mvn",
  "gradlew",
  "gradlew.bat",
  "build.gradle",
  "settings.gradle",
  ".github",
  ".yss-harness-state",
]);
export function governance(ref) {
  relative(ref);
  ensure(
    !protectedRoots.has(ref.split("/")[0]) && !ref.split("/").includes(".git"),
    `受保护业务/Git/状态路径: ${ref}`,
    "PROTECTED",
  );
  ensure(
    /^(?:\.(?:agents|claude|codex|cursor|pi|qoder|trae)\/|docs\/|scripts\/)/.test(
      ref,
    ) ||
      [
        ".cursorrules",
        ".gitignore",
        ".nvmrc",
        "AGENTS.md",
        "CLAUDE.md",
        "CONTEXT.md",
        "README.md",
        "DESIGN.md",
        "skills-lock.json",
        "yss-project.yaml",
        "yss-public-skills.json",
      ].includes(ref),
    `不在治理边界: ${ref}`,
    "PROTECTED",
  );
  ensure(
    ref !== "scripts/instantiate-harness",
    `旧创建入口不得分发`,
    "PROTECTED",
  );
}
export function descriptor(root, ref) {
  const file = safe(root, ref),
    s = stat(file);
  if (!s) return null;
  ensure(
    s.isFile() && s.nlink === 1,
    `目标必须是非硬链接普通文件: ${ref}`,
    "PATH",
  );
  return {
    type: "file",
    digest: hash(fs.readFileSync(file)),
    mode: s.mode & 0o777,
  };
}
export function same(a, b) {
  return (
    (a === null && b === null) ||
    Boolean(
      a && b && a.type === b.type && a.digest === b.digest && a.mode === b.mode,
    )
  );
}
export function write(root, ref, bytes, mode = 0o644) {
  const file = safe(root, ref);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, bytes);
  fs.chmodSync(file, mode);
}
export function readJson(root, ref) {
  return JSON.parse(fs.readFileSync(safe(root, ref), "utf8"));
}
