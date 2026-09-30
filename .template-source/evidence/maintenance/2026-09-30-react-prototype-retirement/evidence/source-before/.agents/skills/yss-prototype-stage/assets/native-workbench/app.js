(() => {
 const $ = id => document.getElementById(id);

 let rows, serverRows, scenario, current, retried=false, trigger;
 function render(){
  const visible=(scenario==='empty'||scenario==='loading')?[]:rows.filter(r=>(r.id+r.name).includes($('keyword').value.trim()));
  $('count').textContent=`共 ${visible.length} 条`;
  $('list-status').textContent=scenario==='loading'?'正在加载（固定评审状态）':visible.length?'':'暂无符合条件的资料';
  $('rows').replaceChildren();
  for(const row of visible){const tr=document.createElement('tr');for(const key of ['id','name','owner','status']){const td=document.createElement('td');td.textContent=row[key];td.dataset.label=({id:'编号',name:'资料名称',owner:'负责人',status:'状态'})[key];tr.append(td);}const td=document.createElement('td');for(const type of ['查看','编辑']){const b=document.createElement('button');b.textContent=type;b.disabled=type==='编辑'&&scenario==='no-permission';b.setAttribute('aria-label',`${type} ${row.id}`);b.onclick=()=>open(row,type,b);td.append(b);}tr.append(td);$('rows').append(tr);}
 }
 function close(id){$(id).close();const next=document.querySelector(`[aria-label="${trigger}"]`);if(next&&!next.disabled)next.focus();}
 function open(row,type,b){current=row;trigger=b.getAttribute('aria-label');retried=false;$('retry').hidden=true;$('reload').hidden=true;$('edit-status').textContent='';if(type==='查看'){ $('detail-content').replaceChildren();for(const [key,label] of [['id','编号'],['name','名称'],['owner','负责人'],['status','状态'],['version','版本']]){const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;dd.textContent=row[key];$('detail-content').append(dt,dd);}$('detail').showModal();$('detail-close').focus();}else{$('name').value=row.name;$('owner').value=row.owner;$('version').textContent=row.version;$('edit').showModal();$('name').focus();}}
 function reset(){
  for(const el of document.querySelectorAll('dialog[open]'))el.close();
  let initial;try{initial=window.prototypeRuntime.initialize();}catch(e){window.prototypeRuntime.showError(e);return;}
  scenario=initial.id;rows=initial.data.rows;serverRows=initial.data.server_rows;current=null;retried=false;
  $('scenario').value=scenario;$('keyword').value='';$('feedback').textContent=scenario==='no-permission'?'当前资料仅可查看。':'';document.body.dataset.state=scenario;render();window.prototypeRuntime.ready(initial.ticket);
 }

 $('query').onsubmit=e=>{e.preventDefault();render();};$('clear').onclick=()=>{$('keyword').value='';render();};
 $('editor').onsubmit=e=>{e.preventDefault();if(scenario==='no-permission')return;if(scenario==='failure'&&!retried){$('edit-status').textContent='保存失败，输入已保留，请重试。';$('retry').hidden=false;return;}if(scenario==='conflict'&&!retried){$('edit-status').textContent='资料已被更新。输入已保留，重新加载前可复制内容。';$('reload').hidden=false;return;}current.name=$('name').value;current.owner=$('owner').value;current.status='已更新';render();close('edit');$('feedback').textContent='保存成功（本地模拟）。';document.body.dataset.state='success';};
 $('retry').onclick=()=>{retried=true;$('editor').requestSubmit();};$('reload').onclick=()=>{if(!confirm('放弃本地修改并重新加载？'))return;retried=true;const latest=serverRows.find(r=>r.id===current.id);Object.assign(current,latest);$('name').value=latest.name;$('owner').value=latest.owner;$('version').textContent=latest.version;$('reload').hidden=true;$('edit-status').textContent='已重新加载，可继续编辑。';$('name').focus();};
 $('cancel').onclick=()=>close('edit');$('detail-close').onclick=()=>close('detail');for(const id of ['edit','detail'])$(id).addEventListener('cancel',e=>{e.preventDefault();close(id);});
 $('scenario').onchange=()=>{location.hash=`scenario=${$('scenario').value}`;reset();};$('reset').onclick=reset;window.addEventListener('hashchange',reset);reset();
})();
