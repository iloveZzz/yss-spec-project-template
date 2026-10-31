import {test} from 'node:test';
import assert from 'node:assert/strict';
import {assertImplementationTicket} from '../../lib/business-tickets.mjs';

test('内容类型隔离，不以目录判断实现资格',()=>{for(const kind of ['business-ticket','business-ticket-set','stage-work-item'])assert.throws(()=>assertImplementationTicket(`---\nkind: ${kind}\n---\n`,'.work/demo/issues/a.md'));});

test('业务 YAML 集合改扩展名也不能伪装为实现票',()=>{assert.throws(()=>assertImplementationTicket('kind: business-ticket-set\n','.work/demo/issues/a.md'),/不能作为实现/);});
