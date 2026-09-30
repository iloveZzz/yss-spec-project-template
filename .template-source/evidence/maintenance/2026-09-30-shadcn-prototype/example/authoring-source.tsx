import React, {useEffect, useRef, useState} from 'react';
import {createRoot} from 'react-dom/client';
import {Button} from '@/registry/new-york-v4/ui/button';
import {Input} from '@/registry/new-york-v4/ui/input';
import {Badge} from '@/registry/new-york-v4/ui/badge';
import {Label} from '@/registry/new-york-v4/ui/label';
import {Dialog, DialogContent, DialogTitle, DialogDescription, DialogHeader} from '@/registry/new-york-v4/ui/dialog';
import {Select, SelectTrigger, SelectValue, SelectContent, SelectItem} from '@/registry/new-york-v4/ui/select';
import {Table, TableHeader, TableBody, TableRow, TableHead, TableCell} from '@/registry/new-york-v4/ui/table';

const seed = [{id:'M-001',name:'季度经营分析资料',owner:'张明',status:'已更新'}, {id:'M-002',name:'跨部门业务协作与异常处理说明（长名称示例）',owner:'李华',status:'待核对'}, {id:'M-003',name:'归档清单',owner:'王宁',status:'已更新'}];
const scenarios = window.prototypeScenarios;
function readScenario() {
  const params = new URLSearchParams(location.hash.slice(1));
  if (!location.hash) return 'primary';
  const id = params.get('scenario');
  return params.size === 1 && scenarios.some(x => x.id === id) ? id : null;
}
function Workbench() {
  const [scenario,setScenario] = useState(readScenario), [rows,setRows] = useState(seed), [query,setQuery] = useState(''), [filter,setFilter] = useState('');
  const [dialog,setDialog] = useState(null), [draft,setDraft] = useState(null), [error,setError] = useState(''), [reloaded,setReloaded] = useState(false), [feedback,setFeedback] = useState('');
  const origin = useRef(null);
  function reset(id) {setScenario(id);setRows(seed.map(x=>({...x})));setQuery('');setFilter('');setDialog(null);setDraft(null);setError('');setReloaded(false);setFeedback('');}
  useEffect(()=>{const change=()=>reset(readScenario());window.addEventListener('hashchange',change);return ()=>window.removeEventListener('hashchange',change);},[]);
  function selectScenario(id) {if(!scenarios.some(x=>x.id===id)){reset(null);return;}reset(id);location.hash=`scenario=${id}`;}
  function open(row,kind) {origin.current=document.activeElement;setDraft({...row});setDialog(kind);setError('');setReloaded(false);}
  function save(retry=false) {
    if (scenario==='no-permission') return;
    if (!draft.name.trim()) {setError('请输入资料名称');document.getElementById('name')?.focus();return;}
    if (scenario==='failure' && !retry) {setError('保存失败，输入已保留，请重试。');return;}
    if (scenario==='conflict' && !reloaded) {setError('资料已更新。输入已保留，重新加载前可复制内容。');return;}
    setRows(rows.map(row=>row.id===draft.id?{...draft,status:'已更新'}:row));setDialog(null);setFeedback('保存成功（本地模拟）。');
  }
  if (scenario===null) return <main><h1>场景入口错误</h1><p role="alert">未知或缺失的场景，请检查评审链接。</p><Button onClick={()=>selectScenario('primary')}>返回正常场景</Button></main>;
  const visible=['empty','loading'].includes(scenario)?[]:rows.filter(x=>(x.id+x.name).includes(filter));
  return <><header className="app-header"><strong>业务工作台</strong><nav aria-label="当前位置">资料管理 / 资料维护</nav></header><main>
    <div className="heading"><div><h1>资料维护</h1><p className="muted">查询资料、核对详情并维护负责人。</p></div><Badge variant="outline">示例数据</Badge></div>
    <section className="surface" aria-label="查询条件"><form onSubmit={e=>{e.preventDefault();setFilter(query.trim());}}><Label htmlFor="keyword">资料名称</Label><div className="actions"><Input id="keyword" value={query} onChange={e=>setQuery(e.target.value)} placeholder="输入名称或编号"/><Button type="submit">查询</Button><Button type="button" variant="outline" onClick={()=>{setQuery('');setFilter('');}}>重置筛选</Button></div></form></section>
    <section className="surface" aria-label="资料列表"><h2>资料列表 · 共 {visible.length} 条</h2>{scenario==='no-permission'&&<p className="notice">当前资料仅可查看。</p>}
      <Table><TableHeader><TableRow>{['编号','资料名称','负责人','状态','操作'].map(x=><TableHead key={x}>{x}</TableHead>)}</TableRow></TableHeader><TableBody>
        {visible.map(row=><TableRow key={row.id}><TableCell>{row.id}</TableCell><TableCell>{row.name}</TableCell><TableCell>{row.owner}</TableCell><TableCell><Badge variant="secondary">{row.status}</Badge></TableCell><TableCell><div className="row-actions"><Button variant="outline" aria-label={`查看 ${row.id}`} onClick={()=>open(row,'detail')}>查看</Button><Button variant="outline" aria-label={`编辑 ${row.id}`} disabled={scenario==='no-permission'} onClick={()=>open(row,'edit')}>编辑</Button></div></TableCell></TableRow>)}
        {!visible.length&&<TableRow><TableCell colSpan={5}><p role="status">{scenario==='loading'?'正在加载（固定评审状态）':'暂无符合条件的资料'}</p></TableCell></TableRow>}
      </TableBody></Table>
    </section><p role="status">{feedback}</p>
    <details className="review-controls"><summary>评审场景</summary><Label htmlFor="scenario">场景</Label><div className="actions"><select id="scenario" value={scenario} onChange={e=>selectScenario(e.target.value)}>{scenarios.map(x=><option key={x.id} value={x.id}>{x.label}</option>)}</select><Button variant="outline" id="reset" onClick={()=>reset(scenario)}>重置场景</Button></div><p className="muted">供评审使用；所有数据和保存结果均为本地模拟。</p></details>
    <Dialog open={!!dialog} onOpenChange={value=>{if(!value)setDialog(null);}}><DialogContent showCloseButton={false} onOpenAutoFocus={e=>{if(dialog==='edit'){e.preventDefault();document.getElementById('name')?.focus();}}} onCloseAutoFocus={e=>{e.preventDefault();origin.current?.focus();}}>
      <DialogHeader><DialogTitle>{dialog==='detail'?'资料详情':'编辑资料'}</DialogTitle><DialogDescription>{dialog==='detail'?'核对当前资料信息。':'修改名称或负责人后保存。'}</DialogDescription></DialogHeader>
      {draft && (dialog==='detail'?<><dl>{Object.entries(draft).map(([k,v])=><React.Fragment key={k}><dt>{({id:'编号',name:'名称',owner:'负责人',status:'状态'})[k]}</dt><dd>{v}</dd></React.Fragment>)}</dl><Button variant="outline" onClick={()=>setDialog(null)}>关闭详情</Button></>:<form onSubmit={e=>{e.preventDefault();save();}} noValidate>
        <Label htmlFor="name">资料名称</Label><Input id="name" maxLength={80} required value={draft.name} aria-invalid={error==='请输入资料名称'} aria-describedby={error?'edit-error':undefined} onChange={e=>setDraft({...draft,name:e.target.value})}/>
        <Label htmlFor="owner">负责人</Label><Select value={draft.owner} onValueChange={owner=>setDraft({...draft,owner})}><SelectTrigger id="owner"><SelectValue/></SelectTrigger><SelectContent>{['张明','李华','王宁','最新负责人'].map(x=><SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent></Select>
        {error&&<p id="edit-error" role="alert" className="notice error">{error}</p>}<div className="actions"><Button id="save" type="submit">保存</Button>{error&&scenario==='failure'&&<Button id="retry" type="button" variant="outline" onClick={()=>save(true)}>重试</Button>}{error&&scenario==='conflict'&&<Button id="reload" type="button" variant="outline" onClick={()=>{setDraft({...draft,owner:'最新负责人'});setReloaded(true);setError('已重新加载，请确认后保存。');}}>重新加载</Button>}<Button type="button" variant="outline" onClick={()=>setDialog(null)}>取消</Button></div>
      </form>)}
    </DialogContent></Dialog></main></>;
}
createRoot(document.getElementById('app')).render(<Workbench/>);
