import pathlib,json,re,subprocess,sys,urllib.parse
s=json.load(open('/tmp/yss-manual-state.json'));issues=[];count=0
for name,r in s['repos'].items():
 p=pathlib.Path(r['path'])
 if len(sys.argv)>1 and name not in sys.argv[1:]:continue
 raw=subprocess.check_output(['git','diff','--name-only','-z',r['base']],cwd=p)+subprocess.check_output(['git','ls-files','--others','--exclude-standard','-z'],cwd=p)
 for f in sorted(set(raw.decode().split('\0'))):
  if not f.endswith('.md') or f.startswith('.template-source/evidence/'):continue
  file=p/f
  if not file.is_file():continue
  text=re.sub(r'```.*?```','',file.read_text(),flags=re.S);count+=1
  for dest in re.findall(r'\]\(([^)]+)\)',text):
   dest=urllib.parse.unquote(dest.strip('<>')).split('#')[0]
   if not dest or re.match(r'[a-zA-Z]+:',dest):continue
   if not (file.parent/dest).exists():issues.append(f'{name}/{f}: {dest}')
print(f'{count} modified manuals/readmes checked; {len(issues)} missing local targets')
print('\n'.join(issues));sys.exit(bool(issues))
