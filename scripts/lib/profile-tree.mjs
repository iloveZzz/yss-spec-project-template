import { loadOrchestrationContract } from './orchestration-contract.mjs';
import { safeFile } from './governance-io.mjs';
import { readdirSync, cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Profile 并入根仓后，一个 Profile 的完整目录 = 内核目录 + profiles/_specialist + profiles/<profile>（后面的覆盖前面的），
 * 只应用分发清单 excludePaths 里 .agents/skills 下的条目（该 Profile 没有这些技能）；scripts 等其他排除项既可能是「该 Profile 没有」，
 * 也可能是「仓库里有、但不随实例分发」，在覆盖层里分不开，所以组合目录对它们是超集，足够让测试和夹具运行 Profile 的脚本；
 * 要知道实际分发什么，看 yss-cli 构建出的 Bundle。
 * 与 yss-cli 的 internal/bundle/overlay.go 同一规则；结果缓存在本进程的临时目录里。
 */
export const KERNEL_SCOPE = [".agents/skills", "scripts", ".template-spec/process", ".template-spec/templates"];
export const PROFILE_NAMES = ["backend"];
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const cache = new Map();

export function composeProfileTree(profile, { root = ROOT } = {}) {
  if (!PROFILE_NAMES.includes(profile)) throw new TypeError(`未知 Profile: ${profile}`);
  const key = `${root}\0${profile}`;
  if (cache.has(key)) return cache.get(key);
  const target = realpathSync(mkdtempSync(path.join(os.tmpdir(), `yss-profile-${profile}-`)));
  for (const scope of KERNEL_SCOPE) {
    const source = path.join(root, scope);
    if (!existsSync(source)) continue;
    mkdirSync(path.dirname(path.join(target, scope)), { recursive: true });
    cpSync(source, path.join(target, scope), { recursive: true, verbatimSymlinks: true });
  }
  for (const layer of ["_specialist", profile]) {
    const source = path.join(root, "profiles", layer);
    if (existsSync(source)) cpSync(source, target, { recursive: true, force: true, verbatimSymlinks: true });
  }
  const policyFile = path.join(target, ".template-source/distribution/bundle-profile.json");
  if (existsSync(policyFile)) {
    for (const entry of JSON.parse(readFileSync(policyFile, "utf8")).manifest?.excludePaths ?? []) {
      if (entry.startsWith(".agents/skills/")) rmSync(path.join(target, entry), { recursive: true, force: true });
    }
  }
  const manifest = '.template-spec/process/orchestration-contract.yaml';
  if (existsSync(path.join(target, manifest))) {
    const loaded = loadOrchestrationContract(ref => readFileSync(safeFile(target, ref)), manifest);
    const kept = new Set(loaded.refs);
    const prune = ref => {
      for (const entry of readdirSync(path.join(target, ref), { withFileTypes: true })) {
        const child = `${ref}/${entry.name}`;
        if (entry.isDirectory()) prune(child);
        else if (!kept.has(child)) rmSync(path.join(target, child));
      }
    };
    const parts = '.template-spec/process/orchestration';
    if (existsSync(path.join(target, parts))) prune(parts);
  }
  cache.set(key, target);
  process.on("exit", () => rmSync(target, { recursive: true, force: true }));
  return target;
}
