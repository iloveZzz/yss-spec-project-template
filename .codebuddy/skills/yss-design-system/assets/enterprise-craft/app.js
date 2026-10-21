(() => {
  const $ = id => document.getElementById(id);
  let rows, scenario, retried, trigger;
  for (const item of window.prototypeScenarios) $('scenario').add(new Option(item.label, item.id));
  const descriptions = {
    list: '观察查询与业务操作的分区、表头/数据的层级、长名称与空值。',
    form: '观察字段分组、辅助说明、错误位置与提交区域；两侧失败都保留输入。',
    approval: '观察待处理项、阻断原因和恢复动作能否关联；不以颜色代替状态文本。'
  };
  function element(tag, text) { const el = document.createElement(tag); el.textContent = text; return el; }
  function feedback(text, kind = 'info') { $('feedback').textContent = text; $('feedback').dataset.kind = kind; }
  function perform() {
    if (scenario.outcome === 'no-permission') { feedback('无操作权限：可以查看资料，请联系负责人。', 'error'); return; }
    if (scenario.outcome === 'failure' && !retried) { feedback('保存失败，当前输入已保留。请重试。', 'error'); $('retry').hidden = false; return; }
    if (scenario.outcome === 'conflict' && !retried) { feedback('版本冲突：本地输入已保留。重新加载前可复制内容。', 'error'); $('reload').hidden = false; return; }
    feedback('操作成功（本地模拟）。', 'success'); $('retry').hidden = true; $('reload').hidden = true; $('submit').focus();
  }
  function render(reloaded = false) {
    const params = new URLSearchParams(location.hash.slice(1));
    const pair = params.get('pair') || 'list'; const variant = params.get('variant') || 'after';
    scenario = window.prototypeScenarios.find(s => s.id === (params.get('scenario') || 'primary'));
    if (!descriptions[pair] || !['before','after'].includes(variant) || !scenario) { $('app').textContent = '示例链接无效：请检查示例、对照和场景。'; return; }
    $('pair').value = pair; $('variant').value = variant; $('scenario').value = scenario.id;
    $('explanation').textContent = descriptions[pair]; rows = (reloaded === true ? window.craftServerData : window.craftData).map(row => ({ ...row })); retried = reloaded === true;
    $('app').className = variant;
    $('app').innerHTML = `<section class="surface"><div class="page-heading"><div><h1>${pair === 'list' ? '资料工作台' : pair === 'form' ? '资料信息' : '待核对资料'}</h1><p class="secondary">核对资料名称、负责人和当前状态。所有操作均为本地模拟。</p></div><div class="actions"><button id="submit" class="primary">${pair === 'list' ? '保存当前清单' : pair === 'form' ? '保存资料' : '确认核对'}</button></div></div><div id="global-feedback"></div><div id="content"></div><div id="local-feedback"></div><div class="actions"><button id="retry" hidden>重试</button><button id="reload" hidden>重新加载</button></div></section>`;
    const notice = element('p', ''); notice.id = 'feedback'; notice.className = 'feedback'; notice.setAttribute('role','status');
    $(variant === 'before' ? 'global-feedback' : 'local-feedback').append(notice);
    if (pair === 'list') {
      $('content').innerHTML = '<form id="query" class="query"><label>名称或编号<input id="keyword" placeholder="输入资料名称或编号"></label><button>查询</button><button type="button" id="clear">重置查询</button></form><p id="count" class="secondary"></p><div class="table-scroll"><table><thead><tr><th>编号</th><th>资料名称</th><th>负责人</th><th>状态</th><th>操作</th></tr></thead><tbody id="rows"></tbody></table></div><dialog id="detail"><h2>资料详情</h2><dl id="detail-data"></dl><button id="close">关闭详情</button></dialog>';
      const showRows = () => {
        const visible = rows.filter(r => (r.id + r.name).includes($('keyword').value.trim())); $('rows').replaceChildren(); $('count').textContent = `共 ${visible.length} 条资料`;
        for (const row of visible) { const tr = document.createElement('tr'); for (const key of ['id','name','owner','status']) tr.append(element('td', row[key] || '未填写')); const cell = document.createElement('td'); const button = element('button','查看'); button.setAttribute('aria-label',`查看 ${row.id}`); button.onclick = () => { trigger = button; $('detail-data').replaceChildren(); for (const [key,label] of [['id','编号'],['name','名称'],['owner','负责人'],['note','说明'],['version','版本']]) $('detail-data').append(element('dt',label),element('dd',row[key] || '未填写')); $('detail').showModal(); $('close').focus(); }; cell.append(button); tr.append(cell); $('rows').append(tr); }
      };
      $('query').onsubmit = e => { e.preventDefault(); showRows(); }; $('clear').onclick = () => { $('keyword').value = ''; showRows(); };
      const close = () => { $('detail').close(); trigger?.focus(); }; $('close').onclick = close; $('detail').oncancel = e => { e.preventDefault(); close(); }; showRows();
    } else if (pair === 'form') {
      $('content').innerHTML = '<form id="editor"><section class="section"><h2>基本信息</h2><div class="fields"><div class="field"><label for="name">资料名称</label><input id="name" required aria-describedby="name-help"><p class="secondary" id="name-help">保留完整名称，便于查询与核对。</p></div><div class="field"><label for="owner">负责人</label><input id="owner" required aria-describedby="owner-help"><p class="secondary" id="owner-help">填写当前资料负责人。</p></div></div></section><section class="section"><h2>核对说明</h2><p id="note"></p><p>版本：<span id="version"></span></p></section></form>';
      $('note').textContent = rows[0].note; $('version').textContent = rows[0].version; $('name').value = rows[0].name; $('owner').value = rows[0].owner; $('name').readOnly = $('owner').readOnly = scenario.outcome === 'no-permission';
      $('editor').onsubmit = e => { e.preventDefault(); perform(); };
    } else {
      for (const row of rows) { const article = element('article',''); article.className = 'approval-item'; const content = element('div',''); content.append(element('h2',row.name), element('p',`${row.id} · ${row.owner || '负责人未填写'} · ${row.status}`), element('p',row.note)); article.append(content, element('span','核对当前资料后提交')); $('content').append(article); }
    }
    $('submit').disabled = scenario.outcome === 'no-permission';
    if (scenario.outcome === 'no-permission') feedback('无操作权限：可以查看资料，请联系负责人。', 'error');
    $('submit').onclick = () => pair === 'form' ? $('editor').requestSubmit() : perform();
    $('retry').onclick = () => { retried = true; pair === 'form' ? $('editor').requestSubmit() : perform(); };
    $('reload').onclick = () => { if (!confirm('重新加载将放弃本地修改，是否继续？')) return; render(true); $('reload').hidden = true; feedback('已重新加载，可继续核对和提交。'); $('submit').focus(); };
    document.body.dataset.scenario = scenario.id;
  }
  for (const name of ['pair','variant','scenario']) $(name).onchange = () => { location.hash = new URLSearchParams({ pair: $('pair').value, variant: $('variant').value, scenario: $('scenario').value }).toString(); };
  $('reset').onclick = render; window.addEventListener('hashchange', render); render();
})();
