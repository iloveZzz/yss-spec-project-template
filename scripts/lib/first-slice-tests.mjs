import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { parseXmlDocument } from '../vendor/xml.mjs';
const array = value => value === undefined ? [] : Array.isArray(value) ? value : [value];

export function verifyFirstSliceTests(contract, projectRoot, startedAt, architectureType) {
  const declarations = contract.backend.first_slice.artifacts.filter(item => item.role === 'test');
  const required = [...declarations.map(item => ({ type: item.type, module: item.path.split('/src/test/java/')[0] })), architectureType];
  const evidence = [], failures = [];
  for (const item of required) {
    try {
      const candidates = ['surefire-reports','failsafe-reports'].map(folder => path.join(projectRoot,item.module,'target',folder,`TEST-${item.type}.xml`));
      const ref = candidates.find(file => fs.existsSync(file) && fs.statSync(file).mtimeMs >= startedAt);
      if (!ref) throw Error('fresh execution report missing');
      const bytes = fs.readFileSync(ref), suite = parseXmlDocument(bytes.toString()).testsuite;
      const cases = array(suite?.testcase);
      if (!cases.length || cases.some(c => ['failure','error','skipped'].some(key => Object.hasOwn(c,key)))) throw Error('test not executed successfully');
      if (cases.some(c => c['@_classname'] !== item.type)) throw Error('test class does not match contract');
      evidence.push({type:item.type,ref,sha256:createHash('sha256').update(bytes).digest('hex'),test_count:cases.length});
    } catch(error) { failures.push(`${item.type}:${error.message}`); }
  }
  return { status: failures.length ? 'failed' : 'passed', evidence, failures };
}
