import {syncCore,syncTemplate} from "file:///private/var/folders/8d/60y8vj2j0nn37t4h26zbvvhw0000gn/T/yss-perf-audit-o0rklmzn/root/.template-source/cli-core/build.mjs";
import fs from 'node:fs';
const root="/private/var/folders/8d/60y8vj2j0nn37t4h26zbvvhw0000gn/T/yss-perf-audit-o0rklmzn/root",base="/private/var/folders/8d/60y8vj2j0nn37t4h26zbvvhw0000gn/T/yss-perf-audit-o0rklmzn";
for(const side of ['backend','frontend']){
 const pkg=base+'/cli-'+side;
 syncCore(root,"6e38f46f2a6c749bc9b9fb57e227c273e797fc44",pkg);syncCore(root,"6e38f46f2a6c749bc9b9fb57e227c273e797fc44",pkg,true);
 const target=base+'/integration/create-yss-harness-'+side;fs.cpSync(pkg,target,{recursive:true});
 const source=base+'/sources/yss-harness-'+side+'-agent';
 const revisions={"root": "6e38f46f2a6c749bc9b9fb57e227c273e797fc44", "yss-harness-design-agent": "04c803271444d67c5461f0db6be73a67992dd629", "yss-harness-dev-agent": "cd39f52b9f54a05e5b3b9250322af68889d9c49f", "yss-harness-backend-agent": "b31e6144f305d586eaf1df8d539caf6ddbe1dab7", "yss-harness-frontend-agent": "8b40748a7db0b0cb287168c5d6ebde6d14ab99af"};syncTemplate(source,revisions['yss-harness-'+side+'-agent'],target);syncTemplate(source,revisions['yss-harness-'+side+'-agent'],target,true);
}
