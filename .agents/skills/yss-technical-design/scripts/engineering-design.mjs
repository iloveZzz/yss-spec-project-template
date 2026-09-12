import path from 'node:path';
import {readFileSync} from 'node:fs';
import {ensure,read,safe,hash} from '../../../../scripts/lib/strategic-handoff-io.mjs';
const beneath=(ref,scope)=>ref===scope||ref.startsWith(`${scope}/`);
export function validateEngineeringDesign(data,{root}) {
 const registration=read(safe(root,data.architecture.decision_ref));
 ensure(registration.architecture_identity?.schema_version===2&&registration.architecture_identity.source_kind==='existing-registration','工程设计分支只承接既有工程身份 v2');
 const binding=registration.architecture_evidence.engineering_baseline;
 ensure(hash(readFileSync(safe(root,binding.ref)))===binding.digest,'工程设计基线摘要漂移');
 const baseline=read(safe(root,binding.ref)),design=data.design;
 ensure(data.inputs.some(x=>x.kind==='engineering'&&x.ref===binding.ref&&x.digest===binding.digest),'工程设计未绑定当前基线输入');
 ensure(data.inputs.some(x=>x.kind==='api'),'工程设计需当前API或经审查的无API依据');
 const ids=new Set(design.component_catalog.map(x=>x.component_id));
 ensure(ids.size===design.component_catalog.length,'工程组件ID重复');
 const paths=new Set();
 for(const component of design.component_catalog){
  const unit=baseline.build_units.find(x=>x.id===component.build_unit_ref);ensure(unit,'工程组件引用未登记的实际构建单元');
  ensure(component.depends_on.every(id=>ids.has(id)),'工程组件依赖悬空');
  for(const ref of component.write_paths){
   ensure(!path.isAbsolute(ref)&&ref.split('/').every(p=>p&&p!=='.'&&p!=='..')&&!ref.includes('\\'),'工程写路径不安全');
   ensure(registration.allowed_write_paths.some(scope=>beneath(ref,scope)),'工程组件写路径超出登记范围');
   ensure(!baseline.boundary_scope.some(scope=>beneath(ref,scope)||beneath(scope,ref)),'工程分支不能改已登记业务架构边界');
   const unitRoot=path.posix.dirname(unit.pom_ref);
   ensure(unitRoot==='.'||beneath(ref,unitRoot),'工程组件写路径与实际构建单元不符');paths.add(ref);
  }
 }
 ensure(design.allowed_write_paths.length===paths.size&&design.allowed_write_paths.every(ref=>paths.has(ref)),'工程设计写范围与组件闭包不一致');
 ensure(data.source_items.length&&data.traceability.every(row=>row.disposition==='implemented'),'工程设计必须逐条承接当前范围，不得全标不适用或延期');
 for(const input of design.read_dependencies)ensure(data.inputs.some(x=>x.ref===input.ref&&x.digest===input.digest),'工程只读依赖未绑定当前输入');
}
