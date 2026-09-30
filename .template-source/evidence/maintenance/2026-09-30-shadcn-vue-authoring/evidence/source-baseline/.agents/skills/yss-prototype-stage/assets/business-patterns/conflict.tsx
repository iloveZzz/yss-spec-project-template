import React, {useEffect, useRef, useState} from 'react';
import {createRoot} from 'react-dom/client';
import {Button} from '@/registry/new-york-v4/ui/button';
import {Input} from '@/registry/new-york-v4/ui/input';
import {Badge} from '@/registry/new-york-v4/ui/badge';
import {Label} from '@/registry/new-york-v4/ui/label';
import {Dialog, DialogContent, DialogTitle, DialogDescription, DialogHeader} from '@/registry/new-york-v4/ui/dialog';
import {Select, SelectTrigger, SelectValue, SelectContent, SelectItem} from '@/registry/new-york-v4/ui/select';
import {Table, TableHeader, TableBody, TableRow, TableHead, TableCell} from '@/registry/new-york-v4/ui/table';
import {AlertDialog,AlertDialogContent,AlertDialogHeader,AlertDialogTitle,AlertDialogDescription,AlertDialogFooter,AlertDialogAction,AlertDialogCancel} from '@/registry/new-york-v4/ui/alert-dialog';
import {Field,FieldLabel,FieldDescription,FieldError} from '@/registry/new-york-v4/ui/field';
import {Alert,AlertDescription} from '@/registry/new-york-v4/ui/alert';
import {Separator} from '@/registry/new-york-v4/ui/separator';
const runtime=window.prototypeRuntime;
function initial(){try{return runtime.initialize();}catch(e){runtime.fail(e);return null;}}
function Workbench(){
 const [start,setStart]=useState(initial),[rows,setRows]=useState(()=>start?.data.rows||[]);
 const [query,setQuery]=useState(''),[filter,setFilter]=useState('');
 const [dialog,setDialog]=useState(null),[draft,setDraft]=useState(null),[error,setError]=useState('');
 const [reloaded,setReloaded]=useState(false),[feedback,setFeedback]=useState(''),[confirmReload,setConfirmReload]=useState(false);
 const origin=useRef(null),scenario=start?.id;
 function reset(){const next=initial();setStart(next);setRows(next?.data.rows||[]);setQuery('');setFilter('');setDialog(null);setDraft(null);setError('');setReloaded(false);setFeedback('');setConfirmReload(false);}
 useEffect(()=>{const change=()=>reset();addEventListener('hashchange',change);return()=>removeEventListener('hashchange',change);},[]);
 useEffect(()=>{if(start)runtime.ready(start.ticket);},[start]);
 function selectScenario(id){if(location.hash===`#scenario=${id}`)reset();else location.hash=`scenario=${id}`;}
 function open(row,kind,trigger){origin.current=trigger;setDraft({...row});setDialog(kind);setError('');setReloaded(false);}
 function save(retry=false){
  if(scenario==='no-permission')return;
  if(!draft.name.trim()){setError('请输入资料名称');document.getElementById('name')?.focus();return;}
  if(scenario==='failure'&&!retry){setError('保存失败，输入已保留，请重试。');return;}
  if(scenario==='conflict'&&!reloaded){setError('资料已更新。输入已保留，重新加载前可复制内容。');return;}
  setRows(rows.map(row=>row.id===draft.id?{...draft,status:'已更新'}:row));setDialog(null);setFeedback('保存成功（本地模拟）。');
 }
 function reload(){setDraft({...start.data.server_rows.find(row=>row.id===draft.id)});setReloaded(true);setConfirmReload(false);setError('已重新加载，请确认后保存。');}
 if(!start)return <main><h1>场景入口错误</h1><p role="alert">未知或缺失的场景，请检查评审链接。</p></main>;
 const visible=rows.filter(x=>(x.id+x.name).includes(filter));
 return <><header className="app-header"><strong>业务工作台</strong><nav aria-label="当前位置">资料管理 / 资料维护</nav></header><main>
  <div className="heading"><div><h1>资料维护</h1><p className="muted">查询资料、核对详情并维护负责人。</p></div><Badge variant="outline">示例数据</Badge></div>
  <section className="surface" aria-label="查询条件"><form onSubmit={e=>{e.preventDefault();setFilter(query.trim());}}><Label htmlFor="keyword">资料名称</Label><div className="actions"><Input id="keyword" value={query} onChange={e=>setQuery(e.target.value)} placeholder="输入名称或编号"/><Button type="submit">查询</Button><Button type="button" variant="outline" onClick={()=>{setQuery('');setFilter('');}}>重置筛选</Button></div></form></section>
  <section className="surface" aria-label="资料列表"><h2>资料列表 · 共 {visible.length} 条</h2>{scenario==='no-permission'&&<p className="notice">当前资料仅可查看。</p>}
   <Table className="responsive-list"><TableHeader><TableRow>{['编号','资料名称','负责人','状态','操作'].map(x=><TableHead key={x}>{x}</TableHead>)}</TableRow></TableHeader><TableBody>
    {visible.map(row=><TableRow key={row.id}><TableCell data-label="编号">{row.id}</TableCell><TableCell data-label="资料名称">{row.name}</TableCell><TableCell data-label="负责人">{row.owner}</TableCell><TableCell data-label="状态"><Badge variant="secondary">{row.status}</Badge></TableCell><TableCell><div className="row-actions"><Button variant="outline" aria-label={`查看 ${row.id}`} onClick={e=>open(row,'detail',e.currentTarget)}>查看</Button><Button variant="outline" aria-label={`编辑 ${row.id}`} disabled={scenario==='no-permission'} onClick={e=>open(row,'edit',e.currentTarget)}>编辑</Button></div></TableCell></TableRow>)}
    {!visible.length&&<TableRow><TableCell colSpan={5}><p role="status">{scenario==='loading'?'正在加载（固定评审状态）':'暂无符合条件的资料'}</p></TableCell></TableRow>}
   </TableBody></Table>
  </section><p role="status">{feedback}</p>
  <details className="review-controls"><summary>评审场景</summary><Label htmlFor="scenario">场景</Label><div className="actions"><select id="scenario" value={scenario} onChange={e=>selectScenario(e.target.value)}>{window.prototypeScenarios.map(x=><option key={x.id} value={x.id}>{x.label}</option>)}</select><Button variant="outline" id="reset" onClick={reset}>重置场景</Button></div><p className="muted">所有数据和保存结果均为本地模拟。</p></details>
  <Dialog open={!!dialog} onOpenChange={value=>{if(!value)setDialog(null);}}><DialogContent showCloseButton={false} onOpenAutoFocus={e=>{if(dialog==='edit'){e.preventDefault();document.getElementById('name')?.focus();}}} onCloseAutoFocus={e=>{e.preventDefault();origin.current?.focus();}}>
   <DialogHeader><DialogTitle>{dialog==='detail'?'资料详情':'编辑资料'}</DialogTitle><DialogDescription>{dialog==='detail'?'核对当前资料信息。':'修改名称或负责人后保存。'}</DialogDescription></DialogHeader>
   {draft&&(dialog==='detail'?<><dl>{Object.entries(draft).map(([k,v])=><React.Fragment key={k}><dt>{({id:'编号',name:'名称',owner:'负责人',status:'状态',version:'版本'})[k]}</dt><dd>{v}</dd></React.Fragment>)}</dl><Button variant="outline" onClick={()=>setDialog(null)}>关闭详情</Button></>:<form onSubmit={e=>{e.preventDefault();save();}} noValidate>
    <Field data-invalid={error==='请输入资料名称'}><FieldLabel htmlFor="name">资料名称</FieldLabel><Input id="name" maxLength={80} required value={draft.name} aria-invalid={error==='请输入资料名称'} aria-describedby={error?'name-help edit-error':'name-help'} onChange={e=>{setDraft({...draft,name:e.target.value});if(error==='请输入资料名称')setError('');}}/><FieldDescription id="name-help">草稿保留至保存成功或确认放弃；重新加载会替换完整资料。</FieldDescription></Field>
    <Field><FieldLabel htmlFor="owner">负责人</FieldLabel><Select value={draft.owner} onValueChange={owner=>setDraft({...draft,owner})}><SelectTrigger id="owner"><SelectValue/></SelectTrigger><SelectContent>{['张明','李华','王宁','最新负责人'].map(x=><SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent></Select></Field><Separator/>
    <p>版本：<span id="version">{draft.version}</span></p>{error&&<Alert id="edit-error" className="notice error"><AlertDescription>{error}</AlertDescription></Alert>}
    <div className="actions"><Button id="save" type="submit">保存</Button>{error&&scenario==='failure'&&<Button id="retry" type="button" variant="outline" onClick={()=>save(true)}>重试</Button>}{error&&scenario==='conflict'&&<Button id="reload" type="button" variant="outline" onClick={()=>setConfirmReload(true)}>重新加载</Button>}<Button type="button" variant="outline" onClick={()=>setDialog(null)}>取消</Button></div>
   </form>)}
  </DialogContent></Dialog>
  <AlertDialog open={confirmReload} onOpenChange={setConfirmReload}><AlertDialogContent onCloseAutoFocus={e=>{e.preventDefault();document.getElementById(reloaded?'save':'reload')?.focus();}}><AlertDialogHeader><AlertDialogTitle>放弃本地修改并重新加载？</AlertDialogTitle><AlertDialogDescription>本地草稿将被服务端完整快照替换；取消可保留当前输入。</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>保留草稿</AlertDialogCancel><AlertDialogAction onClick={reload}>放弃并重新加载</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
 </main></>;
}
createRoot(document.getElementById('app')).render(<Workbench/>);
