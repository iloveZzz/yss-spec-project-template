import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
const root='/private/var/folders/8d/60y8vj2j0nn37t4h26zbvvhw0000gn/T/yss-preview-pilot-20260912-0k_x_zmm/backend-governance',dir='docs/.scratch/target-preview-pilot/existing-v2';
const {generateTaskPackageDefaults}=await import(pathToFileURL(root+'/scripts/lib/task-package.mjs'));
const read=n=>JSON.parse(fs.readFileSync(root+'/'+dir+'/'+n));
const write=(n,v)=>fs.writeFileSync(root+'/'+dir+'/'+n,typeof v==='string'?v:JSON.stringify(v,null,2)+'\n');
const c=read('slice-contract.json'),p=c.common.project_roots[0],scope=dir+'/implementation-task.json',verifier=dir+'/verification-task.json';
const inputs=dir+'/verification/runtime-input.json';
const commands=[
 c.testing.verification_commands[0],
 `scripts/pilot/build-delivery-identity --input ${root}/${inputs}`,
 `scripts/pilot/launch-delivery-trial --input ${root}/${inputs}`,
 `node ${root}/${dir}/verification/verify-runtime.mjs --input ${root}/${inputs} --scenario baseline`,
 `node ${root}/${dir}/verification/verify-runtime.mjs --input ${root}/${inputs} --scenario faults-and-recovery`,
 `node ${root}/${dir}/verification/verify-runtime.mjs --input ${root}/${inputs} --scenario vue-regression`
];
c.status='draft';c.contract.freeze_ref=dir+'/freeze-approved-current-evidence.json';c.lifecycle_refs.openapi_freeze_or_no_impact=c.contract.freeze_ref;
c.common.verification_commands=commands;c.backend.verification_commands=commands;c.testing.verification_commands=commands;
c.testing.independent_verification_task_ref=verifier;c.testing.command_mapping_ref=dir+'/verification-command-map.md';
c.work_units[0].verification_commands=commands;c.work_units[0].task_package_ref=scope;
write('verification-command-map.md',`# R3 验证命令与执行责任\n\n当前是已定义的实现/验证入口，不是执行成功记录；对应脚本由本Slice正常实现，Verifier独立执行。全部命令以真实后端根 ${p} 为cwd，治理验证脚本由独立验证工作单元维护。\n\n|命令|覆盖|执行与判定|\n|---|---|---|\n|根mvnw指定两个测试类|S01–S12单元/集成seam|RED/GREEN记录实际退出码；默认profile或缺显式开关均无路由，成功/异常503/无回显，资源/JAR/只读连接/有序读取测试|\n|build-delivery-identity --input|S01–S06、S10–S12|先校验当前合同/基线并构造专属未过滤资源，再以basic,valset-standardizer-fm2spv,discovery-nacos,delivery-trial完整Maven profiles打包；读最终JAR比对资源，生成外部artifact hash，不自引用|\n|launch-delivery-trial --input|S02–S08、S10–S12|仅当前隔离真实JAR/数据库，继承已验证本地sandbox/config；生成每次独立deployment ID及PID/原始argv/时间，禁止把五个期望值直接注入API|\n|verify-runtime baseline|S01–S07、S09–S12|五字段来自独立源码/JAR/原始API/启动记录/双库18query原始读回；实GET200与schema，原预览CURRENT/ALL/EMPTY/非法参数与业务不存在回归；先通过才允许故障派生|\n|verify-runtime faults-and-recovery|S01–S08、S10–S12|从成功基线独立派生资源/JAR/数据/读取超时故障；503无秘密/期望回显；恢复文件与合成数据经正常重建/启动后复验；此为R3机制验证，不冒充跨仓S2/S3/S4|\n|verify-runtime vue-regression|S09及无UI变化边界|同真实Java端口、固定Vue源码与新实采5动作：默认CURRENT1/ALL2/刷新ALL2/EMPTY0/重开CURRENT1；保留截图/请求/响应/console及真实pnpm退出码|\n\nCLI参数合同：三项脚本均消费 --input 指向的本地JSON；input只保存当前原始源引用、真实构建/运行路径、数据基线引用及输出目录，凭据只在已授权private配置中读取且不写证据。scenario只允许表中三项；未知值/缺文件退出非0。命令未形成或未执行时保留pending；不得用占位输出代替。\n\n独立接收S0–S6/O1由后续交付与接收任务执行；本Slice/测试成功本身不宣布整轮完成。\n`);
const defaults=(role,id,unit,kind,ref,allowed,stage,state='Worker')=>generateTaskPackageDefaults(role,{schema_version:1,task_id:id,work_unit_id:unit,actor_id:id,runtime_id:'runtime.skill-projection',execution_state:state,workflow_status:'not-started',contract:{kind,contract_id:kind==='slice-implementation'?c.contract_id:id,contract_version:kind==='slice-implementation'?c.contract_version:1,status:'issued',contract_ref:ref,...(kind==='slice-implementation'?{slice_contract_ref:ref}:{lifecycle_ref:'docs/process/lifecycle-registry.yaml'})},stage_id:stage,feature_id:'target-preview-pilot',inputs:[dir+'/slice-contract.json',dir+'/technical-design.json',dir+'/verification-command-map.md','CONTEXT.md'],objective:state==='Verifier'?'独立验证R3真实JAR/18项双库/原预览与Vue，并保留失败和恢复证据，不修改实现掩盖失败':'严格在已批准Slice和真实当前实施范围内实现默认关闭R3探针；先RED后GREEN。当前仅待派发草案，尚未授权启动Worker。',allowed_write_paths:allowed,forbidden_actions:['超出当前合同写范围','自签批准或伪造部署/接收','Git提交/推送/发布'],expected_outputs:state==='Verifier'?['独立Fresh Verification与真实验证记录']:['探针源码/测试/构建启动脚本及有限输出补丁'],expected_evidence_files:c.common.expected_evidence_files,verification_commands:commands,verification_results:[],downstream_consumers:['harness-orchestrator'],convergence:{parent_work_unit:unit,convergence_ref:dir+'/slice-contract.json'},...(state==='Verifier'?{review_context:{implementation_actor_id:'r3-backend-worker'}}:{user_decisions:[]})});
write('implementation-task.json',defaults('role.backend-agent','r3-backend-worker','work-unit.slice-implementation','slice-implementation',dir+'/slice-contract.json',c.common.allowed_write_paths,'stage.slice-implementation'));
write('verification-task.json',defaults('role.test-agent','r3-independent-verifier','work-unit.verification','lifecycle-work-unit',dir+'/slice-contract.json',[dir+'/verification/'],'stage.verification','Verifier'));
write('slice-contract.json',c);
console.log('Slice复审候选已补真实任务包引用及构建/启动/独立验收命令映射，未宣布执行或批准。');
