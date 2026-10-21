(() => {
 const $=id=>document.getElementById(id),mode=document.body.dataset.mode;
 let scene,rows,selected=new Set(),failed=false;
 $('title').textContent=({single:'逐项处理',batch:'批量处理',queue:'引导队列'})[mode];
 function button(label,action){const b=document.createElement('button');b.textContent=label;b.onclick=action;return b;}
 function act(ids){if(!ids.length)return;if(scene.id==='failure'&&!failed){failed=true;$('status').textContent='处理失败，选择与资料已保留，请重试。';return;}rows=rows.filter(r=>!ids.includes(r.id));for(const id of ids)selected.delete(id);$('status').textContent=`已处理 ${ids.length} 项（本地模拟）。`;render();}
 function render(){const box=$('content');box.replaceChildren();if(!rows.length){const p=document.createElement('p');p.textContent='全部资料已处理。';box.append(p);return;}
  if(mode==='batch'){box.append(button('选择全部',()=>{selected=new Set(rows.map(r=>r.id));render();}),button('通过所选',()=>act([...selected])));}
  for(const row of (mode==='queue'?rows.slice(0,1):rows)){const article=document.createElement('article'),h=document.createElement('h2'),p=document.createElement('p');h.textContent=`${row.id} · ${row.name}`;p.textContent=`负责人：${row.owner}；状态：${row.status}`;article.append(h,p);
   if(mode==='batch'){const label=document.createElement('label'),input=document.createElement('input');input.type='checkbox';input.checked=selected.has(row.id);input.onchange=()=>{if(input.checked)selected.add(row.id);else selected.delete(row.id);};label.append(input,`选择 ${row.id}`);article.append(label);}else article.append(button(mode==='queue'?'通过并继续':`通过 ${row.id}`,()=>act([row.id])));
   box.append(article);
  }
  if(mode==='queue'){const p=document.createElement('p');p.textContent=`剩余 ${rows.length} 项，按编号依次核对。`;box.append(p);}
 }
 function reset(){try{scene=window.prototypeRuntime.initialize();rows=scene.data.rows;selected=new Set();failed=false;$('status').textContent='待核对资料。';render();window.prototypeRuntime.ready(scene.ticket);}catch(e){window.prototypeRuntime.showError(e);}}
 $('reset').onclick=reset;addEventListener('hashchange',reset);reset();
})();
