import {test} from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {prepareFlowPrototype} from '../scripts/prototype-contract.mjs';
test('retired React authoring has no generation, collection or authoring entrypoint',async()=>{
 for(const ref of ['../scripts/build-shadcn-prototype.mjs','../assets/shadcn-authoring','../assets/business-patterns','../scripts/build-antd-prototype.mjs','../scripts/collect-antd-reference.mjs','../assets/antd-authoring','../references/antd-component-catalog.json','../references/antd-integration.md'])assert.equal(existsSync(new URL(ref,import.meta.url)),false,ref);
 for(const basis of ['react-antd-prebuilt','react-shadcn-prebuilt'])await assert.rejects(prepareFlowPrototype({componentBasis:basis}),/已退役/);
});
