import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { readAsset, parseAsset, serializeAsset } from './structured-assets.mjs';
import { safeFile } from './governance-io.mjs';
import { planAssetWrite, applyAssetWrite, recoverAssetWrite, validateAssetSemantics, assertAssetTransactionIdle, assertCurrentAssetReference } from './asset-transactions.mjs';
import { planAssetMigration, applyAssetMigration } from './asset-migration.mjs';

export const isAssetCommand = command => ['validate','plan-write','apply-write','plan-migrate','apply-migrate','recover'].includes(command);
export function runAssetCommand(args) {
  const command = args.shift();
  const {values, positionals} = parseArgs({ args, allowPositionals: true, strict: true, options: { root:{type:'string'},kind:{type:'string'},input:{type:'string'},output:{type:'string'},resolutions:{type:'string'},'structure-only':{type:'boolean'} } });
  const root = path.resolve(values.root || process.cwd());
  const input = file => parseAsset(fs.readFileSync(path.resolve(file)), file);
  let result;
  if (command === 'recover') { if (positionals.length) throw new Error('recover takes --root only'); result = recoverAssetWrite(root); }
  else {
    if (positionals.length !== 1) throw new Error(`${command} requires one asset/plan path`);
    const ref = positionals[0];
    if (command === 'validate') {
      assertAssetTransactionIdle(root);
      assertCurrentAssetReference(root,ref);
      const record = readAsset(safeFile(root, ref), values.kind, {schemaRoot:root});
      result = {status:'valid',kind:values.kind,ref,digest:record.digest,checks:['schema'],execution_authorization:'not-granted'};
      if (!values['structure-only']) {result.verification=validateAssetSemantics(root,ref,values.kind);result.checks.push('consumer');}
    } else if(command === 'plan-write') {
      if (!values.input) throw new Error('plan-write <target.json> --kind <kind> --input <candidate.json>');
      result = planAssetWrite(root,[{ref,kind:values.kind,value:input(values.input)}],{schemaRoot:root});
    } else if(command === 'apply-write') result = applyAssetWrite(root,input(ref));
    else if(command === 'plan-migrate') result = planAssetMigration(root,ref,{schemaRoot:root});
    else result = applyAssetMigration(root,input(ref),values.resolutions?input(values.resolutions):undefined,{schemaRoot:root});
  }
  if(values.output) fs.writeFileSync(path.resolve(values.output),serializeAsset(result),{flag:'wx'});
  return result;
}
