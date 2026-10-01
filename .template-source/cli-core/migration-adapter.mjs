import * as fs from 'node:fs';
import path from 'node:path';
import {loadBundle} from './bundle.mjs';
import {identity} from './identity.mjs';
import {execute} from './engine.mjs';
import {verifyInstance} from './verification.mjs';
import {hash,ensure} from './io.mjs';
import {migration,parseMigration,assertUpgradeVersion} from './migrate.mjs';
export function dedicatedAdapter(packageRoot) {
  const bundle=loadBundle(packageRoot);
  const fingerprint=hash(JSON.stringify({pkg:bundle.pkg,snapshot:bundle.snapshot,core:bundle.core,driver:hash(fs.readFileSync(new URL('./migrate.mjs',import.meta.url)))}));
  return {
    family:bundle.family,fingerprint,template:{version:bundle.pkg.version,commit:bundle.snapshot.templateCommit,snapshotHash:bundle.snapshot.snapshotHash},
    check(root,opts){ensure(root!==packageRoot && !root.startsWith(packageRoot+path.sep) && !packageRoot.startsWith(root+path.sep),'目标不得覆盖 CLI 安装目录','PATH');const meta=identity(root,bundle,'sync',opts.migrateLayout);ensure(meta,'migrate 仅接受已有同家族实例','IDENTITY');assertUpgradeVersion(meta.cliVersion,bundle.pkg.version);},
    prepare(root,opts,id,time){return execute(bundle,root,{command:'sync',apply:true,prune:opts.prune,migrateLayout:opts.migrateLayout,migrationResolutions:opts.resolutions,migrationId:id,migrationTime:time,captureMigration:(operations,result)=>({operations,changes:result.changes})});},
    verify(root){return verifyInstance(bundle,root);},
  };
}
export function runMigration(packageRoot,args){const {command,opts}=parseMigration(args);return migration(dedicatedAdapter(packageRoot),command,opts);}
