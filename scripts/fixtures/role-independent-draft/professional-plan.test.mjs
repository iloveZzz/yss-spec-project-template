// Synthetic protocol sources; every tool execution is real.
import {test} from 'node:test';
import {installedFixture} from './installed-fixture.mjs';
import {professionalPlanFixture} from './professional-plan-fixture.mjs';
test('installed professional Plan publishes once, completes the actual task and reuses its aggregate',()=>{const f=installedFixture();try{professionalPlanFixture(f);}finally{f.cleanup();}});
