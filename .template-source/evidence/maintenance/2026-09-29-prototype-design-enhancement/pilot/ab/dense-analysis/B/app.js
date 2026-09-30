(function () {
  'use strict';
  const data = window.analysisFixture;
  const form = document.querySelector('#filter-form');
  const input = document.querySelector('#name-filter');
  const records = document.querySelector('#records');
  const status = document.querySelector('#result-status');
  const empty = document.querySelector('#empty-state');
  const scroll = document.querySelector('#table-scroll');
  const notice = document.querySelector('#scenario-notice');

  function cell(tag, text, className) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    element.textContent = text;
    return element;
  }

  function render(query, reason) {
    const keyword = query.trim();
    const rows = data.records.filter(record => record.name.includes(keyword));
    records.replaceChildren();
    rows.forEach(record => {
      const row = document.createElement('tr');
      const name = cell('th', '', 'name-cell');
      name.scope = 'row';
      name.append(cell('span', record.name, 'record-name'), cell('span', record.id, 'record-id'));
      const updated = cell('td', '', 'updated');
      const time = cell('time', record.updated);
      // 保留给定本地时间字符串；未给定时区，不转换也不追加时区。
      time.dateTime = record.updated.replace(' ', 'T');
      updated.append(time);
      row.append(name, cell('td', String(record.checks), 'numeric'), cell('td', String(record.errors), 'numeric error-count'), cell('td', record.owner || '未提供', record.owner ? '' : 'owner-empty'), cell('td', record.status), updated);
      records.append(row);
    });
    empty.hidden = rows.length !== 0;
    document.querySelector('#record-count').textContent = `共 ${rows.length} 项资料`;
    status.textContent = keyword
      ? `匹配 ${rows.length} 项，共 ${data.records.length} 项资料`
      : `${reason ? reason + '，' : ''}显示全部 ${data.records.length} 项资料`;
    scroll.scrollLeft = 0;
  }

  function clearFilter() {
    input.value = '';
    render('', '筛选已重置');
    input.focus();
  }

  function initialize(reset) {
    const requested = new URLSearchParams(window.location.hash.slice(1)).get('scenario') || 'primary';
    const applicable = requested === 'primary';
    input.value = '';
    document.body.dataset.scenario = 'primary';
    document.querySelector('#scenario-label').textContent = '场景：primary';
    notice.hidden = applicable;
    notice.textContent = applicable ? '' : '此草案仅适用 primary 场景，已显示固定资料。';
    document.querySelector('#total-checks').textContent = String(data.summary.checks);
    document.querySelector('#total-errors').textContent = String(data.summary.errors);
    document.querySelector('#total-pending').textContent = String(data.summary.pending);
    render('', reset ? '场景已重置' : '');
  }

  form.addEventListener('submit', event => {
    event.preventDefault();
    render(input.value);
  });
  document.querySelector('#clear-filter').addEventListener('click', clearFilter);
  document.querySelector('#empty-reset').addEventListener('click', clearFilter);
  document.querySelector('#reset-scenario').addEventListener('click', () => {
    if (window.location.hash !== '#scenario=primary') window.location.hash = 'scenario=primary';
    initialize(true);
    input.focus();
  });
  window.addEventListener('hashchange', () => initialize(false));
  initialize(false);
})();
