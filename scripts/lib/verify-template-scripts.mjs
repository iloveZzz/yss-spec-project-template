import { existsSync, readFileSync, readdirSync, realpathSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const legacyRuntime = ["ru", "by"].join("");
const legacyPattern = new RegExp(
  `^#!.*${legacyRuntime}|\\b${legacyRuntime}\\b`,
);

function toPosixPath(value) {
  return value.split(path.sep).join("/");
}

function ancestorDirectories(directory) {
  const ancestors = [];
  let current = path.resolve(directory);
  while (true) {
    ancestors.unshift(current);
    const parent = path.dirname(current);
    if (parent === current) {
      return ancestors;
    }
    current = parent;
  }
}

function hasGitMetadata(cwd) {
  return ancestorDirectories(cwd).some((directory) => existsSync(path.join(directory, ".git")));
}

function gitMetadataDirectory(cwd) {
  return ancestorDirectories(cwd)
    .reverse()
    .find((directory) => existsSync(path.join(directory, ".git"))) || null;
}

function gitCommonDirectory(repositoryRoot) {
  const dotGitPath = path.join(repositoryRoot, ".git");
  try {
    const dotGitContents = readFileSync(dotGitPath, "utf8").trim();
    if (!dotGitContents.startsWith("gitdir:")) {
      return dotGitPath;
    }
    const worktreeGitDirectory = path.resolve(
      repositoryRoot,
      dotGitContents.slice("gitdir:".length).trim(),
    );
    const commonDirectoryPath = path.join(worktreeGitDirectory, "commondir");
    if (!existsSync(commonDirectoryPath)) {
      return worktreeGitDirectory;
    }
    const commonDirectory = readFileSync(commonDirectoryPath, "utf8").trim();
    return commonDirectory
      ? path.resolve(worktreeGitDirectory, commonDirectory)
      : worktreeGitDirectory;
  } catch {
    return dotGitPath;
  }
}

function configuredExcludesFiles(repositoryRoot) {
  const repositoryGitDirectory = gitCommonDirectory(repositoryRoot);
  const homeDirectory = process.env.HOME || path.dirname(repositoryRoot);
  const configPaths = [path.join(repositoryGitDirectory, "config")];
  if (process.env.GIT_CONFIG_GLOBAL) {
    configPaths.push(process.env.GIT_CONFIG_GLOBAL);
  } else {
    const xdgConfigHome = process.env.XDG_CONFIG_HOME || path.join(homeDirectory, ".config");
    configPaths.push(path.join(xdgConfigHome, "git/config"));
    configPaths.push(path.join(homeDirectory, ".gitconfig"));
  }

  const configuredFiles = [];
  for (const configPath of new Set(configPaths)) {
    if (!existsSync(configPath)) {
      continue;
    }
    let section = "";
    for (const line of readFileSync(configPath, "utf8").split(/\r?\n/)) {
      const sectionMatch = line.trim().match(/^\[([^\]]+)\]$/);
      if (sectionMatch) {
        section = sectionMatch[1].trim().toLowerCase();
        continue;
      }
      if (section !== "core") {
        continue;
      }
      const excludesMatch = line.match(/^\s*excludesFile\s*=\s*(.*?)\s*$/i);
      if (!excludesMatch || excludesMatch[1] === "") {
        continue;
      }
      let configuredPath = excludesMatch[1];
      if (configuredPath.startsWith('"') && configuredPath.endsWith('"')) {
        configuredPath = configuredPath.slice(1, -1);
      }
      if (configuredPath.startsWith("~/")) {
        configuredPath = path.join(homeDirectory, configuredPath.slice(2));
      } else if (!path.isAbsolute(configuredPath)) {
        configuredPath = path.resolve(homeDirectory, configuredPath);
      }
      configuredFiles.push(configuredPath);
    }
  }
  return [...new Set(configuredFiles)];
}

function gitInfoExcludeFile(repositoryRoot) {
  const excludePath = path.join(gitCommonDirectory(repositoryRoot), "info", "exclude");
  return existsSync(excludePath) ? excludePath : null;
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function globSource(pattern) {
  let source = "";
  let index = 0;
  while (index < pattern.length) {
    const character = pattern[index];
    if (character === "\\" && index + 1 < pattern.length) {
      source += escapeRegex(pattern[index + 1]);
      index += 2;
      continue;
    } else if (character === "*" && pattern[index + 1] === "*") {
      index += 2;
      while (pattern[index] === "*") {
        index += 1;
      }
      if (pattern[index] === "/") {
        source += "(?:.*/)?";
        index += 1;
      } else {
        source += ".*";
      }
      continue;
    } else if (character === "*") {
      source += "[^/]*";
    } else if (character === "?") {
      source += "[^/]";
    } else if (character === "[") {
      const closing = pattern.indexOf("]", index + 1);
      if (closing > index + 1) {
        let characterClass = pattern.slice(index + 1, closing);
        if (characterClass.startsWith("!")) {
          characterClass = `^${characterClass.slice(1)}`;
        }
        source += `[${characterClass}]`;
        index = closing;
      } else {
        source += "\\[";
      }
    } else {
      source += escapeRegex(character);
    }
    index += 1;
  }
  return source;
}

function parseIgnoreFile(filePath, baseDirectory) {
  return readFileSync(filePath, "utf8").split(/\r?\n/).flatMap((line) => {
    let end = line.length;
    while (end > 0 && line[end - 1] === " ") {
      let backslashCount = 0;
      for (let index = end - 2; index >= 0 && line[index] === "\\"; index -= 1) {
        backslashCount += 1;
      }
      if (backslashCount % 2 === 1) {
        break;
      }
      end -= 1;
    }
    const trimmedLine = line.slice(0, end);
    if (trimmedLine.length === 0 || trimmedLine.startsWith("#")) {
      return [];
    }
    let pattern = trimmedLine;
    let negated = false;
    if (pattern.startsWith("\\#") || pattern.startsWith("\\!")) {
      pattern = pattern.slice(1);
    } else if (pattern.startsWith("!")) {
      negated = true;
      pattern = pattern.slice(1);
    }
    const directoryOnly = pattern.endsWith("/");
    if (directoryOnly) {
      pattern = pattern.replace(/\/+$/, "");
    }
    const anchored = pattern.startsWith("/");
    if (anchored) {
      pattern = pattern.replace(/^\/+/, "");
    }
    if (pattern.length === 0) {
      return [];
    }
    const scoped = anchored || pattern.includes("/");
    return [{
      baseDirectory,
      directoryOnly,
      matcher: new RegExp(`${scoped ? "^" : "(?:^|/)"}${globSource(pattern)}$`),
      negated,
    }];
  });
}

function createIgnoreMatcher(cwd) {
  const includeGitignore = hasGitMetadata(cwd);
  const gitRoot = includeGitignore ? gitMetadataDirectory(cwd) : null;
  const cache = new Map();
  const ignoreFileNames = includeGitignore
    ? [".gitignore", ".ignore", ".rgignore"]
    : [".ignore", ".rgignore"];

  const rulesForDirectory = (directory) => {
    const resolvedDirectory = path.resolve(directory);
    if (cache.has(resolvedDirectory)) {
      return cache.get(resolvedDirectory);
    }
    const rules = [];
    if (gitRoot) {
      const gitExcludePath = gitInfoExcludeFile(gitRoot);
      if (gitExcludePath) {
        rules.push(...parseIgnoreFile(gitExcludePath, gitRoot));
      }
      for (const configuredPath of configuredExcludesFiles(gitRoot)) {
        if (existsSync(configuredPath)) {
          rules.push(...parseIgnoreFile(configuredPath, gitRoot));
        }
      }
    }
    for (const ancestor of ancestorDirectories(resolvedDirectory)) {
      for (const fileName of ignoreFileNames) {
        const ignorePath = path.join(ancestor, fileName);
        if (existsSync(ignorePath)) {
          rules.push(...parseIgnoreFile(ignorePath, ancestor));
        }
      }
    }
    cache.set(resolvedDirectory, rules);
    return rules;
  };

  return (filePath, directory) => {
    const rules = rulesForDirectory(directory ? filePath : path.dirname(filePath));
    let ignored = false;
    for (const rule of rules) {
      if (rule.directoryOnly && !directory) {
        continue;
      }
      const relative = toPosixPath(path.relative(rule.baseDirectory, filePath));
      if (relative && !relative.startsWith("../") && rule.matcher.test(relative)) {
        ignored = !rule.negated;
      }
    }
    return ignored;
  };
}

function collectFiles(rootPath, isIgnored) {
  const files = [];
  const entries = readdirSync(rootPath, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name.startsWith(".")) {
      continue;
    }
    const entryPath = path.join(rootPath, entry.name);
    if (isIgnored(entryPath, entry.isDirectory())) {
      continue;
    }
    if (entry.isDirectory()) {
      files.push(...collectFiles(entryPath, isIgnored));
    } else if (entry.isFile()) {
      files.push(entryPath);
    }
  }
  return files;
}

function relativePath(filePath, cwd) {
  return toPosixPath(path.relative(cwd, filePath));
}

function scanScriptRoots(rootPaths, { cwd = process.cwd() } = {}) {
  const resolvedCwd = path.resolve(cwd);
  const isIgnored = createIgnoreMatcher(resolvedCwd);
  const files = rootPaths.flatMap((rootPath) =>
    collectFiles(path.resolve(resolvedCwd, rootPath), isIgnored),
  );
  const legacyRuntimeMatches = [];
  const legacyExtensionFiles = [];

  for (const filePath of files) {
    const displayPath = relativePath(filePath, resolvedCwd);
    if (!filePath.endsWith(".md")) {
      const sourceBuffer = readFileSync(filePath);
      if (!sourceBuffer.includes(0)) {
        const source = sourceBuffer.toString("utf8");
        for (const [index, lineContent] of source.split(/\r?\n/).entries()) {
          if (legacyPattern.test(lineContent)) {
            legacyRuntimeMatches.push({
              relativePath: displayPath,
              line: index + 1,
              lineContent,
            });
          }
        }
      }
    }
    if (filePath.endsWith(".rb")) {
      legacyExtensionFiles.push(displayPath);
    }
  }

  return { legacyRuntimeMatches, legacyExtensionFiles };
}

function verifyScriptRoots(rootPaths) {
  const result = scanScriptRoots(rootPaths);
  if (result.legacyRuntimeMatches.length > 0) {
    for (const match of result.legacyRuntimeMatches) {
      console.log(`${match.relativePath}:${match.line}:${match.lineContent}`);
    }
    console.error("模板脚本不得保留活跃 Ruby 调用或 shebang");
    return false;
  }
  if (result.legacyExtensionFiles.length > 0) {
    for (const filePath of result.legacyExtensionFiles) {
      console.log(filePath);
    }
    console.error("模板脚本不得保留 .rb 路径");
    return false;
  }
  return true;
}

const isDirectInvocation = (invokedPath) => {
  if (!invokedPath) {
    return false;
  }
  try {
    return realpathSync(invokedPath) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
};

if (isDirectInvocation(process.argv[1])) {
  try {
    const rootPaths = process.argv.slice(2);
    if (rootPaths.length === 0) {
      throw new Error("缺少待扫描的模板脚本目录");
    }
    process.exitCode = verifyScriptRoots(rootPaths) ? 0 : 1;
  } catch (error) {
    console.error(`模板脚本扫描失败：${error.message}`);
    process.exitCode = 1;
  }
}
