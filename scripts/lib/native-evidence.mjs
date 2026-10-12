// 校验语义归 yss；这里只负责定位固定版本的二进制、拼参数、解码信封并透传退出码。
import {spawnSync} from 'node:child_process';
import {contextBinary} from './native-context.mjs';

export function nativeEvidenceVerify({root, kind, file, extra = [], environment = process.env}) {
  const {binary} = contextBinary(environment);
  const args = ['evidence', 'verify', '--root', root, '--kind', kind, '--file', file, ...extra, '--json'];
  const run = spawnSync(binary, args, {cwd: root, env: environment, encoding: 'utf8', timeout: 120000, maxBuffer: 32 * 1024 * 1024});
  if (run.error || run.signal || !Number.isInteger(run.status)) throw new Error(`NATIVE_INTERRUPTED: ${run.error?.message || run.signal}`);
  let envelope;
  try { envelope = JSON.parse(run.stdout); } catch { throw new Error(`NATIVE_PROTOCOL: 非 JSON 响应（退出码 ${run.status}）：${run.stderr || run.stdout}`.slice(0, 600)); }
  const diagnostics = envelope.result?.diagnostics ?? [];
  return {exitCode: run.status, status: envelope.status, code: envelope.code, diagnostics, message: diagnostics.map((item) => `${item.code}: ${item.message}`).join('；') || envelope.code, envelope};
}
