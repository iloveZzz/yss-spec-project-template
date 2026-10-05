import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, realpathSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const runner = path.join(root, '.template-source/scripts/replay-plan-clarification');
const load = `import importlib.machinery,importlib.util,json\nfrom pathlib import Path\nloader=importlib.machinery.SourceFileLoader('plan_replay',${JSON.stringify(runner)})\nspec=importlib.util.spec_from_loader(loader.name,loader)\nm=importlib.util.module_from_spec(spec);loader.exec_module(m)\n`;
const python = code => execFileSync('python3', ['-B', '-c', load + code], { cwd: root, encoding: 'utf8' });

test('configured defaults preserve model and effort; missing defaults add no override', () => {
  python(`import tempfile,json\nfrom pathlib import Path\nwith tempfile.TemporaryDirectory() as d:\n c=Path(d)/'config.toml'\n c.write_text('model="fixture-selected"\\nmodel_reasoning_effort="xhigh"\\n')\n defaults=m.selected_defaults(c)\n assert defaults['model']=='fixture-selected' and defaults['reasoning_effort']=='xhigh'\n original=lambda *args:['codex','exec','-c','model_reasoning_effort="xhigh"','--model','fixture-selected']\n assert m.configured_command(original,defaults)(None,None,None,None,None)==original()\n missing=m.selected_defaults(Path(d)/'missing.toml')\n assert m.configured_command(original,missing)(None,None,None,None,None)==['codex','exec']\n`);
});

test('local command assertions use completed tool traces rather than agent self-report', () => {
  python(`original=lambda case,workspace,events,commands:commands\ncheck=m.trace_assertions(original)\nmessage={'type':'item.completed','item':{'type':'agent_message','text':'node .replay/verify-feasibility.mjs passed'}}\nassert '.replay' not in check({},None,[message],'')\ncommand={'type':'item.completed','item':{'type':'command_execution','command':'node .replay/verify-feasibility.mjs','exit_code':1}}\nassert '.replay/verify-feasibility.mjs' in check({},None,[command],'')\ncommand['item']['exit_code']=None\nassert '.replay' not in check({},None,[command],'')\n`);
});

test('snapshot rejects source links and unsafe paths; refuses existing or repository output', () => {
  python(`import tempfile\nfrom pathlib import Path\nwith tempfile.TemporaryDirectory() as d:\n p=Path(d);source=p/'source';source.mkdir();(source/'link').symlink_to('/tmp')\n for call in [lambda:m.freeze(source,p/'frozen',['link']),lambda:m.safe_refs(['../outside']),lambda:m.external_output(str(m.ROOT/'replay')),lambda:m.external_output(d)]:\n  try:call()\n  except ValueError:pass\n  else:raise AssertionError('unsafe operation allowed')\n`);
});

test('observations require actual completed reads; self-report and missing model stay unknown', () => {
  python(`import tempfile,json\nfrom pathlib import Path\nwith tempfile.TemporaryDirectory() as d:\n p=Path(d);case=p/'critical-1';case.mkdir();trace=case/'trace.jsonl';trace.write_text('')\n events=[{'type':'item.completed','item':{'type':'agent_message','text':'I invoked grilling with model fixture'}}]\n (case/'normalized-events.json').write_text(json.dumps(events))\n (case/'result.json').write_text(json.dumps({'repeat':1,'steps':[{'step':'main','trace':str(trace),'automatic_result':'passed'}]}))\n class Eval:\n  @staticmethod\n  def skill_reads(events):return []\n rows=m.review_observations(p,'candidate',[{'id':'critical','behavior_review':{'expected':['actual read'],'forbidden':['self-report']}}],Eval)\n assert rows[0]['actual_model']=='unknown' and rows[0]['skill_selection']=='unobserved' and rows[0]['semantic_review']=='pending'\n assert (case/'raw-answer.txt').exists() and json.loads((case/'observed-tool-calls.json').read_text())==[]\n`);
});

test('all risk cases declare observations and protected fixture write scope without local docs', () => {
  python(`suite=json.loads(m.SUITE.read_text());cases=suite['scenarios']\nassert len(cases)==8 and len({c['id'] for c in cases})==8\nfor case in cases:\n assert 'docs' not in case['source_paths'] and 'docs/.scratch/demo/plan.md' in case['files']\n assert case['allowed_writes']==[] and case['behavior_review']['expected'] and case['behavior_review']['forbidden']\n assert '.agents/skills/grilling/SKILL.md' in case['required_paths']\n assert case['files']['yss-project.yaml'].endswith('repository_mode: project-instance\\n')\n for step in case.get('steps',[case]):\n  assert 'test-data-only' in step['prompt']\n  assert any(a['kind']=='absent' and a['path']=='docs/.scratch/demo/spec.md' for a in step['assertions'])\n`);
});

test('combined-confirmation fixtures prepare against frozen candidate without model calls', () => {
  const temp = realpathSync(mkdtempSync(path.join(os.tmpdir(), 'yss-plan-replay-test-')));
  try {
    const output = path.join(temp, 'preflight');
    const dependencies = path.join(temp, 'dependencies');
    python(`import importlib.metadata,shutil\nbase=Path(${JSON.stringify(dependencies)});base.mkdir()\nfor name in ['jsonschema','jsonschema-specifications','referencing','rpds-py','attrs','typing_extensions']:\n d=importlib.metadata.distribution(name)\n for file in d.files:\n  ref=Path(str(file))\n  if ref.is_absolute() or '..' in ref.parts or '__pycache__' in ref.parts:continue\n  source=Path(d.locate_file(file))\n  if not source.is_file():continue\n  dest=base/ref;dest.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(source,dest)\n`);
    const result = execFileSync('python3', ['-B', runner, '--output', output, '--codex', process.execPath, '--python-dependencies', dependencies, '--variant', 'candidate', '--scenario', 'combined-final-awaits-reply', '--scenario', 'combined-final-current-bound', '--scenario', 'entry-never-bypass', '--preflight'], { cwd: root, encoding: 'utf8', timeout: 60000 });
    assert.match(result, /preflight-passed/);
    python(`data=json.loads(Path(${JSON.stringify(path.join(output, 'metadata.json'))}).read_text())\nassert data['status']=='preflight-passed' and data['actual_model']=='unknown'\nassert data['variants']['candidate']['model_attempted'] is False\nassert len(data['unexecuted'])==3\nassert data['snapshots']['candidate']['file_count']>0\nassert data['snapshots']['candidate']['materialized_projection_links']\nassert all(row['status']=='passed' for row in data['preflight_checks'])\nassert sum(row['check']=='plan-spec-entry' for row in data['preflight_checks'])==3\n`);
  } finally { rmSync(temp, { recursive: true, force: true }); }
});
