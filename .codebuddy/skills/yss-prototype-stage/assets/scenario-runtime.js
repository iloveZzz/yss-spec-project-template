// Initialization acknowledgement is not a business-behavior proof.
(() => {
 let state={status:'pending'},request=null,generation=0,fatalError=null;
 function send(){if(request)parent.postMessage({type:'yss-scenario-result',requestId:request.requestId,...state},'*');}
 function fail(error){state={...state,status:'error',error:String(error?.message||error)};send();}
 addEventListener('error',e=>{fatalError=e.error||e.message||'资源加载失败';fail(fatalError);},true);
 addEventListener('unhandledrejection',e=>{fatalError=e.reason;fail(fatalError);});
 addEventListener('message',e=>{if(e.source!==parent||e.data?.type!=='yss-scenario-request'||typeof e.data.requestId!=='string')return;request=e.data;send();});
 function initialize(id){
  if(fatalError)throw Error(String(fatalError.message||fatalError));
  const params=new URLSearchParams(location.hash.slice(1));
  if(id===undefined){if(!location.hash)id='primary';else if(params.size===1&&params.has('scenario'))id=params.get('scenario');else throw Error('未知或缺失的场景，请检查评审链接。');}
  const doc=window.prototypeScenarioContract,item=doc?.scenarios.find(s=>s.id===id);
  if(!item)throw Error('未知或缺失的场景，请检查评审链接。');
  document.getElementById('scenario-error')?.remove();const main=document.querySelector('main');if(main)main.hidden=false;
  const ticket=++generation;state={status:'pending',scenarioId:id,dataDigest:doc.data_digests[id]};
  return {id:item.id,label:item.label,stateRef:item.state_ref,data:JSON.parse(JSON.stringify(item.initial_data)),ticket};
 }
 function ready(ticket){if(ticket!==generation||state.status==='error')return;state={...state,status:'ready'};send();}
 function showError(error){fail(error);const box=document.createElement('section');box.setAttribute('role','alert');box.id='scenario-error';const h=document.createElement('h1');h.textContent='场景入口错误';const p=document.createElement('p');p.textContent=String(error.message||error);box.append(h,p);const main=document.querySelector('main');if(main)main.hidden=true;document.getElementById('scenario-error')?.remove();document.body.append(box);}
 window.prototypeRuntime={initialize,ready,fail,showError};
})();
