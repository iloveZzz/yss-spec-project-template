// Shared transport only: Context validation and digest rules belong to yss.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';

const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
export function contextBinary(environment=process.env) {
  let binary=environment.YSS_NATIVE_BINARY||environment.YSS_BINARY;
  if(!binary) {
    const name=process.platform==='win32'?'yss.exe':'yss';
    binary=(environment.PATH||'').split(path.delimiter).filter(Boolean).map(dir=>path.resolve(dir,name)).find(file=>fs.existsSync(file));
    if(binary)binary=fs.realpathSync(binary);
  }
  if(!binary||!path.isAbsolute(binary))throw new Error('CONTEXT_NATIVE_UNAVAILABLE: 需要 yss 二进制绝对路径或 PATH 上的 yss');
  const stat=fs.lstatSync(binary);
  if(!stat.isFile()||stat.isSymbolicLink())throw new Error('CONTEXT_NATIVE_INVALID: 二进制必须为普通文件');
  const digest=hash(fs.readFileSync(binary));
  if(environment.YSS_NATIVE_BINARY_SHA256&&environment.YSS_NATIVE_BINARY_SHA256!==digest)throw new Error('CONTEXT_NATIVE_DRIFT: 二进制摘要不匹配');
  return {binary,digest};
}

export function contextExecution(root,args=[],environment=process.env) {
  const {binary,digest}=contextBinary(environment),terms=[],allowed=[];
  let target=root,profile;
  const singletons=new Set();
  for(let i=0;i<args.length;i++) {
    const arg=args[i];
    if(arg==='--json')continue;
    const key=arg.split('=',1)[0];
    if(!['--root','--term-ref','--allowed-context','--profile'].includes(key))throw new Error(`Context 旧参数不支持: ${arg}`);
    const value=arg.includes('=')?arg.slice(arg.indexOf('=')+1):args[++i];
    if(!value||value.startsWith('--'))throw new Error(`Context 参数缺值: ${key}`);
    if(['--root','--profile'].includes(key)) {
      if(singletons.has(key))throw new Error(`Context 重复参数: ${key}`);
      singletons.add(key);
    }
    if(['--term-ref','--allowed-context'].includes(key)&&(value.includes(',')||value.trim()!==value))throw new Error(`Context 参数不能通过 CSV 重新解释: ${key}`);
    if(key==='--root')target=path.resolve(root,value);
    else if(key==='--profile')profile=value;
    else (key==='--term-ref'?terms:allowed).push(value);
  }
  const argv=['context','check','--root',path.resolve(target),'--json'];
  if(profile)argv.push('--profile',profile);
  if(terms.length)argv.push('--term-refs',terms.join(','));
  if(allowed.length)argv.push('--allowed-context-ids',allowed.join(','));
  return {file:binary,args:argv,cwd:root,environment:{},binary_sha256:digest,protocol:"context-envelope-v1"};
}

export function decodeContext(result) {
  if(result.error||result.signal||!Number.isInteger(result.status))throw new Error('CONTEXT_NATIVE_INTERRUPTED: '+(result.error?.message||result.signal));
  let envelope;
  try{envelope=JSON.parse(result.stdout);}catch{throw new Error('CONTEXT_NATIVE_PROTOCOL: 非 JSON 响应');}
  if(envelope.outputVersion!==1||envelope.protocolVersion!==1||envelope.command!=='context'||!['ok','error'].includes(envelope.status)
    ||!([0,1,2].includes(result.status))||(envelope.status==='ok')!==(result.status===0)||(envelope.code==='OK')!==(result.status===0))throw new Error('CONTEXT_NATIVE_PROTOCOL: 协议与退出码不一致');
  if(result.status!==0)throw Object.assign(new Error(`${envelope.code}: ${JSON.stringify(envelope.result)}`),{code:envelope.code,exitCode:result.status,envelope});
  if(!envelope.result?.context_snapshot)throw new Error('CONTEXT_NATIVE_CAPABILITY: yss 缺少 Context 快照能力，需显式升级');
  const snapshot=envelope.result.context_snapshot;
  const digest=value=>typeof value==='string'&&/^sha256:[0-9a-f]{64}$/.test(value);
  if(snapshot.context_ref!=='CONTEXT.md'||snapshot.context_schema_version!==1||!digest(snapshot.document_digest)||!digest(snapshot.referenced_terms_digest)||!Array.isArray(snapshot.term_refs)||snapshot.term_refs.some(ref=>typeof ref!=='string'||!ref.includes('/')))throw new Error('CONTEXT_NATIVE_PROTOCOL: 无效 Context 快照');
  return envelope.result;
}

export function runContextExecution(execution,environment=process.env) {
  contextBinary({...environment,YSS_NATIVE_BINARY:execution.file,YSS_NATIVE_BINARY_SHA256:execution.binary_sha256});
  const observed=spawnSync(execution.file,execution.args,{cwd:execution.cwd,env:environment,encoding:'utf8',timeout:120000,maxBuffer:32*1024*1024});
  contextBinary({...environment,YSS_NATIVE_BINARY:execution.file,YSS_NATIVE_BINARY_SHA256:execution.binary_sha256});
  return {execution,actual_exit_code:observed.status,result:decodeContext(observed)};
}

export function checkNativeContext({root=process.cwd(),termRefs=[],allowedContextIds=[],environment=process.env}={}) {
  const args=['--root',root,...termRefs.flatMap(ref=>['--term-ref',ref]),...allowedContextIds.flatMap(id=>['--allowed-context',id])];
  return runContextExecution(contextExecution(root,args,environment),environment).result;
}
