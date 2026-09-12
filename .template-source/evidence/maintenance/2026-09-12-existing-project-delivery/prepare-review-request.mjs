import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {requestDigest} from '../../../../scripts/lib/user-decision.mjs';
const p='/private/var/folders/8d/60y8vj2j0nn37t4h26zbvvhw0000gn/T/yss-preview-pilot-20260912-0k_x_zmm';
const s=p+'/strategy-governance',b=p+'/backend-governance',d='docs/.scratch/target-preview-existing-ui/handoff-draft/',bd='docs/.scratch/target-preview-pilot/existing-v2/';
const thread='01a091a1-62fa-7df0-a615-fae2815d4a7a',principal=`codex://threads/${thread}#requester`;
const session='/Users/zhudaoming/.codex/sessions/2026/09/12/rollout-2026-09-12T02-01-08-01a091a1-62fa-7df0-a615-fae2815d4a7a.jsonl';
const digest=bytes=>'sha256:'+createHash('sha256').update(bytes).digest('hex');
const raw=fs.readFileSync(session,'utf8').trim().split('\n').map(x=>JSON.parse(x)).find(x=>x.type==='response_item'&&x.payload.id==='msg_01a091a9-04e3-7310-9a78-8e6fdcbf841d');
if(!raw||raw.payload.role!=='user')throw Error('Original current implementation request missing');
const original={id:raw.payload.id,original_ref:`codex://threads/${thread}#${raw.payload.id}`,principal_ref:principal,actor_kind:'biological-human',sent_at:raw.timestamp,text:raw.payload.content.filter(x=>['input_text','output_text'].includes(x.type)).map(x=>x.text).join('\n')};
const common={changes:'固定真实工程、既有 UI 基线和七路径探针范围。',risks:['仅隔离 PostgreSQL；不代表生产兼容。','真实 S0–S6/O1 尚未执行。'],recommendation:'按当前审阅包继续。',next_actions:['实施 R3，执行 S0–S6/O1。'],responder_ref:principal};
const definitions=[
 ['domain','领域责任','gate.domain-strategy-approved',s,d+'domain-strategy.json'],
 ['stage','阶段范围','gate.stage-decision-package-approved',s,d+'stage-decision.json'],
 ['plan','Plan 入口','plan-conclusion',s,d+'plan-entry-review.json'],
 ['spec','现有行为规格','gate.spec-baseline-approved',s,d+'spec-review-draft.md'],
 ['ui','既有 UI 基线','gate.user-confirmation',s,'docs/.scratch/target-preview-existing-ui/baseline-v1/existing-ui-baseline.json'],
 ['delivery','业务交付范围','gate.strategic-design-handoff-approved',s,d+'delivery-scope.json'],
 ['implementation','探针实施范围','implementation-scope',b,bd+'implementation-scope.json']
];
const items=definitions.map(([id,title,boundary,root,ref])=>({root,id,title,boundary,subject:{ref,version:'v1',digest:digest(fs.readFileSync(root+'/'+ref))},basis:[],scope:id==='implementation'?[bd+'slice-ticket.md']:['target-preview-pilot'],...common}));
for(const [root,ref,group]of [[s,d+'current-request-snapshot.json',items.filter(x=>x.root===s)],[b,bd+'current-request-snapshot.json',items.filter(x=>x.root===b)]]){
 const captureRef=ref.replace('current-request-snapshot.json','current-requester-source.json');
 fs.writeFileSync(root+'/'+captureRef,JSON.stringify({source_kind:'session-export',messages:[original]},null,2)+'\n');
 const request={id:'current-assets-20260912-'+(root===s?'strategy':'backend'),requester_ref:principal,requester_source:{kind:'session-export',ref:captureRef,digest:digest(fs.readFileSync(root+'/'+captureRef)),message_id:original.id},items:group.map(({root,...x})=>x)};
 fs.writeFileSync(root+'/'+ref,JSON.stringify({state:'awaiting-presentation-and-real-response',request,request_digest:requestDigest(request),note:'这只是固定请求快照。没有 presented_source、回复、批准记录或接收状态；须从实际后续消息捕获，不得自造。'},null,2)+'\n');
}
const table=['|事项|固定待审资产（均 v1）|原字节 SHA-256|','|---|---|---|',...items.map(x=>`|${x.title}|[${x.subject.ref.split('/').at(-1)}](${x.root}/${x.subject.ref})|${x.subject.digest.slice(7)}|`)];
const md=`# 当前资产集中审阅\n\n状态：ready-for-human。实施计划已获授权；本包只请求确认本轮新形成的具体资产。当前没有生成本次人类批准，也没有执行真实接收矩阵。\n\n${common.changes}\n\n${table.join('\n')}\n\n范围：target-preview-pilot；探针只在 [当前切片](${b}/${bd}slice-ticket.md) 的七个路径内实施。详见 [技术设计](${b}/${bd}technical-design.json)、[验证命令映射](${b}/${bd}verification-command-map.md) 和 [独立切片审查](${b}/${bd}slice-review.md)。\n\n[打开真实 Vue 五步截图与请求审阅页](${s}/docs/.scratch/target-preview-existing-ui/review.html)。五步是打开 CURRENT、切 ALL、刷新 ALL、空数据、重新打开 CURRENT；结果分别为 1/2/2/0/1 行。截图与实际请求、固定源码、构建和锁文件一起绑定，不声明可离线运行原型。\n\n既有Java固定提交 714fd4223d202b29c410d4d5533913e44874b3f1；Vue固定提交76f2d1627f797d5b12a99c48cf49125544933b18。原API 1.0.0-pilot.3字节保持8d696f69a62bee50545d418a458f848941e4e84647fea465b524779c8708259b，其原始确认消息已核验复用。\n\n修复机制的合成回归、CLI初始化通过不等于本样本交付完成。${common.risks.join(' ')} 本包不扩大业务架构、不变更现有Vue行为、不授权Git提交、推送或发布。\n\n推荐：${common.recommendation} 确认后：${common.next_actions.join(' ')} S3a先用完整合法另一仓包对照；若误收，保留首次证据再修目标授权。\n\n原空数组Slice及旧审查会签保存在 [首次错误证据](${b}/${bd}history/slice-invalid-array-metadata/finding.json)，不能用新批准覆盖。\n\n当前待确认6项战略资产和1项后端实施范围。可以明确批准全部7项，或按事项名称提出修改。\n`;
fs.writeFileSync(s+'/'+d+'current-review.md',md);
const final=`机制修复和四个 CLI 回归已落地；**真实闭环尚未完成**。当前需确认 [集中审阅包](${s}/${d}current-review.md) 中的新资产（均 v1）：\n\n|事项|当前资产|\n|---|---|\n${items.map(x=>`|${x.title}|[查看](${x.root}/${x.subject.ref})|`).join('\n')}\n\n范围为 target-preview-pilot，探针限于 [当前切片](${b}/${bd}slice-ticket.md)。固定真实工程、既有 UI 基线和七路径探针范围。\n\n仅隔离 PostgreSQL；不代表生产兼容。真实 S0–S6/O1 尚未执行。建议按当前审阅包继续。确认后实施 R3，执行 S0–S6/O1。\n\n是否确认以上全部 7 项？也可按事项提出修改。\n\n这次确认来自已授权方案对新 UI 资产真实确认的要求，以及 [AGENTS.md 第10条](/Users/zhudaoming/Projects/yss-spec-project-template/AGENTS.md) 的“必须先展示可审阅资产，再取得……真实回复”；[战略技能](/Users/zhudaoming/Projects/yss-spec-project-template/submodules/yss-harness-design-agent/.agents/skills/yss-strategic-design/SKILL.md) 也要求“缺当前决定不得恢复流转”。不是重新请求机制修复授权。\n`;
// Verify the actual proposed presentation contains all source-policy required visible facts.
for(const item of items)for(const field of [item.title,item.subject.ref,item.subject.version,item.changes,item.recommendation,...item.scope,...item.risks,...item.next_actions])if(!final.includes(field))throw Error('Presentation missing exact fact: '+field);
fs.writeFileSync('.template-source/evidence/maintenance/2026-09-12-existing-project-delivery/current-review-final-draft.md',final);
console.log('Seven current asset requests and human-readable packet prepared; no approval generated.');
