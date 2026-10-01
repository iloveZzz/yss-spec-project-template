import fs from 'node:fs';
import { parseMarkdown } from '../vendor/markdown.mjs';
import { plain } from './plan-spec-markdown.mjs';
import { parseAsset, byteDigest } from './structured-assets.mjs';
import { safeFile } from './governance-io.mjs';

function tables(source) {
  let heading='';const result=[];
  for(const node of parseMarkdown(source).children) {
    if(node.type==='heading')heading=plain(node);
    if(node.type!=='table')continue;
    const headers=node.children[0].children.map(plain);
    for(const row of node.children.slice(1))result.push({heading,headers,cells:row.children.map(plain),line:row.position.start.line});
  }
  return result;
}
/** Coverage is deterministic; equivalence of rewritten business statements requires independent review. */
export function planStageCoverage(root,{plan_ref,decisions_ref,package_ref,mapping_ref}) {
  const bytes=ref=>fs.readFileSync(safeFile(root,ref));
  const plan=bytes(plan_ref),decisions=bytes(decisions_ref),pkgBytes=bytes(package_ref),pkg=parseAsset(pkgBytes,package_ref);
  const mapping=mapping_ref?parseAsset(bytes(mapping_ref),mapping_ref):{non_goals:[]};
  const sourceBindings={plan:{ref:plan_ref,digest:byteDigest(plan)},decisions:{ref:decisions_ref,digest:byteDigest(decisions)}};
  if(mapping_ref && (mapping.plan_digest!==sourceBindings.plan.digest||mapping.package_digest!==byteDigest(pkgBytes)))throw new Error('PLAN_COVERAGE_MAPPING_STALE');
  const sourceDecisions=tables(decisions.toString()).filter(r=>/^D[0-9]+$/.test(r.cells[0])&&r.headers.includes('决定'));
  const sourceNonGoals=tables(plan.toString()).filter(r=>r.headers.some(x=>/MVP.*非目标/.test(x))&&/^非目标/.test(r.cells[r.headers.findIndex(x=>/MVP.*非目标/.test(x))]||''));
  if(!sourceDecisions.length||!sourceNonGoals.length)throw new Error('PLAN_COVERAGE_UNASSESSED: supported decision/non-goal tables were not found');
  if(new Set(sourceDecisions.map(r=>r.cells[0])).size!==sourceDecisions.length)throw new Error('PLAN_COVERAGE_DUPLICATE_SOURCE_ID');
  const rows=sourceDecisions.map(row=>{
    const id=row.cells[0],targets=(pkg.confirmed_decisions||[]).filter(item=>new RegExp(`^decision\\.plan-${id.toLowerCase()}(?:-|$)`).test(item.id));
    return {source_ref:decisions_ref,source_id:id,source_line:row.line,source_text:row.cells.join(' | '),targets:targets.map(x=>({id:x.id,statement:x.statement})),status:targets.length===1?'mapped':'missing-or-ambiguous',semantic_review:'required'};
  });
  const nonGoals=sourceNonGoals.map(row=>{
    const sourceText=row.cells[0],entry=(mapping.non_goals||[]).find(x=>x.source_text===sourceText&&x.source_line===row.line);
    const target=Number.isInteger(entry?.target_index)?pkg.non_goals?.[entry.target_index]:undefined;
    return {source_ref:plan_ref,source_line:row.line,source_text:sourceText,target_index:entry?.target_index??null,target_text:target??null,status:typeof target==='string'&&target===entry.target_text?'mapped':'unmapped',semantic_review:'required'};
  });
  const known=new Set(sourceDecisions.map(r=>r.cells[0].toLowerCase()));
  const undeclared=(pkg.confirmed_decisions||[]).filter(r=>/^decision\.plan-d\d+(?:-|$)/.test(r.id)&&!known.has(r.id.match(/^decision\.plan-(d\d+)/)[1])).map(r=>r.id);
  return {schema_version:1,kind:'plan-stage-coverage',sources:sourceBindings,subject:{ref:package_ref,digest:byteDigest(pkgBytes)},...(mapping_ref?{mapping:{ref:mapping_ref,digest:byteDigest(bytes(mapping_ref))}}:{}),decisions:rows,non_goals:nonGoals,undeclared_decision_ids:undeclared,coverage_status:rows.every(r=>r.status==='mapped')&&nonGoals.every(r=>r.status==='mapped')&&!undeclared.length?'complete':'incomplete',semantic_review:'required',execution_authorization:'not-granted'};
}
