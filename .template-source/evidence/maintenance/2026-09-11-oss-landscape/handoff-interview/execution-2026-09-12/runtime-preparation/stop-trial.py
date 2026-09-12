"""Only stop recorded trial resources. No action unless an explicit flag is supplied."""
from pathlib import Path
import argparse,subprocess,json,os,signal,datetime
out=Path(__file__).resolve().parent;parser=argparse.ArgumentParser();parser.add_argument('--launch-record',default='service-launch-08.json');parser.add_argument('--stop-java',action='store_true');parser.add_argument('--stop-containers',action='store_true');args=parser.parse_args();records=[]
if not(args.stop_java or args.stop_containers):parser.error('specify --stop-java and/or --stop-containers')
if args.stop_java:
 ref=(out/args.launch_record).resolve();assert ref.parent==out,'launch record outside evidence directory';x=json.loads(ref.read_text());pid=x['pid'];r=subprocess.run(['ps','-p',str(pid),'-o','command='],capture_output=True,text=True)
 if r.returncode==0:
  expected=x['argv'][x['argv'].index('-jar')+1];assert expected in r.stdout and str(x['config_ref']) in r.stdout,'PID identity changed; refuse stop';os.kill(pid,signal.SIGTERM);records.append({'action':'SIGTERM','pid':pid})
 else:records.append({'action':'already-stopped','pid':pid})
if args.stop_containers:
 for name in ['yss-preview-0kxzmm-pg','yss-preview-0kxzmm-redis']:
  base=['docker','--context','desktop-linux'];r=subprocess.run(base+['inspect',name,'--format','{{index .Config.Labels "yss.trial"}}'],capture_output=True,text=True);assert r.returncode==0 and r.stdout.strip()=='target-preview-20260912-0kxzmm','unverified container owner; refuse stop';r=subprocess.run(base+['stop',name],capture_output=True,text=True);records.append({'action':'stop-container','name':name,'exit_code':r.returncode,'stdout':r.stdout,'stderr':r.stderr});assert r.returncode==0
(out/('stop-actions-'+datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ')+'.json')).write_text(json.dumps(records,indent=2)+'\n');print('recorded stop actions; retained volumes and evidence')
