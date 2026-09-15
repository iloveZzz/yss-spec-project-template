(() => {
 const $ = id => document.getElementById(id);
 const seed = [{id:'M-001',name:'季度经营分析资料',owner:'张明',status:'已更新'},{id:'M-002',name:'跨部门业务协作与异常处理说明（长名称示例）',owner:'李华',status:'待核对'},{id:'M-003',name:'归档清单',owner:'王宁',status:'已更新'}];
 let rows, scenario, current, retried=false, trigger;
 function render(){
  const visible=(scenario==='empty'||scenario==='loading')?[]:rows.filter(r=>(r.id+r.name).includes($('keyword').value.trim()));
  $('count').textContent=`共 ${visible.length} 条`;
  $('list-status').textContent=scenario==='loading'?'正在加载（固定评审状态）':visible.length?'':'暂无符合条件的资料';
  $('rows').replaceChildren();
  for(const row of visible){const tr=document.createElement('tr');for(const key of ['id','name','owner','status']){const td=document.createElement('td');td.textContent=row[key];tr.append(td);}const td=document.createElement('td');for(const type of ['查看','编辑']){const b=document.createElement('button');b.textContent=type;b.disabled=type==='编辑'&&scenario==='no-permission';b.setAttribute('aria-label',`${type} ${row.id}`);b.onclick=()=>open(row,type,b);td.append(b);}tr.append(td);$('rows').append(tr);}
 }
 function close(id){$(id).close();const next=document.querySelector(`[aria-label="${trigger}"]`);if(next&&!next.disabled)next.focus();}
 function open(row,type,b){current=row;trigger=b.getAttribute('aria-label');retried=false;$('retry').hidden=true;$('reload').hidden=true;$('edit-status').textContent='';if(type==='查看'){ $('detail-content').replaceChildren();for(const [key,label] of [['id','编号'],['name','名称'],['owner','负责人'],['status','状态']]){const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;dd.textContent=row[key];$('detail-content').append(dt,dd);}$('detail').showModal();$('detail-close').focus();}else{$('name').value=row.name;$('owner').value=row.owner;$('edit').showModal();$('name').focus();}}
 function reset(){for(const id of ['detail','edit'])if($(id).open)$(id).close();scenario=new URLSearchParams(location.hash.slice(1)).get('scenario')||'primary';if(![...$('scenario').options].some(x=>x.value===scenario))scenario='primary';$('scenario').value=scenario;rows=seed.map(x=>({...x}));$('keyword').value='';$('feedback').textContent=scenario==='no-permission'?'当前资料仅可查看。':'';document.body.dataset.state=scenario;render();}
 $('query').onsubmit=e=>{e.preventDefault();render();};$('clear').onclick=()=>{$('keyword').value='';render();};
 $('editor').onsubmit=e=>{e.preventDefault();if(scenario==='no-permission')return;if(scenario==='failure'&&!retried){$('edit-status').textContent='保存失败，输入已保留，请重试。';$('retry').hidden=false;return;}if(scenario==='conflict'&&!retried){$('edit-status').textContent='资料已被更新。输入已保留，重新加载前可复制内容。';$('reload').hidden=false;return;}current.name=$('name').value;current.owner=$('owner').value;current.status='已更新';render();close('edit');$('feedback').textContent='保存成功（本地模拟）。';document.body.dataset.state='success';};
 $('retry').onclick=()=>{retried=true;$('editor').requestSubmit();};$('reload').onclick=()=>{retried=true;$('name').value=current.name;$('owner').value='最新负责人';$('reload').hidden=true;$('edit-status').textContent='已重新加载，可继续编辑。';$('name').focus();};
 $('cancel').onclick=()=>close('edit');$('detail-close').onclick=()=>close('detail');for(const id of ['edit','detail'])$(id).addEventListener('cancel',e=>{e.preventDefault();close(id);});
 $('scenario').onchange=()=>{location.hash=`scenario=${$('scenario').value}`;reset();};$('reset').onclick=reset;window.addEventListener('hashchange',reset);reset();
})();
