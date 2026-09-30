import {React,useState,render,Notice,Button,Checkbox,Badge} from './shared';
function Page({scene}){
 const [rows,setRows]=useState(scene.data.rows),[selected,setSelected]=useState([]),[attempted,setAttempted]=useState(false),[message,setMessage]=useState('');
 const denied=scene.id==='no-permission';
 function allowed(r){return !denied&&r.owner!=='李华';}
 function act(ids){const eligible=rows.filter(r=>ids.includes(r.id)&&allowed(r)),failed=scene.id==='failure'&&!attempted?eligible.slice(-1).map(r=>r.id):[];const success=eligible.filter(r=>!failed.includes(r.id)).map(r=>r.id);setRows(rows.filter(r=>!success.includes(r.id)));setSelected(selected.filter(id=>!success.includes(id)));setAttempted(true);setMessage(`已处理 ${success.length} 项${failed.length?'；1 项失败，保留在待处理列表，可重试。':'（本地模拟）。'}`);}
 return <section className="surface"><h2>待处理资料 · {rows.length} 项</h2><Notice>{denied?'当前角色无审批权限。':''}</Notice><div className="toolbar"><Button disabled={!selected.length||denied} onClick={()=>act(selected)}>批量通过</Button><span>已选择 {selected.length} 项</span></div><Notice error={message.includes('失败')}>{message}</Notice><ul className="queue">{rows.map(r=><li key={r.id}><div className="toolbar"><Checkbox checked={selected.includes(r.id)} disabled={!allowed(r)} aria-label={`选择 ${r.id}`} onCheckedChange={checked=>setSelected(checked?[...selected,r.id]:selected.filter(x=>x!==r.id))}/><strong>{r.id} · {r.name}</strong><Badge variant="outline">{r.status}</Badge></div><p>负责人：{r.owner}</p>{!allowed(r)&&<p>不可处理：{denied?'当前角色无权限':'关联资料尚未补齐，请联系负责人补齐后重新进入审批。'}</p>}<Button disabled={!allowed(r)} variant="outline" aria-label={`通过 ${r.id}`} onClick={()=>act([r.id])}>通过</Button></li>)}</ul>{!rows.length&&<Notice>当前没有待处理事项。</Notice>}</section>;
}
render(Page,'审批与权限');
