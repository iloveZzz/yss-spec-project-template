import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { tmpdir } from "node:os";
import { ROOT } from "./template-verification.mjs";

function fail(message) { throw new TypeError(message); }
function ensure(condition, message) { if (!condition) fail(message); }
function git(args, cwd) {
  const result = spawnSync("git", args, { cwd, encoding: "utf8" });
  if (result.status !== 0) fail(result.stderr.trim() || `git ${args.join(" ")} 执行失败`);
  return result.stdout.trim();
}

export function acquireTemplateCommit({ repository, commit, cacheRoot = path.join(ROOT, ".template-source/cache/remote-templates"), allowLocal = false }) {
  ensure(typeof repository === "string" && repository.trim(), "repository 不能为空");
  ensure(/^[a-f0-9]{40}$/.test(commit), "模板 ref 必须是 40 位 commit");
  if (!allowLocal) ensure(/^(?:https?:\/\/|ssh:\/\/|git@)/.test(repository), "正式模板缓存只接受远程 repository URL");
  const key = createHash("sha256").update(repository).update("\0").update(commit).digest("hex");
  const entry = path.join(cacheRoot, key);
  const repositoryPath = path.join(entry, "repository.git");
  const metadataPath = path.join(entry, "metadata.json");
  if (existsSync(entry)) {
    ensure(existsSync(metadataPath) && existsSync(repositoryPath), "模板缓存不完整");
    const metadata = JSON.parse(readFileSync(metadataPath, "utf8"));
    ensure(metadata.repository === repository && metadata.commit === commit && metadata.key === key, "模板缓存来源不一致");
    const actual = git(["--git-dir", repositoryPath, "rev-parse", `${commit}^{commit}`], ROOT);
    ensure(actual === commit, "模板缓存 object hash 校验失败");
    return { cache_hit: true, key, commit, repository, repository_path: repositoryPath, metadata_path: metadataPath };
  }

  mkdirSync(cacheRoot, { recursive: true });
  const temporary = mkdtempSync(path.join(cacheRoot, ".fetch-"));
  try {
    const temporaryRepository = path.join(temporary, "repository.git");
    git(["init", "--bare", "-q", temporaryRepository], ROOT);
    git(["--git-dir", temporaryRepository, "fetch", "--depth=1", "--no-tags", repository, commit], ROOT);
    const actual = git(["--git-dir", temporaryRepository, "rev-parse", "FETCH_HEAD^{commit}"], ROOT);
    ensure(actual === commit, `远程返回 commit 与请求不一致: ${actual}`);
    writeFileSync(path.join(temporary, "metadata.json"), `${JSON.stringify({ schema_version: 1, key, repository, commit })}\n`);
    renameSync(temporary, entry);
  } catch (error) {
    rmSync(temporary, { recursive: true, force: true });
    throw error;
  }
  return { cache_hit: false, key, commit, repository, repository_path: repositoryPath, metadata_path: metadataPath };
}
