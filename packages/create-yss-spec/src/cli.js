const fs = require("node:fs");
const path = require("node:path");
const readline = require("node:readline/promises");
const crypto = require("node:crypto");
const { spawnSync } = require("node:child_process");

const PACKAGE_ROOT = path.resolve(__dirname, "..");
const PACKAGE_MANIFEST = JSON.parse(
  fs.readFileSync(path.join(PACKAGE_ROOT, "package.json"), "utf8"),
);
const BUNDLED_TEMPLATE_ROOT = path.join(PACKAGE_ROOT, "template");
const REPO_TEMPLATE_ROOT = path.resolve(PACKAGE_ROOT, "../..");
const REPO_MANIFEST_PATH = path.join(REPO_TEMPLATE_ROOT, "template.manifest.json");
const BUNDLED_MANIFEST_PATH = path.join(PACKAGE_ROOT, "template.manifest.json");
const IS_REPO_DEVELOPMENT =
  fs.existsSync(path.join(REPO_TEMPLATE_ROOT, "AGENTS.md")) &&
  fs.existsSync(REPO_MANIFEST_PATH);
const TEMPLATE_ROOT = IS_REPO_DEVELOPMENT
  ? REPO_TEMPLATE_ROOT
  : BUNDLED_TEMPLATE_ROOT;
const TEMPLATE_MANIFEST_PATH = IS_REPO_DEVELOPMENT
  ? REPO_MANIFEST_PATH
  : BUNDLED_MANIFEST_PATH;
const TEMPLATE_MANIFEST_TEXT = fs.readFileSync(TEMPLATE_MANIFEST_PATH, "utf8");
const TEMPLATE_MANIFEST = JSON.parse(TEMPLATE_MANIFEST_TEXT);
const ROOT_EXCLUDED_ENTRIES = new Set(TEMPLATE_MANIFEST.excludeRootEntries);
const ROOT_EXCLUDED_FILES = new Set(TEMPLATE_MANIFEST.excludeRootFiles);
const EXCLUDED_RELATIVE_PATHS = new Set(TEMPLATE_MANIFEST.excludePaths);
const RENDERED_RELATIVE_PATHS = new Set(TEMPLATE_MANIFEST.renderPaths);
const EXAMPLE_DOC_PATHS = new Set(TEMPLATE_MANIFEST.exampleDocPaths);
const TEMPLATE_METADATA_FILENAME = ".yss-template.json";
const TEMPLATE_MANIFEST_VERSION = sha256(TEMPLATE_MANIFEST_TEXT);
const REPO_TRACKED_STATE = IS_REPO_DEVELOPMENT
  ? loadRepoTrackedState(REPO_TEMPLATE_ROOT)
  : null;

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function nowIsoString() {
  return new Date().toISOString();
}

function getTemplateSource() {
  return IS_REPO_DEVELOPMENT
    ? "repo-development"
    : `npm:${PACKAGE_MANIFEST.name}@${PACKAGE_MANIFEST.version}`;
}

function loadRepoTrackedState(repoRoot) {
  const result = spawnSync("git", ["ls-files"], {
    cwd: repoRoot,
    encoding: "utf8",
  });

  if (result.status !== 0) {
    return null;
  }

  const files = new Set();
  const directories = new Set();

  for (const entry of result.stdout.split(/\r?\n/)) {
    if (!entry) {
      continue;
    }

    const normalizedEntry = entry.split(path.sep).join("/");
    files.add(normalizedEntry);

    const segments = normalizedEntry.split("/");
    segments.pop();

    let current = "";
    for (const segment of segments) {
      current = current ? `${current}/${segment}` : segment;
      directories.add(current);
    }
  }

  return {
    files,
    directories,
  };
}

function parseArgs(argv) {
  const options = {};

  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];
    const next = argv[index + 1];

    if (current === "--project-name" && next) {
      options.projectName = next;
      index += 1;
    } else if (current === "--business-domain" && next) {
      options.businessDomain = next;
      index += 1;
    } else if (current === "--team-size" && next) {
      options.teamSize = next;
      index += 1;
    } else if (current === "--target-dir" && next) {
      options.targetDir = next;
      index += 1;
    } else if (current === "--issue-tracker" && next) {
      options.issueTracker = next;
      index += 1;
    } else if (current === "--dry-run") {
      options.dryRun = true;
    } else if (current === "--force") {
      options.force = true;
    } else if (current === "--git-init") {
      options.gitInit = true;
    } else if (current === "--include-example-docs") {
      options.includeExampleDocs = true;
    } else if (current === "--no-example-docs") {
      options.includeExampleDocs = false;
    }
  }

  return options;
}

async function promptForMissingOptions(options) {
  if (!process.stdin.isTTY) {
    return promptFromBufferedInput(options);
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    const projectName =
      options.projectName || (await rl.question("项目名称: ")).trim();
    const businessDomain =
      options.businessDomain || (await rl.question("业务领域: ")).trim();
    const teamSizeInput =
      options.teamSize !== undefined
        ? options.teamSize
        : await rl.question("团队规模（可留空）: ");
    const targetDir =
      options.targetDir || (await rl.question("目标目录: ")).trim();

    return {
      projectName,
      businessDomain,
      teamSize: (teamSizeInput || "").trim() || "待补充",
      targetDir,
      issueTracker: options.issueTracker || "github",
      dryRun: Boolean(options.dryRun),
      force: Boolean(options.force),
      gitInit: Boolean(options.gitInit),
      includeExampleDocs:
        options.includeExampleDocs === undefined
          ? true
          : Boolean(options.includeExampleDocs),
    };
  } finally {
    rl.close();
  }
}

async function promptFromBufferedInput(options) {
  const chunks = [];

  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }

  const answers = Buffer.concat(chunks)
    .toString("utf8")
    .split(/\r?\n/);
  let answerIndex = 0;
  const ask = (label) => {
    process.stdout.write(`${label}: `);
    const value = answers[answerIndex] ?? "";
    answerIndex += 1;
    return value.trim();
  };

  const projectName = options.projectName || ask("项目名称");
  const businessDomain = options.businessDomain || ask("业务领域");
  const teamSizeInput =
    options.teamSize !== undefined ? options.teamSize : ask("团队规模（可留空）");
  const targetDir = options.targetDir || ask("目标目录");

  return {
    projectName,
    businessDomain,
    teamSize: teamSizeInput || "待补充",
    targetDir,
    issueTracker: options.issueTracker || "github",
    dryRun: Boolean(options.dryRun),
    force: Boolean(options.force),
    gitInit: Boolean(options.gitInit),
    includeExampleDocs:
      options.includeExampleDocs === undefined
        ? true
        : Boolean(options.includeExampleDocs),
  };
}

function assertRequiredOptions(options) {
  if (!options.projectName) {
    throw new Error("项目名称不能为空");
  }

  if (!options.businessDomain) {
    throw new Error("业务领域不能为空");
  }

  if (!options.targetDir) {
    throw new Error("目标目录不能为空");
  }
}

function normalizeTargetDir(targetDir) {
  return path.resolve(process.cwd(), targetDir);
}

function isInsideTemplateRoot(targetDir) {
  const relativePath = path.relative(TEMPLATE_ROOT, targetDir);
  return (
    relativePath === "" ||
    (!relativePath.startsWith("..") && !path.isAbsolute(relativePath))
  );
}

function shouldExcludeRelativePath(relativePath) {
  const normalizedPath = relativePath.split(path.sep).join("/");
  return EXCLUDED_RELATIVE_PATHS.has(normalizedPath);
}

function shouldSkipRootEntry(entryName) {
  return (
    ROOT_EXCLUDED_ENTRIES.has(entryName) || ROOT_EXCLUDED_FILES.has(entryName)
  );
}

function shouldSkipRepoDevelopmentPath(relativePath, isDirectory) {
  if (!REPO_TRACKED_STATE) {
    return false;
  }

  const normalizedPath = relativePath.split(path.sep).join("/");

  if (isDirectory) {
    return !REPO_TRACKED_STATE.directories.has(normalizedPath);
  }

  return !REPO_TRACKED_STATE.files.has(normalizedPath);
}

function renderTemplateFile(relativePath, content, variables) {
  if (relativePath === "AGENTS.md") {
    return content
      .replace(/(\*\*项目名称：\*\*\s*)\[填写\]/, `$1${variables.projectName}`)
      .replace(
        /(\*\*业务领域：\*\*\s*)\[填写\]/,
        `$1${variables.businessDomain}`,
      )
      .replace(/(\*\*团队规模：\*\*\s*)\[填写\]/, `$1${variables.teamSize}`);
  }

  if (relativePath === "README.md") {
    return content
      .replace(/^# YSS Spec Project Template/m, `# ${variables.projectName}`)
      .replace(
        /^> Matt Pocock Engineering Skills/m,
        `> 默认 Issue Tracker：${variables.issueTracker}\n>\n> Matt Pocock Engineering Skills`,
      );
  }

  return content;
}

function collectManagedFileHashes(operations) {
  const managedFiles = {};

  for (const operation of operations) {
    if (operation.type !== "copy" && operation.type !== "render") {
      continue;
    }

    managedFiles[operation.relativePath] = {
      type: operation.type,
      contentHash: sha256(fs.readFileSync(operation.targetPath)),
    };
  }

  return managedFiles;
}

function writeTemplateMetadata(targetDir, metadata) {
  const metadataPath = path.join(targetDir, TEMPLATE_METADATA_FILENAME);
  fs.writeFileSync(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`, "utf8");
}

function buildTemplateMetadata(targetDir, variables, operations) {
  const timestamp = nowIsoString();

  return {
    templateName: PACKAGE_MANIFEST.name,
    templateVersion: PACKAGE_MANIFEST.version,
    templateSource: getTemplateSource(),
    initializedAt: timestamp,
    lastSyncedAt: timestamp,
    managedFilesManifestVersion: TEMPLATE_MANIFEST_VERSION,
    variables: {
      projectName: variables.projectName,
      businessDomain: variables.businessDomain,
      teamSize: variables.teamSize,
      issueTracker: variables.issueTracker,
      includeExampleDocs: variables.includeExampleDocs,
    },
    managedFiles: collectManagedFileHashes(operations),
  };
}

function buildCopyPlan(sourceDir, targetDir, variables, relativeDir = "") {
  const operations = [];
  const entries = fs.readdirSync(sourceDir, { withFileTypes: true });

  for (const entry of entries) {
    if (!relativeDir && shouldSkipRootEntry(entry.name)) {
      continue;
    }

    const relativePath = relativeDir
      ? path.posix.join(relativeDir, entry.name)
      : entry.name;

    if (shouldSkipRepoDevelopmentPath(relativePath, entry.isDirectory())) {
      continue;
    }

    if (shouldExcludeRelativePath(relativePath)) {
      continue;
    }

    if (!variables.includeExampleDocs && EXAMPLE_DOC_PATHS.has(relativePath)) {
      continue;
    }

    const sourcePath = path.join(sourceDir, entry.name);
    const targetPath = path.join(targetDir, entry.name);

    if (entry.isDirectory()) {
      operations.push({
        type: "mkdir",
        relativePath,
        targetPath,
      });
      operations.push(
        ...buildCopyPlan(sourcePath, targetPath, variables, relativePath),
      );
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    if (RENDERED_RELATIVE_PATHS.has(relativePath)) {
      operations.push({
        type: "render",
        relativePath,
        sourcePath,
        targetPath,
      });
      continue;
    }

    operations.push({
      type: "copy",
      relativePath,
      sourcePath,
      targetPath,
    });
  }

  return operations;
}

function printDryRun(operations, targetDir) {
  console.log("dry-run 预览");
  console.log(`输出目录：${targetDir}`);

  for (const operation of operations) {
    console.log(`${operation.type}: ${operation.relativePath}`);
  }
}

function inspectTargetDir(targetDir, force) {
  if (isInsideTemplateRoot(targetDir)) {
    throw new Error("目标目录不能位于模板源仓库内部");
  }

  if (!fs.existsSync(targetDir)) {
    return {
      exists: false,
      clearEntries: false,
    };
  }

  const entries = fs.readdirSync(targetDir);
  if (entries.length > 0 && !force) {
    throw new Error("目标目录非空，当前主路径不支持覆盖已有内容");
  }

  return {
    exists: true,
    clearEntries: entries.length > 0 && force,
  };
}

function prepareTargetDir(targetDir, targetState) {
  if (!targetState.exists) {
    fs.mkdirSync(targetDir, { recursive: true });
    return;
  }

  if (!targetState.clearEntries) {
    return;
  }

  for (const entry of fs.readdirSync(targetDir)) {
    fs.rmSync(path.join(targetDir, entry), { recursive: true, force: true });
  }
}

function executePlan(operations, variables) {
  for (const operation of operations) {
    if (operation.type === "mkdir") {
      fs.mkdirSync(operation.targetPath, { recursive: true });
      continue;
    }

    if (operation.type === "render") {
      const renderedContent = renderTemplateFile(
        operation.relativePath,
        fs.readFileSync(operation.sourcePath, "utf8"),
        variables,
      );
      fs.mkdirSync(path.dirname(operation.targetPath), { recursive: true });
      fs.writeFileSync(operation.targetPath, renderedContent, "utf8");
      continue;
    }

    fs.mkdirSync(path.dirname(operation.targetPath), { recursive: true });
    fs.copyFileSync(operation.sourcePath, operation.targetPath);
  }
}

function initializeGitRepository(targetDir) {
  const result = spawnSync("git", ["init"], {
    cwd: targetDir,
    encoding: "utf8",
  });

  if (result.status !== 0) {
    throw new Error(result.stderr.trim() || "git init 执行失败");
  }
}

function loadTemplateMetadata(targetDir) {
  const metadataPath = path.join(targetDir, TEMPLATE_METADATA_FILENAME);

  if (!fs.existsSync(metadataPath)) {
    throw new Error(
      `当前目录不是受支持的模板实例仓库，缺少模板元数据文件 ${TEMPLATE_METADATA_FILENAME}`,
    );
  }

  return {
    metadataPath,
    metadata: JSON.parse(fs.readFileSync(metadataPath, "utf8")),
  };
}

function buildSyncVariables(metadata) {
  const variables = metadata.variables || {};

  return {
    projectName: variables.projectName,
    businessDomain: variables.businessDomain,
    teamSize: variables.teamSize || "待补充",
    issueTracker: variables.issueTracker || "github",
    includeExampleDocs:
      variables.includeExampleDocs === undefined
        ? true
        : Boolean(variables.includeExampleDocs),
  };
}

function buildDesiredManagedOperations(targetDir, metadata) {
  const variables = buildSyncVariables(metadata);

  return buildCopyPlan(TEMPLATE_ROOT, targetDir, variables).filter(
    (operation) => operation.type === "copy" || operation.type === "render",
  );
}

function buildDesiredManagedFile(operation, metadata) {
  const variables = buildSyncVariables(metadata);

  if (operation.type === "render") {
    const renderedContent = renderTemplateFile(
      operation.relativePath,
      fs.readFileSync(operation.sourcePath, "utf8"),
      variables,
    );

    return {
      ...operation,
      desiredContent: renderedContent,
      desiredHash: sha256(renderedContent),
    };
  }

  return {
    ...operation,
    desiredHash: sha256(fs.readFileSync(operation.sourcePath)),
  };
}

function classifySyncPlan(targetDir, metadata) {
  const managedFiles = metadata.managedFiles || {};
  const desiredOperations = buildDesiredManagedOperations(targetDir, metadata).map(
    (operation) => buildDesiredManagedFile(operation, metadata),
  );
  const desiredPathSet = new Set(
    desiredOperations.map((operation) => operation.relativePath),
  );

  const updated = [];
  const added = [];
  const unchanged = [];
  const skipped = [];

  for (const operation of desiredOperations) {
    const existingRecord = managedFiles[operation.relativePath];
    const existsOnDisk = fs.existsSync(operation.targetPath);

    if (!existingRecord) {
      if (!existsOnDisk) {
        added.push(operation);
        continue;
      }

      const currentHash = sha256(fs.readFileSync(operation.targetPath));
      if (currentHash === operation.desiredHash) {
        unchanged.push(operation);
      } else {
        skipped.push({
          ...operation,
          reason: "文件已存在，但不在受管模板文件基线中",
        });
      }
      continue;
    }

    if (!existsOnDisk) {
      added.push(operation);
      continue;
    }

    const currentHash = sha256(fs.readFileSync(operation.targetPath));
    if (currentHash !== existingRecord.contentHash) {
      skipped.push({
        ...operation,
        reason: "检测到本地已修改的受管文件",
      });
      continue;
    }

    if (currentHash === operation.desiredHash) {
      unchanged.push(operation);
      continue;
    }

    updated.push(operation);
  }

  const removed = Object.keys(managedFiles).filter(
    (relativePath) => !desiredPathSet.has(relativePath),
  );

  return {
    updated,
    added,
    unchanged,
    skipped,
    removed,
    desiredOperations,
  };
}

function printSyncDryRun(targetDir, metadata, syncPlan) {
  console.log("sync dry-run 预览");
  console.log(`目标目录：${targetDir}`);
  console.log(
    `模板版本：${metadata.templateVersion || "unknown"} -> ${PACKAGE_MANIFEST.version}`,
  );

  for (const operation of syncPlan.updated) {
    console.log(`update: ${operation.relativePath}`);
  }

  for (const operation of syncPlan.added) {
    console.log(`add: ${operation.relativePath}`);
  }

  for (const operation of syncPlan.skipped) {
    console.log(`skip: ${operation.relativePath} (${operation.reason})`);
  }

  for (const relativePath of syncPlan.removed) {
    console.log(`remove-report: ${relativePath}`);
  }
}

function applyManagedFileOperation(operation) {
  fs.mkdirSync(path.dirname(operation.targetPath), { recursive: true });

  if (operation.type === "render") {
    fs.writeFileSync(operation.targetPath, operation.desiredContent, "utf8");
    return;
  }

  fs.copyFileSync(operation.sourcePath, operation.targetPath);
}

function syncTemplateInstance(targetDir, metadata, dryRun) {
  const syncPlan = classifySyncPlan(targetDir, metadata);

  if (dryRun) {
    printSyncDryRun(targetDir, metadata, syncPlan);
    return;
  }

  for (const operation of [...syncPlan.updated, ...syncPlan.added]) {
    applyManagedFileOperation(operation);
  }

  const nextManagedFiles = { ...(metadata.managedFiles || {}) };
  for (const operation of syncPlan.desiredOperations) {
    if (!fs.existsSync(operation.targetPath)) {
      continue;
    }

    const currentHash = sha256(fs.readFileSync(operation.targetPath));
    if (currentHash !== operation.desiredHash) {
      continue;
    }

    nextManagedFiles[operation.relativePath] = {
      type: operation.type,
      contentHash: operation.desiredHash,
    };
  }

  const nextMetadata = {
    ...metadata,
    templateName: PACKAGE_MANIFEST.name,
    templateVersion: PACKAGE_MANIFEST.version,
    templateSource: getTemplateSource(),
    lastSyncedAt: nowIsoString(),
    managedFilesManifestVersion: TEMPLATE_MANIFEST_VERSION,
    managedFiles: nextManagedFiles,
  };

  writeTemplateMetadata(targetDir, nextMetadata);

  console.log("同步完成");
  console.log(
    `模板版本：${metadata.templateVersion || "unknown"} -> ${PACKAGE_MANIFEST.version}`,
  );
  console.log(`自动更新：${syncPlan.updated.length}`);
  console.log(`新增文件：${syncPlan.added.length}`);
  console.log(`跳过文件：${syncPlan.skipped.length}`);
  console.log(`删除差异：${syncPlan.removed.length}`);

  if (syncPlan.skipped.length > 0) {
    console.log("本地已修改，已跳过：");
    for (const operation of syncPlan.skipped) {
      console.log(`- ${operation.relativePath}: ${operation.reason}`);
    }
  }

  if (syncPlan.removed.length > 0) {
    console.log("模板已移除但未自动删除：");
    for (const relativePath of syncPlan.removed) {
      console.log(`- ${relativePath}`);
    }
  }

  console.log("下一步建议：");
  console.log("1. 运行 git diff 或 git status 检查同步结果");
  console.log("2. 人工处理被跳过文件和删除差异（如有）");
  console.log("3. 确认无误后提交本次模板同步结果");
}

async function runInit(argv = []) {
  const promptedOptions = await promptForMissingOptions(parseArgs(argv));
  assertRequiredOptions(promptedOptions);

  const targetDir = normalizeTargetDir(promptedOptions.targetDir);
  const targetState = inspectTargetDir(targetDir, promptedOptions.force);

  const operations = buildCopyPlan(TEMPLATE_ROOT, targetDir, promptedOptions);

  if (promptedOptions.dryRun) {
    printDryRun(operations, targetDir);
    return;
  }

  prepareTargetDir(targetDir, targetState);
  executePlan(operations, promptedOptions);
  writeTemplateMetadata(
    targetDir,
    buildTemplateMetadata(targetDir, promptedOptions, operations),
  );

  if (promptedOptions.gitInit) {
    initializeGitRepository(targetDir);
  }

  console.log("初始化完成");
  console.log(`输出目录：${targetDir}`);
  console.log("下一步建议：");
  console.log(`1. cd ${targetDir}`);
  console.log(
    promptedOptions.gitInit
      ? "2. 运行 git status 检查初始化结果"
      : "2. 如需版本管理，可执行 git init",
  );
  console.log("3. 检查 AGENTS.md、README 和 docs 目录是否符合预期");
}

function runSync(argv = []) {
  const options = parseArgs(argv);
  const targetDir = normalizeTargetDir(options.targetDir || ".");
  const { metadata } = loadTemplateMetadata(targetDir);
  syncTemplateInstance(targetDir, metadata, Boolean(options.dryRun));
}

async function runCli(argv = []) {
  if (argv[0] === "sync") {
    runSync(argv.slice(1));
    return;
  }

  await runInit(argv);
}

module.exports = {
  runCli,
};
