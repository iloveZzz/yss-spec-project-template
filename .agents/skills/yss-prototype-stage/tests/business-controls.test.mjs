import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {validDate,rangeError,inRange,filterOptions,selectedOption} from '../assets/vue-business-patterns/business-controls.js';
test('date-only ranges reject incomplete, invalid and reversed values; include both ends',()=>{
 for(const date of ['2024-02-29','2000-02-29','2024-12-31','0001-01-01'])assert(validDate(date));
 for(const date of ['1900-02-29','2023-02-29','2024-04-31','2024-00-12','0000-01-01','2024-2-01','2024-01-01T00:00:00Z'])assert(!validDate(date));
 assert.equal(rangeError({start:'',end:''}),null);assert.equal(rangeError({start:'2024-02-29',end:''}).field,'end');assert.equal(rangeError({start:'',end:'2024-03-01'}).field,'start');
 assert.equal(rangeError({start:'2024-03-01',end:'2024-02-29'}).field,'start');
 for(const range of [{start:'2024-02-29',end:'2024-02-29'},{start:'2023-12-31',end:'2024-03-01'}]){assert.equal(rangeError(range),null);assert(inRange(range.start,range));assert(inRange(range.end,range));assert(!inRange('2024-03-02',range));}
});
test('search binds stable IDs and distinguishes equal names from text',()=>{
 const options=[{id:'U-001',name:'张明'},{id:'U-002',name:'张明'},{id:'U-003',name:'李华'}];
 assert.equal(filterOptions(options,'张明').length,2);assert.equal(filterOptions(options,'u-002')[0].id,'U-002');assert.equal(filterOptions(options,'不存在').length,0);
 assert.equal(selectedOption(options,'张明'),null);assert.equal(selectedOption(options,'missing'),null);assert.equal(selectedOption(options,'U-002').id,'U-002');
});
test('date semantics stay identical across system timezones',()=>{
 const script=`import {rangeError,inRange} from ${JSON.stringify(new URL('../assets/vue-business-patterns/business-controls.js',import.meta.url).href)};console.log(JSON.stringify([rangeError({start:'2024-02-29',end:'2025-01-01'}),inRange('2024-12-31',{start:'2024-02-29',end:'2025-01-01'})]));`;
 const results=['Asia/Shanghai','America/Los_Angeles','Pacific/Kiritimati'].map(TZ=>execFileSync(process.execPath,['--input-type=module','-e',script],{env:{...process.env,TZ},encoding:'utf8'}));assert.equal(new Set(results).size,1);assert.equal(results[0].trim(),'[null,true]');
});
