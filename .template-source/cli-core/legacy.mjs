import { ensure, governance } from './io.mjs';
import { userOwned } from './family.mjs';
export function normalizeLegacy(meta, family) {
  ensure(family.side === 'design' && meta.metadataSchemaVersion === 1, '不支持旧实例', 'LEGACY');
  for (const key of ['profileId', 'templateName', 'templateSource']) ensure(meta[key] === family[key], `旧 metadata 身份矛盾: ${key}`, 'IDENTITY');
  ensure(/^[a-f0-9]{40}$/.test(meta.templateCommit) && /^[a-f0-9]{64}$/.test(meta.snapshotHash) && /^[a-f0-9]{64}$/.test(meta.managedFilesManifestVersion), '旧 metadata 来源摘要不完整', 'BASELINE');
  ensure(['committed', 'working-tree'].includes(meta.templateSourceState), '旧 metadata 来源状态非法', 'BASELINE');
  ensure(meta.variables && ['projectName','businessDomain','teamSize','issueTracker'].every(k => typeof meta.variables[k] === 'string' && meta.variables[k].trim()) && ['local-markdown','github','gitlab'].includes(meta.variables.issueTracker), '旧实例变量不完整', 'BASELINE');
  ensure(meta.managedFiles && typeof meta.managedFiles === 'object' && !Array.isArray(meta.managedFiles), '旧基线缺失', 'BASELINE');
  const managedFiles = {}, legacyRetainedFiles = [];
  for (const [ref, record] of Object.entries(meta.managedFiles)) {
    if (ref !== "scripts/instantiate-harness") governance(ref);
    ensure(record && ['copy','render'].includes(record.type) && /^[a-f0-9]{64}$/.test(record.contentHash), `旧基线非法: ${ref}`, 'BASELINE');
    if (ref === "scripts/instantiate-harness") { legacyRetainedFiles.push(ref); continue; }
    if (!userOwned(ref, family)) managedFiles[ref] = { baseline: {type:'file',digest:record.contentHash,mode:0o644}, lastApplied:null, legacyUnproven:true };
  }
  for (const ref of ['yss-project.yaml','docs/process/harness-profile.yaml','AGENTS.md','CONTEXT.md']) ensure(managedFiles[ref], `旧基线缺少合同: ${ref}`, 'BASELINE');
  return {...meta, legacy:true, legacyRetainedFiles, variables:{...meta.variables,includeExampleDocs:true}, managedFiles};
}
