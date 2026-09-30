// Keep the registered test entrypoint compatible after retiring the AntD authoring route.
// This entry now verifies retirement and runs the replacement source contract.
import './shadcn-source.test.mjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {prepareFlowPrototype} from '../scripts/prototype-contract.mjs';
test('retired React AntD has no generation, collection or authoring entrypoint',async()=>{
 for(const ref of ['../scripts/build-antd-prototype.mjs','../scripts/collect-antd-reference.mjs','../assets/antd-authoring','../references/antd-component-catalog.json','../references/antd-integration.md'])assert.equal(existsSync(new URL(ref,import.meta.url)),false,ref);
 await assert.rejects(prepareFlowPrototype({componentBasis:'react-antd-prebuilt'}),/已退役/);
});
