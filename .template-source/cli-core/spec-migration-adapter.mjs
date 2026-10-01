import * as fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {hash,ensure,same,descriptor,write} from './io.mjs';
import {inventory,copyCandidate,migration,parseMigration,assertUpgradeVersion} from './migrate.mjs';
import {verifyCore} from './build.mjs';
export function specAdapter(packageRoot) {
  verifyCore(packageRoot);
  const require=createRequire(path.join(packageRoot,'package.json'));
  const {buildSyncContext,applySyncContext}=require('./src/api/_sync-service');
  const {verifyGeneratedProjectInstance,refreshGeneratedProjectInstance,readProjectSkillLock}=require('./src/template/verification-runtime');
  const {readTemplateSnapshot}=require('./src/template/instance-runtime');
  const pkg=require('./package.json'),snapshot=readTemplateSnapshot();
  const family={side:'spec',packageName:'create-yss-spec',profileId:'harness.spec-template',metadataFile:'.yss-template.json'};
  const fingerprint=hash(JSON.stringify({pkg,snapshot,src:inventory(path.join(packageRoot,'src')),driver:inventory(path.join(packageRoot,'vendor/cli-core'))}));
  return {family,fingerprint,template:{version:pkg.version,...snapshot},
    check(root,opts){const c=buildSyncContext({targetDir:root,migrateLayout:opts.migrateLayout});assertUpgradeVersion(c.metadata.cliVersion || c.metadata.templateVersion,pkg.version);},
    prepare(root,opts,id,time){
      const context=buildSyncContext({targetDir:root,migrateLayout:opts.migrateLayout});
      const resolutions={...(opts.resolutions || {})}, conflictMap=new Map(context.syncPlan.forceableConflicts.map(o=>[o.relativePath,o]));
      for(const op of context.syncPlan.forceableConflicts){
        const saved=context.metadata.managedFiles[op.relativePath]?.migrationCustomization;
        if(!resolutions[op.relativePath] && saved?.templateDigest===op.desiredHash && saved.contentDigest===context.syncPlan.currentHashes[op.relativePath])
          resolutions[op.relativePath]={action:'preserve',beforeDigest:saved.contentDigest,templateDigest:saved.templateDigest};
      }
      const unresolved=context.syncPlan.conflicts.filter(o=>!resolutions[o.relativePath]);
      if(unresolved.length)throw Object.assign(new Error(`治理文件冲突，需逐项决议: ${unresolved.map(o=>o.relativePath).join(', ')}`),{code:'CONFLICT',result:{conflicts:unresolved.map(o=>({path:o.relativePath,beforeDigest:context.syncPlan.currentHashes[o.relativePath],templateDigest:o.desiredHash,resolutionSupported:conflictMap.has(o.relativePath)}))}});
      for(const [ref,r]of Object.entries(resolutions)) {
        const op=conflictMap.get(ref);
        ensure(op && context.metadata.managedFiles[ref] && r.beforeDigest===context.syncPlan.currentHashes[ref] && r.templateDigest===op.desiredHash,`非可信或过期的冲突决议: ${ref}`,'CONFLICT');
        ensure(['preserve','merge'].includes(r.action) && (r.action!=='merge' || typeof r.contentBase64==='string'),'冲突决议非法','CONFLICT');
      }
      const scratch=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'yss-spec-migration-')));
      try {
        const before=inventory(root);delete before['.yss-harness-migrate.lock'];copyCandidate(root,scratch,before);
        const stage=buildSyncContext({targetDir:scratch,migrateLayout:opts.migrateLayout});
        stage.syncPlan.forceableConflicts=stage.syncPlan.forceableConflicts.filter(o=>resolutions[o.relativePath]?.action==='merge');
        const applied=applySyncContext(stage,{force:stage.syncPlan.forceableConflicts.length>0,prune:opts.prune});
        try {
          const merged=Object.entries(resolutions).filter(([,r])=>r.action==='merge');
          if(merged.length){
            const lock=readProjectSkillLock(scratch);
            for(const [ref,r] of merged)write(scratch,ref,Buffer.from(r.contentBase64,'base64'),descriptor(root,ref).mode);
            // Regenerate from merged skill bytes; historical upstream baselines remain unchanged.
            const transaction={writeFile:(p,bytes)=>fs.writeFileSync(p,bytes),prepare(){},mark(){},ensureParent:p=>fs.mkdirSync(path.dirname(p),{recursive:true})};
            refreshGeneratedProjectInstance(scratch,{previousSkillLock:lock,previousManagedFiles:stage.metadata.managedFiles,transaction});
            verifyGeneratedProjectInstance(scratch);
          }
          const metaFile=path.join(scratch,family.metadataFile),meta=JSON.parse(fs.readFileSync(metaFile));
          for(const [ref,r] of Object.entries(resolutions)) {
            // Keep the upstream baseline separate from explicitly accepted local content.
            meta.managedFiles[ref]={...context.metadata.managedFiles[ref],contentHash:r.templateDigest,migrationCustomization:{templateDigest:r.templateDigest,contentDigest:hash(fs.readFileSync(path.join(scratch,ref)))}};
          }
          const prior=JSON.parse(fs.readFileSync(path.join(root,family.metadataFile)));
          meta.lastSyncedAt=prior.lastSyncedAt;
          if(JSON.stringify(meta)!==JSON.stringify(prior))meta.lastSyncedAt=time;
          fs.writeFileSync(metaFile,JSON.stringify(meta,null,2)+'\n');
          const after=inventory(scratch),operations=[];
          for(const ref of [...new Set([...Object.keys(before),...Object.keys(after)])].sort()) {
            const a=before[ref] || null,b=after[ref] || null;
            if(a?.type==='directory' || b?.type==='directory')continue;
            if(a?.type==='symlink' || b?.type==='symlink'){ensure(JSON.stringify(a)===JSON.stringify(b),'候选改变符号链接','PATH');continue;}
            if(!same(a,b))operations.push({path:ref,before:a,after:b,bytes:b?fs.readFileSync(path.join(scratch,ref)):undefined});
          }
          operations.sort((a,b)=>(a.path===family.metadataFile?1:0)-(b.path===family.metadataFile?1:0));
          return {operations,changes:context.plan.changes};
        }finally{if(applied.backupPath)fs.rmSync(applied.backupPath,{recursive:true,force:true});}
      }finally{fs.rmSync(scratch,{recursive:true,force:true});}
    },
    verify(root){
      const scratch=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'yss-spec-verify-')));
      try{const tree=inventory(root);delete tree['.yss-harness-migrate.lock'];copyCandidate(root,scratch,tree);verifyGeneratedProjectInstance(scratch);return [{name:'project-instance',status:'passed',location:'isolated-copy'}];}
      finally{fs.rmSync(scratch,{recursive:true,force:true});}
    },
  };
}
export function runSpecMigration(packageRoot,args){
 const {command,opts}=parseMigration(args),require=createRequire(path.join(packageRoot,'package.json'));
 const {withVerificationOutput}=require('./src/template/verification-runtime'),logs=[];
 const result=withVerificationOutput(text=>logs.push(text),()=>migration(specAdapter(packageRoot),command,opts));
 return {...result,...(logs.length?{verificationLog:logs.join('')}:{})};
}
