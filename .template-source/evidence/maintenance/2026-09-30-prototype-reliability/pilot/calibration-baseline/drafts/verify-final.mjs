// Read-only validation of the final bundle against both authoritative inputs
// and their isolated copies. This does not exercise browser behavior.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {validatePrototypeProject} from '../.agents/skills/yss-prototype-stage/scripts/prototype-contract.mjs';

const root = 'drafts/docs/.scratch/pilot/design/prototypes';
for (const projectRoot of ['.', 'drafts/project-snapshot']) {
  const result = await validatePrototypeProject({root, profile: 'H2', projectRoot});
  assert.deepEqual(result.errors, [], `source validation: ${projectRoot}`);
  console.log(`portable bundle validated; projectRoot=${projectRoot}`);
}
for (const ref of ['DESIGN.md', '.template-spec/design/tokens/variables.css']) {
  assert((await readFile(ref)).equals(await readFile(`drafts/project-snapshot/${ref}`)));
}
for (const copy of ['drafts/authoring/scenarios.json', `${root}/scenarios.json`]) {
  assert((await readFile('fixture/scenarios.json')).equals(await readFile(copy)));
}
console.log('input snapshot and shared scenarios are byte-identical');
