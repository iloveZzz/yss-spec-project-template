import fs from 'node:fs';import path from 'node:path';import {createRequire} from 'node:module';import {fileURLToPath} from 'node:url';
import {validateJsonSchemas} from './source/scripts/lib/json-schema.mjs';
import {buildDecisionFixture} from './source/scripts/lib/testing/user-decision-fixture.mjs';
const P=path.dirname(fileURLToPath(import.meta.url)),R=path.join(P,'source'),req=createRequire(path.join(P,'tools/package.json'));
const Ajv=req('ajv/dist/2020').default,formats=req('ajv-formats');
const fixture=buildDecisionFixture(path.join(P,'synthetic-decision-fixture'));
const cases=[
 {schema:'.template-spec/process/schemas/user-decision.schema.json',value:fixture.record,field:['responses',0,'responded_at'],source:'synthetic repository fixture; never real approval'},
 {schema:'.template-source/process/schemas/maintenance-review-record.schema.json',value:JSON.parse(fs.readFileSync(path.join(R,'.template-source/evidence/maintenance/2026-09-28-spec-efficiency-review/reviewer-round2/spec-record.json'))),field:['reviewed_at'],source:'historical review; copy only, no original modification'},
];
const rows=[];
for(const c of cases){
 const schemaPath=path.join(R,c.schema);const ajv=new Ajv({strict:false,allErrors:true,coerceTypes:false,useDefaults:false,removeAdditional:false});formats(ajv);const check=ajv.compile(JSON.parse(fs.readFileSync(schemaPath)));
 for(const time of [null,'not-a-timestamp','2026-99-99T77:00:00Z','2026-10-01T00:00:00Z']){
  const value=structuredClone(c.value);if(time!==null){let x=value;for(const f of c.field.slice(0,-1))x=x[f];x[c.field.at(-1)]=time;}
  const [py]=validateJsonSchemas([{schemaPath,value}]);const av=Boolean(check(value));
  rows.push({schema:c.schema,source:c.source,field:c.field,time,python:py,ajv:{valid:av,errors:structuredClone(check.errors)},decision_match:py.valid===av});
 }
}
fs.writeFileSync(path.join(P,'schema-real-formats.json'),JSON.stringify(rows,null,2)+'\n');console.log(JSON.stringify(rows.map(x=>({schema:x.schema,time:x.time,python:x.python.valid,ajv:x.ajv.valid})),null,2));
