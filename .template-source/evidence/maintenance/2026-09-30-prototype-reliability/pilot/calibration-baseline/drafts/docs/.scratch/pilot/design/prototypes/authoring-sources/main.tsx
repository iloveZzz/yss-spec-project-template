import React, {useCallback, useEffect, useRef, useState} from 'react';
import {createRoot} from 'react-dom/client';
import {Button} from '@/registry/new-york-v4/ui/button';
import {Input} from '@/registry/new-york-v4/ui/input';
import {Label} from '@/registry/new-york-v4/ui/label';
import {Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle} from '@/registry/new-york-v4/ui/dialog';
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from '@/registry/new-york-v4/ui/table';
import './styles.css';

type Row = {id: string; name: string; owner: string; status: string; version: number};
type Session = {id: string; label: string; ticket: number; data: {rows: Row[]}};
const runtime = window.prototypeRuntime;

function initialize(): {session?: Session; error?: string} {
  try {
    return {session: runtime.initialize()};
  } catch (error) {
    runtime.fail(error);
    return {error: error instanceof Error ? error.message : String(error)};
  }
}

function Prototype() {
  const [result, setResult] = useState(initialize);
  const reset = useCallback(() => setResult(initialize()), []);
  useEffect(() => {
    window.addEventListener('hashchange', reset);
    return () => window.removeEventListener('hashchange', reset);
  }, [reset]);

  if (!result.session) {
    return <main className="workspace"><section id="scenario-error" className="feedback feedback-error" role="alert">
      <h1>场景入口错误</h1><p>{result.error}</p>
      <p>请使用 #scenario=primary 或 #scenario=failure 打开本页。</p>
    </section></main>;
  }
  // A fresh ticket remounts the entire workbench, including drafts and retry state.
  return <Workbench key={result.session.ticket} session={result.session} reset={reset}/>;
}

function Status({value}: {value: string}) {
  return <span className="record-status"><span aria-hidden="true" className={value === '待核对' ? 'status-dot status-warning' : 'status-dot status-success'}/>{value}</span>;
}

function Workbench({session, reset}: {session: Session; reset: () => void}) {
  const [rows, setRows] = useState<Row[]>(session.data.rows);
  const [keyword, setKeyword] = useState('');
  const [filter, setFilter] = useState('');
  const [dialog, setDialog] = useState<'detail' | 'edit' | null>(null);
  const [draft, setDraft] = useState<Row | null>(null);
  const [hasFailed, setHasFailed] = useState(false);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const origin = useRef<HTMLElement | null>(null);
  const nameInput = useRef<HTMLInputElement | null>(null);
  const detailClose = useRef<HTMLButtonElement | null>(null);
  const keywordInput = useRef<HTMLInputElement | null>(null);
  const visible = rows.filter(row => (row.id + row.name).includes(filter));

  useEffect(() => {
    runtime.ready(session.ticket);
  }, [session.ticket]);
  useEffect(() => {
    document.body.dataset.state = feedback ? 'success' : session.id;
  }, [session.id, feedback]);

  function open(row: Row, kind: 'detail' | 'edit', trigger: HTMLElement) {
    origin.current = trigger;
    setDraft({...row});
    setError('');
    setFeedback('');
    setDialog(kind);
  }
  function close() {
    setDialog(null);
    setError('');
    setDraft(null);
  }
  function save(event: React.FormEvent) {
    event.preventDefault();
    if (!draft) return;
    if (session.id === 'failure' && !hasFailed) {
      setHasFailed(true);
      setError('保存失败，输入已保留，请重试。');
      return;
    }
    setRows(current => current.map(row => row.id === draft.id ? {...row, name: draft.name, owner: draft.owner} : row));
    close();
    setFeedback('保存成功（本地模拟）。');
  }
  function selectScenario(id: string) {
    const hash = `#scenario=${encodeURIComponent(id)}`;
    if (location.hash === hash) reset();
    else location.hash = hash;
  }

  return <>
    <header className="workspace-header"><strong>业务工作台</strong><nav aria-label="当前位置">资料管理 / 资料维护</nav></header>
    <main className="workspace" data-scenario={session.id}>
      <div className="page-heading"><div><h1>资料维护</h1><p className="secondary">查询资料、核对详情并维护名称与负责人。</p></div><span className="sample-label">示例数据</span></div>

      <section className="workspace-surface query-surface" aria-label="查询条件">
        <form id="query" onSubmit={event => {event.preventDefault(); setFilter(keyword.trim());}}>
          <Label htmlFor="keyword">名称或编号</Label>
          <div className="query-controls">
            <Input ref={keywordInput} id="keyword" value={keyword} onChange={event => setKeyword(event.target.value)} placeholder="输入名称或编号"/>
            <div className="query-buttons">
              <Button type="submit" variant="outline">查询</Button>
              <Button id="clear" type="button" variant="outline" onClick={() => {setKeyword(''); setFilter(''); keywordInput.current?.focus();}}>重置筛选</Button>
            </div>
          </div>
        </form>
      </section>

      <section className="workspace-surface list-surface" aria-labelledby="list-title">
        <div className="list-heading"><h2 id="list-title">资料列表</h2><span id="count" className="secondary" role="status">共 {visible.length} 条</span></div>
        <Table className="records-table" aria-label="资料列表">
          <TableHeader><TableRow>{['编号', '资料名称', '负责人', '状态', '操作'].map(label => <TableHead scope="col" key={label}>{label}</TableHead>)}</TableRow></TableHeader>
          <TableBody>
            {visible.map(row => <TableRow key={row.id}>
              <TableCell data-label="编号" className="id-cell">{row.id}</TableCell>
              <TableCell data-label="资料名称" className="name-cell">{row.name || '—'}</TableCell>
              <TableCell data-label="负责人" className="owner-cell">{row.owner || '—'}</TableCell>
              <TableCell data-label="状态"><Status value={row.status}/></TableCell>
              <TableCell className="action-cell"><div className="record-actions">
                <Button variant="outline" aria-label={`查看 ${row.id}`} onClick={event => open(row, 'detail', event.currentTarget)}>查看</Button>
                <Button variant="outline" aria-label={`编辑 ${row.id}`} onClick={event => open(row, 'edit', event.currentTarget)}>编辑</Button>
              </div></TableCell>
            </TableRow>)}
            {!visible.length && <TableRow><TableCell colSpan={5} className="empty-cell"><div id="list-status" role="status"><p>暂无符合条件的资料</p><p className="secondary">请修改名称或编号，或重置筛选。</p></div></TableCell></TableRow>}
          </TableBody>
        </Table>
      </section>
      <div id="feedback" role="status" aria-live="polite" aria-atomic="true">{feedback && <p className="feedback feedback-success">{feedback}</p>}</div>

      <aside className="scenario-panel" aria-label="评审场景">
        <div className="scenario-heading"><h2>评审场景</h2><span className="secondary">仅本地模拟</span></div>
        <div className="scenario-controls"><Label htmlFor="scenario">场景</Label>
          <select id="scenario" value={session.id} onChange={event => selectScenario(event.target.value)}>
            {window.prototypeScenarioContract.scenarios.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
          </select>
          <Button variant="outline" id="reset" type="button" onClick={reset}>重置场景</Button>
        </div>
        <p className="secondary scenario-hint">{session.id === 'failure' ? '首次保存失败，保留输入；再次保存成功。' : '保存成功后更新当前列表。'}重置可恢复初始资料。</p>
      </aside>

      <Dialog open={dialog !== null} onOpenChange={isOpen => {if (!isOpen) close();}}>
        <DialogContent className="record-dialog" showCloseButton={false}
          onOpenAutoFocus={event => {event.preventDefault(); (dialog === 'edit' ? nameInput.current : detailClose.current)?.focus();}}
          onCloseAutoFocus={event => {event.preventDefault(); const target = origin.current; (target?.isConnected ? target : keywordInput.current)?.focus();}}>
          <DialogHeader><DialogTitle>{dialog === 'detail' ? '资料详情' : '编辑资料'}</DialogTitle>
            <DialogDescription>{dialog === 'detail' ? '核对当前资料信息。' : '修改资料名称和负责人，保存后更新列表。'}</DialogDescription>
          </DialogHeader>
          {draft && (dialog === 'detail' ? <>
            <dl className="detail-fields">
              <div><dt>编号</dt><dd>{draft.id}</dd></div>
              <div><dt>资料名称</dt><dd>{draft.name || '—'}</dd></div>
              <div><dt>负责人</dt><dd>{draft.owner || '—'}</dd></div>
              <div><dt>状态</dt><dd><Status value={draft.status}/></dd></div>
              <div><dt>版本</dt><dd>{draft.version}</dd></div>
            </dl>
            <div className="dialog-actions"><Button ref={detailClose} id="detail-close" variant="outline" onClick={close}>关闭详情</Button></div>
          </> : <form id="editor" onSubmit={save}>
            <p className="record-context"><span>{draft.id}</span><Status value={draft.status}/><span className="secondary">版本 {draft.version}</span></p>
            <div className="field"><Label htmlFor="name">资料名称</Label><Input ref={nameInput} id="name" value={draft.name} onChange={event => setDraft({...draft, name: event.target.value})}/></div>
            <div className="field"><Label htmlFor="owner">负责人</Label><Input id="owner" value={draft.owner} onChange={event => setDraft({...draft, owner: event.target.value})}/></div>
            {error && <div className="feedback feedback-error" role="alert" id="edit-status"><p>{error}</p><p>请再次点击“保存”。</p></div>}
            <div className="dialog-actions"><Button variant="outline" id="cancel" type="button" onClick={close}>取消</Button><Button id="save" type="submit">保存</Button></div>
          </form>)}
        </DialogContent>
      </Dialog>
    </main>
  </>;
}

createRoot(document.getElementById('app')!).render(<Prototype/>);
