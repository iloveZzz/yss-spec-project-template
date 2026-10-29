#!/usr/bin/env node
// 固定 yss 二进制：读取并校验 .template-source/distribution/yss-cli-pin.json（architecture-iteration-v1 FR-002）。
// 根仓不再用 submodule 固定 yss-cli；这里的固定文件记录 yss 的版本号、对应的 yss-cli 提交、构建方式和各平台二进制的 SHA-256。
// 同一提交、同一 Go 版本、yss-cli 的 tools/build-candidate.mjs 构建出的二进制逐字节相同，所以摘要可以用来核对。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

export const PIN_FILE = '.template-source/distribution/yss-cli-pin.json';
const FIELDS = ['schema_version', 'repository', 'version', 'commit', 'go_version', 'build', 'binaries'];
const PLATFORM_KEY = /^(darwin|linux|windows)-(arm64|amd64)$/;
const fail = (message) => { throw new TypeError(message); };

export function platformKey(platform = process.platform, arch = process.arch) {
  const os = { darwin: 'darwin', linux: 'linux', win32: 'windows' }[platform] ?? platform;
  const cpu = { arm64: 'arm64', x64: 'amd64' }[arch] ?? arch;
  return `${os}-${cpu}`;
}

export function validateYssCliPin(pin) {
  if (!pin || typeof pin !== 'object' || Array.isArray(pin)) fail('yss-cli 固定文件必须是对象');
  for (const key of Object.keys(pin)) if (!FIELDS.includes(key)) fail(`yss-cli 固定文件含未知字段: ${key}`);
  if (pin.schema_version !== 1) fail('yss-cli 固定文件 schema_version 必须是 1');
  if (typeof pin.repository !== 'string' || !/^https:\/\/\S+\.git$/.test(pin.repository)) fail('yss-cli 固定文件 repository 必须是 https 的 .git 地址');
  if (typeof pin.version !== 'string' || !/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(-[0-9A-Za-z.-]+)?$/.test(pin.version)) fail('yss-cli 固定文件 version 必须是不带 v 的语义化版本');
  if (typeof pin.commit !== 'string' || !/^[a-f0-9]{40}$/.test(pin.commit)) fail('yss-cli 固定文件 commit 必须是完整 40 位小写 SHA');
  if (typeof pin.go_version !== 'string' || !/^\d+\.\d+\.\d+$/.test(pin.go_version)) fail('yss-cli 固定文件 go_version 必须是 X.Y.Z');
  if (typeof pin.build !== 'string' || !pin.build.trim()) fail('yss-cli 固定文件 build 不能为空');
  if (!pin.binaries || typeof pin.binaries !== 'object' || Array.isArray(pin.binaries) || !Object.keys(pin.binaries).length) fail('yss-cli 固定文件 binaries 至少登记一个平台');
  for (const [key, value] of Object.entries(pin.binaries)) {
    if (!PLATFORM_KEY.test(key)) fail(`yss-cli 固定文件含未知平台: ${key}`);
    if (!value || typeof value !== 'object' || !/^[a-f0-9]{64}$/.test(value.sha256 ?? '') || Object.keys(value).some((field) => field !== 'sha256')) fail(`yss-cli 固定文件 ${key} 的 sha256 必须是 64 位小写十六进制，且只有这一个字段`);
  }
  return pin;
}

const defaultRoot = () => path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

/** 读取并校验固定文件；文件不存在返回 null，内容不合法抛错。 */
export function readYssCliPin(root = defaultRoot()) {
  const file = path.join(root, PIN_FILE);
  if (!fs.existsSync(file)) return null;
  let pin;
  try { pin = JSON.parse(fs.readFileSync(file, 'utf8')); } catch { fail(`${PIN_FILE} 不是合法 JSON`); }
  return validateYssCliPin(pin);
}

/** A verification batch exports its exact pin; consumers never query latest. */
export function readNativeYssPin(root = defaultRoot(), environment = process.env) {
  const file = environment.YSS_NATIVE_PIN_FILE;
  if (!file) {
    if (fs.existsSync(path.join(root, PIN_FILE))) fail('缺少本批固定输入；先运行 ensure-native-yss 默认取得最新正式 Release，或显式 --pin/--pin-file 复现历史输入');
    return null;
  }
  if (!path.isAbsolute(file)) fail('YSS_NATIVE_PIN_FILE 必须是绝对普通文件');
  const stat = fs.lstatSync(file);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1 || stat.size > 65536) fail('YSS_NATIVE_PIN_FILE 必须是受限普通文件');
  const bytes = fs.readFileSync(file);
  if (createHash('sha256').update(bytes).digest('hex') !== environment.YSS_NATIVE_PIN_SHA256) fail('本批 yss pin 摘要漂移或未固定');
  return validateYssCliPin(JSON.parse(bytes));
}

/**
 * 核对二进制摘要与固定文件一致。本地联调自己构建的二进制时，用 YSS_NATIVE_BINARY_OVERRIDE=1 显式覆盖；
 * 结果标记 pinned:false，不能当作固定版本通过。CI 里不接受覆盖。
 */
export function verifyPinnedBinary({ digest, pin, platform = platformKey(), environment = process.env }) {
  validateYssCliPin(pin);
  if (!/^[a-f0-9]{64}$/.test(digest ?? '')) fail('二进制摘要必须是 64 位小写十六进制');
  const expected = pin.binaries[platform]?.sha256;
  if (environment.YSS_NATIVE_BINARY_OVERRIDE === '1') {
    if (environment.CI) fail('CI 不接受覆盖固定的 yss 版本（YSS_NATIVE_BINARY_OVERRIDE）');
    return { pinned: false, overridden_digest: digest, version: pin.version, commit: pin.commit, platform };
  }
  if (!expected) fail(`yss-cli 固定文件没有登记 ${platform} 平台的二进制；本地联调自己构建的二进制请设置 YSS_NATIVE_BINARY_OVERRIDE=1`);
  if (expected !== digest) fail(`yss 二进制与固定版本不符：固定 ${pin.version}（yss-cli ${pin.commit.slice(0, 8)}）在 ${platform} 的 sha256 是 ${expected}，实际 ${digest}；本地联调自己构建的二进制请设置 YSS_NATIVE_BINARY_OVERRIDE=1`);
  return { pinned: true, version: pin.version, commit: pin.commit, platform,
    ...(pin.build.startsWith('regression-only:') ? {purpose:'regression-only',official_installation:false} : {}) };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  // 供 shell 脚本取值：node yss-cli-pin.mjs <repository|version|commit|go_version|build|sha256 <平台>> [--root <目录>]
  try {
    const args = process.argv.slice(2);
    const rootAt = args.indexOf('--root');
    const root = rootAt >= 0 ? path.resolve(args.splice(rootAt, 2)[1]) : defaultRoot();
    const pin = readYssCliPin(root);
    if (!pin) fail(`${PIN_FILE} 不存在`);
    const [field, platform] = args;
    if (field === 'sha256') {
      const value = pin.binaries[platform]?.sha256;
      if (!value) fail(`固定文件没有登记平台 ${platform}`);
      process.stdout.write(`${value}\n`);
    } else if (['repository', 'version', 'commit', 'go_version', 'build'].includes(field)) {
      process.stdout.write(`${pin[field]}\n`);
    } else {
      fail('用法: yss-cli-pin.mjs <repository|version|commit|go_version|build|sha256 <平台>> [--root <目录>]');
    }
  } catch (error) {
    process.stderr.write(`yss-cli-pin 错误: ${error.message}\n`);
    process.exitCode = 1;
  }
}
