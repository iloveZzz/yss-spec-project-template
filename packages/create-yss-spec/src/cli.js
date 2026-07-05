const fs = require("node:fs");
const path = require("node:path");
const readline = require("node:readline/promises");
const { spawnSync } = require("node:child_process");

const PACKAGE_ROOT = path.resolve(__dirname, "..");
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
const TEMPLATE_MANIFEST = JSON.parse(
  fs.readFileSync(TEMPLATE_MANIFEST_PATH, "utf8"),
);
const ROOT_EXCLUDED_ENTRIES = new Set(TEMPLATE_MANIFEST.excludeRootEntries);
const ROOT_EXCLUDED_FILES = new Set(TEMPLATE_MANIFEST.excludeRootFiles);
const EXCLUDED_RELATIVE_PATHS = new Set(TEMPLATE_MANIFEST.excludePaths);
const RENDERED_RELATIVE_PATHS = new Set(TEMPLATE_MANIFEST.renderPaths);
const EXAMPLE_DOC_PATHS = new Set(TEMPLATE_MANIFEST.exampleDocPaths);

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
  const teamSizeInput = options.teamSize !== undefined ? options.teamSize : "待补充";
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

function ensureWritableTargetDir(targetDir, force) {
  if (isInsideTemplateRoot(targetDir)) {
    throw new Error("目标目录不能位于模板源仓库内部");
  }

  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
    return;
  }

  const entries = fs.readdirSync(targetDir);
  if (entries.length > 0) {
    if (force) {
      for (const entry of entries) {
        fs.rmSync(path.join(targetDir, entry), { recursive: true, force: true });
      }
      return;
    }

    throw new Error("目标目录非空，当前主路径不支持覆盖已有内容");
  }
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

async function runCli(argv = []) {
  const promptedOptions = await promptForMissingOptions(parseArgs(argv));
  assertRequiredOptions(promptedOptions);

  const targetDir = normalizeTargetDir(promptedOptions.targetDir);
  ensureWritableTargetDir(targetDir, promptedOptions.force);

  const operations = buildCopyPlan(TEMPLATE_ROOT, targetDir, promptedOptions);

  if (promptedOptions.dryRun) {
    printDryRun(operations, targetDir);
    return;
  }

  executePlan(operations, promptedOptions);

  if (promptedOptions.gitInit) {
    initializeGitRepository(targetDir);
  }

  console.log("初始化完成");
  console.log(`输出目录：${targetDir}`);
}

module.exports = {
  runCli,
};
