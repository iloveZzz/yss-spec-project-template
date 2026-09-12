import { readFileSync, statSync } from 'node:fs';
import { ensure, hash, digest, read, safe, files, schema, treeDigest } from './strategic-handoff-io.mjs';

// This is an observation bundle, not a prototype or an approval generator.
export function validateExistingUiBaseline(data, { bundleRoot } = {}) {
  const errors=[];
  try {
    schema(data,'docs/process/schemas/existing-ui-baseline.schema.json');
    ensure(bundleRoot,'existing-ui-baseline 需要原始 bundleRoot');
    const consumed=new Set(['existing-ui-baseline.json']);
    const allFiles=files(bundleRoot);
    ensure(allFiles.length<=20000&&allFiles.reduce((total,ref)=>total+statSync(safe(bundleRoot,ref)).size,0)<=100*1024*1024,'existing-ui-baseline 文件数量或包大小超限');
    const bound=binding=>{
      consumed.add(binding.ref);
      const bytes=readFileSync(safe(bundleRoot,binding.ref));
      ensure(bytes.length>0&&hash(bytes)===binding.digest,`existing-ui-baseline 原始证据摘要不一致: ${binding.ref}`);
      return bytes;
    };
    const document=binding=>{bound(binding);return read(safe(bundleRoot,binding.ref));};
    const source=data.source, manifest=document(source.manifest);
    ensure(source.digest===treeDigest(bundleRoot,source.root_ref),'existing-ui-baseline 固定源码摘要不一致');
    bound(source.lock);
    ensure(source.lock.ref.startsWith(`${source.root_ref}/`),'existing-ui-baseline 锁文件必须属于固定源码');
    ensure(manifest.schema_version===1&&manifest.kind==='existing-ui-source-observation','existing-ui-baseline 源码观测 manifest 类型无效');
    for(const key of ['repository_id','project_id','source_commit'])ensure(manifest[key]===source[key],`existing-ui-baseline 源码身份不一致: ${key}`);
    ensure(manifest.source_digest===source.digest&&Array.isArray(manifest.files),'existing-ui-baseline 源码观测摘要不一致');
    files(bundleRoot,source.root_ref).forEach(ref=>consumed.add(ref));
    const actual=files(bundleRoot,source.root_ref).map(ref=>({path:ref.slice(source.root_ref.length+1),digest:hash(readFileSync(safe(bundleRoot,ref)))}));
    ensure(digest([...manifest.files].sort((a,b)=>a.path.localeCompare(b.path)))===digest(actual.sort((a,b)=>a.path.localeCompare(b.path))),'existing-ui-baseline 观测文件集与实际源码不一致');
    let routePrefix='';
    if(data.api_route_mapping) {
      const mapping=data.api_route_mapping;
      for(const binding of [mapping.config,mapping.environment])ensure(binding.ref.startsWith(`${source.root_ref}/`)&&actual.some(file=>`${source.root_ref}/${file.path}`===binding.ref),'existing-ui-baseline 代理映射必须绑定固定源码');
      const config=bound(mapping.config).toString('utf8'),environment=bound(mapping.environment).toString('utf8');
      // A deliberately narrow existing Vite convention. Unrecognized rewrites need review;
      // never execute a package's JavaScript to obtain a routing assertion.
      ensure(/^\s*const apiBase = env\.VITE_API_BASE_URL \|\| ['"]\/api['"]\s*;?\s*$/m.test(config)
        && /proxy:\s*\{\s*\[apiBase\]:\s*\{\s*target:\s*proxyTarget,\s*changeOrigin:\s*true,\s*rewrite:\s*\(path\)\s*=>\s*path\.replace\(new RegExp\(`\^\$\{apiBase\}`\),\s*''\)\s*\}/.test(config),'existing-ui-baseline 不支持或缺少固定 Vite prefix rewrite');
      const values=environment.split(/\r?\n/).filter(line=>/^\s*VITE_API_BASE_URL\s*=/.test(line));
      ensure(values.length===1&&values[0].split('=').slice(1).join('=').trim()===mapping.prefix,'existing-ui-baseline 代理 prefix 与原始环境配置不一致');
      routePrefix=mapping.prefix;
    }
    const build=document(data.build),capture=document(data.capture);
    const openapi=document(data.openapi);bound(data.replay);
    ensure(/^3\.1\.[0-9]+$/.test(openapi.openapi)&&openapi.paths,'existing-ui-baseline 需要 OpenAPI 3.1 原始接口');
    for(const [label,record] of [['build',build],['capture',capture]]) {
      ensure(record.schema_version===1&&record.source_commit===source.source_commit&&record.source_digest===source.digest,`existing-ui-baseline ${label} 未绑定当前源码`);
      ensure(record.exit_code===0&&typeof record.command==='string'&&record.command.trim()&&Number.isFinite(Date.parse(record.executed_at)),`existing-ui-baseline ${label} 缺少成功执行记录`);
      ensure(Array.isArray(record.evidence)&&record.evidence.length,`existing-ui-baseline ${label} 缺少原始日志`);record.evidence.forEach(bound);
    }
    ensure(build.lock_digest===source.lock.digest,'existing-ui-baseline 构建锁文件不一致');
    ensure(build.output?.ref&&build.output.digest===treeDigest(bundleRoot,build.output.ref),'existing-ui-baseline 构建输出不一致');
    files(bundleRoot,build.output.ref).forEach(ref=>consumed.add(ref));
    ensure(capture.build_digest===data.build.digest&&capture.openapi_digest===data.openapi.digest,'existing-ui-baseline 截图运行与构建/API 不一致');
    ensure(capture.ui_change==='none'&&Array.isArray(capture.cases),'existing-ui-baseline 不支持 UI 改动');
    const ids=new Set();
    for(const item of data.cases) {
      ensure(!ids.has(item.case_id),`existing-ui-baseline case_id 重复: ${item.case_id}`);ids.add(item.case_id);
      for(const ref of item.source_refs)ensure(ref.startsWith(`${source.root_ref}/`)&&actual.some(file=>`${source.root_ref}/${file.path}`===ref),`existing-ui-baseline 用例源码悬空: ${ref}`);
      bound(item.actions);const api=document(item.api),image=bound(item.image);
      ensure(image.length<=5*1024*1024,'existing-ui-baseline 单张截图超过 5 MiB');
      ensure(image.length>=24&&image.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))&&image.toString('ascii',12,16)==='IHDR','existing-ui-baseline 截图不是 PNG');
      ensure(image.readUInt32BE(16)===item.viewport.width&&image.readUInt32BE(20)===item.viewport.height,'existing-ui-baseline 截图与 viewport 不一致');
      ensure(api.schema_version===1&&api.case_id===item.case_id&&api.openapi_digest===data.openapi.digest&&api.source_digest===source.digest&&api.build_digest===data.build.digest,'existing-ui-baseline API 证据来源不一致');
      ensure(Array.isArray(api.exchanges)&&api.exchanges.length,'existing-ui-baseline 缺少真实 API 请求/响应');
      for(const exchange of api.exchanges) {
        ensure(typeof exchange.operation_id==='string'&&exchange.operation_id&&typeof exchange.method==='string'&&/^https?:\/\//.test(exchange.url)&&Number.isFinite(Date.parse(exchange.executed_at))&&Number.isInteger(exchange.status)&&exchange.status>=100&&exchange.status<=599,'existing-ui-baseline API 交换记录无效');
        const operation=Object.entries(openapi.paths).flatMap(([route,item])=>Object.entries(item).filter(([method,value])=>value?.operationId===exchange.operation_id&&method.toUpperCase()===exchange.method.toUpperCase()).map(()=>route));
        ensure(operation.length===1,'existing-ui-baseline API operation 与冻结接口不一致');
        const routePattern=new RegExp(`^${operation[0].split('/').map(part=>/^\{[^}]+\}$/.test(part)?'[^/]+':part.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('/')}$`);
        const observedPath=new URL(exchange.url).pathname;
        ensure(!routePrefix||observedPath.startsWith(`${routePrefix}/`),'existing-ui-baseline API URL 与代理 prefix 不一致');
        ensure(routePattern.test(routePrefix?observedPath.slice(routePrefix.length):observedPath),'existing-ui-baseline API URL 与冻结接口路径不一致');
        bound(exchange.request);bound(exchange.response);
      }
      const observed=capture.cases.filter(entry=>entry.case_id===item.case_id);
      ensure(observed.length===1,'existing-ui-baseline 缺少或重复 capture case');
      for(const key of ['route','state','viewport','source_refs','actions','image','api'])ensure(digest(observed[0][key])===digest(item[key]),`existing-ui-baseline 截图动作绑定不一致: ${item.case_id}/${key}`);
    }
    ensure(capture.cases.length===ids.size,'existing-ui-baseline capture 含未登记用例');
    ensure(allFiles.every(ref=>consumed.has(ref)),'existing-ui-baseline 包含未绑定原始文件');
  } catch(error) { errors.push(error.message); }
  return {errors};
}
