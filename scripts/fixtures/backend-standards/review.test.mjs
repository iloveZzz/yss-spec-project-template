import test from 'node:test';
import assert from 'node:assert/strict';
import {validateNextRoute} from '../../lib/lifecycle-transition.mjs';

test('workflow cannot complete review without persisted review inputs',()=>{
 const result=validateNextRoute('work-unit.code-review','work-unit.release-and-retrospective',{});
 assert.equal(result.result,'blocked');assert.ok(result.blocking_signals.includes('backend-review-incomplete'));
});
