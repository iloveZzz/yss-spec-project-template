import fs from 'node:fs';
import path from 'node:path';
import {nativeBinary,nativeDigest,NATIVE_PROFILES} from './native-yss.mjs';

export const REQUIRED_LEGACY_RECOVERY_CASES = [
 'warehouse-fixed-executor-init','legacy-requires-explicit-migration','migration-plan-read-only',
 'migration-apply','native-doctor','migration-rollback','fixed-executor-maintains-restored-instance',
 'repeat-rollback','legacy-pending-migration-refusal','unfinished-fixed-executor-recovery',
 'modified-after-apply-rollback-refusal','protection-bytes-and-mode',
];
const ensure=(value,message)=>{if(!value)throw new TypeError(`LEGACY_RECOVERY_EVIDENCE: ${message}`);};
const digest=value=>/^[a-f0-9]{64}$/.test(value||'');
const expectedRefusal={
 'legacy-requires-explicit-migration':'MIGRATION_REQUIRED',
 'legacy-pending-migration-refusal':'LEGACY_INTERRUPTED',
 'modified-after-apply-rollback-refusal':'CONCURRENT',
};
function ordinary(file,expected){
 ensure(typeof file==='string'&&path.isAbsolute(file),'证据必须使用绝对路径');const stat=fs.lstatSync(file);
 ensure(stat.isFile()&&!stat.isSymbolicLink()&&stat.nlink===1&&fs.realpathSync(file)===path.resolve(file),'证据必须为独立普通文件');
 const bytes=fs.readFileSync(file);ensure(digest(expected)&&nativeDigest(bytes)===expected,'证据摘要漂移');return bytes;
}
/** A separate real historical executor matrix; native upgrade fixtures do not qualify. */
export function validateLegacyRecoveryMatrix({file,sha256,binarySha256}={}){
 ensure(typeof file==='string'&&digest(sha256)&&digest(binarySha256),'缺少固定恢复矩阵、摘要或二进制绑定');
 const report=JSON.parse(ordinary(file,sha256)),directory=path.dirname(file);
 ensure(report.schema_version===1&&report.kind==='native-legacy-recovery-matrix'&&report.status==='passed','恢复矩阵尚未通过');
 ensure(report.fixture===undefined||report.fixture===false,'合成 fixture 不能作为正式恢复证据');
 ensure(report.binary_sha256===binarySha256&&report.input_drift===false,'恢复矩阵二进制错配或输入漂移');
 ensure(JSON.stringify(report.families)===JSON.stringify(NATIVE_PROFILES),'恢复矩阵必须覆盖四个 Profile');
 ensure(Array.isArray(report.unexecuted)&&report.unexecuted.length===0,'恢复矩阵必需项未执行');
 ensure(Array.isArray(report.packages)&&report.packages.length===4,'旧固定执行器来源缺失');
 const packages=new Map();
 for(const pin of report.packages){
  ensure(NATIVE_PROFILES.includes(pin.family)&&!packages.has(pin.family),'旧固定执行器重复或家族非法');
  ensure(typeof pin.version==='string'&&pin.version.length>0&&/^[a-f0-9]{40}$/.test(pin.cli_commit||''),'旧执行器版本或源码 SHA 缺失');
  ordinary(pin.ref,pin.sha256);packages.set(pin.family,pin);
 }
 ensure(Array.isArray(report.cases),'恢复场景缺失');const seen=new Set();
 for(const row of report.cases){
  const key=`${row.family}/${row.case}`,pin=packages.get(row.family);ensure(pin&&!seen.has(key),'恢复场景重复或家族非法');seen.add(key);
  ensure(typeof row.case==='string'&&row.passed===true&&Number.isInteger(row.exit_code),'恢复场景未实际通过');
  ensure(row.expected_code===null||typeof row.expected_code==='string'&&row.expected_code.length>0,'恢复场景期望错误码缺失');
  if(expectedRefusal[row.case])ensure(row.expected_code===expectedRefusal[row.case],'恢复拒绝语义被其他错误码替换');
  else if(REQUIRED_LEGACY_RECOVERY_CASES.includes(row.case))ensure(row.expected_code===null||row.expected_code==='OK','恢复成功目标场景不能被偶然拒绝替换');
  ensure((row.expected_code===null||row.expected_code==='OK')?row.exit_code===0:row.exit_code!==0,'恢复场景实际退出与预期错误码矛盾');
  ensure(row.legacy_package_sha256===pin.sha256,'恢复场景未绑定对应旧固定包');
  ensure(typeof row.log_ref==='string','恢复场景缺少日志');const log=path.resolve(directory,row.log_ref),relative=path.relative(directory,log);
  ensure(relative!==''&&!relative.startsWith(`..${path.sep}`)&&!path.isAbsolute(relative),'恢复日志越出矩阵目录');ordinary(log,row.log_sha256);
 }
 for(const family of NATIVE_PROFILES)for(const name of REQUIRED_LEGACY_RECOVERY_CASES)ensure(seen.has(`${family}/${name}`),`缺少必需恢复场景 ${family}/${name}`);
 return {ref:file,sha256,binary_sha256:binarySha256,families:[...NATIVE_PROFILES],cases:report.cases.length};
}
export function requiredLegacyRecoveryMatrix(environment=process.env){
 const binary=nativeBinary(environment);
 return validateLegacyRecoveryMatrix({file:environment.YSS_LEGACY_RECOVERY_REPORT,sha256:environment.YSS_LEGACY_RECOVERY_REPORT_SHA256,binarySha256:binary.digest});
}
