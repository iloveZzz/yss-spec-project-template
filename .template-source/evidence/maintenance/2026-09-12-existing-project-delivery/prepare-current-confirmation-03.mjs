import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = '/private/var/folders/8d/60y8vj2j0nn37t4h26zbvvhw0000gn/T/yss-preview-pilot-20260912-0k_x_zmm/strategy-governance';
const snapshotRef = 'docs/.scratch/target-preview-existing-ui/handoff-draft/current-request-snapshot-03.json';
const requesterSnapshot = JSON.parse(fs.readFileSync(path.join(root, 'docs/.scratch/target-preview-existing-ui/handoff-draft/current-request-snapshot.json'), 'utf8'));
const oldItems = new Map(requesterSnapshot.request.items.map((item) => [item.id, item]));
const definitions = [
  ['domain', 'Domain Strategy', 'sha256:8650c1ab5879e19ce3d822b15cfbce52d9daa40a3b8ade67b4c4b36d4c509397', '两个已实际验证场景改为 confirmed。'],
  ['stage', 'Stage Decision', 'sha256:4410bf0fc948ac376b7aaee0c659d2b20f4d4f07baf7a0189fc91540b830dbf1', '重新绑定上述 Domain Strategy；阶段范围未改变。'],
  ['plan', 'Plan Entry Review', 'sha256:dcbc66b0f1dd306907fe51790fc4feeba0108cca4c83418f5928e5c3e6d40d14', '仅更新受影响的依据摘要。'],
  ['delivery', 'Delivery Scope', 'sha256:bb017bd01c353c87494944350f074cdc97434d7a10c0c88a399d702c83d069de', '重新绑定派生交接内容和上述来源。'],
];
const request = {
  id: 'current-assets-20260912-strategy-rebind-03',
  requester_ref: requesterSnapshot.request.requester_ref,
  requester_source: requesterSnapshot.request.requester_source,
  items: definitions.map(([id, title, digest, changes]) => {
    const old = oldItems.get(id);
    if (!old) throw new Error(`缺少历史事项: ${id}`);
    return {
      ...old,
      title,
      subject: { ...old.subject, version: 'v1', digest },
      changes,
      risks: ['仅隔离 PostgreSQL；不代表生产兼容。', '真实 S0–S6/O1 尚未执行。'],
      recommendation: '按当前审阅包继续。',
      next_actions: ['实施 R3，执行 S0–S6/O1。'],
    };
  }),
};
const { requestDigest, renderDecisionRequest } = await import(pathToFileURL(path.join(root, 'scripts/lib/user-decision.mjs')));
const snapshot = {
  state: 'awaiting-presentation-and-real-response',
  request,
  request_digest: requestDigest(request),
  note: '由运行时 renderDecisionRequest 生成；展示文本须逐字使用。',
};
fs.writeFileSync(path.join(root, snapshotRef), `${JSON.stringify(snapshot, null, 2)}\n`);
const rendered = `${renderDecisionRequest(request)}\n`;
fs.writeFileSync(path.join(root, 'docs/.scratch/target-preview-existing-ui/handoff-draft/current-request-rendered-03.txt'), rendered);
process.stdout.write(rendered);
