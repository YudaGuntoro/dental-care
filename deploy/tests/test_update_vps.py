# Simulated Docker operations only: no real Docker/VPS is used.
import json, os, shutil, subprocess, sys, tempfile
from pathlib import Path
source=(Path(__file__).resolve().parents[1]/'update-vps.sh').read_text()
bash=os.environ.get('WMS_TEST_BASH') or shutil.which('bash')
if not bash: raise SystemExit('Bash is required for the simulated deployment tests')
fake=r'''
import json,os,sys
sys.stdout.reconfigure(newline='\n')
from pathlib import Path
p=Path(os.environ['MOCK_ROOT'])/'state.json'
s=json.loads(p.read_text());a=sys.argv[1:];s['calls'].append(a)
def save(): p.write_text(json.dumps(s))
if a[0]=='info': save();sys.exit(0)
if a[0]=='inspect':
 name=a[-1]
 if name not in s['containers']:save();sys.exit(1)
 c=s['containers'][name]
 if '--format' not in a:print(json.dumps([c]))
 else:
  f=a[a.index('--format')+1]
  if '.Config.Env' in f:print('\n'.join(c['env']))
  elif '.Mounts' in f:print('bind|/srv/wms data|/app/data|false\nvolume|wms-cache|/cache|true')
  elif '.NetworkSettings.Networks' in f:print('\n'.join(c['networks']))
  elif '.HostConfig.ExtraHosts' in f:print('legacy-host:host-gateway')
  elif '.HostConfig.NetworkMode' in f:print(c['primary'])
  else:raise Exception(f)
 save();sys.exit(0)
if a[:2]==['network','inspect']:
 if '--format' in a:print('mysql_vps' if s.get('mysql_connected',True) else '')
 else:print('{}')
elif a[:2]==['network','connect']:
 s['containers'][a[-1]]['networks'].append(a[2])
elif a[0]=='build':
 if s.get('fail_build') and s['fail_build'] in ' '.join(a):save();sys.exit(1)
elif a[0]=='stop':s['containers'][a[1]]['running']=False
elif a[0]=='rename':s['containers'][a[2]]=s['containers'].pop(a[1])
elif a[0]=='run':
 name=a[a.index('--name')+1]
 if s.get('fail_run')==name:save();sys.exit(1)
 env=Path(a[a.index('--env-file')+1]).read_text().splitlines()
 s['containers'][name]={'env':env,'version':'new','networks':[a[a.index('--network')+1]],'primary':a[a.index('--network')+1],'running':True}
 print('new-container-id')
elif a[0]=='rm':s['containers'].pop(a[-1],None)
elif a[0]=='start':s['containers'][a[1]]['running']=True
elif a[0]=='logs':print('mock container log')
elif a[0]=='ps':print('mock running services')
else:raise Exception(a)
save()
'''
with tempfile.TemporaryDirectory(prefix='wms-deploy-test-') as temp:
 for mode,scenario in [('fe','ok'),('be','ok'),('both','ok'),('both','build_failure'),('be','run_failure'),('fe','readiness_failure'),('be','bad_host'),('be','missing_mysql_network')]:
  root=Path(temp)/f'{mode}-{scenario}';(root/'deploy').mkdir(parents=True)
  modified=source.replace('/root/wms-toho-updates/',root.as_posix()+'/snapshots/')
  (root/'deploy/update-vps.sh').write_text(modified,newline='\n')
  for name in ['Dockerfile.api','Dockerfile.fe']:(root/name).write_text('test')
  (root/'mock_docker.py').write_text(fake)
  old_env=['ConnectionStrings__DefaultConnection=Server=mysql_vps;Port=3306;Database=wms-system-toho;User ID=existing-user;Password=sample-secret-not-real;','CUSTOM_SETTING=keep this value']
  state={'calls':[],'containers':{'wms-toho-api':{'env':old_env,'networks':['wms-toho-net'],'primary':'wms-toho-net','version':'old','running':True},'wms-toho-fe':{'env':['CUSTOM_FE=unchanged'],'networks':['bridge','monitoring_net'],'primary':'default','version':'old','running':True},'mysql_vps':{'env':[],'networks':['mysql_dbnet','wms-toho-net'],'primary':'mysql_dbnet','version':'old','running':True}}}
  if scenario=='build_failure':state['fail_build']='Dockerfile.fe'
  if scenario=='run_failure':state['fail_run']='wms-toho-api'
  if scenario=='bad_host':state['containers']['wms-toho-api']['env']=['ConnectionStrings__DefaultConnection=Server=127.0.0.1;Password=test;']
  if scenario=='missing_mysql_network':state['mysql_connected']=False
  (root/'state.json').write_text(json.dumps(state))
  driver='''#!/usr/bin/env bash
function docker() { "$MOCK_PYTHON" "$MOCK_ROOT/mock_docker.py" "$@"; }
function curl() { if [[ "$MOCK_READY_FAIL" == 1 ]]; then printf 000; return 7; fi; if [[ "$*" == *5279* ]]; then printf 401; else printf 200; fi; }
function id() { printf 0; }
function sleep() { :; }
export -f docker curl id sleep
bash "$MOCK_ROOT/deploy/update-vps.sh" "$MOCK_MODE"
'''
  (root/'driver.sh').write_text(driver,newline='\n')
  env={**os.environ,'MOCK_ROOT':root.as_posix(),'MOCK_PYTHON':sys.executable.replace('\\','/'),'MOCK_MODE':mode,'MOCK_READY_FAIL':'1' if scenario=='readiness_failure' else '0','MSYS_NO_PATHCONV':'1'}
  result=subprocess.run([bash,str(root/'driver.sh')],env=env,text=True,capture_output=True,timeout=45)
  after=json.loads((root/'state.json').read_text());calls=after['calls']
  if scenario=='ok':
   assert result.returncode==0,result.stderr
   selected=['wms-toho-api','wms-toho-fe'] if mode=='both' else ['wms-toho-api' if mode=='be' else 'wms-toho-fe']
   for name in selected:
    assert after['containers'][name]['version']=='new'
    assert after['containers'][name]['env']==state['containers'][name]['env']
    run=next(c for c in calls if c[0]=='run' and c[c.index('--name')+1]==name)
    assert '--mount' in run and 'type=bind,source=/srv/wms data,target=/app/data,readonly' in run
    assert 'type=volume,source=wms-cache,target=/cache' in run
    assert '--add-host' in run
   if mode=='fe':assert after['containers']['wms-toho-api']['version']=='old'
   if mode=='be':assert after['containers']['wms-toho-fe']['version']=='old'
   build_indices=[i for i,c in enumerate(calls) if c[0]=='build']; stop_indices=[i for i,c in enumerate(calls) if c[0]=='stop']
   assert max(build_indices)<min(stop_indices)
  else:
   assert result.returncode!=0,(scenario,result.stdout,result.stderr)
   for name in ['wms-toho-api','wms-toho-fe']:
    assert after['containers'][name]['version']=='old',(scenario,after)
    assert after['containers'][name]['running'],(scenario,after)
   if scenario in ['build_failure','bad_host','missing_mysql_network']:assert not any(c[0]=='stop' for c in calls)
  assert after['containers']['mysql_vps']==state['containers']['mysql_vps']
  assert 'sample-secret-not-real' not in result.stdout+result.stderr
  print('PASS',mode,scenario)
