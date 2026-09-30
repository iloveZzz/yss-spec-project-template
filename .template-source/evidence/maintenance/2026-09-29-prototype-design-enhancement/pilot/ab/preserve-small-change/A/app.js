(() => {
  'use strict';

  const form = document.querySelector('form');
  const query = document.querySelector('#query');
  const tbody = document.querySelector('tbody');
  const count = document.querySelector('#count');
  let rows;

  function show() {
    // 沿用现有包含匹配规则：提交时查询，不改变大小写、空格或字段组合。
    const data = rows.filter(row => (row.id + row.name).includes(query.value));
    tbody.replaceChildren();
    for (const row of data) {
      const tr = document.createElement('tr');
      for (const key of ['id', 'name', 'owner', 'status']) {
        const td = document.createElement('td');
        td.textContent = row[key] || '未填写';
        tr.append(td);
      }
      tbody.append(tr);
    }
    count.textContent = data.length
      ? '共 ' + data.length + ' 条'
      : '共 0 条。未找到匹配的资料。请修改名称或编号后点击“查询”，或点击“重置查询”查看全部资料。';
  }

  function initializeScenario() {
    const requested = new URLSearchParams(window.location.hash.slice(1)).get('scenario') || 'primary';
    // 简报仅适用 primary；未声明的场景回落到同一初始列表。
    const scenario = Object.hasOwn(window.materialQueryScenarios, requested)
      ? window.materialQueryScenarios[requested]
      : window.materialQueryScenarios.primary;
    rows = scenario.rows;
    query.value = scenario.query;
    show();
  }

  form.onsubmit = event => {
    event.preventDefault();
    show();
  };
  form.onreset = () => setTimeout(show);
  document.querySelector('#reset-scenario').onclick = () => {
    initializeScenario();
    query.focus();
  };
  window.addEventListener('hashchange', initializeScenario);
  initializeScenario();
})();
