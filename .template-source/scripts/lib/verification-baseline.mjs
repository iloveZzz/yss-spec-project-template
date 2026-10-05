import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const SHA = /^[a-f0-9]{40}$/;
function git(root, args) {
  const result = spawnSync('git', args, {cwd:root,encoding:'utf8',maxBuffer:32*1024*1024});
  if (result.status !== 0) throw new Error(result.stderr?.trim() || 'baseline-git-failed');
  return result.stdout;
}

/** Explicit input errors are rejected before planning; an omitted receipt remains a safe fallback. */
export function assertBaselineParameters({root,base,baselineReport,baselineReportDigest}={}) {
  const receiptSupplied=baselineReport!==undefined||baselineReportDigest!==undefined;
  if(base!==undefined) {
    if(typeof base!=='string'||!SHA.test(base))throw Error('BASELINE_SHA_INVALID');
    if(git(root,['rev-parse',`${base}^{commit}`]).trim()!==base)throw Error('BASELINE_SHA_MISMATCH');
    const ancestor=spawnSync('git',['merge-base','--is-ancestor',base,'HEAD'],{cwd:root});
    if(ancestor.status!==0)throw Error('BASELINE_NOT_ANCESTOR');
  }
  if(!receiptSupplied)return;
  if(!base||typeof baselineReport!=='string'||!baselineReport||typeof baselineReportDigest!=='string'||!baselineReportDigest)throw Error('BASELINE_REPORT_PARAMETERS_INCOMPLETE');
  if(!/^[a-f0-9]{64}$/.test(baselineReportDigest))throw Error('BASELINE_REPORT_DIGEST_INVALID');
  if(!path.isAbsolute(baselineReport)||fs.realpathSync(baselineReport)!==path.resolve(baselineReport)||!fs.lstatSync(baselineReport).isFile())throw Error('BASELINE_REPORT_PATH_INVALID');
  if(hash(fs.readFileSync(baselineReport))!==baselineReportDigest)throw Error('BASELINE_REPORT_DIGEST_MISMATCH');
}

/** A receipt validator is supplied by the release consumer, never inferred from a passed flag. */
export function validateBaseline({root,base,baselineReport,baselineReportDigest,validator,assessment,policyDigest} = {}) {
  const reasons = [], bindings = {};
  if (!base) return {valid:false,reasons:['baseline-missing'],bindings};
  if (!SHA.test(base)) return {valid:false,reasons:['baseline-sha-invalid'],bindings};
  try {
    const resolved = git(root, ['rev-parse', `${base}^{commit}`]).trim();
    if (resolved !== base) throw new Error('baseline-sha-mismatch');
    const ancestor = spawnSync('git',['merge-base','--is-ancestor',base,'HEAD'],{cwd:root});
    if (ancestor.status !== 0) throw new Error('baseline-not-ancestor');
    bindings.base_sha = base;
    bindings.head_sha = git(root,['rev-parse','HEAD']).trim();
    const links = ref => Object.fromEntries(git(root,['ls-tree','-r',ref]).split('\n').filter(row=>row.startsWith('160000 ')).map(row=>{const match=/^160000 commit ([a-f0-9]{40})\t(.+)$/.exec(row);if(!match)throw Error('baseline-gitlink-invalid');return [match[2],match[1]];}));
    bindings.base_gitlinks = links(base);
    bindings.head_gitlinks = links('HEAD');
    bindings.changed_gitlinks = [...new Set([...Object.keys(bindings.base_gitlinks),...Object.keys(bindings.head_gitlinks)])].filter(ref=>bindings.base_gitlinks[ref]!==bindings.head_gitlinks[ref]).sort();
    if (!baselineReport) throw new Error('baseline-report-missing');
    if (!path.isAbsolute(baselineReport)) throw new Error('baseline-report-path-invalid');
    if (fs.realpathSync(baselineReport)!==path.resolve(baselineReport) || !fs.lstatSync(baselineReport).isFile()) throw new Error('baseline-report-path-invalid');
    bindings.report_digest = hash(fs.readFileSync(baselineReport));
    if (!/^[a-f0-9]{64}$/.test(baselineReportDigest||'') || baselineReportDigest!==bindings.report_digest) throw new Error('baseline-report-digest-mismatch');
    const checked = validator ? validator({root,base,reportFile:baselineReport,expectedDigest:baselineReportDigest}) : assessment;
    if (!checked?.valid || !checked.bindings) {
      reasons.push(...(checked?.reasons||['baseline-independent-validation-missing']));
    } else {
      if (checked.bindings.base_sha!==base || checked.bindings.report_digest!==bindings.report_digest) reasons.push('baseline-assessment-binding-mismatch');
      if (checked.bindings.strategy==='qualified-gates' && checked.bindings.policy_digest!==policyDigest) reasons.push('baseline-policy-mismatch');
      if (!['legacy-full','qualified-gates'].includes(checked.bindings.strategy)) reasons.push('baseline-strategy-untrusted');
    }
  } catch(error) { reasons.push(error.message); }
  return {valid:reasons.length===0,reasons,bindings};
}
