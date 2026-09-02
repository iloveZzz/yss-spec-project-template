#!/usr/bin/env node

import { execFile as execFileCallback, spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';

/** Promise 形式的子进程执行函数。 */
const execFile = promisify(execFileCallback);

/** 默认微应用模板地址。 */
const DEFAULT_TEMPLATE_URL =
  process.env.YSS_FRONTEND_TEMPLATE_URL ||
  'http://192.168.167.142:8081/Data-Middleground-Develop-Area/product-code/ai-frontend/yss-design/yss-frontend-template.git';

/** 默认微应用模板分支。 */
const DEFAULT_TEMPLATE_BRANCH = 'template';

/** 默认微应用模板缓存目录。 */
const DEFAULT_CACHE_DIR = path.join(os.tmpdir(), 'yss-frontend-template-cache');

/** 允许的英文应用名格式。 */
const APP_NAME_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** 允许的单段激活路由格式。 */
const ACTIVE_RULE_PATTERN = /^\/[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*$/;

/** 允许的 Git 分支名子集。 */
const BRANCH_PATTERN = /^(?!.*(?:^|\/)\.\.(?:\/|$))[A-Za-z0-9._/-]+$/;

/**
 * 解析命令行参数。
 *
 * @param {string[]} argv 完整命令行参数
 * @returns {Record<string, string | boolean>} 解析后的参数对象
 */
const parseArgs = argv => {
  const args = {};
  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith('--')) {
      continue;
    }

    const key = arg.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith('--')) {
      args[key] = true;
      continue;
    }

    args[key] = next;
    index += 1;
  }
  return args;
};

/**
 * 判断路径是否存在。
 *
 * @param {string} targetPath 待检查路径
 * @returns {Promise<boolean>} 路径是否存在
 */
const pathExists = async targetPath => {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
};

/**
 * 校验 HTTP(S) URL。
 *
 * @param {string} value 待校验地址
 * @param {string} label 参数显示名称
 * @returns {string} 通过校验的地址
 */
const validateHttpUrl = (value, label) => {
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol)) {
      throw new Error('只支持 HTTP(S)');
    }
    return value;
  } catch {
    throw new Error(`${label} 必须是合法的 HTTP(S) URL`);
  }
};

/**
 * 将缓存目录限制在系统临时目录的专用子目录中。
 *
 * @param {string} cacheDir 用户传入的缓存目录
 * @returns {string} 通过安全校验的绝对路径
 */
const resolveSafeCacheDir = cacheDir => {
  const resolvedCacheDir = path.resolve(cacheDir);
  const tempRoot = path.resolve(os.tmpdir());
  const relative = path.relative(tempRoot, resolvedCacheDir);
  const isInsideTemp = relative && !relative.startsWith('..') && !path.isAbsolute(relative);
  const hasDedicatedName = path.basename(resolvedCacheDir).startsWith('yss-frontend-template');

  if (!isInsideTemp || !hasDedicatedName) {
    throw new Error(`cache-dir 必须位于 ${tempRoot} 下且目录名以 yss-frontend-template 开头`);
  }

  return resolvedCacheDir;
};

/**
 * 校验并规范化生成参数。
 *
 * @param {Record<string, string | boolean>} args 原始命令行参数
 * @returns {{appName: string, appNameZh: string, description: string, port: number, activeRule: string, apiBase: string, proxyTarget: string, targetDir: string, templateUrl: string, templateBranch: string, cacheDir: string, openapiUrl: string, dryRun: boolean}} 规范化配置
 */
const normalizeOptions = args => {
  const appName = String(args.name ?? '');
  const appNameZh = String(args['name-zh'] ?? '');
  const description = String(args.description ?? '');
  const activeRule = String(args['active-rule'] ?? '/micro');
  const port = Number(args.port ?? 8081);
  const apiBase = String(args['api-base'] ?? `/api${activeRule}`);
  const proxyTarget = validateHttpUrl(String(args['proxy-target'] ?? 'http://localhost:3000'), 'proxy-target');
  const targetDir = path.resolve(String(args['target-dir'] ?? process.cwd()));
  const templateUrl = validateHttpUrl(String(args['template-url'] ?? DEFAULT_TEMPLATE_URL), 'template-url');
  const templateBranch = String(args['template-branch'] ?? DEFAULT_TEMPLATE_BRANCH);
  const cacheDir = resolveSafeCacheDir(String(args['cache-dir'] ?? DEFAULT_CACHE_DIR));
  const openapiUrl = args['openapi-url'] ? validateHttpUrl(String(args['openapi-url']), 'openapi-url') : '';

  if (!APP_NAME_PATTERN.test(appName)) {
    throw new Error('name 必须使用小写字母、数字和中划线，且不能以中划线开头或结尾');
  }
  if (!appNameZh.trim()) {
    throw new Error('name-zh 为必填参数');
  }
  if (!ACTIVE_RULE_PATTERN.test(activeRule)) {
    throw new Error('active-rule 必须是以 / 开头的单段路径');
  }
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('port 必须是 1-65535 之间的整数');
  }
  if (!apiBase.startsWith('/')) {
    throw new Error('api-base 必须以 / 开头');
  }
  if (!BRANCH_PATTERN.test(templateBranch)) {
    throw new Error('template-branch 包含非法字符或不安全的 .. 路径段');
  }

  return {
    appName,
    appNameZh,
    description,
    port,
    activeRule,
    apiBase,
    proxyTarget,
    targetDir,
    templateUrl,
    templateBranch,
    cacheDir,
    openapiUrl,
    dryRun: Boolean(args['dry-run']),
  };
};

/**
 * 在指定目录执行 Git 命令，避免 shell 插值。
 *
 * @param {string[]} args Git 参数列表
 * @param {string | undefined} cwd 工作目录
 * @returns {Promise<string>} 标准输出
 */
const runGit = async (args, cwd) => {
  const { stdout = '' } = await execFile('git', args, { cwd, maxBuffer: 10 * 1024 * 1024 });
  return stdout.trim();
};

/**
 * 拉取或更新经过边界校验的模板缓存。
 *
 * @param {string} url 模板仓库地址
 * @param {string} branch 模板分支
 * @param {string} cacheDir 安全缓存目录
 * @returns {Promise<void>}
 */
const syncTemplate = async (url, branch, cacheDir) => {
  console.log('🔄 正在同步微应用模板库...');
  console.log(`- 仓库地址: ${url}`);
  console.log(`- 分支: ${branch}`);
  console.log(`- 本地缓存: ${cacheDir}`);

  if (!(await pathExists(cacheDir))) {
    await runGit(['clone', '--branch', branch, '--single-branch', '--', url, cacheDir]);
    return;
  }

  if (!(await pathExists(path.join(cacheDir, '.git')))) {
    throw new Error(`缓存目录已存在但不是 Git 仓库: ${cacheDir}`);
  }

  const currentRemote = await runGit(['config', '--get', 'remote.origin.url'], cacheDir);
  if (currentRemote !== url) {
    throw new Error(`缓存仓库 remote 不匹配，期望 ${url}，实际 ${currentRemote}`);
  }

  await runGit(['fetch', 'origin', branch], cacheDir);
  await runGit(['reset', '--hard', `origin/${branch}`], cacheDir);
  await runGit(['clean', '-fd'], cacheDir);
};

/**
 * 运行模板内的微应用生成脚本。
 *
 * @param {string} scriptPath 生成脚本路径
 * @param {ReturnType<typeof normalizeOptions>} options 规范化配置
 * @returns {Promise<void>}
 */
const runScaffoldScript = (scriptPath, options) => {
  const args = [
    scriptPath,
    '--name',
    options.appName,
    '--target-dir',
    options.targetDir,
    '--port',
    String(options.port),
    '--active-rule',
    options.activeRule,
    '--api-base',
    options.apiBase,
    '--proxy-target',
    options.proxyTarget,
  ];

  if (options.openapiUrl) {
    args.push('--openapi-url', options.openapiUrl);
  }

  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, { stdio: 'inherit', shell: false });
    child.once('error', reject);
    child.once('exit', code => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`脚手架生成失败，退出码: ${code ?? '未知'}`));
    });
  });
};

/**
 * 同步生成项目的中文名和描述。
 *
 * @param {string} targetProjectRoot 生成项目根目录
 * @param {string} appNameZh 应用中文名
 * @param {string} description 项目描述
 * @returns {Promise<void>}
 */
const customizeGeneratedProject = async (targetProjectRoot, appNameZh, description) => {
  const microConfigPath = path.join(targetProjectRoot, 'micro-config.json');
  if (await pathExists(microConfigPath)) {
    const content = await fs.readFile(microConfigPath, 'utf8');
    const config = JSON.parse(content);
    config.name = appNameZh;
    if (config.app) {
      config.app.name = appNameZh;
    }
    if (description) {
      config.description = description;
      if (config.app) {
        config.app.description = description;
      }
    }
    await fs.writeFile(microConfigPath, `${JSON.stringify(config, null, 2)}\n`, 'utf8');
  }

  const packagePath = path.join(targetProjectRoot, 'packages/package.json');
  if (description && (await pathExists(packagePath))) {
    const content = await fs.readFile(packagePath, 'utf8');
    const packageJson = JSON.parse(content);
    packageJson.description = description;
    await fs.writeFile(packagePath, `${JSON.stringify(packageJson, null, 2)}\n`, 'utf8');
  }
};

/** 输出命令用法。 */
const printUsage = () => {
  console.log(`用法:
  node create.mjs --name <app-name> --name-zh <中文名> --active-rule </route> --target-dir <父目录>

可选参数:
  --port <1-65535> --description <描述> --api-base </api/path>
  --proxy-target <http(s)://url> --openapi-url <http(s)://url> --dry-run`);
};

/**
 * 执行微应用生成流程。
 *
 * @returns {Promise<void>}
 */
const main = async () => {
  const args = parseArgs(process.argv);
  if (args.help) {
    printUsage();
    return;
  }

  const options = normalizeOptions(args);
  const targetProjectRoot = path.join(options.targetDir, options.appName);
  if (await pathExists(targetProjectRoot)) {
    throw new Error(`目标项目已存在，已停止以避免覆盖: ${targetProjectRoot}`);
  }

  console.log(`📁 最终生成路径: ${targetProjectRoot}`);
  if (options.dryRun) {
    console.log('✅ 参数与路径校验通过，dry-run 未执行网络或写入操作。');
    return;
  }

  await fs.mkdir(options.targetDir, { recursive: true });
  await syncTemplate(options.templateUrl, options.templateBranch, options.cacheDir);

  const scaffoldScriptPath = path.join(options.cacheDir, 'scripts/create-microapp.mjs');
  if (!(await pathExists(scaffoldScriptPath))) {
    throw new Error(`模板内未找到项目生成脚本: ${scaffoldScriptPath}`);
  }

  await runScaffoldScript(scaffoldScriptPath, options);
  await customizeGeneratedProject(targetProjectRoot, options.appNameZh, options.description);

  console.log('🎉 本地微应用项目已创建。');
  console.log(`进入目录: cd "${targetProjectRoot}"`);
  console.log('后续可按需执行: pnpm install 与 pnpm dev');
};

main().catch(error => {
  console.error(`❌ ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
