from pathlib import Path
import urllib.request,urllib.error,json,datetime,sys
out=Path(__file__).resolve().parent;attempt=sys.argv[1] if len(sys.argv)>1 else '02';opener=urllib.request.build_opener(urllib.request.ProxyHandler({}));records=[]
for name,task,q in [('default','PILOT_PREVIEW',''),('current','PILOT_PREVIEW','?scope=CURRENT'),('all','PILOT_PREVIEW','?scope=ALL'),('invalid','PILOT_PREVIEW','?scope=INVALID'),('unknown','PILOT_UNKNOWN',''),('empty','PILOT_EMPTY','')]:
 url='http://127.0.0.1:61111/file-sync/tasks/'+task+'/target-data-preview'+q
 try:
  try:r=opener.open(url,timeout=15)
  except urllib.error.HTTPError as e:r=e
  body=r.read().decode();v={'name':name,'url':url,'status':r.status,'headers':dict(r.headers),'body':body,'observed_at':datetime.datetime.now(datetime.timezone.utc).isoformat()};records.append(v);print(name,r.status)
 except Exception as e:records.append({'name':name,'url':url,'error':str(e)});print(name,type(e).__name__,str(e))
(out/('preview-http-observations-'+attempt+'.json')).write_text(json.dumps(records,ensure_ascii=False,indent=2)+'\n')
assert all('status' in x for x in records),'HTTP incomplete'
