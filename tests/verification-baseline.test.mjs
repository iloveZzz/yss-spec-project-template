import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {validateBaseline} from '../.template-source/scripts/lib/verification-baseline.mjs';
import {planTemplateVerification,ROOT} from '../scripts/lib/template-verification.mjs';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
function fixture(t) {
  const root=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'verification-baseline-')));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  const git=(...args)=>{const r=spawnSync('git',args,{cwd:root,encoding:'utf8'});assert.equal(r.status,0,r.stderr);return r.stdout.trim();};
  git('init','-q');git('config','user.email','test@example.invalid');git('config','user.name','fixture');fs.writeFileSync(path.join(root,'input'),'first');git('add','input');git('commit','-qm','first');
  const base=git('rev-parse','HEAD'),reportFile=path.join(root,'receipt.json');fs.writeFileSync(reportFile,'{"status":"passed"}');
  return {root,base,baselineReport:reportFile,baselineReportDigest:hash(fs.readFileSync(reportFile)),git};
}
test('基线缺失、简写和仅有 passed 报告均不建立可信差异', t=> {
  assert.deepEqual(validateBaseline({root:'.'}).reasons,['baseline-missing']);
  assert.deepEqual(validateBaseline({root:'.',base:'abc'}).reasons,['baseline-sha-invalid']);
  const f=fixture(t);const outcome=validateBaseline(f);assert.equal(outcome.valid,false);assert.ok(outcome.reasons.includes('baseline-independent-validation-missing'));
});
test('基线成功证据必须绑定同一 SHA、报告字节和当前策略', t=> {
  const f=fixture(t),validator=()=>({valid:true,reasons:[],bindings:{base_sha:f.base,report_digest:f.baselineReportDigest,strategy:'legacy-full'}});
  assert.equal(validateBaseline({...f,validator}).valid,true);
  assert.equal(validateBaseline({...f,validator,baselineReportDigest:'0'.repeat(64)}).valid,false);
  const incompatible=()=>({valid:true,reasons:[],bindings:{base_sha:f.base,report_digest:f.baselineReportDigest,strategy:'qualified-gates',policy_digest:'older'}});
  assert.ok(validateBaseline({...f,validator:incompatible,policyDigest:'current'}).reasons.includes('baseline-policy-mismatch'));
});
test('未来和非祖先提交不能缩小当前候选', t=> {
  const f=fixture(t);fs.writeFileSync(path.join(f.root,'input'),'second');f.git('add','input');f.git('commit','-qm','second');const future=f.git('rev-parse','HEAD');f.git('checkout','--detach',f.base);
  assert.ok(validateBaseline({...f,base:future}).reasons.includes('baseline-not-ancestor'));
});
test('Gitlink 基线差异按真实提交登记而不是工作树版本猜测',t=>{
  const f=fixture(t);
  f.git('update-index','--add','--cacheinfo',`160000,${f.base},registered-submodule`);f.git('commit','-qm','registered gitlink');
  const withLink=f.git('rev-parse','HEAD'),validator=()=>({valid:true,reasons:[],bindings:{base_sha:f.base,report_digest:f.baselineReportDigest,strategy:'legacy-full'}});
  const outcome=validateBaseline({...f,validator});assert.equal(outcome.valid,true);assert.deepEqual(outcome.bindings.changed_gitlinks,['registered-submodule']);assert.equal(outcome.bindings.head_gitlinks['registered-submodule'],f.base);
  f.git('checkout','--detach',f.base);assert.ok(validateBaseline({...f,base:withLink,validator}).reasons.includes('baseline-not-ancestor'));
});

test('公共计划拒绝显式非法基线参数与伪报告，只有完整祖先 SHA 单独给出允许全量回退',t=>{
  const f=fixture(t),source=path.join(f.root,'.template-source/process');fs.mkdirSync(source,{recursive:true});fs.copyFileSync(path.join(ROOT,'.template-source/process/template-verification-legacy.json'),path.join(source,'template-verification-legacy.json'));
  const plan=options=>planTemplateVerification({root:f.root,profile:'release',changedFiles:['README.md'],...options});
  for(const profile of ['fast','candidate','release']) {
    assert.throws(()=>plan({profile,base:'HEAD'}),/BASELINE_SHA_INVALID/);
    assert.throws(()=>plan({profile,base:f.base,baselineReport:f.baselineReport}),/PARAMETERS_INCOMPLETE/);
    assert.throws(()=>plan({profile,base:f.base,baselineReportDigest:f.baselineReportDigest}),/PARAMETERS_INCOMPLETE/);
    assert.throws(()=>plan({profile,baselineReport:f.baselineReport,baselineReportDigest:f.baselineReportDigest}),/PARAMETERS_INCOMPLETE/);
    assert.throws(()=>plan({profile,base:f.base,baselineReport:f.baselineReport,baselineReportDigest:'xyz'}),/DIGEST_INVALID/);
    assert.throws(()=>plan({profile,base:f.base,baselineReport:f.baselineReport,baselineReportDigest:'0'.repeat(64)}),/DIGEST_MISMATCH/);
    assert.throws(()=>plan({profile,base:f.base,baselineReport:f.baselineReport,baselineReportDigest:f.baselineReportDigest,baselineAssessment:{valid:false,reasons:['forged-or-incomplete'],bindings:null}}),/BASELINE_REPORT_INVALID.*forged/);
  }
  const link=path.join(f.root,'symlink.json');fs.symlinkSync(f.baselineReport,link);assert.throws(()=>plan({base:f.base,baselineReport:link,baselineReportDigest:f.baselineReportDigest}),/PATH_INVALID/);
  assert.equal(plan({base:f.base}).strategy,'legacy-full');
  fs.writeFileSync(path.join(f.root,'input'),'future');f.git('add','input');f.git('commit','-qm','future');const future=f.git('rev-parse','HEAD');f.git('checkout','--detach',f.base);
  assert.throws(()=>plan({base:future}),/BASELINE_NOT_ANCESTOR/);
});
