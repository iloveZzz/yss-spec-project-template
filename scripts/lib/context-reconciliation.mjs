import { readFileSync } from './validation-phase.mjs';
import path from "node:path";
import { parseDocument } from "../vendor/yaml.mjs";
import {nativeEvidenceVerify,NEEDS} from "./native-evidence.mjs";
const schemaPath = path.resolve(import.meta.dirname, "../../.template-spec/process/schemas/context-reconciliation.schema.json");
export function parseReconciliationFile(file) {
  const document = parseDocument(readFileSync(file, "utf8"), { maxAliasCount: 0, uniqueKeys: true });
  if (document.errors.length) throw new TypeError(document.errors[0].message);
  return document.toJS({ maxAliasCount: 0 });
}

export function verifyContextReconciliation(file,{root=process.cwd()}={}) {
 const result=nativeEvidenceVerify({root:path.resolve(root),kind:'context-reconciliation',file:path.resolve(file),needs:NEEDS.contextReconciliation});
 if(result.exitCode!==0)throw Object.assign(new TypeError(result.message),{code:result.diagnostics[0]?.code||result.code});
 return result.envelope.result;
}
