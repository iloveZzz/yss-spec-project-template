import {test} from 'node:test';
import assert from 'node:assert/strict';
import {sourceApprovalPolicy} from '../../lib/strategic-handoff-io.mjs';

test('未知源策略能力拒绝，不静默按旧批准解释',()=>{assert.throws(()=>sourceApprovalPolicy({user_decision_policy:{required_capabilities:['business-ticket-approval-v99']},gate_policy:{}}),/不支持/);});
