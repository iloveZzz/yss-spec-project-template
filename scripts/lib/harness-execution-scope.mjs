import { existsSync } from 'node:fs';
import path from 'node:path';
import { ROOT, read, safe, ensure } from './strategic-handoff-io.mjs';

export function loadDeliveryProfile(root=ROOT) {
  const metadata=['backend','frontend'].filter(side=>existsSync(path.join(root,`.yss-harness-${side}.json`)));
  ensure(metadata.length<=1,'专职 Harness metadata 身份冲突');
  const profilePath=path.join(root,'docs/process/harness-profile.yaml');
  ensure(!metadata.length||existsSync(profilePath),'专职 Harness 缺少 profile，不得绕过执行门禁');
  const profile=existsSync(profilePath)?read(safe(root,'docs/process/harness-profile.yaml')):null;
  if(metadata.length) {
    const expected=`harness.${metadata[0]}-delivery`;
    const record=read(safe(root,`.yss-harness-${metadata[0]}.json`));
    // Runtime scope checks preserve old projects; the new CLI still refuses their adoption.
    const newIdentity=record.metadataSchemaVersion===2 && !('schema_version' in record) && !('profile_id' in record)
      && record.profileId===expected && record.templateSource===`github:iloveZzz/yss-harness-${metadata[0]}-agent`
      && profile?.instantiation?.cli_package===`create-yss-harness-${metadata[0]}`;
    const oldIdentity=record.schema_version===1 && !('metadataSchemaVersion' in record) && record.profile_id===expected;
    ensure((newIdentity||oldIdentity)&&profile?.profile_id===expected,'专职 Harness metadata 与 profile 不一致');
  }
  return profile;
}

function activeProfile(root) {
  const profile=loadDeliveryProfile(root);
  if (!['harness.backend-delivery','harness.frontend-delivery'].includes(profile?.profile_id)) return null;
  const identity=read(safe(root,'yss-project.yaml'));
  ensure(identity.schema_version===1&&['template-source','project-instance'].includes(identity.repository_mode),'专职 Harness 仓库身份无效');
  return identity.repository_mode==='project-instance'?profile:null;
}

export function enforceHarnessTaskScope(task,{root=ROOT}={}) {
  const profile=activeProfile(root);
  if (!profile) return;
  ensure(task.contract?.kind!=='template-maintenance','专职产品项目不得派发模板维护任务');
  const local=[...profile.audience.target_user_roles,...profile.audience.control_plane_roles];
  const crossReview=['Explorer','Reviewer'].includes(task.execution_state)&&task.allowed_write_paths.length===0;
  ensure(local.includes(task.role_id)||crossReview,'专职 Harness 不允许派发另一端的实现/起草任务');
  const opposite=profile.profile_id==='harness.frontend-delivery'?'backend':'frontend';
  ensure(task.allowed_write_paths.every(ref=>!new RegExp(`^apps/${opposite}(?:/|$)`).test(ref)),'专职 Harness 不允许写入另一端工程');
}

export function enforceHarnessSkillScope(skills,registry,{root=ROOT}={}) {
  const profile=activeProfile(root);
  if (!profile) return;
  const side=profile.profile_id==='harness.frontend-delivery'?'frontend':'backend';
  const opposite=side==='frontend'?'backend':'frontend';
  for (const id of skills) {
    const impacts=registry.skills.find(skill=>skill.id===id)?.impacts||[];
    ensure(!impacts.includes(opposite)||impacts.includes(side)||impacts.includes('lifecycle'),`专职 Harness 不允许编译另一端技能: ${id}`);
  }
}
