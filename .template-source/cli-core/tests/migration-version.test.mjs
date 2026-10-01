import {test} from 'node:test';
import assert from 'node:assert/strict';
import {assertUpgradeVersion} from '../migrate.mjs';
test('迁移版本顺序遵循预发布数字和正式版优先级',()=>{
 for(const [from,to] of [['1.2.3-rc.2','1.2.3-rc.10'],['1.2.3-rc.10','1.2.3'],['1.2.3+old','1.2.3+new'],['1.2.3','1.3.0-beta.1']])assert.doesNotThrow(()=>assertUpgradeVersion(from,to));
 for(const [from,to] of [['1.2.3','1.2.3-rc.1'],['1.2.3-rc.10','1.2.3-rc.2'],['2.0.0','1.9.9'],['1.2.3-beta','1.2.3-alpha'],['1.2.3-rc.1','1.2.3-rc']])assert.throws(()=>assertUpgradeVersion(from,to),e=>e.code==='VERSION');
 for(const bad of ['1.2.3-','1.2.3-rc.01','01.2.3','latest'])assert.throws(()=>assertUpgradeVersion(bad,'2.0.0'),e=>e.code==='VERSION');
});
