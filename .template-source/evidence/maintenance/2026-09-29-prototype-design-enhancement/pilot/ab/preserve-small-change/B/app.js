"use strict";
const form = document.querySelector('form');
const query = document.querySelector('#query');
const tbody = document.querySelector('tbody');
const count = document.querySelector('#count');
const tableScroll = document.querySelector('.table-scroll');
const scenarioStatus = document.querySelector('#scenario-status');
let resetTimer;

function show() {
  // 保留原页的大小写敏感子串匹配、提交查询和空值展示方式。
  const data = fixtureRows.filter(row => (row.id + row.name).includes(query.value));
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
    : '共 0 条。未找到匹配资料。请修改名称或编号后点击“查询”，或点击“重置查询”查看全部资料。';
}

function initializeScenario(announceReset = false) {
  clearTimeout(resetTimer);
  const requested = new URLSearchParams(location.hash.slice(1)).get('scenario');
  const scenario = Object.hasOwn(fixtureScenarios, requested) ? requested : 'primary';
  query.value = fixtureScenarios[scenario].query;
  tableScroll.scrollLeft = 0;
  show();
  scenarioStatus.textContent = announceReset ? '已重置场景：primary' : '评测场景：primary';
}

form.onsubmit = event => { event.preventDefault(); show(); };
form.onreset = () => {
  // 等待原生 reset 恢复字段默认值，再刷新查询结果。
  clearTimeout(resetTimer);
  resetTimer = setTimeout(show, 0);
};
document.querySelector('#reset-scenario').onclick = () => initializeScenario(true);
window.addEventListener('hashchange', () => initializeScenario());
initializeScenario();
