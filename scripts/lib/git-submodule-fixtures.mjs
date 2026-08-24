import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";

function git(cwd, args) {
  return execFileSync("git", args, { cwd, encoding: "utf8" });
}

function initRepo(dir) {
  mkdirSync(dir, { recursive: true });
  git(dir, ["init", "-b", "main"]);
  git(dir, ["config", "user.email", "test@example.invalid"]);
  git(dir, ["config", "user.name", "fixture"]);
  git(dir, ["config", "commit.gpgsign", "false"]);
}

export function makeGitlinkFixture({ checkout = "empty-gitlink" } = {}) {
  const root = mkdtempSync(path.join(tmpdir(), "yss-gitlink-"));
  const child = path.join(root, "child.git");
  const superproject = path.join(root, "super");
  initRepo(child);
  writeFileSync(path.join(child, "README.md"), "child\n");
  git(child, ["add", "."]);
  git(child, ["commit", "-m", "init child"]);
  const sha = git(child, ["rev-parse", "HEAD"]).trim();
  initRepo(superproject);
  mkdirSync(path.join(superproject, "apps/backend"), { recursive: true });
  const mount = "apps/backend/billing-service";
  if (checkout === "empty-gitlink") {
    mkdirSync(path.join(superproject, mount), { recursive: true });
    writeFileSync(
      path.join(superproject, ".gitmodules"),
      `[submodule "backend-billing-service"]\n\tpath = ${mount}\n\turl = ${child}\n`
    );
    git(superproject, ["update-index", "--add", "--cacheinfo", "160000", sha, mount]);
    git(superproject, ["add", ".gitmodules"]);
    git(superproject, ["commit", "-m", "empty gitlink"]);
  } else {
    git(superproject, ["-c", "protocol.file.allow=always", "submodule", "add", child, mount]);
    git(superproject, ["commit", "-m", "add submodule"]);
    if (checkout === "detached-head") {
      git(path.join(superproject, mount), ["checkout", "--detach"]);
    }
  }
  return {
    root,
    superproject,
    child,
    mount,
    sha,
    cleanup() {
      rmSync(root, { recursive: true, force: true });
    }
  };
}
