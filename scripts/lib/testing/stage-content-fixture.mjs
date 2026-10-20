import fs from 'node:fs';
import path from 'node:path';
import {parseAsset,semanticDigest} from '../structured-assets.mjs';
import {parseContextContract,resolveContextTermRefs} from '../context-contract.mjs';
const skill=path.resolve(import.meta.dirname,'../../../.agents/skills/yss-stage-decision');
export function stageContentFixture(f,{ui=true}={}) {
 const contract=parseContextContract({root:f.root});
 const snapshot={context_ref:'CONTEXT.md',context_schema_version:1,document_digest:contract.document_digest,referenced_terms_digest:resolveContextTermRefs(contract,[]).referenced_terms_digest,term_refs:[]};
 const assets=['valid-supplier-domain.yaml','valid-stage-decision-package.yaml'].map(name=>{
  const v=parseAsset(fs.readFileSync(path.join(skill,'tests/fixtures',name),'utf8').replaceAll('<document-digest>','sha256:'+'a'.repeat(64)).replaceAll('<referenced-terms-digest>','sha256:'+'a'.repeat(64)));
  v.schema_version=4;v.status='ready';v.context_snapshot=snapshot;delete v.approval;return v;
 });
 if(!ui){assets[1].impact_assessment.ui=false;assets[1].impact_assessment.frontend=false;assets[1].downstream_mapping=assets[1].downstream_mapping.filter(x=>x.consumer_capability!=='frontend-engineering-design');}
 assets[1].domain_strategy_ref={...assets[1].domain_strategy_ref,persisted_ref:'domain.json',digest:semanticDigest(assets[0]),status:'ready'};
 f.write('domain.json',assets[0]);f.write('stage-decision.json',assets[1]);return assets;
}
