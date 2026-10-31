import {spawnSync} from 'node:child_process';
import fs from 'node:fs';
import {parseDocument} from '../../../scripts/vendor/yaml.mjs';

const source=(root,commit,ref)=>{const result=spawnSync('git',['show',`${commit}:${ref}`],{cwd:root,encoding:'utf8',maxBuffer:16*1024*1024});if(result.status!==0)throw new Error(result.stderr||'legacy reference source unavailable');return result.stdout;};
const retiredTemplateCommit='1e49127842c358caf552af8ebec58f438a35c5a6';
// Reviewed release commits and report digests are the trust root, not local tags.
export function parseTrustedReportSources(input) {
  const invalid=()=>{throw new TypeError('REPORT_SOURCE_REGISTRY_INVALID: 固定来源登记无效');};
  if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).sort().join(',')!=='releases,schema_version'||input.schema_version!==1||!Array.isArray(input.releases))invalid();
  const releases=new Map(),versions=new Set(),reports=new Set();
  for(const row of input.releases){
    if(!row||typeof row!=='object'||Array.isArray(row)||Object.keys(row).sort().join(',')!=='commit,reports,version'||!/^5\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)$/.test(row.version||'')||!/^[a-f0-9]{40}$/.test(row.commit||'')||row.commit===retiredTemplateCommit||!Array.isArray(row.reports)||releases.has(row.commit)||versions.has(row.version))invalid();
    for(const digest of row.reports){if(!/^[a-f0-9]{64}$/.test(digest||'')||reports.has(digest))invalid();reports.add(digest);}
    versions.add(row.version);releases.set(row.commit,{version:row.version,reports:[...row.reports]});
  }
  return releases;
}
const trustedSources=()=>parseTrustedReportSources(JSON.parse(fs.readFileSync(new URL('../../process/trusted-verification-releases.json',import.meta.url),'utf8')));
export function trustedReportSource(commit,digest) {
  const source=trustedSources().get(commit);
  return source&&source.reports.includes(digest)?source:null;
}
export function assertSupportedReportCommit(root,commit) {
  if(!/^[a-f0-9]{40}$/.test(commit||'')||!trustedSources().has(commit)||spawnSync('git',['cat-file','-e',`${commit}^{commit}`],{cwd:root}).status!==0)throw new TypeError('REPORT_SOURCE_UNSUPPORTED: 无法验证固定报告来源');
}
export function readHistoricalProfiles(root,commit) {
  if(!/^[a-f0-9]{40}$/.test(commit||''))throw new TypeError('历史策略必须绑定完整 SHA');
  const document=parseDocument(source(root,commit,'.template-source/process/template-verification-profiles.yaml'),{uniqueKeys:true});
  if(document.errors.length)throw new TypeError('历史策略无法解析');
  return document.toJS({maxAliasCount:0});
}
