import { createHash } from "node:crypto";
import { existsSync, lstatSync } from "./validation-phase.mjs";
import path from "node:path";

function ensure(condition, message) { if (!condition) throw new TypeError(message); }
export const openApiDigest = (bytes) => `sha256:${createHash("sha256").update(bytes).digest("hex")}`;

export function resolveOpenApiRef(root, reference) {
  ensure(typeof reference === "string" && reference.length > 0, "引用不能为空");
  ensure(!path.isAbsolute(reference) && !reference.includes("\\") && !reference.split("/").includes(".."), `引用必须位于项目内: ${reference}`);
  const target = path.resolve(root, reference);
  ensure(target === root || target.startsWith(`${root}${path.sep}`), `引用越出项目根: ${reference}`);
  ensure(existsSync(target), `引用不可读取: ${reference}`);
  ensure(!lstatSync(target).isSymbolicLink(), `引用不能是 symlink: ${reference}`);
  return target;
}
