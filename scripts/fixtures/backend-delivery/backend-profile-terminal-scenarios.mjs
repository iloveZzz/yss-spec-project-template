#!/usr/bin/env node
// Run with a real native Bundle seed. No missing policy is injected or skipped.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {backendProfileTerminalFixture} from './backend-profile-terminal-fixture.mjs';
import {fixture as architectureFixture} from '../existing-backend/fixture.mjs';
import {files,hash} from '../../lib/strategic-handoff-io.mjs';

const args=process.argv.slice(2),nativeSeed=args[args.indexOf('--native-seed')+1];
assert(args.includes('--native-seed')&&nativeSeed,'--native-seed from actual native Backend initialization is required');
const architecture=architectureFixture('layered-mvc',{nativeSeed});
try {
  const module=await import(pathToFileURL(path.join(architecture.root,'scripts/lib/backend-architecture.mjs')));
  const rolesModule=await import(pathToFileURL(path.join(architecture.root,'scripts/lib/digital-human-roles.mjs')));
  const io=await import(pathToFileURL(path.join(architecture.root,'scripts/lib/strategic-handoff-io.mjs')));
  const rolesRef='.template-spec/agents/digital-human-roles.yaml',rolesBytes=fs.readFileSync(path.join(architecture.root,rolesRef));
  const roles=io.read(path.join(architecture.root,rolesRef));
  assert.equal(architecture.review.gate_id,'gate.technical-design-approved');
  const verify=()=>module.verifyArchitectureEvidence(architecture.identity,architecture.bindings,{root:architecture.root,readOnly:true});
  assert.equal(verify().source_kind,'existing-registration');
  const allowed=new Set(['check.architecture-reviewed','gate.technical-design-approved']);
  for(const [key,value]of Object.entries(roles.gate_policy))if(Array.isArray(value))roles.gate_policy[key]=value.filter(row=>!allowed.has(typeof row==='string'?row:row?.gate));
  architecture.write(rolesRef,roles);
  assert.throws(verify,/ARCH_REVIEW_MISSING/);
  fs.writeFileSync(path.join(architecture.root,rolesRef),rolesBytes);
  assert.throws(()=>rolesModule.countersignRuleForGate(roles.gate_policy,'check.unclassified-fixture'),/GATE_POLICY_REQUIRED/);
  assert.equal(verify().source_kind,'existing-registration');
  process.stdout.write('真实 native Backend 工程基线门禁选择、缺少声明与未知门禁拒绝通过。\n');
}finally{architecture.cleanup();}
if(args.includes('--architecture-only'))process.exit(0);
const f=await backendProfileTerminalFixture({nativeSeed});
try {
  assert.equal(f.result.result,'backend-delivered');
  assert.equal(f.result.business_completed,false);assert.equal(f.result.release_authorized,false);
  assert.equal(fs.existsSync(path.join(f.root,'.yss-execution-scope.yaml')),false);
  assert.equal(fs.existsSync(path.join(f.root,'.yss-backend-delivery.json')),false);
  const before=fs.readFileSync(path.join(f.root,f.checkpointRef));
  const cp=JSON.parse(before);
  const verify=()=>f.terminalModule.verifyBackendDeliveryTerminal(f.root,{checkpointRef:f.checkpointRef});
  const change=async mutate=>{
    const next=structuredClone(cp);mutate(next);f.write(f.checkpointRef,next);
    try{await assert.rejects(verify);}finally{fs.writeFileSync(path.join(f.root,f.checkpointRef),before);}
  };
  await change(next=>delete next.checks['check.design-reviewed']);
  await change(next=>next.human_review.implementation.slice_contract_ref='other-slice.yaml');
  await change(next=>next.profile_id='harness.frontend-delivery');
  const reportRef=f.delivery.verification.contract.ref,report=fs.readFileSync(path.join(f.root,reportRef));
  fs.rmSync(path.join(f.root,reportRef));
  try{await assert.rejects(verify);}finally{fs.writeFileSync(path.join(f.root,reportRef),report);}
  f.write('untyped-fresh.json',{status:'passed',reason:'A status is not actual execution evidence.'});
  const freshGate=cp.gates['gate.fresh-verification-passed'];
  const subjectBytes=fs.readFileSync(path.join(f.root,freshGate.subject_ref)),approvalBytes=fs.readFileSync(path.join(f.root,freshGate.approval_ref));
  // Keep the independently approved gate basis current, so this specifically
  // reaches the actual-report reader instead of merely failing a stale digest.
  const subject=JSON.parse(subjectBytes),approval=JSON.parse(approvalBytes),unknown={ref:'untyped-fresh.json',digest:f.file('untyped-fresh.json').digest.slice(7)};
  subject.basis.push(unknown);f.write(freshGate.subject_ref,subject);
  approval.basis=subject.basis;approval.subject_digest=f.file(freshGate.subject_ref).digest.slice(7);f.write(freshGate.approval_ref,approval);
  const next=structuredClone(cp),gate=next.gates['gate.fresh-verification-passed'];
  gate.subject_digest=approval.subject_digest;gate.basis=[...subject.basis,{ref:gate.subject_ref,digest:approval.subject_digest},{ref:gate.approval_ref,digest:f.file(gate.approval_ref).digest.slice(7)}];
  gate.evidence['evidence.fresh-verification']=['untyped-fresh.json'];f.write(f.checkpointRef,next);
  try{await assert.rejects(verify,/未知 Fresh Verification 报告/);}finally{
    fs.writeFileSync(path.join(f.root,freshGate.subject_ref),subjectBytes);fs.writeFileSync(path.join(f.root,freshGate.approval_ref),approvalBytes);fs.writeFileSync(path.join(f.root,f.checkpointRef),before);
  }
  const inventory=()=>files(f.root).map(ref=>({ref,digest:hash(fs.readFileSync(path.join(f.root,ref))),mode:fs.lstatSync(path.join(f.root,ref)).mode}));
  const tree=inventory();
  assert.equal((await verify()).result,'backend-delivered');
  assert.deepEqual(inventory(),tree,'终点只读复验不能修改任何当前文件、交接包或批准字节');
  assert.deepEqual(fs.readFileSync(path.join(f.root,f.checkpointRef)),before);
  process.stdout.write('真实 native Backend v3 本端终点、当前专业 Slice 审查、Fresh 实际报告与错 Slice/Profile 反例通过。\n');
}finally{f.cleanup();}
