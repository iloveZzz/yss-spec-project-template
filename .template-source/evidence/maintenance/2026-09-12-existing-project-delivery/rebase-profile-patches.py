import pathlib,difflib,hashlib,json
root=pathlib.Path(__file__).resolve().parents[4];source=root/'.agents/skills/yss-implementation-contract-compiler';cfgpath=root/'.template-source/profile-skill-sync.json';cfg=json.loads(cfgpath.read_text())
sourcefiles={str(p.relative_to(source)):p.read_bytes() for p in source.rglob('*') if p.is_file()}
h=hashlib.sha256()
for name,data in sorted(sourcefiles.items()):h.update(name.encode()+b'\0'+data+b'\0')
for profile in ['backend','frontend']:
 target=root/f'submodules/yss-harness-{profile}-agent/.agents/skills/yss-implementation-contract-compiler';desired={str(p.relative_to(target)):p.read_bytes() for p in target.rglob('*') if p.is_file()}
 skill=desired['SKILL.md'].decode();para='\n接入与导出先按 `docs/process/delivery-preflight.md` 执行对应阶段只读预检；既有工程身份按 `docs/process/existing-backend-architecture.md` 读取原始证据，不补造生成器来源。无 UI 改动可承接当前确认的 `existing-ui-baseline`，新设计仍走原型；当前批准后仅允许登记与合同交集内的输出增量。\n'
 if para.strip() not in skill:skill=skill.replace('## 编译结果',para+'\n## 编译结果')
 desired['SKILL.md']=skill.encode()
 content=desired['references/compiler-contract.yaml'].decode()
 if 'existing_identity:' not in content:content=content.replace('  required_identity_surfaces:','  evidence_loading: original-references-and-raw-sha256\n  existing_identity: {schema_version: 2, source_kind: existing-registration, profiles_source: existing_project_profiles}\n  generated_identity: preserve-original-generator-and-module-closure\n  existing_source_policy: fixed-input-and-approved-bounded-output\n  required_identity_surfaces:',1)
 desired['references/compiler-contract.yaml']=content.encode();patch=[]
 for name in sorted(set(sourcefiles)|set(desired)):
  patch.extend(difflib.unified_diff(sourcefiles.get(name,b'').decode().splitlines(True),desired.get(name,b'').decode().splitlines(True),fromfile='a/'+name,tofile='b/'+name))
 item=next(x for x in cfg['profiles'][profile]['adapted'] if x['id']=='yss-implementation-contract-compiler');(root/item['patch']).write_text(''.join(patch));item['source_tree_sha256']=h.hexdigest()
cfgpath.write_text(json.dumps(cfg,ensure_ascii=False,indent=2)+'\n');print('rebased reviewed profile compiler adaptations',h.hexdigest())
