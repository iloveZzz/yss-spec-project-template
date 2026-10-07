import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
export async function fixtureTracker(root, workRoot='docs/.scratch') {
  await mkdir(path.join(root,'.template-spec/agents'),{recursive:true});
  await writeFile(path.join(root,'.template-spec/agents/issue-tracker.md'),`---\ntracker:\n  platform: local-markdown\n  root: ${workRoot}\n---\n`);
}
